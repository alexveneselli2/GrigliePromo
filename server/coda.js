// Serial analysis queue.
//
// A bulk import can drop a dozen flyers in at once, but they must be analysed
// ONE AT A TIME: each run fans out several concurrent vision requests and holds
// a 20 MB PDF in memory, so running two in parallel would multiply both the API
// load and the peak memory of a small instance.
//
// The queue holds only ids — the PDF is read back from the database when the
// flyer's turn comes, so a long queue costs nothing in memory.

import { query } from './db.js';
import { leggiFile } from './file-store.js';
import { analizzaVolantino } from './volantini.js';

// Give up after this many attempts. Without it, a flyer that reliably crashes
// the process would be re-queued on every boot and the service would never
// stay up long enough to be usable.
const MAX_TENTATIVI = 3;

const coda = [];
let inCorso = null;
let attivo = false;

export function statoCoda() {
  return { inCorso, inAttesa: coda.length, prossimi: coda.slice(0, 10) };
}

export async function accoda(volantinoId) {
  if (inCorso === volantinoId || coda.includes(volantinoId)) return statoCoda();
  coda.push(volantinoId);
  await query(
    `UPDATE volantini SET stato = 'in_coda', errore = NULL, fase = NULL,
            progresso_fatto = 0, progresso_totale = 0
      WHERE id = $1`,
    [volantinoId]
  );
  avvia();
  return statoCoda();
}

function avvia() {
  if (attivo) return;
  attivo = true;
  lavora().catch((err) => console.error('[coda] errore inatteso:', err?.message || err));
}

async function lavora() {
  while (coda.length > 0) {
    const id = coda.shift();
    inCorso = id;
    try {
      const tent = await query(
        `UPDATE volantini SET tentativi = tentativi + 1, stato = 'in_analisi'
          WHERE id = $1 RETURNING tentativi`,
        [id]
      );
      if (tent.rows.length === 0) { inCorso = null; continue; } // cancellato nel frattempo

      if (tent.rows[0].tentativi > MAX_TENTATIVI) {
        await fallisci(id, `Analisi non riuscita dopo ${MAX_TENTATIVI} tentativi.`);
        continue;
      }

      const pdf = await leggiFile(id);
      if (!pdf) {
        await fallisci(id, 'Il PDF non è più disponibile: ricarica il volantino.');
        continue;
      }

      const out = await analizzaVolantino(id, pdf);
      console.log(`[coda] #${id} completato: ${out.pagine} pagine, ${out.articoli} articoli`);
    } catch (err) {
      console.error(`[coda] #${id} errore:`, err?.message || err);
      await fallisci(id, String(err?.message || err).slice(0, 500));
    } finally {
      inCorso = null;
    }
  }
  attivo = false;
}

async function fallisci(id, messaggio) {
  try {
    await query(`UPDATE volantini SET stato = 'errore', errore = $1 WHERE id = $2`, [messaggio, id]);
  } catch { /* best effort */ }
}

/**
 * On boot, anything left mid-flight belongs to a process that no longer exists.
 * With the PDF stored we can simply resume it instead of failing it — unless it
 * has already burned its attempts, which is what stops a crash loop.
 */
export async function riprendiInterrotti() {
  const r = await query(
    `SELECT v.id, v.tentativi,
            EXISTS (SELECT 1 FROM volantino_file_chunk c WHERE c.volantino_id = v.id) AS ha_file
       FROM volantini v
      WHERE v.stato IN ('in_analisi', 'in_coda')
      ORDER BY v.id`
  );
  let ripresi = 0, falliti = 0;
  for (const v of r.rows) {
    if (v.ha_file && v.tentativi < MAX_TENTATIVI) {
      await accoda(v.id);
      ripresi++;
    } else {
      await fallisci(v.id, v.ha_file
        ? `Analisi non riuscita dopo ${MAX_TENTATIVI} tentativi.`
        : 'Analisi interrotta dal riavvio del server e PDF non disponibile: ricarica il volantino.');
      falliti++;
    }
  }
  if (ripresi || falliti) {
    console.warn(`[coda] interrotte dal riavvio: ${ripresi} riprese, ${falliti} marcate come errore`);
  }
  return { ripresi, falliti };
}
