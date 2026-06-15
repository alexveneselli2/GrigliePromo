import { useState, useMemo, useCallback } from 'react';
import PROMOZIONI from '../data/promozioni';
import ANAGRAFICA from '../data/anagrafica';
import METRICS from '../data/metrics';
import SPAZI from '../data/spazi';
import REPARTI, { REPARTO_TO_SPAZI } from '../data/reparti';

// Section definitions for a given promo
export function getSectionsForPromo(promo) {
  if (!promo) return [];
  const sections = [];
  const isReal = (s) => s && s !== 'NA' && s !== '';

  if (isReal(promo.tema)) sections.push({
    key: 'tema', label: promo.tema, short: 'Tema', code: promo.temaCod,
    group: 'main', color: 'red',
  });
  if (isReal(promo.sottotema)) sections.push({
    key: 'sotto', label: promo.sottotema, short: 'Sottotema', code: promo.sottotemaCod,
    group: 'main', color: 'orange',
  });
  if (isReal(promo.speciale1)) sections.push({
    key: 's1', label: promo.speciale1, short: 'Spec.1', code: promo.speciale1Cod,
    group: 'spec', color: 'amber',
  });
  if (isReal(promo.speciale2)) sections.push({
    key: 's2', label: promo.speciale2, short: 'Spec.2', code: promo.speciale2Cod,
    group: 'spec', color: 'green',
  });
  if (isReal(promo.speciale3)) sections.push({
    key: 's3', label: promo.speciale3, short: 'Spec.3', code: promo.speciale3Cod,
    group: 'spec', color: 'teal',
  });
  if (isReal(promo.speciale4Aff)) sections.push({
    key: 's4', label: promo.speciale4Aff, short: 'Aff.', code: promo.speciale4AffCod,
    group: 'aff', color: 'blue',
  });

  return sections;
}

// Map from section key to spazi sezione name
const SECTION_TO_SPAZI_KEY = {
  tema: 'Tema',
  sotto: 'Sottotema',
  s1: 'Speciale1',
  s2: 'Speciale2',
  s3: 'Speciale3',
  s4: 'Speciale4_Affiancamento',
};

const SECTION_KEYS = ['tema', 'sotto', 's1', 's2', 's3', 's4'];

// Synthetic-budget ratios: when the Excel data has no explicit allocation
// for a non-Tema section, we estimate the budget as a fraction of the Tema
// budget for that same reparto. Allows the AI to propose assignments across
// all sections defined in the promo metadata, not only Tema.
const SYNTHETIC_BUDGET_RATIOS = {
  sotto: 0.30,
  s1: 0.45,
  s2: 0.30,
  s3: 0.25,
  s4: 0.20,
};

// Family count per anagrafica reparto (used as split weight)
const REPARTO_WEIGHT = Object.fromEntries(REPARTI.map(r => [r.code, r.count || 1]));

// Reverse map: spazi reparto -> [anagrafica reparto codes that include it]
const SPAZI_TO_REPARTI = (() => {
  const m = {};
  for (const [anag, spaziList] of Object.entries(REPARTO_TO_SPAZI)) {
    for (const sp of spaziList) {
      if (!m[sp]) m[sp] = [];
      m[sp].push(anag);
    }
  }
  return m;
})();

// Largest-remainder integer split of `total` across `weights`, preserving the sum.
function largestRemainderSplit(total, weights) {
  const n = weights.length;
  if (n === 0) return [];
  if (total <= 0) return weights.map(() => 0);
  const sumW = weights.reduce((a, b) => a + b, 0);
  // Even split when all weights are zero
  const raw = sumW === 0
    ? weights.map(() => total / n)
    : weights.map(w => (total * w) / sumW);
  const floors = raw.map(Math.floor);
  let assigned = floors.reduce((a, b) => a + b, 0);
  let remaining = total - assigned;
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);
  const result = [...floors];
  for (let k = 0; k < remaining; k++) {
    result[order[k % n].i] += 1;
  }
  return result;
}

// ----------------------------------------------------------------------------
// Single source of truth for budgets.
// Splits each spazi-reparto budget among the anagrafica reparti that map to it
// (by family-count weight, largest-remainder) so that the per-reparto budgets
// sum EXACTLY to the assignable section total. No more double-counting of
// shared spazi reparti (e.g. "No Food" shared by 4 reparti, "B.co Pesce" by 2).
// Cached per promoCode.
// ----------------------------------------------------------------------------
const _budgetCache = new Map();

export function buildPromoBudget(promoCode) {
  if (_budgetCache.has(promoCode)) return _budgetCache.get(promoCode);

  const promoSpazi = SPAZI[promoCode] || {};
  // byReparto[anagCode][sectionKey] = { prod, card, synthetic }
  const byReparto = {};
  // bySection[sectionKey] = { prod, card, synthetic }
  const bySection = {};

  const ensure = (anag) => {
    if (!byReparto[anag]) byReparto[anag] = {};
    return byReparto[anag];
  };

  // 1. Real sections: split each mapped spazi-reparto budget across its anag reparti
  for (const sectionKey of SECTION_KEYS) {
    const sez = promoSpazi[SECTION_TO_SPAZI_KEY[sectionKey]];
    if (!sez) continue;
    let sectionHasReal = false;
    // For every spazi reparto that maps to ≥1 anag reparto, split its budget
    for (const [sp, anagList] of Object.entries(SPAZI_TO_REPARTI)) {
      const v = sez.byReparto?.[sp];
      if (!v) continue;
      const prod = v.prod || 0;
      const card = v.card || 0;
      if (prod === 0 && card === 0) continue;
      sectionHasReal = true;
      const weights = anagList.map(a => REPARTO_WEIGHT[a] || 1);
      const prodSplit = largestRemainderSplit(prod, weights);
      const cardSplit = largestRemainderSplit(card, weights);
      anagList.forEach((a, idx) => {
        const slot = ensure(a);
        if (!slot[sectionKey]) slot[sectionKey] = { prod: 0, card: 0, synthetic: false };
        slot[sectionKey].prod += prodSplit[idx];
        slot[sectionKey].card += cardSplit[idx];
      });
    }
    if (sectionHasReal) {
      // mark section as real (totals computed later from per-reparto sums)
      bySection[sectionKey] = { prod: 0, card: 0, synthetic: false };
    }
  }

  // 2. Synthetic sections (present in promo metadata but no real spazi budget):
  //    derive each reparto's budget from its real Tema budget × ratio.
  // (Caller passes the active sections; here we synthesise for any section key
  //  that has a ratio and is not already real, using Tema as the base.)
  for (const sectionKey of SECTION_KEYS) {
    if (sectionKey === 'tema') continue;
    if (bySection[sectionKey]) continue; // already real
    const ratio = SYNTHETIC_BUDGET_RATIOS[sectionKey];
    if (!ratio) continue;
    let any = false;
    for (const anag of Object.keys(byReparto)) {
      const tema = byReparto[anag]['tema'];
      if (!tema || tema.prod === 0) continue;
      const prod = Math.round(tema.prod * ratio);
      const card = Math.round(tema.card * ratio);
      if (prod === 0 && card === 0) continue;
      byReparto[anag][sectionKey] = { prod, card, synthetic: true };
      any = true;
    }
    if (any) bySection[sectionKey] = { prod: 0, card: 0, synthetic: true };
  }

  // 3. Compute section totals as the EXACT sum of per-reparto budgets.
  for (const sectionKey of Object.keys(bySection)) {
    let prod = 0, card = 0;
    for (const anag of Object.keys(byReparto)) {
      const s = byReparto[anag][sectionKey];
      if (s) { prod += s.prod; card += s.card; }
    }
    bySection[sectionKey].prod = prod;
    bySection[sectionKey].card = card;
  }

  const result = { byReparto, bySection };
  _budgetCache.set(promoCode, result);
  return result;
}

// Get budget for (promo, sezione, anagrafica reparto code)
// Returns { prod, card, synthetic }.
export function getBudgetForRepartoSezione(promoCode, sectionKey, anagRepartoCode) {
  const { byReparto } = buildPromoBudget(promoCode);
  return byReparto[anagRepartoCode]?.[sectionKey] || { prod: 0, card: 0, synthetic: false };
}

// Promo total budget per sezione (exact sum of per-reparto assignable budgets)
export function getPromoTotalBudget(promoCode, sectionKey) {
  const { bySection } = buildPromoBudget(promoCode);
  const s = bySection[sectionKey];
  return s ? { prod: s.prod, card: s.card, pag: 0, synthetic: s.synthetic } : { prod: 0, card: 0, pag: 0 };
}

export default function useGridState(selectedPromo) {
  // selections[fc][sectionKey] = { p: number, c: number } - numeric count of slots
  const [allSelections, setAllSelections] = useState({}); // keyed by promoCode
  const [collapsedReparti, setCollapsedReparti] = useState({});
  const [searchText, setSearchText] = useState('');
  const [repartoFilter, setRepartoFilter] = useState([]);

  const promoCode = selectedPromo?.codice;
  const selections = useMemo(() => allSelections[promoCode] || {}, [allSelections, promoCode]);

  const setSelections = useCallback((updater) => {
    setAllSelections(prev => {
      const cur = prev[promoCode] || {};
      const next = typeof updater === 'function' ? updater(cur) : updater;
      return { ...prev, [promoCode]: next };
    });
  }, [promoCode]);

  const sections = useMemo(() => getSectionsForPromo(selectedPromo), [selectedPromo]);

  // Toggle between 0 and 1 (click-to-activate). Use setCellCount for numeric updates.
  const toggleCell = useCallback((fc, sectionKey, type = 'p') => {
    setSelections(prev => {
      const row = prev[fc] || {};
      const sec = row[sectionKey] || { p: 0, c: 0 };
      const cur = sec[type] || 0;
      const newSec = { ...sec, [type]: cur > 0 ? 0 : 1 };
      if (type === 'c' && newSec.c > 0 && !newSec.p) newSec.p = newSec.c;
      if (type === 'p' && newSec.p === 0) newSec.c = 0;
      return { ...prev, [fc]: { ...row, [sectionKey]: newSec } };
    });
  }, [setSelections]);

  // Set numeric count for a cell (clamped >= 0)
  const setCellCount = useCallback((fc, sectionKey, type, count) => {
    const safeCount = Math.max(0, Math.floor(Number(count) || 0));
    setSelections(prev => {
      const row = prev[fc] || {};
      const sec = row[sectionKey] || { p: 0, c: 0 };
      const newSec = { ...sec, [type]: safeCount };
      // Card cannot exceed Prod
      if (type === 'c' && safeCount > (newSec.p || 0)) newSec.p = safeCount;
      // If reducing Prod below Card, clamp Card
      if (type === 'p' && (newSec.c || 0) > safeCount) newSec.c = safeCount;
      return { ...prev, [fc]: { ...row, [sectionKey]: newSec } };
    });
  }, [setSelections]);

  const incCellCount = useCallback((fc, sectionKey, type, delta = 1) => {
    setSelections(prev => {
      const row = prev[fc] || {};
      const sec = row[sectionKey] || { p: 0, c: 0 };
      const cur = sec[type] || 0;
      const next = Math.max(0, cur + delta);
      const newSec = { ...sec, [type]: next };
      if (type === 'c' && next > (newSec.p || 0)) newSec.p = next;
      if (type === 'p' && (newSec.c || 0) > next) newSec.c = next;
      return { ...prev, [fc]: { ...row, [sectionKey]: newSec } };
    });
  }, [setSelections]);

  const resetSelections = useCallback(() => setSelections({}), [setSelections]);

  const applySelections = useCallback((newSelections) => {
    setSelections(newSelections);
  }, [setSelections]);

  // Apply suggestions across MULTIPLE promos
  const applyMultiPromoSuggestions = useCallback((suggestions) => {
    setAllSelections(prev => ({ ...prev, ...suggestions }));
  }, []);

  const toggleReparto = useCallback((code) => {
    setCollapsedReparti(prev => ({ ...prev, [code]: !prev[code] }));
  }, []);

  // Combine ANAGRAFICA + METRICS for current promo
  const families = useMemo(() => {
    const m = METRICS[promoCode] || {};
    return ANAGRAFICA.map(a => {
      const x = m[a.fc] || {};
      return {
        ...a,
        v: x.v || 0,
        margine: x.m || 0,
        inc: x.inc || 0,
        m1: x.m1 || 0, m2: x.m2 || 0, m3: x.m3 || 0, m4: x.m4 || 0,
        ps: x.ps || 0,
        ultimaPromo: x.ultima,
        penultimaPromo: x.penultima,
        nVol: x.nVol || 0,
        nPromo: x.nPromo || 0,
      };
    });
  }, [promoCode]);

  // Group families by reparto
  const groupedFamilies = useMemo(() => {
    const groups = {};
    for (const f of families) {
      if (!groups[f.rc]) groups[f.rc] = [];
      groups[f.rc].push(f);
    }
    return REPARTI
      .filter(r => groups[r.code])
      .map(r => ({
        code: r.code,
        name: r.name,
        families: groups[r.code],
      }));
  }, [families]);

  // Row totals for a family - sum of P and C counts across all sections
  const getRowTotals = useCallback((fc) => {
    const row = selections[fc] || {};
    let totProd = 0, totCard = 0;
    for (const s of sections) {
      const v = row[s.key];
      totProd += (v?.p || 0);
      totCard += (v?.c || 0);
    }
    return { totProd, totCard, totSlot: totProd + totCard };
  }, [selections, sections]);

  // Per-reparto budgets (PROD/CARD per section, summed counts)
  const repartoBudgets = useMemo(() => {
    return groupedFamilies.map(g => {
      const sectionBudgets = {};
      let totalProd = 0, totalCard = 0, usedProdTot = 0, usedCardTot = 0;

      for (const sec of sections) {
        const b = getBudgetForRepartoSezione(promoCode, sec.key, g.code);
        let usedProd = 0, usedCard = 0;
        for (const f of g.families) {
          const row = selections[f.fc] || {};
          const v = row[sec.key];
          usedProd += (v?.p || 0);
          usedCard += (v?.c || 0);
        }
        sectionBudgets[sec.key] = { prod: b.prod, card: b.card, usedProd, usedCard };
        totalProd += b.prod;
        totalCard += b.card;
        usedProdTot += usedProd;
        usedCardTot += usedCard;
      }

      return {
        code: g.code,
        name: g.name,
        familyCount: g.families.length,
        sectionBudgets,
        totalProd,
        totalCard,
        usedProdTot,
        usedCardTot,
      };
    });
  }, [groupedFamilies, sections, promoCode, selections]);

  // Total per-section budgets (whole promo) - summed counts
  const sectionTotals = useMemo(() => {
    return sections.map(sec => {
      const total = getPromoTotalBudget(promoCode, sec.key);
      let usedProd = 0, usedCard = 0;
      for (const fc of Object.keys(selections)) {
        const v = selections[fc][sec.key];
        usedProd += (v?.p || 0);
        usedCard += (v?.c || 0);
      }
      return {
        ...sec,
        prod: total.prod,
        card: total.card,
        pag: total.pag,
        usedProd,
        usedCard,
      };
    });
  }, [sections, promoCode, selections]);

  const totalBudget = useMemo(() => {
    return sectionTotals.reduce(
      (acc, s) => ({
        prod: acc.prod + s.prod,
        card: acc.card + s.card,
        usedProd: acc.usedProd + s.usedProd,
        usedCard: acc.usedCard + s.usedCard,
      }),
      { prod: 0, card: 0, usedProd: 0, usedCard: 0 }
    );
  }, [sectionTotals]);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    return groupedFamilies
      .filter(g => repartoFilter.length === 0 || repartoFilter.includes(g.code))
      .map(g => ({
        ...g,
        families: g.families.filter(f =>
          searchText === '' || f.fn.toLowerCase().includes(searchText.toLowerCase())
        ),
      }))
      .filter(g => g.families.length > 0);
  }, [groupedFamilies, searchText, repartoFilter]);

  return {
    selections,
    allSelections,
    sections,
    toggleCell,
    setCellCount,
    incCellCount,
    resetSelections,
    applySelections,
    applyMultiPromoSuggestions,
    collapsedReparti,
    toggleReparto,
    searchText,
    setSearchText,
    repartoFilter,
    setRepartoFilter,
    getRowTotals,
    families,
    groupedFamilies,
    filteredGroups,
    repartoBudgets,
    sectionTotals,
    totalBudget,
  };
}
