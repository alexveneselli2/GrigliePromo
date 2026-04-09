import { useState, useCallback } from 'react';
import PROMOZIONI from './data/promozioni';
import Header from './components/Header';
import BudgetDashboard from './components/BudgetDashboard';
import GridFilters from './components/GridFilters';
import PromoGrid from './components/PromoGrid';
import AISuggestions from './components/AISuggestions';
import useGridState from './hooks/useGridState';

export default function App() {
  const [selectedPromoIdx, setSelectedPromoIdx] = useState(0);
  const selectedPromo = PROMOZIONI[selectedPromoIdx];

  const {
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
    filteredGroups,
    repartoBudgets,
    totalBudget,
  } = useGridState(selectedPromo);

  const handlePromoChange = useCallback((idx) => {
    setSelectedPromoIdx(idx);
    resetSelections();
  }, [resetSelections]);

  return (
    <div className="h-screen flex flex-col bg-dimar-gray">
      <Header selectedPromoIdx={selectedPromoIdx} onPromoChange={handlePromoChange} />

      <div className="flex flex-1 overflow-hidden">
        <BudgetDashboard repartoBudgets={repartoBudgets} totalBudget={totalBudget} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <GridFilters
            searchText={searchText}
            onSearchChange={setSearchText}
            repartoFilter={repartoFilter}
            onRepartoFilterChange={setRepartoFilter}
          />
          <PromoGrid
            filteredGroups={filteredGroups}
            columns={columns}
            volKeys={volKeys}
            affKeys={affKeys}
            selections={selections}
            toggleCell={toggleCell}
            getRowTotals={getRowTotals}
            collapsedReparti={collapsedReparti}
            toggleReparto={toggleReparto}
            repartoBudgets={repartoBudgets}
          />
        </div>
      </div>

      <AISuggestions
        columns={columns}
        volKeys={volKeys}
        onApply={applySelections}
        onReset={resetSelections}
      />
    </div>
  );
}
