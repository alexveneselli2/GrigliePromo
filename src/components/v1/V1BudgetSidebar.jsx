import { budgetColor } from '../../utils';

// Section color mapping
const SEC_COLORS = {
  red:    { fill: 'bg-dimar-red',    light: 'bg-red-100',    text: 'text-dimar-red',    ring: 'ring-dimar-red/20' },
  orange: { fill: 'bg-orange-500',   light: 'bg-orange-100',  text: 'text-orange-600',   ring: 'ring-orange-500/20' },
  amber:  { fill: 'bg-amber-500',    light: 'bg-amber-100',   text: 'text-amber-600',    ring: 'ring-amber-500/20' },
  green:  { fill: 'bg-emerald-500',  light: 'bg-emerald-100', text: 'text-emerald-600',  ring: 'ring-emerald-500/20' },
  teal:   { fill: 'bg-teal-500',     light: 'bg-teal-100',    text: 'text-teal-600',     ring: 'ring-teal-500/20' },
  blue:   { fill: 'bg-blue-500',     light: 'bg-blue-100',    text: 'text-blue-600',     ring: 'ring-blue-500/20' },
};

function DonutRing({ used, budget, size = 40, stroke = 4.5 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = budget > 0 ? Math.min(used / budget, 1.2) : 0;
  const color = budgetColor(used, budget);
  const colors = { green: '#10b981', yellow: '#f59e0b', red: '#ef4444', gray: '#d1d5db' };
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} stroke="#f1f5f9" strokeWidth={stroke} fill="none" />
        <circle
          cx={size/2} cy={size/2} r={radius}
          stroke={colors[color]}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.min(pct, 1))}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-bold tabular-nums" style={{ color: colors[color] }}>
          {budget > 0 ? Math.round(pct * 100) : 0}
        </span>
      </div>
    </div>
  );
}

function SectionMiniBar({ sec, sb }) {
  if (!sb || (sb.prod === 0 && sb.usedProd === 0)) return null;
  const pct = sb.prod > 0 ? Math.min(sb.usedProd / sb.prod, 1.2) * 100 : 0;
  const cc = SEC_COLORS[sec.color] || SEC_COLORS.red;
  const overBudget = sb.usedProd > sb.prod;

  return (
    <div className="flex items-center gap-1.5 text-[10px]">
      <span className={`w-1.5 h-1.5 rounded-full ${cc.fill} shrink-0`} />
      <span className="w-11 text-gray-500 truncate" title={sec.label}>{sec.short}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${overBudget ? 'bg-red-500' : cc.fill}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className={`w-11 text-right font-mono tabular-nums font-semibold ${overBudget ? 'text-red-600' : cc.text}`}>
        {sb.usedProd}/{sb.prod}
      </span>
    </div>
  );
}

function SectionTotalCard({ sec }) {
  if (sec.prod === 0 && sec.usedProd === 0) return null;
  const pct = sec.prod > 0 ? Math.min(sec.usedProd / sec.prod, 1.2) * 100 : 0;
  const cc = SEC_COLORS[sec.color] || SEC_COLORS.red;
  const overBudget = sec.usedProd > sec.prod;

  return (
    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${cc.light} ring-1 ${cc.ring}`}>
      <DonutRing used={sec.usedProd} budget={sec.prod} size={36} stroke={4} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className={`text-[11px] font-bold ${cc.text} truncate`} title={sec.label}>{sec.short}</span>
          <span className={`text-[11px] font-mono font-bold tabular-nums ${overBudget ? 'text-red-600' : cc.text}`}>
            {sec.usedProd}<span className="text-gray-400 font-normal">/{sec.prod}</span>
          </span>
        </div>
        <div className="h-1 bg-white/60 rounded-full overflow-hidden mt-1">
          <div
            className={`h-full rounded-full transition-all duration-300 ${overBudget ? 'bg-red-500' : cc.fill}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        {sec.card > 0 && (
          <div className="text-[9px] text-gray-500 mt-0.5">
            Card: <strong className="text-rose-600">{sec.usedCard}</strong>/{sec.card}
          </div>
        )}
      </div>
    </div>
  );
}

export default function V1BudgetSidebar({ repartoBudgets, sectionTotals, totalBudget, sections }) {
  const overallPct = totalBudget.prod > 0
    ? (totalBudget.usedProd / totalBudget.prod) * 100
    : 0;

  return (
    <div className="w-72 shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
      {/* Header summary */}
      <div className="p-4 bg-gradient-to-br from-dimar-dark via-slate-800 to-indigo-900 text-white">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wider opacity-70 font-semibold">Budget Promo</span>
          <span className="text-[10px] opacity-60">{Math.round(overallPct)}%</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold tabular-nums">{totalBudget.usedProd}</span>
          <span className="text-lg opacity-60">/ {totalBudget.prod}</span>
          <span className="text-xs opacity-50 ml-1">PROD</span>
        </div>
        <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-dimar-red via-orange-400 to-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(overallPct, 100)}%` }}
          />
        </div>
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
          <div>
            <div className="text-[9px] uppercase opacity-60 tracking-wider">Card</div>
            <div className="text-sm font-semibold tabular-nums">
              {totalBudget.usedCard}<span className="opacity-50 text-xs">/{totalBudget.card}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] uppercase opacity-60 tracking-wider">Reparti</div>
            <div className="text-sm font-semibold tabular-nums">{repartoBudgets.length}</div>
          </div>
        </div>
      </div>

      {/* Per-section totals as colored cards */}
      {sectionTotals && sectionTotals.length > 0 && (
        <div className="border-b border-gray-200 px-3 py-3 bg-gray-50/40">
          <h3 className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-2 px-1">
            Sezioni
          </h3>
          <div className="space-y-1.5">
            {sectionTotals.map(s => (
              <SectionTotalCard key={s.key} sec={s} />
            ))}
          </div>
        </div>
      )}

      {/* Reparti list with donut + mini bars */}
      <div className="flex-1 overflow-y-auto">
        <div className="text-[10px] uppercase tracking-wider font-bold text-gray-400 px-4 pt-3 pb-1">
          Per Reparto
        </div>
        <div className="divide-y divide-gray-50">
          {repartoBudgets.map(r => {
            const color = budgetColor(r.usedProdTot, r.totalProd);
            const dotColors = { green: 'bg-emerald-500', yellow: 'bg-amber-400', red: 'bg-red-500', gray: 'bg-gray-300' };

            return (
              <div key={r.code} className="px-3 py-2.5 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <DonutRing used={r.usedProdTot} budget={r.totalProd} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${dotColors[color]}`} />
                      <span className="text-xs font-bold text-dimar-dark truncate">{r.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                      <span className="font-mono tabular-nums text-gray-500">
                        P <strong className={color === 'red' ? 'text-red-600' : color === 'yellow' ? 'text-amber-600' : 'text-emerald-600'}>{r.usedProdTot}</strong>/{r.totalProd}
                      </span>
                      {r.totalCard > 0 && (
                        <span className="font-mono tabular-nums text-rose-500">
                          C {r.usedCardTot}/{r.totalCard}
                        </span>
                      )}
                      <span className="text-gray-400 ml-auto">{r.familyCount} fam.</span>
                    </div>
                  </div>
                </div>
                {/* Per-section mini bars */}
                <div className="space-y-0.5 pl-[46px]">
                  {sections.map(sec => (
                    <SectionMiniBar key={sec.key} sec={sec} sb={r.sectionBudgets?.[sec.key]} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
