import { Fragment } from 'react';
import { fmtEuro, fmtPct, sparklinePath, budgetColor } from '../utils';

function Sparkline({ values }) {
  const path = sparklinePath(values);
  return (
    <svg viewBox="0 0 60 20" className="w-[60px] h-[20px] inline-block">
      <path d={path} fill="none" stroke="#E1261C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Checkbox({ checked, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all duration-150 ${
        checked
          ? 'bg-dimar-red border-dimar-red text-white scale-105'
          : 'border-gray-300 hover:border-dimar-red/50 bg-white'
      }`}
    >
      {checked ? (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : null}
    </button>
  );
}

export default function PromoGrid({
  filteredGroups,
  columns,
  volKeys,
  affKeys,
  selections,
  toggleCell,
  getRowTotals,
  collapsedReparti,
  toggleReparto,
  repartoBudgets,
}) {
  const volCols = columns.filter(c => c.group === 'vol');
  const affCols = columns.filter(c => c.group === 'aff');

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 z-20">
          {/* Group header row */}
          <tr className="bg-gray-100">
            <th colSpan={7} className="px-3 py-1.5 text-left text-[10px] uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-200 bg-gray-100">
              Dati Famiglia
            </th>
            <th colSpan={volCols.length} className="px-3 py-1.5 text-center text-[10px] uppercase tracking-wider text-dimar-red font-semibold border-b border-gray-200 border-l-2 border-l-dimar-red/20 bg-red-50/50">
              Volantino
            </th>
            <th colSpan={affCols.length} className="px-3 py-1.5 text-center text-[10px] uppercase tracking-wider text-blue-600 font-semibold border-b border-gray-200 border-l-2 border-l-blue-200 bg-blue-50/50">
              Affiancamento
            </th>
            <th colSpan={3} className="px-3 py-1.5 text-center text-[10px] uppercase tracking-wider text-gray-600 font-semibold border-b border-gray-200 border-l-2 border-l-gray-300 bg-gray-50">
              Totali
            </th>
          </tr>
          {/* Column headers */}
          <tr className="bg-white border-b-2 border-gray-200">
            <th className="px-3 py-2 text-left font-semibold text-gray-700 bg-gray-50 w-[200px] min-w-[200px]">Famiglia</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-700 bg-gray-50 w-20">Vendite</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-700 bg-gray-50 w-14">Marg.%</th>
            <th className="px-3 py-2 text-center font-semibold text-gray-700 bg-gray-50 w-16">Trend</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-700 bg-gray-50 w-14">Scontr.</th>
            <th className="px-3 py-2 text-center font-semibold text-gray-700 bg-gray-50 w-10">St.V</th>
            <th className="px-3 py-2 text-center font-semibold text-gray-700 bg-gray-50 w-10">St.P</th>
            {volCols.map(c => (
              <th key={c.key} className="px-1.5 py-2 text-center font-semibold text-dimar-red border-l border-gray-100 bg-white w-16 max-w-[70px]">
                <span className="block truncate" title={c.label}>{c.label.length > 10 ? c.label.slice(0, 10) + '...' : c.label}</span>
              </th>
            ))}
            {affCols.map(c => (
              <th key={c.key} className="px-1.5 py-2 text-center font-semibold text-blue-600 border-l border-gray-100 bg-white w-16 max-w-[70px]">
                <span className="block truncate" title={c.label}>{c.label.length > 12 ? c.label.slice(0, 12) + '...' : c.label}</span>
              </th>
            ))}
            <th className="px-2 py-2 text-center font-semibold text-gray-700 border-l-2 border-gray-300 bg-gray-50 w-10">Vol</th>
            <th className="px-2 py-2 text-center font-semibold text-gray-700 bg-gray-50 w-10">Aff</th>
            <th className="px-2 py-2 text-center font-semibold text-gray-700 bg-gray-50 w-10">Tot</th>
          </tr>
        </thead>
        <tbody>
          {filteredGroups.map(group => {
            const isCollapsed = collapsedReparti[group.code];
            const budget = repartoBudgets.find(r => r.code === group.code);
            const color = budgetColor(budget?.usedVol || 0, group.budget_vol);
            const bgColors = {
              green: 'bg-emerald-600',
              yellow: 'bg-amber-500',
              red: 'bg-red-600',
              gray: 'bg-gray-500',
            };

            return (
              <Fragment key={group.code}>
                {/* Reparto header */}
                <tr
                  className="cursor-pointer hover:bg-gray-50 group"
                  onClick={() => toggleReparto(group.code)}
                >
                  <td
                    colSpan={7 + volCols.length + affCols.length + 3}
                    className="px-3 py-2 border-b border-gray-200"
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className={`w-2.5 h-2.5 rounded-full ${bgColors[color]}`} />
                      <span className="font-bold text-sm text-dimar-dark">{group.name}</span>
                      <span className="text-gray-400 text-xs">{group.families.length} famiglie</span>
                      <span className="ml-auto text-xs font-mono">
                        <span className="text-gray-500">Vol </span>
                        <span className={`font-bold ${color === 'red' ? 'text-red-600' : color === 'yellow' ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {budget?.usedVol || 0}
                        </span>
                        <span className="text-gray-400">/{group.budget_vol}</span>
                        {group.budget_aff > 0 && (
                          <>
                            <span className="text-gray-300 mx-2">|</span>
                            <span className="text-gray-500">Aff </span>
                            <span className="font-bold text-blue-600">{budget?.usedAff || 0}</span>
                            <span className="text-gray-400">/{group.budget_aff}</span>
                          </>
                        )}
                      </span>
                    </div>
                  </td>
                </tr>
                {/* Family rows */}
                {!isCollapsed && group.families.map((f, fi) => {
                  const row = selections[f.fc] || {};
                  const { totVol, totAff, totPromo } = getRowTotals(f.fc);
                  const stripe = fi % 2 === 0 ? 'bg-white' : 'bg-gray-50/50';

                  return (
                    <tr key={f.fc} className={`${stripe} hover:bg-yellow-50/40 border-b border-gray-100 transition-colors`}>
                      <td className="px-3 py-1.5 text-left font-medium text-dimar-dark bg-gray-50/30 border-r border-gray-100">
                        <span className="block truncate max-w-[190px]" title={f.fn}>{f.fn}</span>
                      </td>
                      <td className="px-3 py-1.5 text-right text-gray-600 bg-gray-50/30 font-mono tabular-nums">{fmtEuro(f.v)}</td>
                      <td className="px-3 py-1.5 text-right text-gray-600 bg-gray-50/30 font-mono tabular-nums">{fmtPct(f.m)}</td>
                      <td className="px-3 py-1.5 text-center bg-gray-50/30">
                        <Sparkline values={[f.m1, f.m2, f.m3, f.m4]} />
                      </td>
                      <td className="px-3 py-1.5 text-right text-gray-600 bg-gray-50/30 font-mono tabular-nums">{fmtPct(f.ps)}</td>
                      <td className="px-3 py-1.5 text-center text-gray-500 bg-gray-50/30">{f.storicoVol}</td>
                      <td className="px-3 py-1.5 text-center text-gray-500 bg-gray-50/30 border-r border-gray-200">{f.storicoPromo}</td>
                      {volCols.map(c => (
                        <td key={c.key} className="px-1.5 py-1 text-center border-l border-gray-50">
                          <div className="flex justify-center">
                            <Checkbox checked={!!row[c.key]} onChange={() => toggleCell(f.fc, c.key)} />
                          </div>
                        </td>
                      ))}
                      {affCols.map(c => (
                        <td key={c.key} className="px-1.5 py-1 text-center border-l border-gray-50">
                          <div className="flex justify-center">
                            <Checkbox checked={!!row[c.key]} onChange={() => toggleCell(f.fc, c.key)} />
                          </div>
                        </td>
                      ))}
                      <td className={`px-2 py-1.5 text-center font-bold border-l-2 border-gray-300 tabular-nums ${totVol > 0 ? 'text-dimar-red' : 'text-gray-300'}`}>{totVol}</td>
                      <td className={`px-2 py-1.5 text-center font-bold tabular-nums ${totAff > 0 ? 'text-blue-600' : 'text-gray-300'}`}>{totAff}</td>
                      <td className={`px-2 py-1.5 text-center font-bold tabular-nums ${totPromo > 0 ? 'text-dimar-dark' : 'text-gray-300'}`}>{totPromo}</td>
                    </tr>
                  );
                })}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

