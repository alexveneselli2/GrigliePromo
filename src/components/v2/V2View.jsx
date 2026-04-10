import { useState, useMemo, useCallback } from 'react';
import V2BudgetPanel from './V2BudgetPanel';
import V2FamilyCard from './V2FamilyCard';
import V2FiltersBar from './V2FiltersBar';

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
            const assignedCount = group.families.filter(f => {
              const row = selections[f.fc] || {};
              return Object.values(row).some(v => v);
            }).length;

            return (
              <section key={group.code} className="mb-4">
                {/* Reparto header (dropdown-style) */}
                <button
                  onClick={() => toggleReparto(group.code)}
                  className="w-full text-left flex items-center gap-3 py-3 px-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group"
                >
                  <svg
                    className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 group-hover:text-indigo-600 ${
                      isCollapsed ? '' : 'rotate-90'
                    }`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                  <div className="w-1 h-6 bg-gradient-to-b from-dimar-red to-indigo-600 rounded-full shrink-0" />
                  <h3 className="text-base font-bold text-dimar-dark">{group.name}</h3>
                  <span className="text-xs text-gray-400">{group.families.length} famiglie</span>
                  {assignedCount > 0 && (
                    <span className="px-2 py-0.5 bg-dimar-red/10 text-dimar-red text-[10px] font-bold rounded-full">
                      {assignedCount} assegnate
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-3 text-xs">
                    <span className="text-gray-500">
                      Vol. <strong className="text-dimar-red">{budget?.usedVol || 0}</strong>
                      <span className="text-gray-400">/{group.budget_vol}</span>
                    </span>
                    {group.budget_aff > 0 && (
                      <span className="text-gray-500">
                        Aff. <strong className="text-blue-600">{budget?.usedAff || 0}</strong>
                        <span className="text-gray-400">/{group.budget_aff}</span>
                      </span>
                    )}
                  </div>
                </button>

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
