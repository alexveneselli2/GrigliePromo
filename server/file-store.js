// Storage for the uploaded PDFs.
//
// The file is kept in CHUNKS rather than one BYTEA column. Reproduced on the
// live free-tier database: a single INSERT carrying a 22 MB parameter killed
// the Postgres instance, because it cannot buffer and TOAST a value that size
// in one statement. 256 KB per statement lands the same file without a blip.

import { query } from './db.js';

const CHUNK_BYTE = 256 * 1024;

export async function salvaFile(volantinoId, buffer) {
  await query('DELETE FROM volantino_file_chunk WHERE volantino_id = $1', [volantinoId]);
  let seq = 0;
  for (let off = 0; off < buffer.length; off += CHUNK_BYTE) {
    await query(
      'INSERT INTO volantino_file_chunk (volantino_id, seq, dati) VALUES ($1,$2,$3)',
      [volantinoId, seq++, buffer.subarray(off, Math.min(off + CHUNK_BYTE, buffer.length))]
    );
  }
  return seq;
}

export async function leggiFile(volantinoId) {
  const r = await query(
    'SELECT dati FROM volantino_file_chunk WHERE volantino_id = $1 ORDER BY seq',
    [volantinoId]
  );
  if (r.rows.length === 0) return null;
  return Buffer.concat(r.rows.map((x) => x.dati));
}

export async function eliminaFile(volantinoId) {
  await query('DELETE FROM volantino_file_chunk WHERE volantino_id = $1', [volantinoId]);
  await query('UPDATE volantini SET file_dati = NULL WHERE id = $1', [volantinoId]);
}
