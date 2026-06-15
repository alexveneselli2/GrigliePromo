// AI proxy backend for Dimar Griglie Promozionali.
//
// Holds the Anthropic API key (server-side only, from env) and exposes a single
// endpoint that turns a compact "candidate" payload into budget-aware
// promotional-grid suggestions, produced by Claude.
//
// The frontend never sees the key. The browser calls POST /api/ai/plan; this
// server calls the Anthropic Messages API with structured outputs and returns
// JSON the UI can render.

import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

const PORT = process.env.PORT || 8787;
const MODEL = process.env.AI_MODEL || 'claude-opus-4-8';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('\n[FATAL] ANTHROPIC_API_KEY is not set. Copy server/.env.example to server/.env and add your key.\n');
  process.exit(1);
}

// Reads ANTHROPIC_API_KEY from the environment.
const client = new Anthropic();

const app = express();
app.use(express.json({ limit: '4mb' }));
app.use(
  cors({
    origin(origin, cb) {
      // Allow same-origin / curl (no Origin header) and any whitelisted origin.
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`Origin ${origin} not allowed by CORS`));
    },
  })
);

app.get('/health', (_req, res) => res.json({ ok: true, model: MODEL }));

// ---- Structured-output schema returned by Claude (per promo) ----
const PickSchema = z.object({
  fc: z.string().describe('Family code (IV-level ECR) chosen, taken from the candidates list'),
  sectionKey: z.string().describe('Section key: tema | sotto | s1 | s2 | s3 | s4'),
  prodCount: z.number().int().describe('Number of PROD (volantino) slots to assign, 0 or more, within the budget'),
  cardCount: z.number().int().describe('Number of CARD slots, must be <= prodCount and within the card budget'),
  score: z.number().int().describe('Suitability score 0-100'),
  confidence: z.number().int().describe('Confidence 0-100'),
  reason: z.string().describe('One concise sentence in Italian explaining why this family fits this section'),
  warning: z.string().describe('Short Italian caveat if any (e.g. already in a recent flyer), or empty string'),
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
- Spiega ogni scelta con una frase concreta e specifica (cita il KPI o l'affinita' tematica reale).

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
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: SYSTEM_PROMPT,
    output_format: betaZodOutputFormat(PromoResultSchema),
    messages: [{ role: 'user', content: buildUserPrompt(promo, weights) }],
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error(`Model returned no parseable output for promo ${promo.promoCode} (stop_reason=${response.stop_reason})`);
  }
  return parsed;
}

app.post('/api/ai/plan', async (req, res) => {
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

app.listen(PORT, () => {
  console.log(`AI proxy listening on http://localhost:${PORT} (model: ${MODEL})`);
  console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});
