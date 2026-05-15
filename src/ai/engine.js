// Advanced AI Suggestion Engine for promotional planning
//
// Computes multi-criteria scores with confidence, natural-language reasoning,
// alternative candidates and predicted-impact metrics for each (family,
// promo, section) assignment.

import PROMOZIONI from '../data/promozioni';
import ANAGRAFICA from '../data/anagrafica';
import METRICS from '../data/metrics';
import { REPARTO_TO_SPAZI } from '../data/reparti';
import { getSectionsForPromo, getBudgetForRepartoSezione } from '../hooks/useGridState';

export const DEFAULT_WEIGHTS = {
  sales: 0.22,
  margin: 0.18,
  scontrini: 0.15,
  seasonality: 0.12,
  themeAffinity: 0.18,
  roleBoost: 0.05,
  recencyPenalty: 0.20,
  saturationPenalty: 0.25,
};

// ---------- KPI normalization ----------

function normalizeWithinReparto(families, key) {
  const byReparto = {};
  for (const f of families) {
    if (!byReparto[f.rc]) byReparto[f.rc] = [];
    byReparto[f.rc].push(f);
  }
  const norm = {};
  for (const list of Object.values(byReparto)) {
    const max = Math.max(...list.map(f => f[key] || 0), 0.0001);
    for (const f of list) norm[f.fc] = (f[key] || 0) / max;
  }
  return norm;
}

// ---------- Seasonality ----------

function seasonalityScoreForFamily(family, promo) {
  if (!promo.dataInizio) return 0;
  const start = new Date(promo.dataInizio);
  const month = start.getMonth();
  const q = promo.quadrimestre || 1;
  const qStart = q === 1 ? 1 : q === 2 ? 4 : 8;
  const monthInQ = Math.max(0, Math.min(3, month - qStart));
  const ms = [family.m1 || 0, family.m2 || 0, family.m3 || 0, family.m4 || 0];
  const totalSales = ms.reduce((a, b) => a + b, 0) || 1;
  const weights = ms.map((_, i) => Math.exp(-Math.pow(i - monthInQ, 2) * 0.7));
  const wsum = weights.reduce((a, b) => a + b, 0);
  let score = 0;
  for (let i = 0; i < 4; i++) score += (ms[i] / totalSales) * (weights[i] / wsum);
  return Math.min(1, score * 4);
}

// ---------- Theme affinity ----------

const THEME_KEYWORDS = {
  aperitivo: ['birra', 'vino', 'aperitiv', 'snack', 'patatine', 'olive', 'cracker', 'salatin', 'salume', 'salam'],
  birra: ['birra'],
  colazione: ['caffe', 'biscot', 'cereali', 'latte', 'cacao', 'thè', 'tè', 'marmellat', 'fette', 'brioche', 'cornett', 'yogurt'],
  salutistico: ['delattos', 'integrale', 'bio', 'light', 'senza', 'sale', 'fibr', 'verdura', 'frutta'],
  'freschi d': ['mozzarell', 'yogurt', 'formag', 'gelat', 'gastronom', 'burrat'],
  gelati: ['gelat'],
  estate: ['gelat', 'birra', 'aperitiv', 'cocomero', 'limonata', 'acqua'],
  vacanze: ['conserv', 'biscot', 'caffe', 'olio', 'pasta'],
  'grandi formati': ['gr', 'formato'],
  vini: ['vino', 'bianch', 'rosa'],
  scuola: ['cancell', 'libri', 'penne', 'quadern', 'astuc', 'merenda'],
  pasta: ['pasta', 'sugo', 'pomodoro'],
  sottocosto: ['pasta', 'pomodoro', 'olio', 'tonno', 'carne', 'detersiv', 'pannolin'],
  'al costo': ['detersiv', 'pannolin', 'cur'],
  'carta fedeltà': [],
  rientro: ['biscot', 'caffe', 'pasta', 'cereali'],
  casa: ['detersiv', 'tessil', 'casaling'],
  pet: ['cane', 'gatto', 'animal', 'pet'],
  auto: ['auto', 'olio motor'],
  evento: ['detersiv', 'pasta', 'biscot', 'olio', 'tonno'],
  '50%': ['pasta', 'detersiv', 'cura'],
  svuotatutto: ['tessil', 'bazar'],
  'tutto a': ['biscot', 'pasta', 'tonno', 'detersiv'],
};

function themeAffinity(familyName, sectionLabel) {
  if (!sectionLabel) return { score: 0, matched: [] };
  const fn = (familyName || '').toLowerCase();
  const sl = sectionLabel.toLowerCase();
  let score = 0;
  const matched = [];
  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
    if (sl.includes(theme)) {
      for (const k of keywords) {
        if (fn.includes(k)) {
          score += 0.6;
          matched.push({ theme, keyword: k });
          break;
        }
      }
    }
  }
  const stopWords = ['di', 'da', 'in', 'la', 'il', 'lo', 'gli', 'le', 'i', 'e', 'a', 'al', 'del', 'con'];
  const slWords = sl.split(/[\s,\-/]+/).filter(w => w.length > 3 && !stopWords.includes(w));
  for (const w of slWords) {
    if (fn.includes(w)) {
      score += 0.2;
      matched.push({ theme: 'direct', keyword: w });
    }
  }
  return { score: Math.min(1, score), matched };
}

function roleBoost(promo, salesNorm) {
  const rt = promo.ruoloTemaCod;
  if (rt === 'RT1') return Math.pow(salesNorm, 0.5);
  if (rt === 'RT3') return 1 - Math.abs(salesNorm - 0.5) * 1.2;
  return salesNorm * 0.7;
}

// ---------- Score & components ----------

export function computeBaseScore(family, promo, section, weights, salesNorm, marginNorm, psNorm) {
  const sales = salesNorm[family.fc] || 0;
  const margin = marginNorm[family.fc] || 0;
  const ps = psNorm[family.fc] || 0;
  const seasonality = seasonalityScoreForFamily(family, promo);
  const aff = themeAffinity(family.fn, section.label);
  const role = roleBoost(promo, sales);

  let recPenalty = 0;
  if (family.ultimaPromo) recPenalty += 0.6;
  if (family.penultimaPromo) recPenalty += 0.3;
  recPenalty += Math.min(family.nVol / 8, 0.4);

  const base =
    weights.sales * sales +
    weights.margin * margin +
    weights.scontrini * ps +
    weights.seasonality * seasonality +
    weights.themeAffinity * aff.score +
    weights.roleBoost * role -
    weights.recencyPenalty * recPenalty;

  return {
    score: base,
    components: {
      sales, margin, ps,
      seasonality,
      affinity: aff.score,
      affinityMatched: aff.matched,
      role,
      recPenalty,
    },
  };
}

// ---------- Confidence ----------

function computeConfidence(picked, alternatives) {
  // Confidence = function of score gap vs #2 alternative and absolute score
  const pickedScore = picked.score;
  const nextScore = alternatives[0]?.score ?? 0;
  const gap = Math.max(0, pickedScore - nextScore);
  const gapNorm = Math.min(1, gap * 4);
  const absScoreNorm = Math.min(1, Math.max(0, pickedScore) * 2);
  const c = 0.4 + 0.4 * gapNorm + 0.2 * absScoreNorm;
  return Math.min(0.99, Math.max(0.3, c));
}

// ---------- Natural-language reasoning ----------

function buildReasoning(family, components, promo, section, refStats) {
  const reasons = [];
  const warnings = [];

  if (components.sales > 0.7) {
    reasons.push({
      icon: 'sales',
      text: `Top vendite del reparto (€${Math.round(family.v).toLocaleString('it-IT')})`,
      strength: 'high',
    });
  } else if (components.sales > 0.4) {
    reasons.push({
      icon: 'sales',
      text: `Vendite solide (€${Math.round(family.v).toLocaleString('it-IT')})`,
      strength: 'medium',
    });
  }

  if (components.margin > 0.7) {
    reasons.push({
      icon: 'margin',
      text: `Margine elevato (${(family.margine * 100).toFixed(1)}%)`,
      strength: 'high',
    });
  } else if (components.margin > 0.4) {
    reasons.push({
      icon: 'margin',
      text: `Margine sopra la media (${(family.margine * 100).toFixed(1)}%)`,
      strength: 'medium',
    });
  }

  if (components.ps > 0.6) {
    reasons.push({
      icon: 'scontrini',
      text: `Alta penetrazione scontrini (${(family.ps * 100).toFixed(2)}% dei cassieri)`,
      strength: 'high',
    });
  }

  if (components.seasonality > 0.55) {
    reasons.push({
      icon: 'season',
      text: `Forte stagionalità nel periodo della promo`,
      strength: 'high',
    });
  } else if (components.seasonality > 0.35) {
    reasons.push({
      icon: 'season',
      text: `Andamento stagionale favorevole`,
      strength: 'medium',
    });
  }

  if (components.affinity > 0.5) {
    const labels = components.affinityMatched.slice(0, 2).map(m => m.keyword);
    reasons.push({
      icon: 'theme',
      text: `Match tematico forte con "${section.short}" (${labels.join(', ')})`,
      strength: 'high',
    });
  } else if (components.affinity > 0.25) {
    reasons.push({
      icon: 'theme',
      text: `Affinità tematica con "${section.short}"`,
      strength: 'medium',
    });
  }

  if (promo.ruoloTemaCod === 'RT1' && components.role > 0.7) {
    reasons.push({
      icon: 'role',
      text: `Famiglia top-tier adatta a promo A`,
      strength: 'medium',
    });
  }

  // Warnings
  if (family.ultimaPromo) {
    warnings.push({
      icon: 'warning',
      text: `Già in volantino in promo ${family.ultimaPromo}`,
      severity: 'high',
    });
  }
  if (family.nVol >= 6) {
    warnings.push({
      icon: 'warning',
      text: `Già usata ${family.nVol}× in volantino recentemente — rotazione bassa`,
      severity: 'medium',
    });
  }
  if (components.sales < 0.15 && family.v > 0) {
    warnings.push({
      icon: 'low',
      text: `Vendite basse rispetto al reparto`,
      severity: 'low',
    });
  }

  return { reasons, warnings };
}

// ---------- Predicted impact ----------

function predictImpact(family, components, section) {
  // Expected revenue contribution during promo (simplified):
  // sales × seasonality × theme uplift factor
  const baseUplift = 1.15 + components.affinity * 0.6 + components.seasonality * 0.4;
  const expectedRevenue = (family.v / 365) * 11 * baseUplift; // ~11 promo days
  // Card pickup probability based on scontrini penetration
  const cardProb = Math.min(0.95, family.ps * 12 + 0.2);
  // Engagement: psNorm + affinity
  const engagement = Math.min(1, components.ps * 0.6 + components.affinity * 0.4);
  return {
    expectedRevenue,
    cardProb,
    engagement,
  };
}

// ---------- Plan generation with rich output ----------

export function generateRichPlan(channelCode, weights = DEFAULT_WEIGHTS) {
  const channelPromos = PROMOZIONI
    .filter(p => p.canale === channelCode)
    .sort((a, b) => (a.dataInizio || '').localeCompare(b.dataInizio || ''));

  const richByPromo = {}; // promoCode -> [richSuggestion, ...]
  const familyUsage = {};

  for (const promo of channelPromos) {
    const promoCode = promo.codice;
    const sections = getSectionsForPromo(promo);
    const metrics = METRICS[promoCode] || {};

    const families = ANAGRAFICA.map(a => {
      const x = metrics[a.fc] || {};
      return {
        ...a,
        v: x.v || 0, margine: x.m || 0, ps: x.ps || 0,
        m1: x.m1 || 0, m2: x.m2 || 0, m3: x.m3 || 0, m4: x.m4 || 0,
        ultimaPromo: x.ultima, penultimaPromo: x.penultima,
        nVol: x.nVol || 0, nPromo: x.nPromo || 0,
      };
    });

    const salesNorm = normalizeWithinReparto(families, 'v');
    const marginNorm = normalizeWithinReparto(families, 'margine');
    const psNorm = normalizeWithinReparto(families, 'ps');

    const promoSuggestions = [];

    for (const sec of sections) {
      const repartoFamilies = {};
      for (const f of families) {
        if (!REPARTO_TO_SPAZI[f.rc] || REPARTO_TO_SPAZI[f.rc].length === 0) continue;
        if (!repartoFamilies[f.rc]) repartoFamilies[f.rc] = [];
        repartoFamilies[f.rc].push(f);
      }

      for (const [repartoCode, repFamilies] of Object.entries(repartoFamilies)) {
        const budget = getBudgetForRepartoSezione(promoCode, sec.key, repartoCode);
        if (!budget.prod) continue;

        const candidates = repFamilies
          .filter(f => f.v > 0)
          .map(f => {
            const b = computeBaseScore(f, promo, sec, weights, salesNorm, marginNorm, psNorm);
            const usage = familyUsage[f.fc] || 0;
            const satPenalty = weights.saturationPenalty * Math.min(usage / 4, 1);
            return { f, score: b.score - satPenalty, components: b.components, satPenalty };
          })
          .sort((a, b) => b.score - a.score);

        // ---- Multi-slot allocation ----
        // Top-scoring families receive multiple slots, weaker ones a single slot.
        // Cap individual allocation to a fraction of total budget to preserve diversity.
        const maxPerFamily = Math.max(2, Math.min(5, Math.ceil(budget.prod * 0.30)));

        let slotsLeft = budget.prod;
        let cardLeft = budget.card;
        const picks = [];

        for (let ci = 0; ci < candidates.length; ci++) {
          if (slotsLeft <= 0) break;
          const cand = candidates[ci];
          const s = cand.score;

          // Score → desired slot count
          let desired;
          if (s > 0.55) desired = 4;
          else if (s > 0.42) desired = 3;
          else if (s > 0.28) desired = 2;
          else desired = 1;

          // Cap to maxPerFamily and remaining
          let prodCount = Math.min(desired, maxPerFamily, slotsLeft);
          // Reserve at least 1 slot for next 2 candidates (preserves diversity)
          const reserve = Math.min(2, candidates.length - ci - 1);
          prodCount = Math.max(1, Math.min(prodCount, slotsLeft - reserve));
          if (prodCount < 1) prodCount = Math.min(1, slotsLeft);

          // CARD allocation: proportional to scontrini penetration
          const psScore = psNorm[cand.f.fc] || 0;
          let cardCount = 0;
          if (cardLeft > 0 && psScore > 0.20) {
            cardCount = Math.max(1, Math.round(prodCount * Math.min(1, psScore * 0.9)));
            cardCount = Math.min(cardCount, prodCount, cardLeft);
          }

          picks.push({ ...cand, prodCount, cardCount });
          slotsLeft -= prodCount;
          cardLeft -= cardCount;
        }

        const alternatives = candidates.slice(picks.length, picks.length + 3);

        for (const pick of picks) {
          const remainingAlts = alternatives.slice(0, 3);
          const conf = computeConfidence(pick, remainingAlts);
          const { reasons, warnings } = buildReasoning(pick.f, pick.components, promo, sec);
          const impact = predictImpact(pick.f, pick.components, sec);

          // Multi-slot reasoning bonus
          if (pick.prodCount >= 3) {
            reasons.unshift({
              icon: 'role',
              text: `Allocazione concentrata: ${pick.prodCount} slot consigliati grazie a score elevato`,
              strength: 'high',
            });
          } else if (pick.prodCount === 2) {
            reasons.unshift({
              icon: 'role',
              text: `Doppio slot consigliato (score sopra media)`,
              strength: 'medium',
            });
          }

          promoSuggestions.push({
            promoCode,
            fc: pick.f.fc,
            family: pick.f,
            sectionKey: sec.key,
            sectionLabel: sec.label,
            sectionShort: sec.short,
            sectionColor: sec.color,
            repartoCode,
            repartoName: pick.f.rn,
            prodCount: pick.prodCount,
            cardCount: pick.cardCount,
            // Impact scaled by slot count
            score: pick.score,
            confidence: conf,
            components: pick.components,
            reasons,
            warnings,
            impact: {
              ...impact,
              expectedRevenue: impact.expectedRevenue * pick.prodCount,
            },
            alternatives: remainingAlts.map(a => ({
              fc: a.f.fc,
              fn: a.f.fn,
              score: a.score,
              v: a.f.v,
              margine: a.f.margine,
            })),
            satPenalty: pick.satPenalty,
            usageBefore: familyUsage[pick.f.fc] || 0,
          });

          // Track usage: each slot counts toward saturation
          familyUsage[pick.f.fc] = (familyUsage[pick.f.fc] || 0) + pick.prodCount;
        }
      }
    }

    // Sort suggestions per promo by section order then by score
    promoSuggestions.sort((a, b) => {
      if (a.sectionKey !== b.sectionKey) {
        const order = ['tema', 'sotto', 's1', 's2', 's3', 's4'];
        return order.indexOf(a.sectionKey) - order.indexOf(b.sectionKey);
      }
      return b.score - a.score;
    });

    richByPromo[promoCode] = promoSuggestions;
  }

  return { richByPromo, channelPromos };
}

// ---------- Plan insights (simulated AI commentary) ----------

export function generatePlanInsights(richByPromo, channelPromos) {
  const insights = [];
  const allSuggestions = Object.values(richByPromo).flat();
  const totalSuggestions = allSuggestions.length;

  if (totalSuggestions === 0) return insights;

  const distinctFamilies = new Set(allSuggestions.map(s => s.fc));
  const reuseRate = 1 - distinctFamilies.size / totalSuggestions;
  const avgConfidence = allSuggestions.reduce((s, x) => s + x.confidence, 0) / totalSuggestions;
  const totalExpectedRevenue = allSuggestions.reduce((s, x) => s + x.impact.expectedRevenue, 0);
  const totalProdSlots = allSuggestions.reduce((s, x) => s + (x.prodCount || 1), 0);
  const totalCardSlots = allSuggestions.reduce((s, x) => s + (x.cardCount || 0), 0);
  const multiSlotCount = allSuggestions.filter(s => (s.prodCount || 1) > 1).length;

  // Insight: confidence
  insights.push({
    type: avgConfidence > 0.75 ? 'positive' : avgConfidence > 0.55 ? 'neutral' : 'warning',
    icon: 'confidence',
    title: 'Confidenza media',
    text: `${(avgConfidence * 100).toFixed(0)}% — ${
      avgConfidence > 0.75 ? "il modello ha trovato chiari vincitori in quasi tutti gli slot"
      : avgConfidence > 0.55 ? "alcuni slot sono contesi, ma il piano è solido"
      : "molti slot hanno alternative simili: rivedi manualmente i casi a bassa confidenza"
    }`,
    value: `${(avgConfidence * 100).toFixed(0)}%`,
  });

  // Insight: revenue forecast
  insights.push({
    type: 'positive',
    icon: 'revenue',
    title: 'Ricavi attesi piano',
    text: `€ ${Math.round(totalExpectedRevenue / 1000)}k stimati durante l'intero quadrimestre sulle famiglie selezionate, considerando uplift tematico e stagionale.`,
    value: `€${Math.round(totalExpectedRevenue / 1000)}k`,
  });

  // Insight: diversity
  insights.push({
    type: reuseRate > 0.5 ? 'warning' : 'positive',
    icon: 'diversity',
    title: 'Diversità famiglie',
    text: reuseRate > 0.5
      ? `${distinctFamilies.size} famiglie distinte su ${totalSuggestions} slot: rotazione bassa. Aumenta il peso "saturazione" per maggiore varietà.`
      : `${distinctFamilies.size} famiglie distinte su ${totalSuggestions} slot: buona rotazione tra promo.`,
    value: `${distinctFamilies.size}/${totalSuggestions}`,
  });

  // Insight: per-quadrimestre patterns
  const byQuart = { 1: 0, 2: 0, 3: 0 };
  for (const p of channelPromos) {
    const sugs = richByPromo[p.codice] || [];
    byQuart[p.quadrimestre] = (byQuart[p.quadrimestre] || 0) + sugs.length;
  }
  const maxQ = Object.keys(byQuart).reduce((a, b) => byQuart[a] > byQuart[b] ? a : b);
  insights.push({
    type: 'neutral',
    icon: 'season',
    title: 'Bilanciamento quadrimestri',
    text: `Q1: ${byQuart[1]} · Q2: ${byQuart[2]} · Q3: ${byQuart[3]} slot. ${
      maxQ ? `Q${maxQ} è il più ricco grazie a formati più ampi e più speciali attivi.` : ''
    }`,
    value: `Q${maxQ}`,
  });

  // Insight: multi-slot allocations
  insights.push({
    type: multiSlotCount > totalSuggestions * 0.3 ? 'positive' : 'neutral',
    icon: 'role',
    title: 'Allocazioni concentrate',
    text: `${multiSlotCount} su ${totalSuggestions} proposte ricevono più di uno slot. In totale ${totalProdSlots} slot PROD e ${totalCardSlots} CARD distribuiti tra ${distinctFamilies.size} famiglie distinte.`,
    value: `${multiSlotCount}/${totalSuggestions}`,
  });

  // Insight: warnings count
  const totalWarnings = allSuggestions.reduce((s, x) => s + x.warnings.length, 0);
  if (totalWarnings > 0) {
    insights.push({
      type: 'warning',
      icon: 'warning',
      title: 'Avvisi',
      text: `${totalWarnings} suggerimenti hanno avvisi (famiglia già in promo recente, vendite basse, ecc.). Filtra per "Solo con avvisi" per rivederli.`,
      value: `${totalWarnings}`,
    });
  }

  return insights;
}

// ---------- Helpers exposed to UI ----------

export function buildSelectionsFromAccepted(accepted, richByPromo) {
  // accepted: { [promoCode]: { [`${fc}::${sectionKey}`]: true } }
  const selectionsByPromo = {};
  for (const promoCode of Object.keys(richByPromo)) {
    const acc = accepted[promoCode] || {};
    const sel = {};
    for (const s of richByPromo[promoCode]) {
      const key = `${s.fc}::${s.sectionKey}`;
      if (acc[key]) {
        if (!sel[s.fc]) sel[s.fc] = {};
        // Multi-slot: PROD count and CARD count from the suggestion
        sel[s.fc][s.sectionKey] = {
          p: s.prodCount || 1,
          c: s.cardCount || 0,
        };
      }
    }
    selectionsByPromo[promoCode] = sel;
  }
  return selectionsByPromo;
}
