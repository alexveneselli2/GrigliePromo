// Thin client for the AI proxy backend (see /server).
//
// The Anthropic API key lives only on the proxy, never in this bundle. When
// VITE_AI_PROXY_URL is not set, the app falls back to the local heuristic
// engine so the static GitHub Pages demo keeps working.

const BASE = (import.meta.env.VITE_AI_PROXY_URL || '').replace(/\/$/, '');

export function isAIConfigured() {
  return BASE.length > 0;
}

export function aiProxyUrl() {
  return BASE;
}

export async function requestAIPlan(payload, { signal } = {}) {
  if (!BASE) throw new Error('AI proxy non configurato (VITE_AI_PROXY_URL mancante).');
  const res = await fetch(`${BASE}/api/ai/plan`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok) {
    let detail = '';
    try {
      const j = await res.json();
      detail = j?.error ? ` — ${j.error}` : '';
    } catch {
      /* ignore */
    }
    throw new Error(`Errore proxy AI (${res.status})${detail}`);
  }
  return res.json();
}
