import { fmtEuro, fmtPct, budgetColor } from '../../utils';

function MiniProgressBar({ used, budget, colorClass }) {
  if (budget === 0) return null;
  const pct = Math.min((used / budget) * 100, 100);
  const overBudget = used > budget;
  return (
    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[40px]">
      <div
        className={`h-full rounded-full transition-all duration-300 ${
          overBudget ? 'bg-red-500' : colorClass
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function SectionBudgetMini({ label, used, budget, color }) {
  if (budget === 0 && used === 0) return null;
  const colors = {
    red: { bar: 'bg-dimar-red', text: 'text-dimar-red' },
    orange: { bar: 'bg-orange-600', text: 'text-orange-600' },
    amber: { bar: 'bg-amber-600', text: 'text-amber-600' },
    green: { bar: 'bg-emerald-600', text: 'text-emerald-600' },
    teal: { bar: 'bg-teal-600', text: 'text-teal-600' },
    blue: { bar: 'bg-blue-600', text: 'text-blue-600' },
  };
  const cc = colors[color] || colors.red;
  return (
    <div className="flex flex-col items-start gap-0.5 min-w-[70px]">
      <div className="flex items-center gap-1.5 text-[10px] w-full">
        <span className="text-gray-400 font-semibold uppercase tracking-wider text-[9px] truncate">{label}</span>
        <span className={`font-mono font-bold tabular-nums ml-auto ${cc.text}`}>
          {used}<span className="text-gray-400 font-normal">/{budget}</span>
        </span>
      </div>
      <MiniProgressBar used={used} budget={budget} colorClass={cc.bar} />
    </div>
  );
}

export default function V2RepartoHeader({
  group,
  isCollapsed,
  onToggle,
  budget,
  selections,
  sections,
  getRowTotals,
}) {
  const families = group.families;
  const totalSales = families.reduce((s, f) => s + (f.v || 0), 0);
  const weightedMarginSum = families.reduce((s, f) => s + (f.v || 0) * (f.margine || 0), 0);
  const avgMargin = totalSales > 0 ? weightedMarginSum / totalSales : 0;

  const assignedFamilies = families.filter(f => {
    const t = getRowTotals(f.fc);
    return t.totSlot > 0;
  });
  const assignedCount = assignedFamilies.length;
  const assignedSales = assignedFamilies.reduce((s, f) => s + (f.v || 0), 0);
  const salesCoverage = totalSales > 0 ? assignedSales / totalSales : 0;

  const totalSlotAssignments = families.reduce((s, f) => s + getRowTotals(f.fc).totSlot, 0);

  const semColor = budgetColor(budget?.usedProdTot || 0, budget?.totalProd || 0);
  const semDot = {
    green: 'bg-emerald-500',
    yellow: 'bg-amber-500',
    red: 'bg-red-500',
    gray: 'bg-gray-300',
  }[semColor];
  const semRing = {
    green: 'ring-emerald-200',
    yellow: 'ring-amber-200',
    red: 'ring-red-200',
    gray: 'ring-gray-200',
  }[semColor];

  return (
    <button
      onClick={onToggle}
      className="w-full text-left bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group overflow-hidden"
    >
      {/* Row 1: name + counters */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 group-hover:text-indigo-600 ${
            isCollapsed ? '' : 'rotate-90'
          }`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>

        <div className="w-1 h-6 bg-gradient-to-b from-dimar-red to-indigo-600 rounded-full shrink-0" />
        <div className={`w-2.5 h-2.5 rounded-full ${semDot} ring-4 ${semRing} shrink-0`} />

        <h3 className="text-base font-bold text-dimar-dark">{group.name}</h3>
        <span className="text-xs text-gray-400">{families.length} famiglie</span>

        {assignedCount > 0 && (
          <span className="px-2 py-0.5 bg-dimar-red/10 text-dimar-red text-[10px] font-bold rounded-full">
            {assignedCount} assegnate
          </span>
        )}
        {totalSlotAssignments > 0 && (
          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-full">
            {totalSlotAssignments} slot
          </span>
        )}

        <div className="ml-auto flex items-center gap-2 text-[11px]">
          <span className="text-gray-400 uppercase tracking-wider text-[9px] font-semibold">Copertura</span>
          <span className={`font-bold tabular-nums ${salesCoverage >= 0.5 ? 'text-emerald-600' : salesCoverage >= 0.2 ? 'text-amber-600' : 'text-gray-500'}`}>
            {(salesCoverage * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Row 2: metrics + per-section budgets */}
      <div className="flex items-center gap-4 px-4 pb-3 pt-1 border-t border-gray-50 bg-gray-50/40 flex-wrap">
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold leading-none">Vendite Tot.</span>
          <span className="text-xs font-bold font-mono tabular-nums mt-0.5 text-dimar-dark">€ {fmtEuro(totalSales)}</span>
        </div>
        <div className="h-6 w-px bg-gray-200" />
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold leading-none">Margine</span>
          <span className="text-xs font-bold font-mono tabular-nums mt-0.5 text-emerald-600">{fmtPct(avgMargin)}</span>
        </div>
        <div className="h-6 w-px bg-gray-200" />
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold leading-none">Vend. Assegn.</span>
          <span className="text-xs font-bold font-mono tabular-nums mt-0.5 text-indigo-600">€ {fmtEuro(assignedSales)}</span>
        </div>

        {/* Per-section budget bars */}
        <div className="ml-auto flex items-center gap-3 flex-wrap">
          {sections.map(sec => {
            const sb = budget?.sectionBudgets?.[sec.key];
            if (!sb || (sb.prod === 0 && sb.usedProd === 0)) return null;
            return (
              <SectionBudgetMini
                key={sec.key}
                label={sec.short}
                used={sb.usedProd}
                budget={sb.prod}
                color={sec.color}
              />
            );
          })}
        </div>
      </div>
    </button>
  );
}
