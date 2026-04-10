import { fmtEuro, fmtPct, budgetColor } from '../../utils';

function MiniProgressBar({ used, budget, colorClass }) {
  if (budget === 0) return null;
  const pct = Math.min((used / budget) * 100, 100);
  const overBudget = used > budget;
  return (
    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[40px] max-w-[80px]">
      <div
        className={`h-full rounded-full transition-all duration-300 ${
          overBudget ? 'bg-red-500' : colorClass
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StatBlock({ label, value, accentClass = 'text-dimar-dark' }) {
  return (
    <div className="flex flex-col items-start">
      <span className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold leading-none">
        {label}
      </span>
      <span className={`text-xs font-bold font-mono tabular-nums mt-0.5 ${accentClass}`}>
        {value}
      </span>
    </div>
  );
}

export default function V2RepartoHeader({
  group,
  isCollapsed,
  onToggle,
  budget,
  selections,
  getRowTotals,
}) {
  // Compute aggregate stats for this reparto
  const families = group.families;
  const totalSales = families.reduce((s, f) => s + (f.v || 0), 0);

  // Weighted average margin by sales
  const weightedMarginSum = families.reduce((s, f) => s + (f.v || 0) * (f.m || 0), 0);
  const avgMargin = totalSales > 0 ? weightedMarginSum / totalSales : 0;

  // Assigned families and their sales
  const assignedFamilies = families.filter(f => {
    const row = selections[f.fc] || {};
    return Object.values(row).some(v => v);
  });
  const assignedCount = assignedFamilies.length;
  const assignedSales = assignedFamilies.reduce((s, f) => s + (f.v || 0), 0);
  const salesCoverage = totalSales > 0 ? assignedSales / totalSales : 0;

  // Total slot assignments (volantino + aff)
  const totalSlotAssignments = families.reduce((s, f) => {
    const t = getRowTotals(f.fc);
    return s + t.totPromo;
  }, 0);

  // Semaphore color based on vol usage
  const semColor = budgetColor(budget?.usedVol || 0, group.budget_vol);
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
      {/* Row 1: name + key counters */}
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

        {/* Semaphore dot */}
        <div className={`w-2.5 h-2.5 rounded-full ${semDot} ring-4 ${semRing} shrink-0`} />

        <h3 className="text-base font-bold text-dimar-dark">{group.name}</h3>

        <span className="text-xs text-gray-400">
          {families.length} famiglie
        </span>

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

        {/* Right side: coverage ring */}
        <div className="ml-auto flex items-center gap-2 text-[11px]">
          <span className="text-gray-400 uppercase tracking-wider text-[9px] font-semibold">
            Copertura
          </span>
          <span className={`font-bold tabular-nums ${salesCoverage >= 0.5 ? 'text-emerald-600' : salesCoverage >= 0.2 ? 'text-amber-600' : 'text-gray-500'}`}>
            {(salesCoverage * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Row 2: metrics strip */}
      <div className="flex items-center gap-5 px-4 pb-3 pt-1 border-t border-gray-50 bg-gray-50/40">
        <StatBlock
          label="Vendite Tot."
          value={`€ ${fmtEuro(totalSales)}`}
          accentClass="text-dimar-dark"
        />
        <div className="h-6 w-px bg-gray-200" />
        <StatBlock
          label="Margine Medio"
          value={fmtPct(avgMargin)}
          accentClass="text-emerald-600"
        />
        <div className="h-6 w-px bg-gray-200" />
        <StatBlock
          label="Vendite Assegnate"
          value={`€ ${fmtEuro(assignedSales)}`}
          accentClass="text-indigo-600"
        />
        <div className="h-6 w-px bg-gray-200" />

        {/* Progress bars for budget slots */}
        <div className="flex items-center gap-3 ml-auto">
          <div className="flex flex-col items-start gap-0.5">
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="text-gray-400 font-semibold uppercase tracking-wider text-[9px]">Vol.</span>
              <span className="font-mono font-bold text-dimar-red tabular-nums">
                {budget?.usedVol || 0}
                <span className="text-gray-400 font-normal">/{group.budget_vol}</span>
              </span>
            </div>
            <MiniProgressBar
              used={budget?.usedVol || 0}
              budget={group.budget_vol}
              colorClass="bg-dimar-red"
            />
          </div>

          {group.budget_aff > 0 && (
            <div className="flex flex-col items-start gap-0.5">
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-gray-400 font-semibold uppercase tracking-wider text-[9px]">Aff.</span>
                <span className="font-mono font-bold text-blue-600 tabular-nums">
                  {budget?.usedAff || 0}
                  <span className="text-gray-400 font-normal">/{group.budget_aff}</span>
                </span>
              </div>
              <MiniProgressBar
                used={budget?.usedAff || 0}
                budget={group.budget_aff}
                colorClass="bg-blue-500"
              />
            </div>
          )}

          {group.budget_card > 0 && (
            <div className="flex flex-col items-start gap-0.5">
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-gray-400 font-semibold uppercase tracking-wider text-[9px]">Card</span>
                <span className="font-mono font-bold text-purple-600 tabular-nums">
                  {budget?.usedCard || 0}
                  <span className="text-gray-400 font-normal">/{group.budget_card}</span>
                </span>
              </div>
              <MiniProgressBar
                used={budget?.usedCard || 0}
                budget={group.budget_card}
                colorClass="bg-purple-500"
              />
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
