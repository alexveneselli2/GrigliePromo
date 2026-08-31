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

export function hasDb() {
  return !!pool;
}

export async function query(text, params) {
  if (!pool) throw new Error('DATABASE_URL non configurato: nessun database disponibile.');
  return pool.query(text, params);
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
