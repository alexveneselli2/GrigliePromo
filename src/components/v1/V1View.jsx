import { Fragment } from 'react';
import { fmtEuro, fmtPct, sparklinePath, budgetColor } from '../../utils';

function Sparkline({ values }) {
  return (
    <svg viewBox="0 0 60 20" className="w-[60px] h-[20px] inline-block">
      <path d={sparklinePath(values)} fill="none" stroke="#E1261C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Cell({ value, type, onClick, color }) {
  const active = !!value;
  const base = "w-6 h-6 rounded border-2 flex items-center justify-center text-[9px] font-bold transition-all duration-150";
  const colorClasses = {
    p: active ? 'bg-dimar-red border-dimar-red text-white scale-105' : 'border-gray-300 hover:border-dimar-red/50 bg-white text-transparent',
    c: active ? 'bg-rose-500 border-rose-500 text-white' : 'border-gray-300 hover:border-rose-400/50 bg-white text-gray-300',
  };
  return (
    <button onClick={onClick} className={`${base} ${colorClasses[type]}`}>
      {type === 'p' ? (active ? '✓' : '') : 'C'}
    </button>
  );
}

export default function V1View({ gridState }) {
  const {
    sections,
    selections,
    toggleCell,
    getRowTotals,
    filteredGroups,
    repartoBudgets,
    collapsedReparti,
    toggleReparto,
    searchText,
    setSearchText,
  } = gridState;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200">
        <input
          type="text"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          placeholder="Cerca famiglia..."
          className="text-sm border border-gray-200 rounded px-3 py-1.5 bg-gray-50 max-w-xs flex-1"
        />
        <span className="text-xs text-gray-500 ml-auto">
          Vista <strong>Classic</strong> · per ogni sezione: P = PROD, C = CARD
        </span>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-20">
            <tr className="bg-white border-b-2 border-gray-200">
              <th className="px-3 py-2 text-left font-semibold text-gray-700 bg-gray-50 w-[220px]">Famiglia</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700 bg-gray-50 w-20">Vendite</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700 bg-gray-50 w-14">Marg.</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-700 bg-gray-50 w-16">Trend</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700 bg-gray-50 w-14">Scontr.</th>
              {sections.map(sec => (
                <th key={sec.key} colSpan={2} className="px-2 py-2 text-center font-semibold border-l border-gray-100 bg-white" title={sec.label}>
                  <div className="text-[10px] truncate max-w-[80px] mx-auto">{sec.short}</div>
                </th>
              ))}
              <th className="px-2 py-2 text-center bg-gray-50 border-l-2 border-gray-300">Tot</th>
            </tr>
            <tr className="bg-gray-50 border-b border-gray-200 text-[9px]">
              <th colSpan={5}></th>
              {sections.map(sec => (
                <Fragment key={sec.key}>
                  <th className="text-center text-dimar-red font-bold border-l border-gray-100">P</th>
                  <th className="text-center text-rose-500 font-bold">C</th>
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

              return (
                <Fragment key={group.code}>
                  <tr className="cursor-pointer hover:bg-gray-50" onClick={() => toggleReparto(group.code)}>
                    <td colSpan={5 + sections.length * 2 + 1} className="px-3 py-2 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className={`w-2.5 h-2.5 rounded-full ${dotColors[semColor]}`} />
                        <span className="font-bold text-sm text-dimar-dark">{group.name}</span>
                        <span className="text-gray-400 text-xs">{group.families.length} fam.</span>
                        <span className="ml-auto text-xs">
                          P <strong className="text-dimar-red">{budget?.usedProdTot || 0}</strong>/{budget?.totalProd || 0}
                          {budget?.totalCard > 0 && (
                            <> · C <strong className="text-rose-500">{budget?.usedCardTot || 0}</strong>/{budget?.totalCard}</>
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
                      <tr key={f.fc} className={`${stripe} hover:bg-yellow-50/40 border-b border-gray-100`}>
                        <td className="px-3 py-1.5 font-medium text-dimar-dark bg-gray-50/30 border-r border-gray-100">
                          <span className="block truncate max-w-[210px]" title={f.fn}>{f.fn}</span>
                        </td>
                        <td className="px-3 py-1.5 text-right text-gray-600 bg-gray-50/30 font-mono tabular-nums">{fmtEuro(f.v)}</td>
                        <td className="px-3 py-1.5 text-right text-gray-600 bg-gray-50/30 font-mono tabular-nums">{fmtPct(f.margine)}</td>
                        <td className="px-3 py-1.5 text-center bg-gray-50/30">
                          <Sparkline values={[f.m1, f.m2, f.m3, f.m4]} />
                        </td>
                        <td className="px-3 py-1.5 text-right text-gray-600 bg-gray-50/30 font-mono tabular-nums border-r border-gray-200">{fmtPct(f.ps)}</td>
                        {sections.map(sec => {
                          const v = row[sec.key];
                          return (
                            <Fragment key={sec.key}>
                              <td className="px-1 py-1 text-center border-l border-gray-50">
                                <div className="flex justify-center">
                                  <Cell value={v?.p} type="p" onClick={() => toggleCell(f.fc, sec.key, 'p')} />
                                </div>
                              </td>
                              <td className="px-1 py-1 text-center">
                                <div className="flex justify-center">
                                  <Cell value={v?.c} type="c" onClick={() => toggleCell(f.fc, sec.key, 'c')} />
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
  );
}
