// Advanced AI Suggestion Engine for promotional planning
//
// Computes a multi-criteria score per (family, promo, section) and produces
// optimized assignments across the entire portfolio of promos for a channel.
//
// KPIs:
//  - Vendite normalized (within reparto)
//  - Margine
//  - Penetrazione scontrini (PS)
//  - Stagionalità (m1-m4 weighted by promo period)
//  - Affinità tematica (keyword matching family ↔ section label)
//  - Recency penalty (NumeroVolteVolantino, UltimaPromoVolantino)
//  - Saturation penalty (assignments in current plan)
//  - Role boost (A-promo: top-tier; C-promo: broader)

import PROMOZIONI from '../data/promozioni';
import ANAGRAFICA from '../data/anagrafica';
import METRICS from '../data/metrics';
import SPAZI from '../data/spazi';
import { REPARTO_TO_SPAZI } from '../data/reparti';
import { getSectionsForPromo, getBudgetForRepartoSezione } from '../hooks/useGridState';

// Default weight configuration (tunable in UI)
export const DEFAULT_WEIGHTS = {
  sales: 0.22,         // vendite
  margin: 0.18,        // margine
  scontrini: 0.15,     // % scontrini
  seasonality: 0.12,   // M1-M4 alignment with promo period
  themeAffinity: 0.18, // keyword affinity
  roleBoost: 0.05,     // role A/B/C
  recencyPenalty: 0.20, // recency penalty (subtracted)
  saturationPenalty: 0.25, // current-plan saturation penalty (subtracted)
};

// ---------- helpers ----------

function normalizeWithinReparto(families, key) {
  // Map fc -> normalized [0,1] value of `key`, normalized within reparto
  const byReparto = {};
  for (const f of families) {
    if (!byReparto[f.rc]) byReparto[f.rc] = [];
    byReparto[f.rc].push(f);
  }
  const norm = {};
  for (const list of Object.values(byReparto)) {
    const max = Math.max(...list.map(f => f[key] || 0), 0.0001);
    for (const f of list) {
      norm[f.fc] = (f[key] || 0) / max;
    }
  }
  return norm;
}

// Weight months [m1,m2,m3,m4] by where the promo falls within the quadrimestre
function seasonalityScoreForFamily(family, promo) {
  if (!promo.dataInizio) return 0;
  const start = new Date(promo.dataInizio);
  const month = start.getMonth(); // 0-indexed
  const q = promo.quadrimestre || 1;
  // Quadrimestre 1: Feb,Mar,Apr,May (months 1-4)
  // Quadrimestre 2: May,Jun,Jul,Aug (months 4-7)
  // Quadrimestre 3: Sep,Oct,Nov,Dec (months 8-11)
  const qStart = q === 1 ? 1 : q === 2 ? 4 : 8;
  const monthInQ = Math.max(0, Math.min(3, month - qStart));
  const ms = [family.m1 || 0, family.m2 || 0, family.m3 || 0, family.m4 || 0];
  const totalSales = ms.reduce((a, b) => a + b, 0) || 1;
  // Apply Gaussian-like weighting around the dominant month, peaked at monthInQ
  const weights = ms.map((_, i) => Math.exp(-Math.pow(i - monthInQ, 2) * 0.7));
  const wsum = weights.reduce((a, b) => a + b, 0);
  let score = 0;
  for (let i = 0; i < 4; i++) {
    score += (ms[i] / totalSales) * (weights[i] / wsum);
  }
  return Math.min(1, score * 4); // scale up
}

// Match family name keywords with section label (theme affinity)
function themeAffinity(familyName, sectionLabel) {
  if (!sectionLabel) return 0;
  const fn = (familyName || '').toLowerCase();
  const sl = sectionLabel.toLowerCase();

  // Domain-specific keyword affinities
  const themeMap = {
    aperitivo: ['birra', 'vino', 'aperitiv', 'snack', 'patatine', 'olive', 'cracker', 'salatini', 'salume', 'salam', 'salatin'],
    birra: ['birra'],
    colazione: ['caffe', 'biscot', 'cereali', 'latte', 'cacao', 'thè', 'tè', 'marmellat', 'fette', 'brioche', 'cornett'],
    salutistico: ['delattos', 'integrale', 'bio', 'light', 'senza', 'sale', 'fibr', 'verdura', 'frutta'],
    'freschi d': ['mozzarell', 'yogurt', 'formag', 'gelat', 'gastronom'],
    gelati: ['gelat'],
    estate: ['gelat', 'birra', 'aperitiv', 'cocomero', 'limonata'],
    vacanze: ['conserv', 'biscot', 'caffe'],
    'grandi formati': ['gr', 'formato'],
    'vini bianchi': ['vino', 'bianch'],
    'allegato scuola': ['cancell', 'libri', 'penne', 'quadern', 'astuc'],
    pasta: ['pasta'],
    sottocosto: ['pasta', 'pomodoro', 'olio', 'tonno', 'carne', 'detersiv', 'pannolin'],
    'al costo': ['detersiv', 'pannolin', 'cur'],
    'carta fedeltà': ['fedelt'],
    rientro: ['biscot', 'caffe', 'pasta', 'cereali'],
    casa: ['detersiv', 'tessil', 'casaling'],
    pet: ['cane', 'gatto', 'animal', 'pet'],
    auto: ['auto', 'olio motor'],
  };

  let score = 0;
  for (const [theme, keywords] of Object.entries(themeMap)) {
    if (sl.includes(theme)) {
      for (const k of keywords) {
        if (fn.includes(k)) { score += 0.6; break; }
      }
    }
  }
  // Generic substring boost
  const stopWords = ['di', 'da', 'in', 'la', 'il', 'lo', 'gli', 'le', 'i', 'e', 'a', 'al', 'del', 'con'];
  const slWords = sl.split(/[\s,\-/]+/).filter(w => w.length > 3 && !stopWords.includes(w));
  for (const w of slWords) {
    if (fn.includes(w)) score += 0.2;
  }
  return Math.min(1, score);
}

function roleBoost(promo, family, salesNorm) {
  // A-promo: prefer top families (high salesNorm)
  // B-promo: medium
  // C-promo: broader spread (mid families get more)
  const rt = promo.ruoloTemaCod;
  if (rt === 'RT1') return Math.pow(salesNorm, 0.5); // boost top
  if (rt === 'RT3') return 1 - Math.abs(salesNorm - 0.5) * 1.2; // peak at mid
  return salesNorm * 0.7; // RT2 default
}

// Compute base score (without saturation; saturation is plan-dependent)
export function computeBaseScore(family, promo, section, weights, salesNorm, marginNorm, psNorm) {
  const sales = salesNorm[family.fc] || 0;
  const margin = marginNorm[family.fc] || 0;
  const ps = psNorm[family.fc] || 0;

  const seasonality = seasonalityScoreForFamily(family, promo);
  const affinity = themeAffinity(family.fn, section.label);
  const role = roleBoost(promo, family, sales);

  // Recency penalty: family in recent volantini
  let recPenalty = 0;
  if (family.ultimaPromo) recPenalty += 0.6;
  if (family.penultimaPromo) recPenalty += 0.3;
  recPenalty += Math.min(family.nVol / 8, 0.4); // intensive use

  const base =
    weights.sales * sales +
    weights.margin * margin +
    weights.scontrini * ps +
    weights.seasonality * seasonality +
    weights.themeAffinity * affinity +
    weights.roleBoost * role -
    weights.recencyPenalty * recPenalty;

  return {
    score: base,
    components: { sales, margin, ps, seasonality, affinity, role, recPenalty },
  };
}

// Generate a full multi-promo plan for a channel
// Returns { selectionsByPromo, scores, summary }
export function generateChannelPlan(channelCode, weights = DEFAULT_WEIGHTS) {
  const channelPromos = PROMOZIONI
    .filter(p => p.canale === channelCode)
    .sort((a, b) => (a.dataInizio || '').localeCompare(b.dataInizio || ''));

  const selectionsByPromo = {};
  const scoreLog = []; // for transparency
  // Track family usage across the plan (saturation tracking)
  const familyUsage = {}; // fc -> count of slot assignments across plan

  for (const promo of channelPromos) {
    const promoCode = promo.codice;
    const sections = getSectionsForPromo(promo);
    const metrics = METRICS[promoCode] || {};

    // Build family list for this promo
    const families = ANAGRAFICA.map(a => {
      const x = metrics[a.fc] || {};
      return {
        ...a,
        v: x.v || 0,
        m: x.m || 0,
        ps: x.ps || 0,
        m1: x.m1 || 0, m2: x.m2 || 0, m3: x.m3 || 0, m4: x.m4 || 0,
        ultimaPromo: x.ultima,
        penultimaPromo: x.penultima,
        nVol: x.nVol || 0,
        nPromo: x.nPromo || 0,
      };
    });

    const salesNorm = normalizeWithinReparto(families, 'v');
    const marginNorm = normalizeWithinReparto(families, 'm');
    const psNorm = normalizeWithinReparto(families, 'ps');
    const familyByFc = Object.fromEntries(families.map(f => [f.fc, f]));

    const promoSelections = {}; // { fc: { sectionKey: { p, c } } }

    // For each section, fill PROD slots per reparto, then CARD slots
    for (const sec of sections) {
      // Group families by anagrafica reparto
      const repartoFamilies = {};
      for (const f of families) {
        // Only consider families that map to spazi reparti (have budget potential)
        if (!REPARTO_TO_SPAZI[f.rc] || REPARTO_TO_SPAZI[f.rc].length === 0) continue;
        if (!repartoFamilies[f.rc]) repartoFamilies[f.rc] = [];
        repartoFamilies[f.rc].push(f);
      }

      // Fill PROD per reparto according to budget
      for (const [repartoCode, repFamilies] of Object.entries(repartoFamilies)) {
        const budget = getBudgetForRepartoSezione(promoCode, sec.key, repartoCode);
        if (!budget.prod) continue;

        // Score and rank candidates
        const candidates = repFamilies
          .filter(f => f.v > 0) // skip zero-sales
          .map(f => {
            const base = computeBaseScore(f, promo, sec, weights, salesNorm, marginNorm, psNorm);
            const usage = familyUsage[f.fc] || 0;
            const satPenalty = weights.saturationPenalty * Math.min(usage / 3, 1);
            return { f, score: base.score - satPenalty, components: base.components, satPenalty };
          })
          .sort((a, b) => b.score - a.score);

        const picks = candidates.slice(0, budget.prod);
        for (const pick of picks) {
          if (!promoSelections[pick.f.fc]) promoSelections[pick.f.fc] = {};
          if (!promoSelections[pick.f.fc][sec.key]) promoSelections[pick.f.fc][sec.key] = { p: 0, c: 0 };
          promoSelections[pick.f.fc][sec.key].p = 1;
          familyUsage[pick.f.fc] = (familyUsage[pick.f.fc] || 0) + 1;

          scoreLog.push({
            promoCode, fc: pick.f.fc, fn: pick.f.fn, section: sec.key,
            type: 'P', score: pick.score, components: pick.components,
          });
        }

        // CARD: pick from PROD-assigned families with highest scontrini score
        if (budget.card > 0) {
          const prodAssigned = picks
            .map(p => ({ ...p, cardScore: (psNorm[p.f.fc] || 0) * 0.6 + (salesNorm[p.f.fc] || 0) * 0.4 }))
            .sort((a, b) => b.cardScore - a.cardScore);
          const cardPicks = prodAssigned.slice(0, budget.card);
          for (const cp of cardPicks) {
            promoSelections[cp.f.fc][sec.key].c = 1;
          }
        }
      }
    }

    selectionsByPromo[promoCode] = promoSelections;
  }

  // Summary stats
  const summary = {
    totalAssignments: Object.values(selectionsByPromo).reduce(
      (s, sel) => s + Object.values(sel).reduce(
        (s2, secs) => s2 + Object.values(secs).filter(v => v?.p).length, 0
      ), 0
    ),
    distinctFamilies: new Set(Object.values(selectionsByPromo).flatMap(s => Object.keys(s))).size,
    promoCount: channelPromos.length,
    avgFamiliesPerPromo: 0,
  };
  summary.avgFamiliesPerPromo = summary.totalAssignments / Math.max(summary.promoCount, 1);

  return { selectionsByPromo, scoreLog, summary, channelPromos };
}

// Compute top-N suggestions for a single promo (lightweight, for previewing)
export function getTopSuggestionsForPromo(promo, weights = DEFAULT_WEIGHTS, topN = 15) {
  if (!promo) return [];
  const promoCode = promo.codice;
  const sections = getSectionsForPromo(promo);
  const metrics = METRICS[promoCode] || {};
  const families = ANAGRAFICA.map(a => {
    const x = metrics[a.fc] || {};
    return {
      ...a,
      v: x.v || 0, m: x.m || 0, ps: x.ps || 0,
      m1: x.m1 || 0, m2: x.m2 || 0, m3: x.m3 || 0, m4: x.m4 || 0,
      ultimaPromo: x.ultima, penultimaPromo: x.penultima,
      nVol: x.nVol || 0, nPromo: x.nPromo || 0,
    };
  });

  const salesNorm = normalizeWithinReparto(families, 'v');
  const marginNorm = normalizeWithinReparto(families, 'm');
  const psNorm = normalizeWithinReparto(families, 'ps');

  const main = sections.find(s => s.key === 'tema');
  if (!main) return [];

  return families
    .filter(f => f.v > 0)
    .map(f => {
      const base = computeBaseScore(f, promo, main, weights, salesNorm, marginNorm, psNorm);
      return { ...f, score: base.score, components: base.components };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
