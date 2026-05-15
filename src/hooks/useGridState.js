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

// Get budget for (promo, sezione, anagrafica reparto code)
export function getBudgetForRepartoSezione(promoCode, sectionKey, anagRepartoCode) {
  const sezioneSpazi = SECTION_TO_SPAZI_KEY[sectionKey];
  if (!sezioneSpazi) return { prod: 0, card: 0 };
  const promoSpazi = SPAZI[promoCode];
  if (!promoSpazi) return { prod: 0, card: 0 };
  const sez = promoSpazi[sezioneSpazi];
  if (!sez) return { prod: 0, card: 0 };

  const mappedReparti = REPARTO_TO_SPAZI[anagRepartoCode] || [];
  let prod = 0, card = 0;
  for (const r of mappedReparti) {
    const v = sez.byReparto[r];
    if (v) { prod += v.prod || 0; card += v.card || 0; }
  }
  return { prod, card };
}

// Promo total budget per sezione
export function getPromoTotalBudget(promoCode, sectionKey) {
  const sezioneSpazi = SECTION_TO_SPAZI_KEY[sectionKey];
  if (!sezioneSpazi) return { prod: 0, card: 0, pag: 0 };
  const sez = SPAZI[promoCode]?.[sezioneSpazi];
  if (!sez) return { prod: 0, card: 0, pag: 0 };
  return { prod: sez.prod, card: sez.card, pag: sez.pag };
}

export default function useGridState(selectedPromo) {
  // selections[fc][sectionKey] = { p: 0|1, c: 0|1 }
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

  const toggleCell = useCallback((fc, sectionKey, type = 'p') => {
    setSelections(prev => {
      const row = prev[fc] || {};
      const sec = row[sectionKey] || { p: 0, c: 0 };
      const newSec = { ...sec, [type]: sec[type] ? 0 : 1 };
      // If marking as Card, auto-mark Prod too
      if (type === 'c' && newSec.c) newSec.p = 1;
      // If unmarking Prod, also unmark Card
      if (type === 'p' && !newSec.p) newSec.c = 0;
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

  // Row totals for a family
  const getRowTotals = useCallback((fc) => {
    const row = selections[fc] || {};
    let totProd = 0, totCard = 0;
    for (const s of sections) {
      const v = row[s.key];
      if (v?.p) totProd++;
      if (v?.c) totCard++;
    }
    return { totProd, totCard, totSlot: totProd + totCard };
  }, [selections, sections]);

  // Per-reparto budgets (PROD/CARD per section)
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
          if (v?.p) usedProd++;
          if (v?.c) usedCard++;
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

  // Total per-section budgets (whole promo)
  const sectionTotals = useMemo(() => {
    return sections.map(sec => {
      const total = getPromoTotalBudget(promoCode, sec.key);
      let usedProd = 0, usedCard = 0;
      for (const fc of Object.keys(selections)) {
        const v = selections[fc][sec.key];
        if (v?.p) usedProd++;
        if (v?.c) usedCard++;
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
