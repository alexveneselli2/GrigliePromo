// Flyer (volantino) analysis pipeline.
//
// A flyer is a graphic-heavy PDF. Page count and raw text are easy, but the two
// things the buyer actually needs — "is this article bigger than the others"
// and "is this block supplier-managed artwork" — are purely VISUAL. So the PDF
// itself is handed to Claude (document content block), which reads layout and
// text together, and returns a structured description of every page.
//
// Flow:
//   1. split the PDF into small page chunks (bounded output per request)
//   2. each chunk -> Claude -> { pagine: [{ articoli, zoneFornitore }] }
//   3. match each description against the product catalogue (exact, then fuzzy)
//   4. anything still unmatched -> Claude classifies it into the ECR tree and
//      is flagged `da_rivedere` so the user can confirm or correct it
//   5. persist everything

import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { PDFDocument } from 'pdf-lib';
import { query, withTransaction, hasTrigram } from './db.js';

const MODEL = process.env.VOLANTINO_MODEL || 'claude-opus-5';
const PAGES_PER_CHUNK = Number(process.env.VOLANTINO_PAGES_PER_CHUNK || 3);
const CONCURRENCY = Number(process.env.VOLANTINO_CONCURRENCY || 6);
// Descriptions per classification request: one big call with ~190 items and the
// full ECR vocabulary was a multi-minute serial step.
const CLASSIFY_BATCH = Number(process.env.VOLANTINO_CLASSIFY_BATCH || 50);

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

// ---------------------------------------------------------------------------
// Structured output schema
// ---------------------------------------------------------------------------

const ArticoloSchema = z.object({
  descrizione: z.string().describe('Testo del prodotto come stampato sul volantino, il piu\' fedele possibile (marca + descrizione + formato).'),
  marca: z.string().describe('Marca commerciale se leggibile, altrimenti stringa vuota.'),
  prezzo: z.number().describe('Prezzo promozionale in euro. 0 se non leggibile.'),
  inEvidenza: z.boolean().describe('true se questo articolo occupa uno spazio visibilmente PIU\' GRANDE degli altri della stessa pagina (vetrina, taglio prezzo in grande, box doppio). false per gli articoli di taglio standard.'),
  zonaFornitore: z.string().describe('Se l\'articolo si trova dentro un\'area con grafica gestita dal fornitore, riporta qui il nome identificativo di quella zona (lo stesso usato in zoneFornitore). Stringa vuota se e\' nel layout standard del volantino.'),
});

const ZonaSchema = z.object({
  nome: z.string().describe('Nome breve e univoco della zona nella pagina (es. "zona Barilla", "spazio Coca-Cola").'),
  fornitore: z.string().describe('Fornitore/marca che gestisce la grafica della zona, se riconoscibile.'),
  descrizione: z.string().describe('Breve descrizione di come si distingue graficamente dal resto della pagina.'),
  nArticoli: z.number().int().describe('Quanti articoli sono contenuti dentro questa zona.'),
});

const PaginaSchema = z.object({
  numero: z.number().int().describe('Numero di pagina ASSOLUTO nel PDF completo (usa l\'offset indicato nel prompt).'),
  articoli: z.array(ArticoloSchema),
  zoneFornitore: z.array(ZonaSchema),
});

const ChunkSchema = z.object({
  pagine: z.array(PaginaSchema),
});

const SYSTEM_ESTRAZIONE = `Sei un analista che cataloga volantini promozionali della GDO italiana.

Ricevi alcune pagine di un volantino in PDF. Per OGNI pagina devi restituire:

1. ARTICOLI — ogni singolo prodotto in promozione presente sulla pagina, con la descrizione cosi' come e' stampata (marca, denominazione, formato/grammatura), il prezzo promozionale e la marca.

2. IN EVIDENZA — per ogni articolo indica se occupa uno spazio VISIBILMENTE PIU' GRANDE rispetto agli altri articoli della stessa pagina. I volantini hanno un taglio standard ripetuto (celle di dimensione simile); gli articoli "in evidenza" rompono quella griglia: box doppio o triplo, immagine grande, prezzo cubitale, posizione di apertura pagina. Confronta SEMPRE con gli altri articoli della stessa pagina: e' una valutazione relativa, non assoluta. Se in una pagina tutti gli articoli hanno la stessa dimensione, nessuno e' in evidenza.

3. ZONE FORNITORE — aree in cui e' il FORNITORE a fornire la grafica, comprata come spazio pubblicitario. Sono rare: in un volantino tipico se ne contano poche unita', non una per pagina.

   Una zona fornitore si riconosce perche' porta un SISTEMA GRAFICO ESTRANEO al volantino:
   - font e impaginazione propri della marca, diversi da quelli usati in tutto il resto del volantino;
   - fotografia pubblicitaria del fornitore (testimonial, persone, ambientazioni, illustrazioni), non il semplice packshot del prodotto su fondo piatto;
   - materiale di campagna: concorsi a premi, "vinci", regolamento, QR code, montepremi, claim del brand;
   - palette di colori della marca, estranea a quella del volantino;
   - una composizione interna propria, che di norma presenta PIU' prodotti disposti a modo suo.

   ATTENZIONE — l'errore piu' frequente e' scambiare per zona fornitore il modo in cui IL VOLANTINO STESSO mette in risalto un articolo. Il volantino ha un suo trattamento di evidenza ricorrente (cornice colorata, fondo/diagonale a tinta, packshot ingrandito, prezzo cubitale, box che rompe la griglia): quello NON e' una zona fornitore, e' semplicemente un articolo in evidenza. Se vedi un box piu' grande con la cornice e i colori usati anche altrove nel volantino, e dentro c'e' UN SOLO prodotto col suo packshot e il suo prezzo, allora quell'articolo va marcato inEvidenza=true e il suo zonaFornitore va lasciato VUOTO.

   Non sono zone fornitore nemmeno:
   - i box istituzionali dell'insegna (servizi, spesa online, orari, carta fedelta', concorsi dell'insegna);
   - i contenuti editoriali del volantino che parlano di una marca (schede prodotto, "abbinamento consigliato", riquadri della raccolta punti), riconoscibili perche' usano la grafica e i loghi dell'insegna.

   Nel dubbio NON dichiarare la zona: e' preferibile perderne una che inventarne una che non esiste.

   Per ogni zona indica il fornitore, come si distingue e quanti articoli contiene; e valorizza il campo zonaFornitore di ogni articolo che vi sta dentro con lo stesso nome della zona.

Regole:
- Non inventare articoli: riporta solo quelli effettivamente visibili.
- Non classificare merceologicamente i prodotti: pensa solo a estrarre testo, dimensione relativa e zone. La classificazione avviene dopo.
- Se una pagina e' di sola copertina/istituzionale senza prodotti, restituiscila con liste vuote.
- Il numero di pagina deve essere quello ASSOLUTO nel volantino completo, calcolato con l'offset che ti viene indicato.`;

// ---------------------------------------------------------------------------
// PDF splitting
// ---------------------------------------------------------------------------

export async function contaPagine(pdfBuffer) {
  const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  return doc.getPageCount();
}

// The source document is parsed once and reused: re-loading a 26-page,
// image-heavy flyer for every chunk was pure waste on a 0.1-CPU instance.
async function estraiChunk(src, startIdx, endIdx) {
  const out = await PDFDocument.create();
  const indices = [];
  for (let i = startIdx; i < endIdx; i++) indices.push(i);
  const pages = await out.copyPages(src, indices);
  for (const p of pages) out.addPage(p);
  const bytes = await out.save();
  return Buffer.from(bytes);
}

// ---------------------------------------------------------------------------
// Step 1 — extraction via Claude (reads the PDF pages directly)
// ---------------------------------------------------------------------------

async function analizzaChunk(chunkBuffer, offset, nPagine) {
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    thinking: { type: 'adaptive' },
    system: [{ type: 'text', text: SYSTEM_ESTRAZIONE, cache_control: { type: 'ephemeral' } }],
    // Reading a page is perception, not deep reasoning: the default effort
    // ("high") spent minutes per chunk for no measurable gain.
    output_config: { effort: 'medium', format: betaZodOutputFormat(ChunkSchema) },
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: chunkBuffer.toString('base64') },
        },
        {
          type: 'text',
          text: `Queste sono ${nPagine} pagine consecutive del volantino. La prima pagina di questo blocco corrisponde alla pagina ${offset + 1} del volantino completo: numera le pagine di conseguenza (${offset + 1}…${offset + nPagine}).`,
        },
      ],
    }],
  });

  const res = await stream.finalMessage();
  if (res.stop_reason === 'max_tokens') {
    throw new Error(`Output troncato analizzando le pagine ${offset + 1}-${offset + nPagine}`);
  }
  let parsed = res.parsed_output;
  if (!parsed) {
    const text = (res.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    if (text) parsed = ChunkSchema.parse(JSON.parse(text));
  }
  if (!parsed) throw new Error(`Nessun output leggibile per le pagine ${offset + 1}-${offset + nPagine}`);
  return parsed;
}

// ---------------------------------------------------------------------------
// Step 2 — match descriptions against the product catalogue
// ---------------------------------------------------------------------------

// Same normalisation used when seeding catalogo_prodotti.descrizione_norm.
export function normalizza(s) {
  return String(s || '')
    .toUpperCase()
    .replace(/\*+/g, ' ')
    .replace(/\.+(?=\s|$)/g, ' ')
    .replace(/[^\wÀ-ÿ0-9.,/ -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Technical/administrative buckets that exist in the product master but are not
// real merchandising categories. Measured on live data: without this filter a
// flyer line like "Mulino Bianco Macine" lands in "ESAURITI CON ECR A ZERO".
const FAMIGLIE_TECNICHE = /ESAURIT|NON CLASS|CAUZION|BATTUTE REP|BUONI SCONTO|DA DEFINIRE|VARIE ?$/i;

// Similarity tiers, tuned against real flyer-style descriptions.
// Measured on a real 26-page flyer (377 articles): flyer copy is much longer
// than the internal product master ("PESTO FRESCO BIFFI gr.90 vari tipi" vs
// "PESTO BIFFI GR.90"), and trigram similarity punishes that length gap rather
// than any real error. At 0.75 only ~11% of correct matches passed; spot checks
// showed matches down to ~0.60 are reliable.
const SIM_SICURA = 0.60;  // accept as-is
// Below this the catalogue match is worse than letting Claude classify from
// the ECR vocabulary: measured on the real flyer, AI results sat at 80-99%
// confidence while catalogue matches in the 0.40-0.55 band were weak.
const SIM_MINIMA = 0.55;

async function matchCatalogo(descrizione) {
  const norm = normalizza(descrizione);
  if (!norm) return null;

  // 1) exact normalised match — unambiguous, no review needed
  const exact = await query(
    `SELECT reparto, gruppo, settore, famiglia FROM catalogo_prodotti
      WHERE descrizione_norm = $1
        AND famiglia !~* $2
      LIMIT 1`,
    [norm, FAMIGLIE_TECNICHE.source]
  );
  if (exact.rows.length) {
    return { ...exact.rows[0], origine: 'catalogo', confidenza: 100, daRivedere: false };
  }

  if (!hasTrigram()) return null;

  // 2) fuzzy: take several candidates and let the most represented
  // (reparto, famiglia) win — one odd top hit shouldn't decide the class.
  const fuzzy = await query(
    `SELECT reparto, gruppo, settore, famiglia,
            similarity(descrizione_norm, $1) AS sim
       FROM catalogo_prodotti
      WHERE descrizione_norm % $1
        AND famiglia !~* $2
      ORDER BY sim DESC
      LIMIT 8`,
    [norm, FAMIGLIE_TECNICHE.source]
  );
  if (fuzzy.rows.length === 0) return null;

  const best = fuzzy.rows[0];
  if (best.sim < SIM_MINIMA) return null;

  // Weighted vote: each candidate contributes its own similarity.
  const voti = new Map();
  for (const r of fuzzy.rows) {
    const key = `${r.reparto}||${r.famiglia}`;
    const cur = voti.get(key) || { peso: 0, row: r };
    cur.peso += Number(r.sim);
    voti.set(key, cur);
  }
  const vincitore = [...voti.values()].sort((a, b) => b.peso - a.peso)[0].row;

  return {
    reparto: vincitore.reparto,
    gruppo: vincitore.gruppo,
    settore: vincitore.settore,
    famiglia: vincitore.famiglia,
    origine: 'catalogo',
    confidenza: Math.round(best.sim * 100),
    // Anything short of a strong match gets queued for human confirmation.
    daRivedere: best.sim < SIM_SICURA,
  };
}

// ---------------------------------------------------------------------------
// Step 3 — classify the leftovers with Claude, against the real ECR tree
// ---------------------------------------------------------------------------

const ClassificazioneSchema = z.object({
  risultati: z.array(z.object({
    indice: z.number().int().describe('Indice dell\'articolo nella lista fornita (0-based).'),
    reparto: z.string().describe('Reparto ECR, scelto ESATTAMENTE da quelli elencati.'),
    famiglia: z.string().describe('Famiglia ECR piu\' plausibile, scelta dalla lista fornita per quel reparto.'),
    confidenza: z.number().int().describe('0-100: quanto sei sicuro della classificazione.'),
    motivo: z.string().describe('Una frase breve sul perche\' di questa scelta.'),
  })),
});

// The ECR vocabulary is ~19.6k tokens and identical on every call, so it is
// fetched once per process and cached prompt-side.
let vocabolarioCache = null;
async function vocabolarioECR() {
  if (vocabolarioCache) return vocabolarioCache;
  const alb = await query(
    `SELECT DISTINCT reparto, famiglia FROM catalogo_prodotti
     WHERE famiglia IS NOT NULL ORDER BY reparto, famiglia`
  );
  const perReparto = {};
  for (const r of alb.rows) (perReparto[r.reparto] = perReparto[r.reparto] || []).push(r.famiglia);
  vocabolarioCache = Object.entries(perReparto)
    .map(([rep, fams]) => `${rep}: ${fams.join(' | ')}`)
    .join('\n');
  return vocabolarioCache;
}

/**
 * Classify descriptions in parallel batches. A single call carrying every
 * leftover description plus the whole vocabulary was a multi-minute serial
 * step; batches of CLASSIFY_BATCH run concurrently instead. Indices returned
 * by each batch are local, so they are rebased onto the caller's list.
 */
async function classificaConAI(descrizioni) {
  if (descrizioni.length === 0) return [];

  const lotti = [];
  for (let i = 0; i < descrizioni.length; i += CLASSIFY_BATCH) {
    lotti.push({ offset: i, items: descrizioni.slice(i, i + CLASSIFY_BATCH) });
  }

  const esiti = await mapLimit(lotti, CONCURRENCY, async ({ offset, items }) => {
    const out = await classificaLotto(items);
    return out.map((e) => ({ ...e, indice: e.indice + offset }));
  });
  return esiti.flat();
}

async function classificaLotto(descrizioni) {
  if (descrizioni.length === 0) return [];
  const vocabolario = await vocabolarioECR();
  const elenco = descrizioni.map((d, i) => `${i}. ${d}`).join('\n');

  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    thinking: { type: 'adaptive' },
    system: [{
      type: 'text',
      cache_control: { type: 'ephemeral' },
      text: `Classifichi prodotti di un volantino GDO italiano nell'albero merceologico ECR.

Ti vengono dati dei testi presi da un volantino che NON hanno trovato corrispondenza nel catalogo prodotti. Per ognuno scegli il reparto e la famiglia piu' plausibili, usando ESCLUSIVAMENTE i valori dell'elenco fornito: non inventare reparti o famiglie.

Se un testo e' troppo generico o non e' un prodotto (slogan, intestazione, condizioni promo), assegna comunque la scelta piu' vicina ma metti confidenza bassa (sotto 40), cosi' l'operatore potra' correggerla.

ALBERO ECR DISPONIBILE (reparto: famiglie):
${vocabolario}`,
    }],
    output_config: { effort: 'medium', format: betaZodOutputFormat(ClassificazioneSchema) },
    messages: [{ role: 'user', content: `Classifica questi ${descrizioni.length} testi:\n\n${elenco}` }],
  });

  const res = await stream.finalMessage();
  let parsed = res.parsed_output;
  if (!parsed) {
    const text = (res.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    if (text) parsed = ClassificazioneSchema.parse(JSON.parse(text));
  }
  return parsed?.risultati || [];
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

/**
 * Analyse an uploaded flyer and persist the catalogue. Runs in the background;
 * progress is reflected in volantini.stato.
 */
// Progress helpers. A full flyer takes minutes, so the run reports which phase
// it is in and how far through it is; the UI polls the detail endpoint.
async function fase(volantinoId, nome, totale) {
  await query(
    `UPDATE volantini SET fase = $1, progresso_fatto = 0, progresso_totale = $2,
            aggiornato_il = now() WHERE id = $3`,
    [nome, totale, volantinoId]
  );
}
async function avanza(volantinoId) {
  // Incremented from concurrent workers, so the increment happens in SQL.
  await query(
    `UPDATE volantini SET progresso_fatto = progresso_fatto + 1,
            aggiornato_il = now() WHERE id = $1`,
    [volantinoId]
  );
}

export async function analizzaVolantino(volantinoId, pdfBuffer) {
  if (!client) throw new Error('ANTHROPIC_API_KEY non configurata sul server.');

  const pagine = await contaPagine(pdfBuffer);
  await query('UPDATE volantini SET pagine = $1, modello = $2 WHERE id = $3', [pagine, MODEL, volantinoId]);

  // 1 — split into chunks and extract
  const chunks = [];
  for (let start = 0; start < pagine; start += PAGES_PER_CHUNK) {
    const end = Math.min(start + PAGES_PER_CHUNK, pagine);
    chunks.push({ start, end });
  }

  await fase(volantinoId, 'estrazione', chunks.length);
  const src = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const risultati = await mapLimit(chunks, CONCURRENCY, async ({ start, end }) => {
    const buf = await estraiChunk(src, start, end);
    const out = await analizzaChunk(buf, start, end - start);
    await avanza(volantinoId);
    return out;
  });

  const paginePiatte = risultati.flatMap((r) => r?.pagine || []);

  // 2 — match every description against the catalogue
  const tuttiArticoli = [];
  for (const p of paginePiatte) {
    for (const a of p.articoli || []) {
      tuttiArticoli.push({ ...a, pagina: p.numero });
    }
  }

  await fase(volantinoId, 'catalogo', tuttiArticoli.length);
  const classificati = await Promise.all(
    tuttiArticoli.map(async (a) => ({ art: a, cls: await matchCatalogo(a.descrizione) }))
  );

  // 3 — the leftovers go to Claude
  const mancanti = classificati.filter((c) => !c.cls);
  if (mancanti.length > 0) {
    await fase(volantinoId, 'classificazione', mancanti.length);
    const esiti = await classificaConAI(mancanti.map((m) => m.art.descrizione));
    for (const e of esiti) {
      const target = mancanti[e.indice];
      if (!target) continue;
      target.cls = {
        reparto: e.reparto,
        gruppo: null,
        settore: null,
        famiglia: e.famiglia,
        origine: 'ai',
        confidenza: e.confidenza,
        daRivedere: true, // AI guesses are always surfaced for confirmation
      };
    }
  }

  // 4 — persist
  await fase(volantinoId, 'salvataggio', classificati.length);
  await withTransaction(async (c) => {
    // zones first, so articles can reference them
    const zonaIdByKey = new Map();
    for (const p of paginePiatte) {
      for (const z of p.zoneFornitore || []) {
        const ins = await c.query(
          `INSERT INTO volantino_zone (volantino_id, pagina, fornitore, descrizione, n_articoli)
           VALUES ($1,$2,$3,$4,$5) RETURNING id`,
          [volantinoId, p.numero, z.fornitore || null, z.descrizione || null, z.nArticoli || 0]
        );
        zonaIdByKey.set(`${p.numero}::${z.nome}`, ins.rows[0].id);
      }
    }

    for (const { art, cls } of classificati) {
      const zonaId = art.zonaFornitore
        ? zonaIdByKey.get(`${art.pagina}::${art.zonaFornitore}`) || null
        : null;
      await c.query(
        `INSERT INTO volantino_articoli
           (volantino_id, pagina, descrizione, marca, prezzo, reparto, gruppo, settore, famiglia,
            origine, confidenza, da_rivedere, in_evidenza, zona_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          volantinoId,
          art.pagina,
          art.descrizione,
          art.marca || null,
          art.prezzo || null,
          cls?.reparto || null,
          cls?.gruppo || null,
          cls?.settore || null,
          cls?.famiglia || null,
          cls?.origine || 'ai',
          cls?.confidenza ?? null,
          // AI-classified rows always need a check; catalogue matches only when
          // the similarity was not strong enough to stand on its own.
          cls ? cls.daRivedere !== false : true,
          !!art.inEvidenza,
          zonaId,
        ]
      );
    }

    // keep zone article counts consistent with what was actually linked
    await c.query(
      `UPDATE volantino_zone z
          SET n_articoli = COALESCE(sub.n, z.n_articoli)
         FROM (SELECT zona_id, COUNT(*) AS n FROM volantino_articoli
                WHERE volantino_id = $1 AND zona_id IS NOT NULL GROUP BY zona_id) sub
        WHERE z.id = sub.zona_id`,
      [volantinoId]
    );

    await c.query(
      `UPDATE volantini SET stato = 'completato', completato_il = now(),
              fase = NULL, progresso_fatto = 0, progresso_totale = 0
        WHERE id = $1`,
      [volantinoId]
    );
  });

  return { pagine, articoli: classificati.length };
}

/**
 * Re-run only the classification step on articles already extracted from the
 * PDF. Cheap compared to a full re-analysis (no vision pass), so tuning the
 * matching thresholds doesn't mean paying to read the flyer again.
 * Manually corrected rows are left untouched.
 */
export async function riclassifica(volantinoId) {
  const r = await query(
    `SELECT id, descrizione FROM volantino_articoli
      WHERE volantino_id = $1 AND origine <> 'manuale'
      ORDER BY id`,
    [volantinoId]
  );
  if (r.rows.length === 0) return { aggiornati: 0, daRivedere: 0 };

  await fase(volantinoId, 'catalogo', r.rows.length);
  const esiti = await Promise.all(
    r.rows.map(async (row) => ({ row, cls: await matchCatalogo(row.descrizione) }))
  );

  const mancanti = esiti.filter((e) => !e.cls);
  if (mancanti.length > 0 && client) {
    await fase(volantinoId, 'classificazione', mancanti.length);
    const out = await classificaConAI(mancanti.map((m) => m.row.descrizione));
    for (const e of out) {
      const target = mancanti[e.indice];
      if (!target) continue;
      target.cls = {
        reparto: e.reparto, gruppo: null, settore: null, famiglia: e.famiglia,
        origine: 'ai', confidenza: e.confidenza, daRivedere: true,
      };
    }
  }

  let daRivedere = 0;
  await withTransaction(async (c) => {
    for (const { row, cls } of esiti) {
      const rivedi = cls ? cls.daRivedere !== false : true;
      if (rivedi) daRivedere++;
      await c.query(
        `UPDATE volantino_articoli
            SET reparto = $1, gruppo = $2, settore = $3, famiglia = $4,
                origine = $5, confidenza = $6, da_rivedere = $7
          WHERE id = $8`,
        [
          cls?.reparto || null, cls?.gruppo || null, cls?.settore || null, cls?.famiglia || null,
          cls?.origine || 'ai', cls?.confidenza ?? null, rivedi, row.id,
        ]
      );
    }
  });

  return { aggiornati: esiti.length, daRivedere };
}

// ---------------------------------------------------------------------------
// Aggregations for the UI
// ---------------------------------------------------------------------------

export async function riepilogo(volantinoId) {
  const [testata, perFamiglia, zone, totali] = await Promise.all([
    query(`SELECT id, nome, canali, mese, anno, progressivo, nota, file_nome, file_bytes,
   pagine, stato, errore, modello, creato_il, completato_il,
   fase, progresso_fatto, progresso_totale, aggiornato_il,
   (file_dati IS NOT NULL) AS ha_file FROM volantini WHERE id = $1`, [volantinoId]),
    query(
      `SELECT reparto, famiglia,
              COUNT(*)                                    AS articoli,
              COUNT(*) FILTER (WHERE in_evidenza)         AS in_evidenza,
              COUNT(*) FILTER (WHERE zona_id IS NOT NULL) AS in_zona_fornitore,
              COUNT(DISTINCT zona_id) FILTER (WHERE zona_id IS NOT NULL) AS zone_fornitore,
              COUNT(*) FILTER (WHERE da_rivedere)         AS da_rivedere
         FROM volantino_articoli
        WHERE volantino_id = $1
        GROUP BY reparto, famiglia
        ORDER BY reparto NULLS LAST, articoli DESC`,
      [volantinoId]
    ),
    query(
      `SELECT z.*, COUNT(a.id) AS articoli_collegati
         FROM volantino_zone z
         LEFT JOIN volantino_articoli a ON a.zona_id = z.id
        WHERE z.volantino_id = $1
        GROUP BY z.id
        ORDER BY z.pagina`,
      [volantinoId]
    ),
    query(
      `SELECT COUNT(*)                                    AS articoli,
              COUNT(*) FILTER (WHERE in_evidenza)         AS in_evidenza,
              COUNT(*) FILTER (WHERE zona_id IS NOT NULL) AS in_zona_fornitore,
              COUNT(*) FILTER (WHERE da_rivedere)         AS da_rivedere
         FROM volantino_articoli WHERE volantino_id = $1`,
      [volantinoId]
    ),
  ]);

  if (testata.rows.length === 0) return null;
  return {
    volantino: testata.rows[0],
    totali: totali.rows[0],
    perFamiglia: perFamiglia.rows,
    zone: zone.rows,
  };
}
