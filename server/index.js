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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8787;
const MODEL = process.env.AI_MODEL || 'claude-opus-4-8';
// Extra cross-origin browsers allowed to call the proxy (besides same-origin,
// which is always allowed). Same-origin works automatically — no config needed.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
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

app.get('/health', (_req, res) => res.json({ ok: true, model: MODEL, ai: HAS_KEY }));

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
- Per ogni (sezione × reparto) ti viene dato un budget di spazi PROD e CARD. La somma dei prodCount che assegni in quella sezione/reparto NON deve superare budgetProd. La somma dei cardCount non deve superare budgetCard. cardCount di una famiglia non puo' superare il suo prodCount.
- Scegli SOLO famiglie presenti nella lista candidates fornita.
- Concentra piu' spazi (prodCount 2-4) sulle famiglie piu' forti per quella sezione; assegna 1 spazio a quelle marginali; lascia fuori quelle deboli.
- Usa i KPI forniti: vendite nette, margine %, penetrazione scontrini, andamento mensile (m1-m4 vs periodo della promo = stagionalita'), e l'affinita' tra il nome famiglia e il tema/speciale della sezione.
- Penalizza le famiglie gia' a volantino di recente (campo ultimaPromo valorizzato, nVol alto) per garantire rotazione tra le promo del quadrimestre.
- Spiega ogni scelta con 1-3 motivazioni concrete e specifiche (cita il KPI o l'affinita' tematica reale, non frasi generiche).
- Per ogni scelta stima l'impatto atteso (ricavo incrementale in migliaia di euro, probabilita' uso carta fedelta', engagement) coerente con i KPI forniti: famiglie con vendite/scontrini alti e forte affinita' col tema avranno impatto maggiore.

Rispondi esclusivamente nel formato strutturato richiesto.`;

function buildUserPrompt(promo, weights) {
  return [
    `CANALE: ${promo.canale ?? ''}`,
    `PROMO ${promo.promoCode} — Q${promo.quadrimestre ?? '?'} — ${promo.dataInizio ?? ''} → ${promo.dataFine ?? ''}`,
    `Tema: ${promo.tema ?? ''} | Ruolo: ${promo.ruolo ?? ''}`,
    weights ? `Priorita' richieste (pesi 0-1): ${JSON.stringify(weights)}` : '',
    '',
    'Sezioni e candidati (con budget e KPI):',
    JSON.stringify(promo.sections, null, 1),
    '',
    'Per ogni sezione/reparto seleziona le famiglie e assegna prodCount/cardCount rispettando i budget. Restituisci anche una frase di insight sulla strategia complessiva della promo.',
  ]
    .filter(Boolean)
    .join('\n');
}

async function planForPromo(promo, weights) {
  // The per-promo structured JSON can be large (many picks, each with reason/
  // warning text), so we give it plenty of headroom. Above ~16k max_tokens the
  // SDK requires streaming to avoid HTTP timeouts — so we stream and read the
  // final message, then validate it against the Zod schema.
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    system: SYSTEM_PROMPT,
    output_format: betaZodOutputFormat(PromoResultSchema),
    messages: [{ role: 'user', content: buildUserPrompt(promo, weights) }],
  });

  const response = await stream.finalMessage();

  if (response.stop_reason === 'max_tokens') {
    throw new Error(`Output troncato per promo ${promo.promoCode} — max_tokens raggiunto`);
  }

  // With output_format set, the SDK exposes the validated result on the final
  // message; fall back to parsing the text content if needed.
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
  try {
    const out = [];
    // Sequential per-promo calls keep each request (and its output) bounded.
    for (const promo of promos) {
      const result = await planForPromo(promo, weights);
      out.push({ promoCode: promo.promoCode, ...result });
    }
    res.json({ model: MODEL, promos: out });
  } catch (err) {
    console.error('[ai/plan] error:', err?.message || err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    res.status(status).json({ error: err?.message || 'AI request failed' });
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

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT} (model: ${MODEL}, ai: ${HAS_KEY})`);
});
