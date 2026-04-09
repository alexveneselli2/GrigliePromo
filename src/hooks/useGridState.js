import { useState, useMemo, useCallback } from 'react';
import FAMIGLIE from '../data/famiglie';
import REPARTI from '../data/reparti';

// Get dynamic column keys for a given promo
export function getPromoColumns(promo) {
  const cols = [];
  // Volantino columns
  cols.push({ key: 'tema', label: promo.tema.split(' - ')[0], group: 'vol' });
  if (promo.speciale1 !== 'NA') cols.push({ key: 'spec1', label: promo.speciale1.split(' - ')[0], group: 'vol' });
  if (promo.speciale2 !== 'NA') cols.push({ key: 'spec2', label: promo.speciale2.split(' - ')[0], group: 'vol' });
  if (promo.speciale4 !== 'NA') cols.push({ key: 'spec4', label: promo.speciale4.split(' - ')[0], group: 'vol' });
  cols.push({ key: 'mcs', label: 'MCS', group: 'vol' });
  cols.push({ key: 'card', label: 'Card', group: 'vol' });
  cols.push({ key: 'buyers', label: 'Buyers', group: 'vol' });
  // Affiancamento columns
  if (promo.sotto_tema !== 'NA') cols.push({ key: 'tp_aff', label: 'Taglio Prezzo Aff.', group: 'aff' });
  cols.push({ key: 'card_aff', label: 'Card Aff.', group: 'aff' });
  cols.push({ key: 'buyer_aff', label: 'Buyer Aff.', group: 'aff' });
  return cols;
}

export default function useGridState(selectedPromo) {
  // selections[familyCode][columnKey] = 0 | 1
  const [selections, setSelections] = useState({});
  const [collapsedReparti, setCollapsedReparti] = useState({});
  const [searchText, setSearchText] = useState('');
  const [repartoFilter, setRepartoFilter] = useState([]);

  const columns = useMemo(() => getPromoColumns(selectedPromo), [selectedPromo]);

  const volKeys = useMemo(() => columns.filter(c => c.group === 'vol').map(c => c.key), [columns]);
  const affKeys = useMemo(() => columns.filter(c => c.group === 'aff').map(c => c.key), [columns]);

  const toggleCell = useCallback((fc, colKey) => {
    setSelections(prev => {
      const row = prev[fc] || {};
      const current = row[colKey] || 0;
      return { ...prev, [fc]: { ...row, [colKey]: current ? 0 : 1 } };
    });
  }, []);

  const resetSelections = useCallback(() => setSelections({}), []);

  const applySelections = useCallback((newSelections) => {
    setSelections(newSelections);
  }, []);

  const toggleReparto = useCallback((code) => {
    setCollapsedReparti(prev => ({ ...prev, [code]: !prev[code] }));
  }, []);

  // Compute row totals for each family
  const getRowTotals = useCallback((fc) => {
    const row = selections[fc] || {};
    const totVol = volKeys.reduce((sum, k) => sum + (row[k] || 0), 0);
    const totAff = affKeys.reduce((sum, k) => sum + (row[k] || 0), 0);
    return { totVol, totAff, totPromo: totVol + totAff };
  }, [selections, volKeys, affKeys]);

  // Group families by reparto
  const groupedFamilies = useMemo(() => {
    const groups = {};
    const repartoOrder = REPARTI.map(r => r.code);

    for (const f of FAMIGLIE) {
      const code = f.repartoCode;
      if (!groups[code]) groups[code] = [];
      groups[code].push(f);
    }

    return repartoOrder
      .filter(code => groups[code])
      .map(code => {
        const reparto = REPARTI.find(r => r.code === code);
        return {
          code,
          name: reparto?.name || code,
          budget_vol: reparto?.budget_vol || 0,
          budget_aff: reparto?.budget_aff || 0,
          budget_card: reparto?.budget_card || 0,
          families: groups[code],
        };
      });
  }, []);

  // Budget stats per reparto
  const repartoBudgets = useMemo(() => {
    return groupedFamilies.map(group => {
      let usedVol = 0;
      let usedAff = 0;
      let usedCard = 0;

      for (const f of group.families) {
        const row = selections[f.fc] || {};
        const hasVol = volKeys.some(k => row[k]);
        const hasAff = affKeys.some(k => row[k]);
        const hasCard = (row.card || 0) + (row.card_aff || 0) > 0;
        if (hasVol) usedVol++;
        if (hasAff) usedAff++;
        if (hasCard) usedCard++;
      }

      return {
        code: group.code,
        name: group.name,
        budget_vol: group.budget_vol,
        budget_aff: group.budget_aff,
        budget_card: group.budget_card,
        usedVol,
        usedAff,
        usedCard,
      };
    });
  }, [groupedFamilies, selections, volKeys, affKeys]);

  // Total overall
  const totalBudget = useMemo(() => {
    return repartoBudgets.reduce(
      (acc, r) => ({
        budgetVol: acc.budgetVol + r.budget_vol,
        budgetAff: acc.budgetAff + r.budget_aff,
        budgetCard: acc.budgetCard + r.budget_card,
        usedVol: acc.usedVol + r.usedVol,
        usedAff: acc.usedAff + r.usedAff,
        usedCard: acc.usedCard + r.usedCard,
      }),
      { budgetVol: 0, budgetAff: 0, budgetCard: 0, usedVol: 0, usedAff: 0, usedCard: 0 }
    );
  }, [repartoBudgets]);

  // Filtered families
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
    columns,
    volKeys,
    affKeys,
    toggleCell,
    resetSelections,
    applySelections,
    collapsedReparti,
    toggleReparto,
    searchText,
    setSearchText,
    repartoFilter,
    setRepartoFilter,
    getRowTotals,
    groupedFamilies,
    filteredGroups,
    repartoBudgets,
    totalBudget,
  };
}
