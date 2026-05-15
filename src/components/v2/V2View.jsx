import { useState, useMemo, useCallback } from 'react';
import V2BudgetPanel from './V2BudgetPanel';
import V2FamilyCard from './V2FamilyCard';
import V2FiltersBar from './V2FiltersBar';
import V2RepartoHeader from './V2RepartoHeader';

export default function V2View({ gridState, selectedPromo }) {
  const {
    selections,
    sections,
    toggleCell,
    incCellCount,
    getRowTotals,
    searchText,
    setSearchText,
    repartoFilter,
    setRepartoFilter,
    filteredGroups,
    repartoBudgets,
    sectionTotals,
    totalBudget,
    collapsedReparti,
    toggleReparto,
  } = gridState;

  const [sortBy, setSortBy] = useState('default');
  const [showOnlyAssigned, setShowOnlyAssigned] = useState(false);

  const displayGroups = useMemo(() => {
    return filteredGroups.map(g => {
      let families = [...g.families];
      if (showOnlyAssigned) {
        families = families.filter(f => getRowTotals(f.fc).totSlot > 0);
      }
      if (sortBy === 'vendite') families.sort((a, b) => b.v - a.v);
      else if (sortBy === 'margine') families.sort((a, b) => b.margine - a.margine);
      else if (sortBy === 'assigned') {
        families.sort((a, b) => getRowTotals(b.fc).totSlot - getRowTotals(a.fc).totSlot);
      }
      return { ...g, families };
    }).filter(g => g.families.length > 0);
  }, [filteredGroups, sortBy, showOnlyAssigned, getRowTotals]);

  const allCollapsed = useMemo(
    () => displayGroups.length > 0 && displayGroups.every(g => collapsedReparti[g.code]),
    [displayGroups, collapsedReparti]
  );

  const expandAllReparti = useCallback(() => {
    displayGroups.forEach(g => { if (collapsedReparti[g.code]) toggleReparto(g.code); });
  }, [displayGroups, collapsedReparti, toggleReparto]);

  const collapseAllReparti = useCallback(() => {
    displayGroups.forEach(g => { if (!collapsedReparti[g.code]) toggleReparto(g.code); });
  }, [displayGroups, collapsedReparti, toggleReparto]);

  return (
    <div className="flex flex-1 overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <V2BudgetPanel
        repartoBudgets={repartoBudgets}
        totalBudget={totalBudget}
        sectionTotals={sectionTotals}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <V2FiltersBar
          searchText={searchText}
          onSearchChange={setSearchText}
          repartoFilter={repartoFilter}
          onRepartoFilterChange={setRepartoFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          showOnlyAssigned={showOnlyAssigned}
          onShowOnlyAssignedChange={setShowOnlyAssigned}
          allCollapsed={allCollapsed}
          onExpandAll={expandAllReparti}
          onCollapseAll={collapseAllReparti}
        />

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {displayGroups.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm">Nessuna famiglia trovata con i filtri correnti</p>
            </div>
          )}

          {displayGroups.map(group => {
            const isCollapsed = collapsedReparti[group.code];
            const budget = repartoBudgets.find(r => r.code === group.code);

            return (
              <section key={group.code} className="mb-4">
                <V2RepartoHeader
                  group={group}
                  isCollapsed={isCollapsed}
                  onToggle={() => toggleReparto(group.code)}
                  budget={budget}
                  selections={selections}
                  sections={sections}
                  getRowTotals={getRowTotals}
                />

                {!isCollapsed && (
                  <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 animate-expand">
                    {group.families.map(f => (
                      <V2FamilyCard
                        key={f.fc}
                        family={f}
                        sections={sections}
                        selections={selections[f.fc] || {}}
                        onInc={(secKey, type, delta) => incCellCount(f.fc, secKey, type, delta)}
                        totals={getRowTotals(f.fc)}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
