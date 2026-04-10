import { useState, useMemo } from 'react';
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

          {displayGroups.map(group => (
            <section key={group.code} className="mb-8">
              {/* Reparto header */}
              <div className="flex items-center gap-3 mb-3 pb-2 border-b-2 border-gray-100">
                <div className="w-1 h-6 bg-gradient-to-b from-dimar-red to-indigo-600 rounded-full" />
                <h3 className="text-base font-bold text-dimar-dark">{group.name}</h3>
                <span className="text-xs text-gray-400">{group.families.length} famiglie</span>
                <div className="ml-auto flex items-center gap-3 text-xs">
                  <span className="text-gray-500">
                    Vol. <strong className="text-dimar-red">{repartoBudgets.find(r => r.code === group.code)?.usedVol || 0}</strong>
                    <span className="text-gray-400">/{group.budget_vol}</span>
                  </span>
                  {group.budget_aff > 0 && (
                    <span className="text-gray-500">
                      Aff. <strong className="text-blue-600">{repartoBudgets.find(r => r.code === group.code)?.usedAff || 0}</strong>
                      <span className="text-gray-400">/{group.budget_aff}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Family cards grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
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
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
