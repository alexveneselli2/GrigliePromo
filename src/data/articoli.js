// Article-level catalogue for the Buyer panel (step 2 of the workflow).
//
// The promo grid works at FAMILY level: it decides how many PROD/CARD slots a
// family gets in each section. The buyer then has to fill every one of those
// slots with a specific ARTICLE (EAN). This file provides the mockup catalogue
// plus the slot plan for one sottogruppo.
//
// ⚠️ LIVE-DATA SEAM: articles are mock data modelled on the Italian GDO tissue
// market (real brands, plausible EANs/prices). To go live, replace ARTICOLI
// with a feed returning the same shape; nothing in the UI needs to change.

// ---------------------------------------------------------------------------
// The sottogruppo being worked on, and its famiglie (the "sottofamiglie")
// ---------------------------------------------------------------------------

export const SOTTOGRUPPO = {
  code: '060105',
  name: 'Carta Igienica',
  gruppo: 'Igienico Sanitari',
  reparto: 'CURA PERSONA',
  repartoCode: '06',
};

export const FAMIGLIE = [
  {
    fc: '06010501',
    fn: 'Carta Igienica Normale',
    vendite: 88342.73,
    marginePct: 44.7,
    scontriniPct: 6.5,
    nVol: 4,
    ultimaPromo: null,
  },
  {
    fc: '06010502',
    fn: 'Carta Igienica Rotoloni',
    vendite: 61508.20,
    marginePct: 41.2,
    scontriniPct: 4.1,
    nVol: 3,
    ultimaPromo: '2026-08',
  },
];

// ---------------------------------------------------------------------------
// Slot plan — how many PROD / CARD slots each famiglia got in each section.
// (Mirrors what the promo grid produced; hypothetical numbers for the mockup.)
// ---------------------------------------------------------------------------

export const SECTIONS = [
  { key: 'tema', label: 'Tema', short: 'Tema', color: 'red', tema: 'Tutto a 0,98 — convenienza' },
  { key: 'sotto', label: 'Sottotema', short: 'Sottotema', color: 'orange', tema: 'Taglio prezzo carta fedeltà' },
  { key: 's1', label: 'Speciale 1', short: 'Spec.1', color: 'amber', tema: 'Casa pulita' },
  { key: 's2', label: 'Speciale 2', short: 'Spec.2', color: 'green', tema: 'Formato famiglia' },
  { key: 's3', label: 'Speciale 3', short: 'Spec.3', color: 'teal', tema: 'Green / sostenibile' },
];

// slotPlan[fc][sectionKey] = { prod, card }
export const SLOT_PLAN = {
  '06010501': {
    tema: { prod: 2, card: 1 },
    sotto: { prod: 1, card: 1 },
    s1: { prod: 1, card: 1 },
    s2: { prod: 1, card: 1 },
    s3: { prod: 1, card: 1 },
  },
  '06010502': {
    tema: { prod: 2, card: 1 },
    sotto: { prod: 1, card: 0 },
    s1: { prod: 1, card: 1 },
    s2: { prod: 1, card: 0 },
  },
};

// ---------------------------------------------------------------------------
// Article catalogue
// ---------------------------------------------------------------------------
// rotazione: 'A' = fast mover, 'B' = medium, 'C' = slow
// segmento:  'premium' | 'mainstream' | 'primo-prezzo' | 'private-label'

export const ARTICOLI = [
  // ---- Carta Igienica Normale (06010501) ----
  {
    ean: '8004260012345', fc: '06010501', marca: 'Regina',
    descrizione: 'Regina Rotoloni Classica 4 rotoli 2 veli',
    formato: '4 rotoli × 2 veli', strappi: 400,
    prezzoListino: 2.49, prezzoPromo: 1.79, margineePct: 38.5,
    rotazione: 'A', segmento: 'mainstream', fornitore: 'Sofidel',
    quotaMercato: 18.4, giacenza: 'ok', novita: false, ultimaPromo: '2026-04',
  },
  {
    ean: '8004260012352', fc: '06010501', marca: 'Regina',
    descrizione: 'Regina Camomilla 4 rotoli 3 veli profumata',
    formato: '4 rotoli × 3 veli', strappi: 360,
    prezzoListino: 3.29, prezzoPromo: 2.29, margineePct: 42.0,
    rotazione: 'B', segmento: 'mainstream', fornitore: 'Sofidel',
    quotaMercato: 7.1, giacenza: 'ok', novita: false, ultimaPromo: null,
  },
  {
    ean: '8006540098761', fc: '06010501', marca: 'Scottex',
    descrizione: 'Scottex Original 4 rotoli 2 veli',
    formato: '4 rotoli × 2 veli', strappi: 384,
    prezzoListino: 2.79, prezzoPromo: 1.99, margineePct: 35.2,
    rotazione: 'A', segmento: 'premium', fornitore: 'Kimberly-Clark',
    quotaMercato: 15.9, giacenza: 'ok', novita: false, ultimaPromo: '2026-06',
  },
  {
    ean: '8006540098778', fc: '06010501', marca: 'Scottex',
    descrizione: 'Scottex Complete Clean 6 rotoli 2 veli',
    formato: '6 rotoli × 2 veli', strappi: 576,
    prezzoListino: 4.19, prezzoPromo: 2.99, margineePct: 36.8,
    rotazione: 'B', segmento: 'premium', fornitore: 'Kimberly-Clark',
    quotaMercato: 6.3, giacenza: 'ok', novita: true, ultimaPromo: null,
  },
  {
    ean: '8001480123456', fc: '06010501', marca: 'Foxy',
    descrizione: 'Foxy Mio 4 rotoli 3 veli extra morbida',
    formato: '4 rotoli × 3 veli', strappi: 360,
    prezzoListino: 3.49, prezzoPromo: 2.49, margineePct: 40.1,
    rotazione: 'A', segmento: 'premium', fornitore: 'Industrie Cartarie Tronchetti',
    quotaMercato: 11.2, giacenza: 'ok', novita: false, ultimaPromo: null,
  },
  {
    ean: '8001480123463', fc: '06010501', marca: 'Foxy',
    descrizione: 'Foxy Aloe Vera 4 rotoli 3 veli',
    formato: '4 rotoli × 3 veli', strappi: 340,
    prezzoListino: 3.79, prezzoPromo: 2.69, margineePct: 43.5,
    rotazione: 'B', segmento: 'premium', fornitore: 'Industrie Cartarie Tronchetti',
    quotaMercato: 4.8, giacenza: 'basso', novita: false, ultimaPromo: '2026-02',
  },
  {
    ean: '8002340556677', fc: '06010501', marca: 'Tenderly',
    descrizione: 'Tenderly Soffice 4 rotoli 2 veli',
    formato: '4 rotoli × 2 veli', strappi: 400,
    prezzoListino: 2.19, prezzoPromo: 1.49, margineePct: 39.8,
    rotazione: 'B', segmento: 'mainstream', fornitore: 'Lucart',
    quotaMercato: 5.6, giacenza: 'ok', novita: false, ultimaPromo: null,
  },
  {
    ean: '8002340556684', fc: '06010501', marca: 'Nicky',
    descrizione: 'Nicky Elite 4 rotoli 3 veli',
    formato: '4 rotoli × 3 veli', strappi: 350,
    prezzoListino: 2.99, prezzoPromo: 1.99, margineePct: 44.2,
    rotazione: 'B', segmento: 'mainstream', fornitore: 'Lucart',
    quotaMercato: 4.1, giacenza: 'ok', novita: false, ultimaPromo: null,
  },
  {
    ean: '8012345009911', fc: '06010501', marca: 'Grazie Natural',
    descrizione: 'Grazie Natural 4 rotoli 2 veli fibra riciclata FSC',
    formato: '4 rotoli × 2 veli', strappi: 380,
    prezzoListino: 2.89, prezzoPromo: 1.99, margineePct: 46.0,
    rotazione: 'C', segmento: 'mainstream', fornitore: 'Lucart',
    quotaMercato: 2.7, giacenza: 'ok', novita: true, ultimaPromo: null,
    green: true,
  },
  {
    ean: '8058796001122', fc: '06010501', marca: 'Dimar',
    descrizione: 'Dimar Carta Igienica 4 rotoli 2 veli',
    formato: '4 rotoli × 2 veli', strappi: 400,
    prezzoListino: 1.19, prezzoPromo: 0.98, margineePct: 51.3,
    rotazione: 'A', segmento: 'private-label', fornitore: 'Private Label',
    quotaMercato: 12.8, giacenza: 'ok', novita: false, ultimaPromo: '2026-05',
  },
  {
    ean: '8058796001139', fc: '06010501', marca: 'Dimar Bio',
    descrizione: 'Dimar Bio Carta Igienica 4 rotoli 2 veli 100% riciclata',
    formato: '4 rotoli × 2 veli', strappi: 380,
    prezzoListino: 1.49, prezzoPromo: 0.98, margineePct: 48.7,
    rotazione: 'B', segmento: 'private-label', fornitore: 'Private Label',
    quotaMercato: 3.9, giacenza: 'ok', novita: true, ultimaPromo: null,
    green: true,
  },
  {
    ean: '8009876001234', fc: '06010501', marca: 'Primo Prezzo',
    descrizione: 'Carta Igienica Economy 4 rotoli 2 veli',
    formato: '4 rotoli × 2 veli', strappi: 360,
    prezzoListino: 0.89, prezzoPromo: 0.69, margineePct: 28.4,
    rotazione: 'B', segmento: 'primo-prezzo', fornitore: 'Cartiera Lucchese',
    quotaMercato: 6.5, giacenza: 'ok', novita: false, ultimaPromo: null,
  },
  {
    ean: '8006540098785', fc: '06010501', marca: 'Kleenex',
    descrizione: 'Kleenex Cottonelle 4 rotoli 3 veli',
    formato: '4 rotoli × 3 veli', strappi: 320,
    prezzoListino: 3.99, prezzoPromo: 2.79, margineePct: 37.1,
    rotazione: 'C', segmento: 'premium', fornitore: 'Kimberly-Clark',
    quotaMercato: 2.2, giacenza: 'critico', novita: false, ultimaPromo: '2026-07',
  },

  // ---- Carta Igienica Rotoloni (06010502) ----
  {
    ean: '8004260022345', fc: '06010502', marca: 'Regina',
    descrizione: 'Regina Rotoloni Maxi 8 rotoli 2 veli',
    formato: '8 rotoli × 2 veli', strappi: 1200,
    prezzoListino: 6.49, prezzoPromo: 4.49, margineePct: 40.2,
    rotazione: 'A', segmento: 'mainstream', fornitore: 'Sofidel',
    quotaMercato: 21.5, giacenza: 'ok', novita: false, ultimaPromo: '2026-03',
  },
  {
    ean: '8004260022352', fc: '06010502', marca: 'Regina',
    descrizione: 'Regina Rotoloni XXL 12 rotoli 2 veli',
    formato: '12 rotoli × 2 veli', strappi: 1800,
    prezzoListino: 8.99, prezzoPromo: 5.99, margineePct: 42.8,
    rotazione: 'B', segmento: 'mainstream', fornitore: 'Sofidel',
    quotaMercato: 9.7, giacenza: 'ok', novita: false, ultimaPromo: null,
  },
  {
    ean: '8006540108761', fc: '06010502', marca: 'Scottex',
    descrizione: 'Scottex Rotolone Megarotolo 6 rotoli',
    formato: '6 rotoli × 2 veli', strappi: 1080,
    prezzoListino: 6.99, prezzoPromo: 4.99, margineePct: 36.4,
    rotazione: 'A', segmento: 'premium', fornitore: 'Kimberly-Clark',
    quotaMercato: 13.1, giacenza: 'ok', novita: false, ultimaPromo: null,
  },
  {
    ean: '8001480223456', fc: '06010502', marca: 'Foxy',
    descrizione: 'Foxy Rotolone Mega 8 rotoli 3 veli',
    formato: '8 rotoli × 3 veli', strappi: 1120,
    prezzoListino: 7.99, prezzoPromo: 5.49, margineePct: 41.6,
    rotazione: 'B', segmento: 'premium', fornitore: 'Industrie Cartarie Tronchetti',
    quotaMercato: 8.4, giacenza: 'ok', novita: true, ultimaPromo: null,
  },
  {
    ean: '8002340656677', fc: '06010502', marca: 'Tenderly',
    descrizione: 'Tenderly Rotolone 8 rotoli 2 veli',
    formato: '8 rotoli × 2 veli', strappi: 1200,
    prezzoListino: 5.49, prezzoPromo: 3.79, margineePct: 43.0,
    rotazione: 'B', segmento: 'mainstream', fornitore: 'Lucart',
    quotaMercato: 6.2, giacenza: 'basso', novita: false, ultimaPromo: null,
  },
  {
    ean: '8058796011122', fc: '06010502', marca: 'Dimar',
    descrizione: 'Dimar Rotoloni 8 rotoli 2 veli',
    formato: '8 rotoli × 2 veli', strappi: 1200,
    prezzoListino: 3.99, prezzoPromo: 2.98, margineePct: 52.1,
    rotazione: 'A', segmento: 'private-label', fornitore: 'Private Label',
    quotaMercato: 14.6, giacenza: 'ok', novita: false, ultimaPromo: '2026-05',
  },
  {
    ean: '8058796011139', fc: '06010502', marca: 'Dimar Bio',
    descrizione: 'Dimar Bio Rotoloni 6 rotoli riciclata FSC',
    formato: '6 rotoli × 2 veli', strappi: 900,
    prezzoListino: 3.49, prezzoPromo: 2.49, margineePct: 49.4,
    rotazione: 'C', segmento: 'private-label', fornitore: 'Private Label',
    quotaMercato: 3.1, giacenza: 'ok', novita: true, ultimaPromo: null,
    green: true,
  },
  {
    ean: '8012345019911', fc: '06010502', marca: 'Grazie Natural',
    descrizione: 'Grazie Natural Rotolone 8 rotoli fibra riciclata',
    formato: '8 rotoli × 2 veli', strappi: 1120,
    prezzoListino: 5.99, prezzoPromo: 3.99, margineePct: 45.8,
    rotazione: 'C', segmento: 'mainstream', fornitore: 'Lucart',
    quotaMercato: 2.4, giacenza: 'ok', novita: false, ultimaPromo: null,
    green: true,
  },
  {
    ean: '8009876011234', fc: '06010502', marca: 'Primo Prezzo',
    descrizione: 'Rotolone Economy 8 rotoli 2 veli',
    formato: '8 rotoli × 2 veli', strappi: 1040,
    prezzoListino: 2.79, prezzoPromo: 1.98, margineePct: 26.9,
    rotazione: 'B', segmento: 'primo-prezzo', fornitore: 'Cartiera Lucchese',
    quotaMercato: 7.3, giacenza: 'ok', novita: false, ultimaPromo: null,
  },
];

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

export const SEGMENTO_LABELS = {
  premium: 'Premium',
  mainstream: 'Mainstream',
  'primo-prezzo': 'Primo prezzo',
  'private-label': 'Private label',
};

// Flatten the slot plan into an ordered list of individual slots to fill.
// Each slot has a stable id so assignments can be keyed on it.
export function buildSlots() {
  const slots = [];
  for (const fam of FAMIGLIE) {
    const plan = SLOT_PLAN[fam.fc] || {};
    for (const sec of SECTIONS) {
      const p = plan[sec.key];
      if (!p) continue;
      for (let i = 0; i < (p.prod || 0); i++) {
        slots.push({ id: `${fam.fc}|${sec.key}|P|${i}`, fc: fam.fc, sectionKey: sec.key, tipo: 'PROD', idx: i });
      }
      for (let i = 0; i < (p.card || 0); i++) {
        slots.push({ id: `${fam.fc}|${sec.key}|C|${i}`, fc: fam.fc, sectionKey: sec.key, tipo: 'CARD', idx: i });
      }
    }
  }
  return slots;
}
