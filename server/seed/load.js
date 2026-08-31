// Loads the reference data (ECR tree + product catalogue) into Postgres.
//
// Runs on boot and is a no-op once the tables are populated, so a redeploy
// doesn't re-import 314k rows. The CSVs are committed gzipped (41 MB -> 4.9 MB);
// they are streamed straight into COPY without ever being fully buffered.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import copyFrom from 'pg-copy-streams';
import { query } from '../db.js';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));

async function countRows(table) {
  const r = await query(`SELECT COUNT(*)::int AS n FROM ${table}`);
  return r.rows[0].n;
}

async function copyGzCsv(client, file, table, columns) {
  const full = path.join(here, file);
  if (!fs.existsSync(full)) {
    console.warn(`[seed] file mancante, salto: ${file}`);
    return 0;
  }
  const sql = `COPY ${table} (${columns.join(',')}) FROM STDIN WITH (FORMAT csv, HEADER true)`;
  const dest = client.query(copyFrom.from(sql));
  await pipeline(fs.createReadStream(full), zlib.createGunzip(), dest);
  return countRows(table);
}

export async function seedIfEmpty() {
  const { Pool } = pg;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: /render\.com/.test(process.env.DATABASE_URL || '') ? { rejectUnauthorized: false } : false,
    max: 1,
  });
  const client = await pool.connect();
  try {
    const nAlbero = await countRows('ecr_albero');
    const nCatalogo = await countRows('catalogo_prodotti');

    if (nAlbero === 0) {
      console.log('[seed] importo albero ECR…');
      const n = await copyGzCsv(client, 'ecr_albero.csv.gz', 'ecr_albero', [
        'cod_famiglia', 'reparto', 'cod_reparto', 'gruppo', 'cod_gruppo',
        'sottogruppo', 'cod_sottogruppo', 'famiglia', 'cod_famiglia_liv4', 'udm',
      ]);
      console.log(`[seed] albero ECR: ${n} righe`);
    }

    if (nCatalogo === 0) {
      console.log('[seed] importo catalogo prodotti (può richiedere qualche minuto)…');
      const n = await copyGzCsv(client, 'catalogo_prodotti.csv.gz', 'catalogo_prodotti', [
        'cod_prodotto', 'descrizione', 'reparto', 'gruppo', 'settore', 'famiglia', 'descrizione_norm',
      ]);
      console.log(`[seed] catalogo prodotti: ${n} righe`);
    }

    if (nAlbero > 0 && nCatalogo > 0) {
      console.log(`[seed] dati di riferimento già presenti (albero ${nAlbero}, catalogo ${nCatalogo})`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}
