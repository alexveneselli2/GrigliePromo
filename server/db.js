// Postgres access layer for the volantino (flyer) cataloguing feature.
//
// Render injects DATABASE_URL from the managed database declared in render.yaml.
// When it is absent (local dev without a DB) every export degrades gracefully:
// hasDb() returns false and the API surfaces a clear 503 instead of crashing.

import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || '';

// Render's managed Postgres requires TLS but presents a certificate that isn't
// in Node's default trust store, so verification is relaxed for that host only.
const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: /render\.com|localhost|127\.0\.0\.1/.test(DATABASE_URL) && !/localhost|127\.0\.0\.1/.test(DATABASE_URL)
        ? { rejectUnauthorized: false }
        : false,
      max: 5,
      idleTimeoutMillis: 30000,
    })
  : null;

// A pooled client that dies while idle — exactly what a database restart does —
// makes node-postgres emit 'error' on the Pool. An EventEmitter that emits
// 'error' with no listener terminates the process, so without this handler a
// brief Postgres blip takes the whole web service down with it. Reproduced:
// stopping Postgres with an idle client in the pool killed Node with exit 1.
if (pool) {
  pool.on('error', (err) => {
    console.error('[db] client inattivo caduto (il pool si riprende da solo):', err?.message || err);
  });
}

export function hasDb() {
  return !!pool;
}

// Connection-level failures that are worth retrying: the database is briefly
// unreachable (restart, failover) rather than the query being wrong.
const TRANSITORI = new Set([
  'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'ENOTFOUND', 'ENOENT', 'EHOSTUNREACH',
  '57P01', // admin_shutdown
  '57P03', // cannot_connect_now — server still starting
  '08006', '08001', '08004', // connection failures
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function query(text, params, tentativi = 3) {
  if (!pool) throw new Error('DATABASE_URL non configurato: nessun database disponibile.');
  let ultimo;
  for (let i = 0; i < tentativi; i++) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      ultimo = err;
      if (!TRANSITORI.has(err?.code) || i === tentativi - 1) throw err;
      // Short backoff: a Postgres restart is usually back within seconds.
      await sleep(300 * (i + 1));
      console.warn(`[db] connessione fallita (${err.code}), ritento ${i + 1}/${tentativi - 1}`);
    }
  }
  throw ultimo;
}

// Raw driver errors leak the database's internal address (e.g. "connect
// ECONNREFUSED 10.24.249.13:5432"), which tells the user nothing useful.
export function messaggioErrore(err) {
  if (TRANSITORI.has(err?.code)) {
    return 'Database temporaneamente non raggiungibile. Riprova tra qualche istante.';
  }
  return err?.message || 'Errore interno.';
}

// Actually talks to the database, unlike hasDb() which only says whether a
// URL is configured. Used by /health so "db: true" means something.
export async function pingDb() {
  if (!pool) return { ok: false, motivo: 'DATABASE_URL non configurato' };
  const t0 = Date.now();
  try {
    const r = await query(
      `SELECT pg_database_size(current_database()) AS byte,
              (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) AS connessioni`,
      [], 1 // no retry: health must report the state now, not after backoff
    );
    return {
      ok: true,
      ms: Date.now() - t0,
      dimensioneMb: Math.round(Number(r.rows[0].byte) / 1024 / 1024),
      connessioni: Number(r.rows[0].connessioni),
    };
  } catch (err) {
    return { ok: false, motivo: err?.code || err?.message, ms: Date.now() - t0 };
  }
}

export async function withTransaction(fn) {
  if (!pool) throw new Error('DATABASE_URL non configurato: nessun database disponibile.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
// Created on boot if missing. Kept deliberately simple (no migration tool):
// every statement is IF NOT EXISTS so repeated boots are a no-op.

const SCHEMA = `
-- One row per uploaded flyer.
CREATE TABLE IF NOT EXISTS volantini (
  id              SERIAL PRIMARY KEY,
  nome            TEXT        NOT NULL,
  canali          TEXT[]      NOT NULL DEFAULT '{}',
  mese            SMALLINT    NOT NULL CHECK (mese BETWEEN 1 AND 12),
  anno            SMALLINT    NOT NULL,
  progressivo     INTEGER     NOT NULL,
  nota            TEXT        DEFAULT '',
  file_nome       TEXT,
  file_bytes      INTEGER,
  pagine          INTEGER     DEFAULT 0,
  stato           TEXT        NOT NULL DEFAULT 'in_analisi',
  errore          TEXT,
  modello         TEXT,
  creato_il       TIMESTAMPTZ NOT NULL DEFAULT now(),
  completato_il   TIMESTAMPTZ
);

-- Supplier-managed zones (different artwork), detected per page.
CREATE TABLE IF NOT EXISTS volantino_zone (
  id              SERIAL PRIMARY KEY,
  volantino_id    INTEGER     NOT NULL REFERENCES volantini(id) ON DELETE CASCADE,
  pagina          INTEGER     NOT NULL,
  fornitore       TEXT,
  descrizione     TEXT,
  reparto         TEXT,
  famiglia        TEXT,
  n_articoli      INTEGER     NOT NULL DEFAULT 0
);

-- One row per article found in the flyer.
CREATE TABLE IF NOT EXISTS volantino_articoli (
  id              SERIAL PRIMARY KEY,
  volantino_id    INTEGER     NOT NULL REFERENCES volantini(id) ON DELETE CASCADE,
  pagina          INTEGER     NOT NULL,
  descrizione     TEXT        NOT NULL,
  marca           TEXT,
  prezzo          NUMERIC(10,2),
  -- classification
  reparto         TEXT,
  gruppo          TEXT,
  settore         TEXT,
  famiglia        TEXT,
  cod_famiglia    TEXT,
  -- how the classification was obtained: 'catalogo' | 'ai' | 'manuale'
  origine         TEXT        NOT NULL DEFAULT 'ai',
  confidenza      SMALLINT,
  da_rivedere     BOOLEAN     NOT NULL DEFAULT false,
  -- layout flags
  in_evidenza     BOOLEAN     NOT NULL DEFAULT false,
  zona_id         INTEGER     REFERENCES volantino_zone(id) ON DELETE SET NULL,
  creato_il       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_art_volantino ON volantino_articoli(volantino_id);
CREATE INDEX IF NOT EXISTS idx_art_rivedere  ON volantino_articoli(volantino_id) WHERE da_rivedere;
CREATE INDEX IF NOT EXISTS idx_zone_volantino ON volantino_zone(volantino_id);

-- Reference data: the ECR tree (4 levels) used to validate classifications.
-- cod_famiglia is NOT unique: the same 8-digit code recurs with different units
-- of measure (6082 rows / 2368 distinct codes), so the key is a surrogate.
CREATE TABLE IF NOT EXISTS ecr_albero (
  id              SERIAL PRIMARY KEY,
  cod_famiglia    TEXT NOT NULL,
  reparto         TEXT NOT NULL,
  cod_reparto     TEXT,
  gruppo          TEXT,
  cod_gruppo      TEXT,
  sottogruppo     TEXT,
  cod_sottogruppo TEXT,
  famiglia        TEXT,
  cod_famiglia_liv4 TEXT,
  udm             TEXT
);

-- Reference data: the product catalogue used to match flyer descriptions.
CREATE TABLE IF NOT EXISTS catalogo_prodotti (
  cod_prodotto      TEXT,
  descrizione       TEXT NOT NULL,
  descrizione_norm  TEXT NOT NULL,
  reparto           TEXT,
  gruppo            TEXT,
  settore           TEXT,
  famiglia          TEXT
);

-- Analysis progress, so a run that takes minutes can report where it is.
-- Added after the table shipped, hence ALTER rather than inline columns.
ALTER TABLE volantini ADD COLUMN IF NOT EXISTS fase TEXT;
ALTER TABLE volantini ADD COLUMN IF NOT EXISTS progresso_fatto INTEGER NOT NULL DEFAULT 0;
ALTER TABLE volantini ADD COLUMN IF NOT EXISTS progresso_totale INTEGER NOT NULL DEFAULT 0;
ALTER TABLE volantini ADD COLUMN IF NOT EXISTS aggiornato_il TIMESTAMPTZ;

-- The uploaded PDF, kept so an analysis can be re-run without re-uploading.
-- NEVER select this with *: it is tens of MB per flyer. Use COLONNE_VOLANTINO
-- in routes-volantini.js, which lists every column except this one.
ALTER TABLE volantini ADD COLUMN IF NOT EXISTS file_dati BYTEA;

CREATE INDEX IF NOT EXISTS idx_cat_norm ON catalogo_prodotti(descrizione_norm);
CREATE INDEX IF NOT EXISTS idx_albero_cod ON ecr_albero(cod_famiglia);
CREATE INDEX IF NOT EXISTS idx_albero_rep ON ecr_albero(reparto);
`;

// pg_trgm powers fuzzy matching of flyer descriptions against the catalogue.
// It needs a superuser-ish role; Render's default DB user can create it, but we
// tolerate failure so the app still boots (exact matching keeps working).
const TRIGRAM = `
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_cat_trgm ON catalogo_prodotti USING gin (descrizione_norm gin_trgm_ops);
`;

let trigramReady = false;
export function hasTrigram() {
  return trigramReady;
}

export async function initSchema() {
  if (!pool) {
    console.warn('[db] DATABASE_URL non impostato — la sezione Volantini sarà disabilitata.');
    return false;
  }
  await pool.query(SCHEMA);
  try {
    await pool.query(TRIGRAM);
    trigramReady = true;
  } catch (err) {
    console.warn('[db] pg_trgm non disponibile, matching fuzzy disattivato:', err?.message || err);
  }
  console.log('[db] schema pronto' + (trigramReady ? ' (con pg_trgm)' : ''));
  return true;
}
