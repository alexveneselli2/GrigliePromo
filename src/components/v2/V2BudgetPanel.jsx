import { budgetColor } from '../../utils';

function DonutRing({ used, budget, size = 44, stroke = 5 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = budget > 0 ? Math.min(used / budget, 1.2) : 0;
  const color = budgetColor(used, budget);
  const colors = {
    green: '#10b981',
    yellow: '#f59e0b',
    red: '#ef4444',
    gray: '#d1d5db',
  };
  const dashOffset = circumference * (1 - Math.min(pct, 1));

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} stroke="#f1f5f9" strokeWidth={stroke} fill="none" />
        <circle
          cx={size/2} cy={size/2} r={radius}
          stroke={colors[color]} strokeWidth={stroke} strokeLinecap="round" fill="none"
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold tabular-nums" style={{ color: colors[color] }}>
          {budget > 0 ? Math.round(pct * 100) : 0}%
        </span>
      </div>
    </div>
  );
}

const SECTION_COLORS = {
  red: 'from-dimar-red to-rose-500',
  orange: 'from-orange-600 to-orange-400',
  amber: 'from-amber-600 to-amber-400',
  green: 'from-emerald-600 to-emerald-400',
  teal: 'from-teal-600 to-teal-400',
  blue: 'from-blue-600 to-blue-400',
};

export default function V2BudgetPanel({ repartoBudgets, totalBudget, sectionTotals }) {
  const overallPct = totalBudget.prod > 0
    ? (totalBudget.usedProd / totalBudget.prod) * 100
    : 0;

  return (
    <aside className="w-80 shrink-0 border-r border-gray-100 bg-white flex flex-col overflow-hidden">
      {/* Top summary card */}
      <div className="p-5 border-b border-gray-100 bg-gradient-to-br from-dimar-dark via-slate-800 to-indigo-900 text-white">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wider opacity-70 font-semibold">Totale PROD assegnati</span>
          <span className="text-[10px] opacity-60">{Math.round(overallPct)}%</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold tabular-nums">{totalBudget.usedProd}</span>
          <span className="text-lg opacity-60">/ {totalBudget.prod}</span>
        </div>
        <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-dimar-red via-orange-400 to-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(overallPct, 100)}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-white/10">
          <div>
            <div className="text-[9px] uppercase opacity-60 tracking-wider">Card</div>
            <div className="text-sm font-semibold tabular-nums">
              {totalBudget.usedCard}<span className="opacity-50 text-xs">/{totalBudget.card}</span>
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase opacity-60 tracking-wider">Sezioni</div>
            <div className="text-sm font-semibold tabular-nums">{sectionTotals.length}</div>
          </div>
        </div>
      </div>

      {/* Per-section overview */}
      {sectionTotals && sectionTotals.length > 0 && (
        <div className="px-3 py-3 border-b border-gray-100">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gray-400 px-2 mb-2">
            Per Sezione
          </div>
          <div className="space-y-1.5">
            {sectionTotals.map(s => {
              if (s.prod === 0 && s.usedProd === 0) return null;
              const pct = s.prod > 0 ? Math.min(s.usedProd / s.prod, 1.2) * 100 : 0;
              const grad = SECTION_COLORS[s.color] || SECTION_COLORS.red;
              return (
                <div key={s.key} className="px-2">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-semibold text-dimar-dark truncate" title={s.label}>
                      {s.short}
                    </span>
                    <span className="font-mono tabular-nums text-gray-500">
                      <strong className="text-dimar-dark">{s.usedProd}</strong>/{s.prod}
                      {s.card > 0 && <span className="ml-1.5 text-rose-500">{s.usedCard}/{s.card}c</span>}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${grad} rounded-full transition-all duration-300`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reparti list */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="text-[10px] uppercase tracking-wider font-bold text-gray-400 px-2 mb-2">
          Reparti ({repartoBudgets.length})
        </div>
        <div className="space-y-1">
          {repartoBudgets.map(r => {
            const color = budgetColor(r.usedProdTot, r.totalProd);
            const textColors = {
              green: 'text-emerald-600',
              yellow: 'text-amber-600',
              red: 'text-red-600',
              gray: 'text-gray-400',
            };

            return (
              <div key={r.code} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                <DonutRing used={r.usedProdTot} budget={r.totalProd} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-dimar-dark truncate">{r.name}</div>
                  <div className="flex items-center gap-2 text-[10px] mt-0.5">
                    <span className={`font-mono font-bold ${textColors[color]} tabular-nums`}>
                      P {r.usedProdTot}/{r.totalProd}
                    </span>
                    {r.totalCard > 0 && (
                      <span className="text-rose-500 font-mono tabular-nums">C {r.usedCardTot}/{r.totalCard}</span>
                    )}
                    <span className="text-gray-400 ml-auto">{r.familyCount} fam.</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
