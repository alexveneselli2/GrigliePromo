import { Fragment, useMemo } from 'react';
import { fmtEuro, fmtPct, sparklinePath, budgetColor } from '../../utils';
import V1BudgetSidebar from './V1BudgetSidebar';
import V1Toolbar from './V1Toolbar';
import Stepper from '../common/Stepper';

function Sparkline({ values }) {
  return (
    <svg viewBox="0 0 60 20" className="w-[60px] h-[20px] inline-block">
      <path d={sparklinePath(values)} fill="none" stroke="#E1261C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}


export default function V1View({ gridState }) {
  const {
    sections,
    selections,
    incCellCount,
    getRowTotals,
    filteredGroups,
    groupedFamilies,
    repartoBudgets,
    sectionTotals,
    totalBudget,
    collapsedReparti,
    toggleReparto,
    searchText,
    setSearchText,
    repartoFilter,
    setRepartoFilter,
  } = gridState;

  const totalCount = useMemo(
    () => groupedFamilies.reduce((s, g) => s + g.families.length, 0),
    [groupedFamilies]
  );
  const visibleCount = useMemo(
    () => filteredGroups.reduce((s, g) => s + g.families.length, 0),
    [filteredGroups]
  );

  // Column count for header colspan calculation
  const readonlyCols = 8; // Famiglia, Reparto, Vendite, Margine, Trend, Scontr, NVol, UltimaPromo
  const inputCols = sections.length * 2;
  const totalCols = readonlyCols + inputCols + 1; // +1 for Tot

  return (
    <div className="flex flex-1 overflow-hidden">
      <V1BudgetSidebar
        repartoBudgets={repartoBudgets}
        sectionTotals={sectionTotals}
        totalBudget={totalBudget}
        sections={sections}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <V1Toolbar
          searchText={searchText}
          onSearchChange={setSearchText}
          repartoFilter={repartoFilter}
          onRepartoFilterChange={setRepartoFilter}
          totalCount={totalCount}
          visibleCount={visibleCount}
        />

        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-20">
              {/* Group header */}
              <tr className="bg-gray-100">
                <th colSpan={readonlyCols} className="px-3 py-1.5 text-left text-[10px] uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-200">
                  Dati Famiglia
                </th>
                <th colSpan={inputCols} className="px-3 py-1.5 text-center text-[10px] uppercase tracking-wider text-dimar-red font-semibold border-b border-gray-200 border-l-2 border-l-dimar-red/20 bg-red-50/50">
                  Sezioni Promo
                </th>
                <th className="px-3 py-1.5 text-center text-[10px] uppercase tracking-wider text-gray-600 font-semibold border-b border-gray-200 border-l-2 border-l-gray-300 bg-gray-50">
                  Tot
                </th>
              </tr>
              {/* Column headers */}
              <tr className="bg-white border-b-2 border-gray-200">
                <th className="px-3 py-2 text-left font-semibold text-gray-700 bg-gray-50 w-[200px] min-w-[200px]">Famiglia</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 bg-gray-50 w-[110px]">Reparto</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 bg-gray-50 w-20">Vendite</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 bg-gray-50 w-14">Marg.</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700 bg-gray-50 w-16">Trend</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 bg-gray-50 w-14">Scontr.</th>
                <th className="px-2 py-2 text-center font-semibold text-gray-700 bg-gray-50 w-10" title="Numero volte in volantino">N.Vol</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 bg-gray-50 w-[120px]" title="Ultima promo in volantino">Ultima Promo</th>
                {sections.map(sec => (
                  <th key={sec.key} colSpan={2} className="px-2 py-2 text-center font-semibold border-l border-gray-100 bg-white min-w-[140px]" title={sec.label}>
                    <div className="text-[10px] truncate max-w-[140px] mx-auto">{sec.short}</div>
                  </th>
                ))}
                <th className="px-2 py-2 text-center bg-gray-50 border-l-2 border-gray-300">Tot</th>
              </tr>
              {/* P/C sub-headers */}
              <tr className="bg-gray-50 border-b border-gray-200 text-[9px]">
                <th colSpan={readonlyCols}></th>
                {sections.map(sec => (
                  <Fragment key={sec.key}>
                    <th className="text-center text-dimar-red font-bold border-l border-gray-100 py-0.5 min-w-[70px]">PROD</th>
                    <th className="text-center text-rose-500 font-bold py-0.5 min-w-[70px]">CARD</th>
                  </Fragment>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredGroups.map(group => {
                const isCollapsed = collapsedReparti[group.code];
                const budget = repartoBudgets.find(r => r.code === group.code);
                const semColor = budgetColor(budget?.usedProdTot || 0, budget?.totalProd || 0);
                const dotColors = { green: 'bg-emerald-500', yellow: 'bg-amber-400', red: 'bg-red-500', gray: 'bg-gray-300' };
                const textSem = { green: 'text-emerald-600', yellow: 'text-amber-600', red: 'text-red-600', gray: 'text-gray-500' }[semColor];

                return (
                  <Fragment key={group.code}>
                    <tr className="cursor-pointer hover:bg-gray-100/60" onClick={() => toggleReparto(group.code)}>
                      <td colSpan={totalCols} className="px-3 py-2 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center gap-3">
                          <svg className={`w-4 h-4 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span className={`w-2.5 h-2.5 rounded-full ${dotColors[semColor]}`} />
                          <span className="font-bold text-sm text-dimar-dark">{group.name}</span>
                          <span className="text-gray-400 text-xs">{group.families.length} famiglie</span>
                          <span className="ml-auto text-xs font-mono">
                            <span className="text-gray-500">PROD </span>
                            <span className={`font-bold ${textSem}`}>{budget?.usedProdTot || 0}</span>
                            <span className="text-gray-400">/{budget?.totalProd || 0}</span>
                            {budget?.totalCard > 0 && (
                              <>
                                <span className="text-gray-300 mx-2">|</span>
                                <span className="text-gray-500">CARD </span>
                                <span className="font-bold text-rose-500">{budget?.usedCardTot || 0}</span>
                                <span className="text-gray-400">/{budget?.totalCard}</span>
                              </>
                            )}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {!isCollapsed && group.families.map((f, fi) => {
                      const row = selections[f.fc] || {};
                      const totals = getRowTotals(f.fc);
                      const stripe = fi % 2 === 0 ? 'bg-white' : 'bg-gray-50/50';
                      return (
                        <tr key={f.fc} className={`${stripe} hover:bg-yellow-50/40 border-b border-gray-100 transition-colors`}>
                          <td className="px-3 py-1.5 font-medium text-dimar-dark bg-gray-50/30 border-r border-gray-100">
                            <span className="block truncate max-w-[190px]" title={f.fn}>{f.fn}</span>
                            <span className="block text-[9px] text-gray-400 truncate" title={f.sn}>{f.sn}</span>
                          </td>
                          <td className="px-3 py-1.5 text-gray-600 bg-gray-50/30 text-[10px] truncate" title={f.rn}>
                            {f.rn}
                          </td>
                          <td className="px-3 py-1.5 text-right text-gray-600 bg-gray-50/30 font-mono tabular-nums">{fmtEuro(f.v)}</td>
                          <td className="px-3 py-1.5 text-right text-gray-600 bg-gray-50/30 font-mono tabular-nums">{fmtPct(f.margine)}</td>
                          <td className="px-3 py-1.5 text-center bg-gray-50/30">
                            <Sparkline values={[f.m1, f.m2, f.m3, f.m4]} />
                          </td>
                          <td className="px-3 py-1.5 text-right text-gray-600 bg-gray-50/30 font-mono tabular-nums">{fmtPct(f.ps)}</td>
                          <td className="px-2 py-1.5 text-center text-gray-600 bg-gray-50/30 font-mono tabular-nums" title="Volte in volantino">
                            {f.nVol || '—'}
                          </td>
                          <td className="px-3 py-1.5 text-gray-500 bg-gray-50/30 border-r border-gray-200 text-[10px] truncate" title={f.ultimaPromo || 'mai in volantino'}>
                            {f.ultimaPromo || <span className="text-gray-300">—</span>}
                          </td>
                          {sections.map(sec => {
                            const v = row[sec.key];
                            return (
                              <Fragment key={sec.key}>
                                <td className="px-1 py-1 text-center border-l border-gray-50">
                                  <div className="flex justify-center">
                                    <Stepper
                                      variant="inline"
                                      color={sec.color}
                                      size="sm"
                                      value={v?.p || 0}
                                      onIncrement={() => incCellCount(f.fc, sec.key, 'p', 1)}
                                      onDecrement={() => incCellCount(f.fc, sec.key, 'p', -1)}
                                      title={`${sec.label} – PROD`}
                                    />
                                  </div>
                                </td>
                                <td className="px-1 py-1 text-center">
                                  <div className="flex justify-center">
                                    <Stepper
                                      variant="inline"
                                      color="rose"
                                      size="sm"
                                      value={v?.c || 0}
                                      max={v?.p || 0}
                                      onIncrement={() => incCellCount(f.fc, sec.key, 'c', 1)}
                                      onDecrement={() => incCellCount(f.fc, sec.key, 'c', -1)}
                                      title={`${sec.label} – CARD (max ${v?.p || 0})`}
                                    />
                                  </div>
                                </td>
                              </Fragment>
                            );
                          })}
                          <td className={`px-2 py-1.5 text-center font-bold border-l-2 border-gray-300 tabular-nums ${totals.totSlot > 0 ? 'text-dimar-dark' : 'text-gray-300'}`}>
                            {totals.totSlot}
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
