import { useState, useMemo, useCallback } from 'react';
import V2BudgetPanel from './V2BudgetPanel';
import V2FamilyCard from './V2FamilyCard';
import V2FiltersBar from './V2FiltersBar';
import V2RepartoHeader from './V2RepartoHeader';

export default function V2View({ gridState, selectedPromo }) {
  const {
    selections,
    columns,
    toggleCell,
    getRowTotals,
    searchText,
    setSearchText,
    repartoFilter,
    setRepartoFilter,
    filteredGroups,
    repartoBudgets,
    totalBudget,
    collapsedReparti,
    toggleReparto,
  } = gridState;

  const [sortBy, setSortBy] = useState('default'); // default | vendite | margine | assigned
  const [showOnlyAssigned, setShowOnlyAssigned] = useState(false);

  // Flatten & sort families
  const displayGroups = useMemo(() => {
    return filteredGroups.map(g => {
      let families = [...g.families];
      if (showOnlyAssigned) {
        families = families.filter(f => {
          const row = selections[f.fc] || {};
          return Object.values(row).some(v => v);
        });
      }
      if (sortBy === 'vendite') families.sort((a, b) => b.v - a.v);
      else if (sortBy === 'margine') families.sort((a, b) => b.m - a.m);
      else if (sortBy === 'assigned') {
        families.sort((a, b) => {
          const aT = getRowTotals(a.fc).totPromo;
          const bT = getRowTotals(b.fc).totPromo;
          return bT - aT;
        });
      }
      return { ...g, families };
    }).filter(g => g.families.length > 0);
  }, [filteredGroups, sortBy, showOnlyAssigned, selections, getRowTotals]);

  const allCollapsed = useMemo(() => {
    return displayGroups.length > 0 && displayGroups.every(g => collapsedReparti[g.code]);
  }, [displayGroups, collapsedReparti]);

  const expandAllReparti = useCallback(() => {
    displayGroups.forEach(g => {
      if (collapsedReparti[g.code]) toggleReparto(g.code);
    });
  }, [displayGroups, collapsedReparti, toggleReparto]);

  const collapseAllReparti = useCallback(() => {
    displayGroups.forEach(g => {
      if (!collapsedReparti[g.code]) toggleReparto(g.code);
    });
  }, [displayGroups, collapsedReparti, toggleReparto]);

  return (
    <div className="flex flex-1 overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Left: budget panel */}
      <V2BudgetPanel repartoBudgets={repartoBudgets} totalBudget={totalBudget} />

      {/* Right: main content */}
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
              <svg className="w-16 h-16 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
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
                  getRowTotals={getRowTotals}
                />

                {/* Family cards grid (collapsible content) */}
                {!isCollapsed && (
                  <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 animate-expand">
                    {group.families.map(f => (
                      <V2FamilyCard
                        key={f.fc}
                        family={f}
                        columns={columns}
                        selections={selections[f.fc] || {}}
                        onToggle={(col) => toggleCell(f.fc, col)}
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
