// AI proxy backend for Dimar Griglie Promozionali.
//
// Holds the Anthropic API key (server-side only, from env) and exposes a single
// endpoint that turns a compact "candidate" payload into budget-aware
// promotional-grid suggestions, produced by Claude.
//
// The frontend never sees the key. The browser calls POST /api/ai/plan; this
// server calls the Anthropic Messages API with structured outputs and returns
// JSON the UI can render.

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { initSchema, hasDb } from './db.js';
import volantiniRouter from './routes-volantini.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8787;
const MODEL = process.env.AI_MODEL || 'claude-opus-4-8';
// Extra cross-origin browsers allowed to call the proxy (besides same-origin,
// which is always allowed). Same-origin works automatically — no config needed.
// The defaults cover the two ways this app is served outside Render itself:
// the Vite dev server and the GitHub Pages deploy. Override with ALLOWED_ORIGINS.
const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://alexveneselli2.github.io',
].join(',');
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || DEFAULT_ORIGINS)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const HAS_KEY = !!process.env.ANTHROPIC_API_KEY;
if (!HAS_KEY) {
  console.warn('\n[WARN] ANTHROPIC_API_KEY is not set — the static app will still be served, but /api/ai/plan will return 503 until you add the key.\n');
}

// Reads ANTHROPIC_API_KEY from the environment (only constructed when present).
const client = HAS_KEY ? new Anthropic() : null;

const app = express();
app.set('trust proxy', true); // so req.protocol reflects x-forwarded-proto on Render
app.use(express.json({ limit: '4mb' }));

// CORS that always allows same-origin (the request's own host) plus any
// configured cross-origin. This makes the single-service Render deploy work
// with zero CORS config while still supporting a split Pages+proxy setup.
app.use((req, res, next) => {
  const selfOrigin = `${req.protocol}://${req.headers.host}`;
  const allow = new Set([...ALLOWED_ORIGINS, selfOrigin]);
  return cors({
    origin(origin, cb) {
      if (!origin || allow.has(origin)) return cb(null, true);
      return cb(new Error(`Origin ${origin} not allowed by CORS`));
    },
  })(req, res, next);
});

app.get('/health', (_req, res) => res.json({
  ok: true,
  model: MODEL,
  ai: HAS_KEY,
  db: hasDb(),
  volantini: hasDb() && HAS_KEY,
}));

// ---- Volantini (flyer cataloguing) ----
app.use('/api/volantini', volantiniRouter());

// ---- Structured-output schema returned by Claude (per promo) ----
const ImpactSchema = z.object({
  expectedRevenueK: z.number().describe('Ricavo incrementale atteso durante la promo, in migliaia di euro (es. 12.5 = 12.500€). Stima basata su vendite, stagionalita\' e affinita\' col tema.'),
  cardProb: z.number().int().describe('Probabilita\' 0-100 che la famiglia spinga l\'uso della carta fedelta\', derivata dalla penetrazione scontrini.'),
  engagement: z.number().int().describe('Engagement atteso 0-100: mix di penetrazione scontrini e affinita\' tematica.'),
});

const PickSchema = z.object({
  fc: z.string().describe('Family code (IV-level ECR) chosen, taken from the candidates list'),
  sectionKey: z.string().describe('Section key: tema | sotto | s1 | s2 | s3 | s4'),
  prodCount: z.number().int().describe('Number of PROD (volantino) slots to assign, 0 or more, within the budget'),
  cardCount: z.number().int().describe('Number of CARD slots, must be <= prodCount and within the card budget'),
  score: z.number().int().describe('Suitability score 0-100'),
  confidence: z.number().int().describe('Confidence 0-100'),
  reasons: z.array(z.string()).describe('Da 1 a 3 motivazioni concise in italiano, ognuna che cita un KPI reale o l\'affinita\' tematica (es. "Top vendite del reparto", "Forte stagionalita\' nel periodo").'),
  warning: z.string().describe('Short Italian caveat if any (e.g. already in a recent flyer), or empty string'),
  impact: ImpactSchema.describe('Stima quantitativa dell\'impatto atteso di questa scelta.'),
});

const PromoResultSchema = z.object({
  picks: z.array(PickSchema),
  insight: z.string().describe('One-sentence Italian commentary on the strategy chosen for this promo'),
});

const SYSTEM_PROMPT = `Sei un category manager esperto della GDO italiana (catena Dimar). Devi decidere quali famiglie merceologiche inserire in ogni sezione di un volantino promozionale e con quanti spazi (PROD = spazi a volantino, CARD = spazi con carta fedeltà).

Regole ferree:
- Per ogni (sezione × reparto) ti viene dato un budget di spazi PROD e CARD. DEVI USARE TUTTI GLI SPAZI DISPONIBILI: la somma dei prodCount che assegni in quella sezione/reparto DEVE essere ESATTAMENTE uguale a budgetProd. La somma dei cardCount DEVE essere ESATTAMENTE uguale a budgetCard. Non lasciare spazi vuoti — un volantino con slot vuoti non viene stampato. Se servono piu' famiglie per riempire il budget, aggiungine: anche famiglie con score medio sono meglio di uno slot vuoto.
- cardCount di una famiglia non puo' superare il suo prodCount.
- Scegli SOLO famiglie presenti nella lista candidates fornita.
- Se sono presenti "locked" (selezioni manuali gia' confermate dall'utente), queste sono IMMODIFICABILI. Non puoi rimuoverle ne' cambiarne prodCount/cardCount. Riportale esattamente come sono nel tuo output e assegna gli spazi rimanenti (budgetProd - lockedProd, budgetCard - lockedCard) alle altre famiglie candidate.
- Concentra piu' spazi (prodCount 2-4) sulle famiglie piu' forti per quella sezione; assegna 1 spazio a quelle marginali; ma NON lasciare fuori famiglie se ci sono ancora spazi da riempire.

Criteri di valutazione (in ordine di priorita' secondo i pesi forniti dall'utente):
- VENDITE: vendite nette nel periodo (campo "vendite"). Le famiglie top-seller del reparto meritano piu' spazi.
- MARGINE: margine % (campo "marginePct"). Privilegia famiglie che bilanciano volume e redditivita'.
- SCONTRINI: penetrazione scontrini (campo "scontriniPct"). Indica quanti clienti comprano quella famiglia — alta penetrazione = domanda diffusa.
- STAGIONALITÀ: andamento mensile (campo "m" = [m1,m2,m3,m4]). Se il mese della promo coincide col picco, la famiglia va privilegiata.
- AFFINITÀ TEMATICA: valuta semanticamente se il nome famiglia (campo "fn") e' coerente col tema/speciale della sezione. Non limitarti a keyword: ragiona sul significato (es. "Birra artigianale" ha forte affinita' col tema "Aperitivo estivo").
- ELASTICITÀ PROMO: campo "promoElasticity" (0-1). Famiglie con alta elasticita' rispondono meglio alle promozioni.
- ROTAZIONE: penalizza le famiglie gia' a volantino di recente (campo "ultimaPromo" valorizzato, "nVol" alto) per garantire varieta' tra le promo del quadrimestre.
- PROFILO CLIENTE: usa il campo "targetDemo" per diversificare il target nel volantino (non solo famiglie, non solo giovani).
- TREND MARGINE: campo "marginTrend" (up/stable/down). Preferisci famiglie con trend stabile o in crescita.

Dati di contesto aggiuntivi:
- Ogni candidato puo' avere: descrizione, segmento prezzo (entry/mainstream/premium), tier fornitore (leader/follower/private-label), rischio stock, e famiglie in cross-sell.
- Il contesto promo include: risultati anno precedente, attivita' concorrenza, contesto stagionale.
- I benchmark del reparto indicano margine medio, lift promozionale tipico, penetrazione card e trend.
Usa questi dati per motivare le scelte e stimare l'impatto in modo piu' accurato.

Per ogni scelta:
- Spiega con 1-3 motivazioni concrete e specifiche (cita il KPI reale, il match tematico, o il dato di contesto).
- Stima l'impatto atteso (ricavo incrementale in migliaia di euro, probabilita' uso carta fedelta', engagement) coerente con i KPI e il contesto forniti.

Rispondi esclusivamente nel formato strutturato richiesto.`;

function buildUserPrompt(promo, weights) {
  const lines = [
    `CANALE: ${promo.canale ?? ''}`,
    `PROMO ${promo.promoCode} — Q${promo.quadrimestre ?? '?'} — ${promo.dataInizio ?? ''} → ${promo.dataFine ?? ''}`,
    `Tema: ${promo.tema ?? ''} | Ruolo: ${promo.ruolo ?? ''}`,
  ];

  // Explicit weight priorities so the model knows what the user cares about
  if (weights) {
    const wLabels = {
      sales: 'Vendite', margin: 'Margine', scontrini: 'Scontrini',
      seasonality: 'Stagionalita\'', themeAffinity: 'Affinita\' tematica',
      roleBoost: 'Ruolo promo', recencyPenalty: 'Rotazione (penalty recency)',
      saturationPenalty: 'Saturazione (penalty riuso)',
    };
    const sorted = Object.entries(weights)
      .sort(([, a], [, b]) => b - a)
      .map(([k, v]) => `  ${wLabels[k] || k}: ${v.toFixed(2)}`)
      .join('\n');
    lines.push('', 'PRIORITÀ KPI (pesi dall\'utente, dal piu\' importante):');
    lines.push(sorted);
    lines.push('Rispetta queste priorita\': dai piu\' peso ai criteri con valore alto.');
  }

  // Promo context (history, competition, seasonality)
  if (promo.context) {
    lines.push('', 'CONTESTO PROMO:');
    if (promo.context.prevYear)
      lines.push(`  Anno precedente: ricavi ${promo.context.prevYear.totalRevenue}k, lift medio ${promo.context.prevYear.avgLift}, card ${promo.context.prevYear.cardActivations}, reach ${promo.context.prevYear.customerReach}`);
    if (promo.context.competition)
      lines.push(`  Concorrenza: ${promo.context.competition}`);
    if (promo.context.seasonal)
      lines.push(`  Stagione: ${promo.context.seasonal}`);
  }

  // Reparto benchmarks
  if (promo.repartoBenchmarks) {
    lines.push('', 'BENCHMARK PER REPARTO:');
    lines.push(JSON.stringify(promo.repartoBenchmarks, null, 1));
  }

  lines.push(
    '',
    'SEZIONI E CANDIDATI (con budget, KPI e profilo arricchito):',
    JSON.stringify(promo.sections, null, 1),
    '',
    'Per ogni sezione/reparto seleziona le famiglie e assegna prodCount/cardCount rispettando i budget. Restituisci anche una frase di insight sulla strategia complessiva della promo.',
  );
  return lines.filter(Boolean).join('\n');
}

async function planForPromo(promo, weights) {
  // The per-promo structured JSON can be large (many picks, each with reason/
  // warning text), so we give it plenty of headroom. Above ~16k max_tokens the
  // SDK requires streaming to avoid HTTP timeouts — so we stream and read the
  // final message, then validate it against the Zod schema.
  // betaZodOutputFormat() returns { type: 'json_schema', schema }, i.e. the
  // canonical `output_config.format` object. The top-level `output_format`
  // param is deprecated (and rejected on streaming calls), so we pass it via
  // output_config and parse/validate the final message text ourselves.
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    // Extended (adaptive) thinking: lets the model reason through budget
    // trade-offs and rotation before committing. Safe with streaming + 64k.
    thinking: { type: 'adaptive' },
    // The system prompt is identical on every call, so we cache it: subsequent
    // promo requests reuse it instead of re-billing/re-processing the tokens.
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    output_config: { format: betaZodOutputFormat(PromoResultSchema) },
    messages: [{ role: 'user', content: buildUserPrompt(promo, weights) }],
  });

  const response = await stream.finalMessage();

  if (response.stop_reason === 'max_tokens') {
    throw new Error(`Output troncato per promo ${promo.promoCode} — max_tokens raggiunto`);
  }

  // Prefer the SDK's parsed result if present, else parse the text content.
  let parsed = response.parsed_output;
  if (!parsed) {
    const text = (response.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');
    if (text) {
      parsed = PromoResultSchema.parse(JSON.parse(text));
    }
  }
  if (!parsed) {
    throw new Error(`Model returned no parseable output for promo ${promo.promoCode} (stop_reason=${response.stop_reason})`);
  }
  return parsed;
}

app.post('/api/ai/plan', async (req, res) => {
  if (!HAS_KEY) {
    return res.status(503).json({ error: 'AI non disponibile: ANTHROPIC_API_KEY non configurata sul server.' });
  }
  const { promos, weights } = req.body || {};
  if (!Array.isArray(promos) || promos.length === 0) {
    return res.status(400).json({ error: 'Body must include a non-empty "promos" array.' });
  }

  // Extended thinking on a full promo can take well over a minute. Render (and
  // most proxies) drop a connection that transfers no bytes for ~100s. So we
  // open the 200 response immediately and write a whitespace heartbeat while the
  // model works — JSON.parse() ignores leading whitespace, so the final body
  // stays valid JSON. Errors after headers are sent are reported as a JSON
  // body with an `error` field (the client checks for it).
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no', // disable proxy buffering so heartbeats flush
  });
  const heartbeat = setInterval(() => {
    try { res.write(' '); } catch { /* socket gone */ }
  }, 15000);

  try {
    const out = [];
    // Sequential per-promo calls keep each request (and its output) bounded.
    for (const promo of promos) {
      const result = await planForPromo(promo, weights);
      out.push({ promoCode: promo.promoCode, ...result });
    }
    clearInterval(heartbeat);
    res.end(JSON.stringify({ model: MODEL, promos: out }));
  } catch (err) {
    clearInterval(heartbeat);
    console.error('[ai/plan] error:', err?.message || err);
    res.end(JSON.stringify({ error: err?.message || 'AI request failed' }));
  }
});

// ---- Serve the built frontend (single-service deploy) ----
// When the Vite build output exists (../dist), serve it as static files with
// SPA fallback. This lets one Render service host both the app and the API on
// the same origin (no CORS, no VITE_AI_PROXY_URL needed).
const distDir = path.resolve(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
  console.log(`Serving frontend from ${distDir}`);
} else {
  console.log('No ../dist found — running in API-only mode (run "npm run build" at repo root to serve the app too).');
}

// Boot: prepare the DB schema and seed reference data, then start listening.
// A DB failure must not take the whole app down — the promo grid works without
// it; only the Volantini section becomes unavailable.
async function boot() {
  if (hasDb()) {
    try {
      await initSchema();
      const { seedIfEmpty } = await import('./seed/load.js');
      await seedIfEmpty();
    } catch (err) {
      console.error('[boot] inizializzazione database fallita:', err?.message || err);
    }
  }
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT} (model: ${MODEL}, ai: ${HAS_KEY}, db: ${hasDb()})`);
  });
}

boot();
