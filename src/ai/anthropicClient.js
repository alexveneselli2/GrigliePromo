// Thin client for the AI proxy backend (see /server).
//
// The Anthropic API key lives only on the proxy, never in this bundle.
//
// Two deployment shapes are supported:
//  1. Single service (Render): frontend + API on the same origin. Built with
//     VITE_AI_SAME_ORIGIN=1 → calls a relative "/api/ai/plan".
//  2. Split (GitHub Pages + separate proxy): set VITE_AI_PROXY_URL to the
//     proxy's absolute URL.
// If neither is set, the app uses the local heuristic engine.

const BASE = (import.meta.env.VITE_AI_PROXY_URL || '').replace(/\/$/, '');
const SAME_ORIGIN = import.meta.env.VITE_AI_SAME_ORIGIN === '1';

export function isAIConfigured() {
  return BASE.length > 0 || SAME_ORIGIN;
}

export function aiProxyUrl() {
  return BASE || (SAME_ORIGIN ? '(stesso dominio)' : '');
}

function endpoint() {
  return BASE ? `${BASE}/api/ai/plan` : '/api/ai/plan';
}

export async function requestAIPlan(payload, { signal } = {}) {
  if (!isAIConfigured()) throw new Error('AI proxy non configurato.');
  const res = await fetch(endpoint(), {
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
