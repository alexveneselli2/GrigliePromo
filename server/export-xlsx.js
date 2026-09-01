// Excel export for the volantini lists.
//
// Generated server-side so an export always covers the full dataset, not just
// the rows the browser happened to have loaded, and so the frontend bundle
// doesn't have to carry a spreadsheet writer.

import ExcelJS from 'exceljs';
import { query } from './db.js';

const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

// Each export is described once: the query that feeds it, the column layout
// and the sheet name.
const ESPORTAZIONI = {
  famiglie: {
    foglio: 'Per reparto e famiglia',
    file: 'reparti-famiglie',
    colonne: [
      { header: 'Reparto', key: 'reparto', width: 32 },
      { header: 'Famiglia ECR', key: 'famiglia', width: 46 },
      { header: 'Articoli', key: 'articoli', numero: true, width: 10 },
      { header: 'In evidenza', key: 'in_evidenza', numero: true, width: 12 },
      { header: 'In zona fornitore', key: 'in_zona_fornitore', numero: true, width: 16 },
      { header: 'Zone fornitore', key: 'zone_fornitore', numero: true, width: 14 },
      { header: 'Da rivedere', key: 'da_rivedere', numero: true, width: 12 },
    ],
    sql: `SELECT reparto, famiglia,
                 COUNT(*)                                    AS articoli,
                 COUNT(*) FILTER (WHERE in_evidenza)         AS in_evidenza,
                 COUNT(*) FILTER (WHERE zona_id IS NOT NULL) AS in_zona_fornitore,
                 COUNT(DISTINCT zona_id) FILTER (WHERE zona_id IS NOT NULL) AS zone_fornitore,
                 COUNT(*) FILTER (WHERE da_rivedere)         AS da_rivedere
            FROM volantino_articoli
           WHERE volantino_id = $1
           GROUP BY reparto, famiglia
           ORDER BY reparto NULLS LAST, articoli DESC`,
  },

  evidenza: {
    foglio: 'Articoli in evidenza',
    file: 'articoli-in-evidenza',
    colonne: [
      { header: 'Pagina', key: 'pagina', numero: true, width: 8 },
      { header: 'Tipo', key: 'tipo_evidenza', width: 10 },
      { header: 'Descrizione', key: 'descrizione', width: 56 },
      { header: 'Marca', key: 'marca', width: 20 },
      { header: 'Prezzo', key: 'prezzo', numero: true, width: 10 },
      { header: 'Reparto', key: 'reparto', width: 30 },
      { header: 'Famiglia ECR', key: 'famiglia', width: 46 },
      { header: 'Zona fornitore', key: 'zona_fornitore', width: 26 },
    ],
    sql: `SELECT a.pagina, a.tipo_evidenza, a.descrizione, a.marca, a.prezzo, a.reparto, a.famiglia,
                 z.fornitore AS zona_fornitore
            FROM volantino_articoli a
            LEFT JOIN volantino_zone z ON z.id = a.zona_id
           WHERE a.volantino_id = $1 AND a.tipo_evidenza IS NOT NULL
           ORDER BY a.reparto NULLS LAST, a.famiglia NULLS LAST, a.pagina`,
  },

  zone: {
    foglio: 'Zone fornitore',
    file: 'zone-fornitore',
    colonne: [
      { header: 'Pagina', key: 'pagina', numero: true, width: 8 },
      { header: 'Fornitore', key: 'fornitore', width: 30 },
      { header: 'Come si distingue', key: 'descrizione', width: 70 },
      { header: 'Articoli', key: 'articoli', numero: true, width: 10 },
    ],
    sql: `SELECT z.pagina, z.fornitore, z.descrizione,
                 COUNT(a.id) AS articoli
            FROM volantino_zone z
            LEFT JOIN volantino_articoli a ON a.zona_id = z.id
           WHERE z.volantino_id = $1
           GROUP BY z.id
           ORDER BY z.pagina`,
  },

  rivedere: {
    foglio: 'Da rivedere',
    file: 'da-rivedere',
    colonne: [
      { header: 'Pagina', key: 'pagina', numero: true, width: 8 },
      { header: 'Descrizione', key: 'descrizione', width: 56 },
      { header: 'Reparto proposto', key: 'reparto', width: 30 },
      { header: 'Famiglia proposta', key: 'famiglia', width: 46 },
      { header: 'Origine', key: 'origine', width: 12 },
      { header: 'Confidenza', key: 'confidenza', numero: true, width: 12 },
    ],
    sql: `SELECT pagina, descrizione, reparto, famiglia, origine, confidenza
            FROM volantino_articoli
           WHERE volantino_id = $1 AND da_rivedere
           ORDER BY confidenza ASC NULLS FIRST, pagina`,
  },

  articoli: {
    foglio: 'Tutti gli articoli',
    file: 'articoli',
    colonne: [
      { header: 'Pagina', key: 'pagina', numero: true, width: 8 },
      { header: 'Descrizione', key: 'descrizione', width: 56 },
      { header: 'Marca', key: 'marca', width: 20 },
      { header: 'Prezzo', key: 'prezzo', numero: true, width: 10 },
      { header: 'Reparto', key: 'reparto', width: 30 },
      { header: 'Famiglia ECR', key: 'famiglia', width: 46 },
      { header: 'Tipo evidenza', key: 'tipo_evidenza', width: 14 },
      { header: 'Fidelity', key: 'fidelity', width: 10 },
      { header: 'Zona fornitore', key: 'zona_fornitore', width: 26 },
      { header: 'Origine', key: 'origine', width: 12 },
      { header: 'Confidenza', key: 'confidenza', numero: true, width: 12 },
      { header: 'Da rivedere', key: 'da_rivedere', numero: true, width: 12 },
    ],
    sql: `SELECT a.pagina, a.descrizione, a.marca, a.prezzo, a.reparto, a.famiglia,
                 a.tipo_evidenza, a.fidelity, z.fornitore AS zona_fornitore,
                 a.origine, a.confidenza, a.da_rivedere
            FROM volantino_articoli a
            LEFT JOIN volantino_zone z ON z.id = a.zona_id
           WHERE a.volantino_id = $1
           ORDER BY a.pagina, a.id`,
  },

  fidelity: {
    foglio: 'Articoli Fidelity',
    file: 'articoli-fidelity',
    colonne: [
      { header: 'Pagina', key: 'pagina', numero: true, width: 8 },
      { header: 'Descrizione', key: 'descrizione', width: 56 },
      { header: 'Marca', key: 'marca', width: 20 },
      { header: 'Prezzo', key: 'prezzo', numero: true, width: 10 },
      { header: 'Reparto', key: 'reparto', width: 30 },
      { header: 'Famiglia ECR', key: 'famiglia', width: 46 },
      { header: 'Tipo evidenza', key: 'tipo_evidenza', width: 14 },
    ],
    sql: `SELECT pagina, descrizione, marca, prezzo, reparto, famiglia, tipo_evidenza
            FROM volantino_articoli
           WHERE volantino_id = $1 AND fidelity
           ORDER BY pagina, id`,
  },

  pagine: {
    foglio: 'Per pagina',
    file: 'per-pagina',
    colonne: [
      { header: 'Pagina', key: 'pagina', numero: true, width: 8 },
      { header: 'Articoli', key: 'articoli', numero: true, width: 10 },
      { header: 'Cover', key: 'cover', numero: true, width: 8 },
      { header: 'Faro', key: 'faro', numero: true, width: 8 },
      { header: 'Doppio', key: 'doppio', numero: true, width: 8 },
      { header: 'Fidelity', key: 'fidelity', numero: true, width: 10 },
      { header: 'Zone fornitore', key: 'zone_fornitore', numero: true, width: 14 },
      { header: 'Articoli in zona', key: 'in_zona_fornitore', numero: true, width: 16 },
      { header: 'Da rivedere', key: 'da_rivedere', numero: true, width: 12 },
    ],
    sql: `SELECT p.pagina,
                 COUNT(a.id)                                       AS articoli,
                 COUNT(*) FILTER (WHERE a.tipo_evidenza = 'cover')  AS cover,
                 COUNT(*) FILTER (WHERE a.tipo_evidenza = 'faro')   AS faro,
                 COUNT(*) FILTER (WHERE a.tipo_evidenza = 'doppio') AS doppio,
                 COUNT(*) FILTER (WHERE a.fidelity)                AS fidelity,
                 COUNT(*) FILTER (WHERE a.zona_id IS NOT NULL)     AS in_zona_fornitore,
                 COUNT(*) FILTER (WHERE a.da_rivedere)             AS da_rivedere,
                 (SELECT COUNT(*) FROM volantino_zone z
                   WHERE z.volantino_id = $1 AND z.pagina = p.pagina) AS zone_fornitore
            FROM (SELECT DISTINCT pagina FROM volantino_articoli WHERE volantino_id = $1
                  UNION SELECT DISTINCT pagina FROM volantino_zone WHERE volantino_id = $1) p
            LEFT JOIN volantino_articoli a ON a.volantino_id = $1 AND a.pagina = p.pagina
           GROUP BY p.pagina
           ORDER BY p.pagina`,
  },
};

export const TIPI_EXPORT = Object.keys(ESPORTAZIONI);

function intestazione(ws) {
  const row = ws.getRow(1);
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE1261C' } };
  row.alignment = { vertical: 'middle' };
  row.height = 20;
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

// Two fixes on the way into a cell:
//  - booleans read better as Sì/No than TRUE/FALSE;
//  - node-postgres returns COUNT (int8) and NUMERIC as STRINGS, which Excel
//    would store as text: not summable, not sortable. Columns declared
//    `numero: true` are coerced back to real numbers. Only declared columns
//    are touched, so a description that happens to look numeric stays text.
function normalizzaRiga(r, colonne) {
  const numeriche = new Set(colonne.filter((c) => c.numero).map((c) => c.key));
  const out = {};
  for (const [k, v] of Object.entries(r)) {
    if (typeof v === 'boolean') { out[k] = v ? 'Sì' : 'No'; continue; }
    if (numeriche.has(k) && v !== null && v !== undefined && v !== '') {
      const n = Number(v);
      out[k] = Number.isFinite(n) ? n : v;
      continue;
    }
    out[k] = v;
  }
  return out;
}

/** One list of one flyer. Returns { buffer, filename }. */
export async function esportaLista(volantinoId, tipo) {
  const spec = ESPORTAZIONI[tipo];
  if (!spec) throw new Error(`Tipo di export non valido: ${tipo}`);

  const testata = await query(
    'SELECT nome, mese, anno, progressivo FROM volantini WHERE id = $1',
    [volantinoId]
  );
  if (testata.rows.length === 0) return null;
  const v = testata.rows[0];

  const dati = await query(spec.sql, [volantinoId]);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Dimar — Catalogazione volantini';
  wb.created = new Date();
  const ws = wb.addWorksheet(spec.foglio);
  ws.columns = spec.colonne;
  intestazione(ws);
  for (const r of dati.rows) ws.addRow(normalizzaRiga(r, spec.colonne));
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: spec.colonne.length } };

  const slug = `${v.nome}-${MESI[v.mese - 1]}-${v.anno}-n${v.progressivo}`
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    buffer: await wb.xlsx.writeBuffer(),
    filename: `${slug}-${spec.file}.xlsx`,
  };
}

/** The list of uploaded flyers. */
export async function esportaVolantini() {
  const r = await query(
    `SELECT v.nome, v.canali, v.mese, v.anno, v.progressivo, v.nota,
            v.pagine, v.stato, v.file_nome, v.modello, v.creato_il,
            (SELECT COUNT(*) FROM volantino_articoli a WHERE a.volantino_id = v.id) AS articoli,
            (SELECT COUNT(*) FROM volantino_articoli a WHERE a.volantino_id = v.id AND a.in_evidenza) AS in_evidenza,
            (SELECT COUNT(*) FROM volantino_zone z WHERE z.volantino_id = v.id) AS zone_fornitore,
            (SELECT COUNT(*) FROM volantino_articoli a WHERE a.volantino_id = v.id AND a.da_rivedere) AS da_rivedere
       FROM volantini v
      ORDER BY v.anno DESC, v.mese DESC, v.progressivo DESC`
  );

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Dimar — Catalogazione volantini';
  wb.created = new Date();
  const ws = wb.addWorksheet('Volantini');
  ws.columns = [
    { header: 'Nome', key: 'nome', width: 34 },
    { header: 'Canali', key: 'canali', width: 34 },
    { header: 'Mese', key: 'mese', width: 12 },
    { header: 'Anno', key: 'anno', numero: true, width: 8 },
    { header: 'Progressivo', key: 'progressivo', numero: true, width: 12 },
    { header: 'Pagine', key: 'pagine', numero: true, width: 8 },
    { header: 'Articoli', key: 'articoli', numero: true, width: 10 },
    { header: 'In evidenza', key: 'in_evidenza', numero: true, width: 12 },
    { header: 'Zone fornitore', key: 'zone_fornitore', numero: true, width: 14 },
    { header: 'Da rivedere', key: 'da_rivedere', numero: true, width: 12 },
    { header: 'Stato', key: 'stato', width: 12 },
    { header: 'File', key: 'file_nome', width: 34 },
    { header: 'Modello', key: 'modello', width: 18 },
    { header: 'Caricato il', key: 'creato_il', width: 20 },
    { header: 'Nota', key: 'nota', width: 50 },
  ];
  intestazione(ws);
  for (const row of r.rows) {
    ws.addRow(normalizzaRiga({
      ...row,
      canali: (row.canali || []).join(', '),
      mese: MESI[row.mese - 1] || row.mese,
      creato_il: row.creato_il ? new Date(row.creato_il).toLocaleString('it-IT') : '',
    }, ws.columns));
  }
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 15 } };

  return {
    buffer: await wb.xlsx.writeBuffer(),
    filename: `volantini-${new Date().toISOString().slice(0, 10)}.xlsx`,
  };
}
