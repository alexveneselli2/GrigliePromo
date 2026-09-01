// REST surface for the volantino (flyer) cataloguing section.
//
// Analysis of a full flyer takes minutes, so upload returns immediately with an
// id and the work continues in the background; the client polls the detail
// endpoint until `stato` leaves 'in_analisi'.

import express from 'express';
import multer from 'multer';
import { query, hasDb, messaggioErrore } from './db.js';
import { analizzaVolantino, riepilogo, contaPagine, riclassifica } from './volantini.js';
import { esportaLista, esportaVolantini, TIPI_EXPORT } from './export-xlsx.js';
import { salvaFile, leggiFile, eliminaFile } from './file-store.js';
import { accoda, statoCoda } from './coda.js';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
function inviaXlsx(res, { buffer, filename }) {
  res.setHeader('Content-Type', XLSX_MIME);
  // The name is ASCII-safe by construction (slugified), so a plain filename
  // is enough and avoids the RFC 5987 encoding dance.
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(Buffer.from(buffer));
}

// Every column of `volantini` EXCEPT file_dati, which holds the raw PDF and
// must never be dragged into list/detail responses.
const COLONNE_VOLANTINO = `id, nome, canali, mese, anno, progressivo, nota, file_nome, file_bytes,
   pagine, stato, errore, modello, tentativi, creato_il, completato_il, da_completare,
   fase, progresso_fatto, progresso_totale, aggiornato_il,
   (EXISTS (SELECT 1 FROM volantino_file_chunk c WHERE c.volantino_id = volantini.id)) AS ha_file`;

const CANALI_VALIDI = ['Mercatò', 'Mercatò Local', 'Mercatò Big', 'Mercatò Extra'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 60 * 1024 * 1024 }, // 60 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') return cb(new Error('Sono ammessi solo file PDF.'));
    cb(null, true);
  },
});

export default function volantiniRouter() {
  const router = express.Router();

  // Every route needs the DB; fail with a clear message instead of a stack trace.
  router.use((_req, res, next) => {
    if (!hasDb()) {
      return res.status(503).json({
        error: 'Database non configurato: la sezione Volantini richiede DATABASE_URL (Postgres).',
      });
    }
    next();
  });

  // ---- list -------------------------------------------------------------
  router.get('/', async (_req, res, next) => {
    try {
      const r = await query(
        `SELECT ${COLONNE_VOLANTINO.replace('volantini.id', 'v.id').replace(/^id\b/, 'v.id')},
                (SELECT COUNT(*) FROM volantino_articoli a WHERE a.volantino_id = v.id) AS n_articoli,
                (SELECT COUNT(*) FROM volantino_articoli a WHERE a.volantino_id = v.id AND a.da_rivedere) AS n_da_rivedere
           FROM volantini v
          ORDER BY v.anno DESC, v.mese DESC, v.progressivo DESC, v.id DESC`
      );
      res.json({ volantini: r.rows });
    } catch (err) { next(err); }
  });

  // ---- Excel exports -----------------------------------------------------
  // Declared before '/:id' so "export" isn't parsed as an id.
  router.get('/export', async (_req, res, next) => {
    try { inviaXlsx(res, await esportaVolantini()); } catch (err) { next(err); }
  });

  router.get('/:id/export', async (req, res, next) => {
    try {
      const tipo = String(req.query.tipo || 'articoli');
      if (!TIPI_EXPORT.includes(tipo)) {
        return res.status(400).json({ error: `Tipo non valido. Ammessi: ${TIPI_EXPORT.join(', ')}.` });
      }
      const out = await esportaLista(Number(req.params.id), tipo);
      if (!out) return res.status(404).json({ error: 'Volantino non trovato.' });
      inviaXlsx(res, out);
    } catch (err) { next(err); }
  });

  // ---- edit the flyer's own attributes -----------------------------------
  router.patch('/:id', async (req, res, next) => {
    try {
      const { nome, canali, mese, anno, progressivo, nota } = req.body || {};
      const errori = [];
      if (nome !== undefined && !String(nome).trim()) errori.push('nome');
      if (mese !== undefined && !(Number(mese) >= 1 && Number(mese) <= 12)) errori.push('mese');
      if (anno !== undefined && !(Number(anno) >= 2000 && Number(anno) <= 2100)) errori.push('anno');
      if (progressivo !== undefined && !Number.isInteger(Number(progressivo))) errori.push('progressivo');
      if (canali !== undefined) {
        if (!Array.isArray(canali) || canali.length === 0) errori.push('canali');
        else {
          const nv = canali.filter((c) => !CANALI_VALIDI.includes(c));
          if (nv.length) errori.push(`canali non validi: ${nv.join(', ')}`);
        }
      }
      if (errori.length) {
        return res.status(400).json({ error: `Campi non validi: ${errori.join(', ')}` });
      }

      // COALESCE keeps every field the caller didn't send. Supplying the
      // channels is what a bulk-imported row is missing, so that edit is also
      // what clears the "da completare" flag.
      const r = await query(
        `UPDATE volantini
            SET nome        = COALESCE($1, nome),
                canali      = COALESCE($2, canali),
                mese        = COALESCE($3, mese),
                anno        = COALESCE($4, anno),
                progressivo = COALESCE($5, progressivo),
                nota        = COALESCE($6, nota),
                da_completare = CASE WHEN $2::text[] IS NULL THEN da_completare ELSE false END
          WHERE id = $7
          RETURNING ${COLONNE_VOLANTINO}`,
        [
          nome !== undefined ? String(nome).trim() : null,
          canali !== undefined ? canali : null,
          mese !== undefined ? Number(mese) : null,
          anno !== undefined ? Number(anno) : null,
          progressivo !== undefined ? Number(progressivo) : null,
          nota !== undefined ? String(nota) : null,
        ].concat([Number(req.params.id)])
      );
      if (r.rows.length === 0) return res.status(404).json({ error: 'Volantino non trovato.' });
      res.json({ volantino: r.rows[0] });
    } catch (err) { next(err); }
  });

  // ---- ECR taxonomy for the linked dropdowns -----------------------------
  // Declared before '/:id' so Express doesn't read "tassonomia" as an id.
  // Cached in memory: it is reference data and never changes at runtime.
  let tassonomiaCache = null;
  router.get('/tassonomia', async (_req, res, next) => {
    try {
      if (!tassonomiaCache) {
        const r = await query(
          `SELECT DISTINCT reparto, famiglia FROM catalogo_prodotti
            WHERE reparto IS NOT NULL AND famiglia IS NOT NULL
            ORDER BY reparto, famiglia`
        );
        const perReparto = {};
        for (const row of r.rows) {
          (perReparto[row.reparto] = perReparto[row.reparto] || []).push(row.famiglia);
        }
        tassonomiaCache = { reparti: Object.keys(perReparto).sort(), famiglie: perReparto };
      }
      res.json(tassonomiaCache);
    } catch (err) { next(err); }
  });

  // ---- bulk approve everything at or above a confidence level ------------
  router.post('/:id/approva-massivo', async (req, res, next) => {
    try {
      const minConfidenza = Number(req.body?.minConfidenza);
      if (!Number.isFinite(minConfidenza) || minConfidenza < 0 || minConfidenza > 100) {
        return res.status(400).json({ error: 'minConfidenza deve essere un numero tra 0 e 100.' });
      }
      // Only rows that are actually pending and have a classification to approve.
      const r = await query(
        `UPDATE volantino_articoli
            SET da_rivedere = false
          WHERE volantino_id = $1
            AND da_rivedere
            AND confidenza IS NOT NULL
            AND confidenza >= $2
            AND famiglia IS NOT NULL`,
        [Number(req.params.id), minConfidenza]
      );
      res.json({ approvati: r.rowCount, minConfidenza });
    } catch (err) { next(err); }
  });

  // ---- detail -----------------------------------------------------------
  router.get('/:id', async (req, res, next) => {
    try {
      const data = await riepilogo(Number(req.params.id));
      if (!data) return res.status(404).json({ error: 'Volantino non trovato.' });
      res.json(data);
    } catch (err) { next(err); }
  });

  // ---- articles (paged; supports the review queue) -----------------------
  router.get('/:id/articoli', async (req, res, next) => {
    try {
      const soloDaRivedere = req.query.daRivedere === '1';
      const soloInEvidenza = req.query.inEvidenza === '1';
      const soloFidelity = req.query.fidelity === '1';
      const pagina = req.query.pagina ? Number(req.query.pagina) : null;
      const filtri = [
        soloDaRivedere ? 'AND a.da_rivedere' : '',
        soloInEvidenza ? 'AND a.tipo_evidenza IS NOT NULL' : '',
        soloFidelity ? 'AND a.fidelity' : '',
        Number.isFinite(pagina) && pagina ? `AND a.pagina = ${Number(pagina)}` : '',
      ].join(' ');
      // Highlighted articles read best grouped by category; the review queue
      // reads best worst-first.
      const ordine = soloDaRivedere
        ? 'a.confidenza ASC NULLS FIRST, a.pagina'
        : soloInEvidenza
          ? 'a.reparto NULLS LAST, a.famiglia NULLS LAST, a.pagina'
          : 'a.pagina, a.id';
      const r = await query(
        `SELECT a.*, z.fornitore AS zona_fornitore
           FROM volantino_articoli a
           LEFT JOIN volantino_zone z ON z.id = a.zona_id
          WHERE a.volantino_id = $1 ${filtri}
          ORDER BY ${ordine}
          LIMIT 2000`,
        [Number(req.params.id)]
      );
      res.json({ articoli: r.rows });
    } catch (err) { next(err); }
  });

  // ---- correct one article's classification ------------------------------
  router.patch('/:id/articoli/:articoloId', async (req, res, next) => {
    try {
      const { reparto, famiglia, inEvidenza, tipoEvidenza, fidelity, confermato } = req.body || {};
      const TIPI = ['cover', 'faro', 'doppio'];
      if (tipoEvidenza !== undefined && tipoEvidenza !== null && tipoEvidenza !== '' && !TIPI.includes(tipoEvidenza)) {
        return res.status(400).json({ error: `tipoEvidenza non valido. Ammessi: ${TIPI.join(', ')} oppure vuoto.` });
      }
      const r = await query(
        `UPDATE volantino_articoli
            SET reparto       = COALESCE($1::text, reparto),
                famiglia      = COALESCE($2::text, famiglia),
                -- clearing the type also clears the derived boolean
                -- Explicit casts: these parameters appear only inside CASE
                -- branches, where Postgres cannot infer their type on its own
                -- ("could not determine data type of parameter").
                tipo_evidenza = CASE WHEN $7::boolean THEN NULLIF($8::text, '') ELSE tipo_evidenza END,
                in_evidenza   = CASE WHEN $7::boolean THEN NULLIF($8::text, '') IS NOT NULL
                                     WHEN $3::boolean IS NOT NULL THEN $3::boolean
                                     ELSE in_evidenza END,
                fidelity      = COALESCE($9::boolean, fidelity),
                origine       = CASE WHEN $1::text IS NOT NULL OR $2::text IS NOT NULL THEN 'manuale' ELSE origine END,
                da_rivedere   = CASE WHEN $4::boolean = true THEN false ELSE da_rivedere END
          WHERE id = $5 AND volantino_id = $6
          RETURNING *`,
        [
          reparto ?? null,
          famiglia ?? null,
          typeof inEvidenza === 'boolean' ? inEvidenza : null,
          confermato === true,
          Number(req.params.articoloId),
          Number(req.params.id),
          tipoEvidenza !== undefined,
          tipoEvidenza ?? '',
          typeof fidelity === 'boolean' ? fidelity : null,
        ]
      );
      if (r.rows.length === 0) return res.status(404).json({ error: 'Articolo non trovato.' });
      res.json({ articolo: r.rows[0] });
    } catch (err) { next(err); }
  });

  // ---- upload + analyse --------------------------------------------------
  router.post('/', upload.single('pdf'), async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Nessun PDF caricato.' });

      const { nome, mese, anno, progressivo, nota } = req.body || {};
      let canali = req.body.canali;
      if (typeof canali === 'string') {
        try { canali = JSON.parse(canali); } catch { canali = [canali]; }
      }
      canali = Array.isArray(canali) ? canali : [];

      const errori = [];
      if (!nome || !String(nome).trim()) errori.push('nome');
      if (!(Number(mese) >= 1 && Number(mese) <= 12)) errori.push('mese');
      if (!(Number(anno) >= 2000 && Number(anno) <= 2100)) errori.push('anno');
      if (!Number.isInteger(Number(progressivo))) errori.push('progressivo');
      if (canali.length === 0) errori.push('canali');
      const canaliNonValidi = canali.filter((c) => !CANALI_VALIDI.includes(c));
      if (canaliNonValidi.length) errori.push(`canali non validi: ${canaliNonValidi.join(', ')}`);
      if (errori.length) {
        return res.status(400).json({ error: `Campi mancanti o non validi: ${errori.join(', ')}` });
      }

      // Fail fast on a PDF we can't even open, before creating a row.
      let pagine = 0;
      try {
        pagine = await contaPagine(req.file.buffer);
      } catch {
        return res.status(400).json({ error: 'Il file non sembra un PDF leggibile.' });
      }

      const ins = await query(
        `INSERT INTO volantini (nome, canali, mese, anno, progressivo, nota, file_nome, file_bytes, pagine, stato)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'in_analisi')
         RETURNING ${COLONNE_VOLANTINO}`,
        [
          String(nome).trim(), canali, Number(mese), Number(anno), Number(progressivo),
          nota ? String(nota) : '', req.file.originalname, req.file.size, pagine,
        ]
      );
      const volantino = ins.rows[0];

      // Respond now; keep analysing in the background.
      res.status(202).json({ volantino });

      const buf = req.file.buffer;
      // Store the PDF, then hand the id to the serial queue. Failing to store
      // it is fatal here: the queue reads the file back when its turn comes.
      salvaFile(volantino.id, buf)
        .then(() => accoda(volantino.id))
        .catch(async (err) => {
          console.error(`[volantini] #${volantino.id} PDF non salvato:`, err?.message || err);
          try {
            await query(`UPDATE volantini SET stato = 'errore', errore = $1 WHERE id = $2`,
              ['Salvataggio del PDF non riuscito: ' + String(err?.message || err).slice(0, 300), volantino.id]);
          } catch { /* best effort */ }
        });
    } catch (err) { next(err); }
  });

  // ---- bulk import: many flyers, analysed one at a time ------------------
  // No metadata is asked for here: the point of a bulk import is to get the
  // PDFs into the queue straight away. Each row is created as "Import N" and
  // flagged `da_completare`; name, channels and period are filled in later
  // from the list, while the analysis is already running.
  router.post('/bulk', upload.array('pdf', 30), async (req, res, next) => {
    try {
      const files = req.files || [];
      if (files.length === 0) return res.status(400).json({ error: 'Nessun PDF caricato.' });

      // Placeholders for the NOT NULL period columns until the user fills them.
      const oggi = new Date();
      const mese = oggi.getMonth() + 1;
      const anno = oggi.getFullYear();

      // Create every row first so the client gets the full list back at once;
      // the queue then works through them strictly one at a time.
      const creati = [];
      const scartati = [];
      for (const f of files) {
        let pagine = 0;
        try {
          pagine = await contaPagine(f.buffer);
        } catch {
          scartati.push({ file: f.originalname, motivo: 'PDF non leggibile' });
          continue;
        }
        // The sequence hands out the number; it also becomes the progressivo,
        // so the placeholder row is internally consistent until it is edited.
        const ins = await query(
          `INSERT INTO volantini (nome, canali, mese, anno, progressivo, nota, file_nome, file_bytes, pagine, stato, da_completare)
           SELECT 'Import ' || n, '{}', $1, $2, n, '', $3, $4, $5, 'in_coda', true
             FROM nextval('import_progressivo') AS n
           RETURNING ${COLONNE_VOLANTINO}`,
          [mese, anno, f.originalname, f.size, pagine]
        );
        creati.push(ins.rows[0]);
        try {
          await salvaFile(ins.rows[0].id, f.buffer);
        } catch (err) {
          scartati.push({ file: f.originalname, motivo: 'Salvataggio del PDF non riuscito' });
          await query(`UPDATE volantini SET stato='errore', errore=$1 WHERE id=$2`,
            ['Salvataggio del PDF non riuscito.', ins.rows[0].id]);
          continue;
        }
        await accoda(ins.rows[0].id);
      }

      res.status(202).json({ creati, scartati, coda: statoCoda() });
    } catch (err) { next(err); }
  });

  // ---- queue state -------------------------------------------------------
  router.get('/coda/stato', (_req, res) => res.json(statoCoda()));

  // ---- re-run classification only (no vision pass, so cheap) --------------
  // Re-classifying 300+ articles takes minutes and Render drops a connection
  // that transfers nothing for ~300s, so answer immediately and work in the
  // background — same pattern as upload. The client polls the detail endpoint.
  router.post('/:id/riclassifica', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const esiste = await query('SELECT id FROM volantini WHERE id = $1', [id]);
      if (esiste.rows.length === 0) return res.status(404).json({ error: 'Volantino non trovato.' });

      await query(`UPDATE volantini SET stato = 'in_analisi', errore = NULL WHERE id = $1`, [id]);
      res.status(202).json({ avviata: true });

      riclassifica(id)
        .then(async (out) => {
          await query(`UPDATE volantini SET stato = 'completato' WHERE id = $1`, [id]);
          console.log(`[volantini] #${id} riclassificato: ${out.aggiornati} articoli, ${out.daRivedere} da rivedere`);
        })
        .catch(async (err) => {
          console.error(`[volantini] #${id} riclassificazione fallita:`, err?.message || err);
          try {
            await query(`UPDATE volantini SET stato = 'errore', errore = $1 WHERE id = $2`,
              [String(err?.message || err).slice(0, 500), id]);
          } catch { /* best effort */ }
        });
    } catch (err) { next(err); }
  });

  // ---- re-run the full analysis from the stored PDF ----------------------
  router.post('/:id/rianalizza', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const r = await query('SELECT stato FROM volantini WHERE id = $1', [id]);
      if (r.rows.length === 0) return res.status(404).json({ error: 'Volantino non trovato.' });
      if (r.rows[0].stato === 'in_analisi') {
        return res.status(409).json({ error: 'Un\'analisi è già in corso su questo volantino.' });
      }
      const pdf = await leggiFile(id);
      if (!pdf) {
        return res.status(409).json({ error: 'Il PDF non è più disponibile: ricarica il volantino per rianalizzarlo.' });
      }

      // Start from a clean slate: the previous run's articles and zones go.
      await query('DELETE FROM volantino_articoli WHERE volantino_id = $1', [id]);
      await query('DELETE FROM volantino_zone WHERE volantino_id = $1', [id]);
      await query('UPDATE volantini SET tentativi = 0, completato_il = NULL WHERE id = $1', [id]);
      await accoda(id);
      res.status(202).json({ avviata: true, coda: statoCoda() });
    } catch (err) { next(err); }
  });

  // ---- drop just the stored PDF, keeping the catalogue -------------------
  router.delete('/:id/file', async (req, res, next) => {
    try {
      const esiste = await query('SELECT id FROM volantini WHERE id = $1', [Number(req.params.id)]);
      if (esiste.rows.length === 0) return res.status(404).json({ error: 'Volantino non trovato.' });
      await eliminaFile(Number(req.params.id));
      res.json({ ok: true });
    } catch (err) { next(err); }
  });

  // ---- delete a supplier zone (false positive) ---------------------------
  // The articles stay: only their zona_id is cleared (ON DELETE SET NULL), so
  // removing a wrongly detected zone never removes products from the catalogue.
  router.delete('/:id/zone/:zonaId', async (req, res, next) => {
    try {
      const r = await query(
        'DELETE FROM volantino_zone WHERE id = $1 AND volantino_id = $2 RETURNING id',
        [Number(req.params.zonaId), Number(req.params.id)]
      );
      if (r.rows.length === 0) return res.status(404).json({ error: 'Zona non trovata.' });
      res.json({ ok: true });
    } catch (err) { next(err); }
  });

  // ---- delete ------------------------------------------------------------
  router.delete('/:id', async (req, res, next) => {
    try {
      await query('DELETE FROM volantini WHERE id = $1', [Number(req.params.id)]);
      res.json({ ok: true });
    } catch (err) { next(err); }
  });

  // Multer and validation errors become clean JSON.
  router.use((err, _req, res, _next) => {
    console.error('[volantini] ', err?.message || err);
    const status = err?.code === 'LIMIT_FILE_SIZE' ? 413 : 500;
    res.status(status).json({ error: messaggioErrore(err) });
  });

  return router;
}

export { CANALI_VALIDI };
