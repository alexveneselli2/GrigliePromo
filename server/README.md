# AI proxy backend

Small Express service that holds the **Anthropic API key** (server-side only) and
turns the grid's candidate payload into AI-generated promo suggestions via
`claude-opus-4-8`. The browser never sees the key.

## Why a backend is required

The frontend is a static SPA (GitHub Pages). A browser cannot safely hold an API
key — anything in the bundle is public. This proxy keeps the key in an env var
and exposes a single JSON endpoint the frontend calls.

## Run locally

```bash
cd server
cp .env.example .env          # then edit .env and paste your key
npm install
npm start                     # http://localhost:8787
```

Then point the frontend at it (from the repo root):

```bash
echo "VITE_AI_PROXY_URL=http://localhost:8787" > .env.local
npm install
npm run dev
```

Open the app, click **AI Plan**, switch the engine toggle to **AI (Claude)**, and
generate. Without `VITE_AI_PROXY_URL` the app silently uses the local heuristic
engine, so the GitHub Pages demo keeps working.

## Endpoint

`POST /api/ai/plan`

```jsonc
// request
{
  "weights": { "sales": 0.22, "margin": 0.18, ... },
  "promos": [
    {
      "promoCode": "2026-13", "canale": "Ipermercati", "tema": "...", "quadrimestre": 3,
      "dataInizio": "2026-10-08", "dataFine": "2026-10-18", "ruolo": "A - RT1",
      "sections": [
        { "key": "tema", "label": "...", "reparti": [
          { "repartoCode": "01", "repartoName": "DROGHERIA", "budgetProd": 27, "budgetCard": 9,
            "candidates": [ { "fc": "...", "fn": "...", "settore": "...", "vendite": 244038,
                             "marginePct": 15.0, "scontriniPct": 7.8, "m": [..4..],
                             "ultimaPromo": null, "nVol": 4 } ] } ] }
      ]
    }
  ]
}
```

```jsonc
// response
{
  "model": "claude-opus-4-8",
  "promos": [
    { "promoCode": "2026-13", "insight": "…", "picks": [
      { "fc": "...", "sectionKey": "tema", "prodCount": 3, "cardCount": 1,
        "score": 88, "confidence": 82, "reason": "…", "warning": "" } ] }
  ]
}
```

The frontend clamps `prodCount`/`cardCount` to the real section budget on apply,
so suggestions can never exceed budget even if the model overshoots.

## Deploy on Render (single service — recommended)

The repo ships a `render.yaml` blueprint that builds the frontend **and** runs
this server, hosting both on the same origin (no CORS, no extra config).

1. Render Dashboard → **New → Blueprint** → select this repo → **Apply**.
   (Render reads `render.yaml`: build = `npm install --include=dev && npm run
   build && npm install --prefix server`, start = `node server/index.js`.)
2. Open the created service → **Environment** → add the secret
   **`ANTHROPIC_API_KEY`** = your key → save (it redeploys).
3. Open the service URL. The whole app loads; **AI Plan → AI (Claude)** works
   on the same domain.

Without the key the app still loads and `/api/ai/plan` returns `503` (the
heuristic engine keeps working). On Render's free plan the service sleeps when
idle, so the first request after a pause takes ~30–50s to wake.

## Deploy split (separate proxy + static frontend elsewhere)

Run this server anywhere, set `ANTHROPIC_API_KEY` and `ALLOWED_ORIGINS`
(include the frontend origin), then build the frontend with
`VITE_AI_PROXY_URL=https://your-proxy` so it calls the proxy cross-origin.
