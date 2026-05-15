import { budgetColor } from '../../utils';

function BudgetBar({ label, used, budget, colorClass = 'bg-dimar-red' }) {
  if (budget === 0 && used === 0) return null;
  const pct = budget > 0 ? Math.min((used / budget) * 100, 150) : 0;
  const status = budgetColor(used, budget);
  const textColors = {
    green: 'text-emerald-700',
    yellow: 'text-amber-700',
    red: 'text-red-600',
    gray: 'text-gray-500',
  };
  const barColors = {
    green: 'bg-emerald-500',
    yellow: 'bg-amber-400',
    red: 'bg-red-500',
    gray: 'bg-gray-300',
  };
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-14 text-gray-500 shrink-0 truncate" title={label}>{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${barColors[status]}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className={`w-12 text-right font-mono font-medium ${textColors[status]} tabular-nums`}>
        {used}/{budget}
      </span>
    </div>
  );
}

export default function V1BudgetSidebar({ repartoBudgets, sectionTotals, totalBudget, sections }) {
  return (
    <div className="w-72 shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-bold text-dimar-dark uppercase tracking-wide">Budget Reparti</h2>
      </div>

      {sectionTotals && sectionTotals.length > 0 && (
        <div className="border-b border-gray-200 px-4 py-3 bg-gray-50/40">
          <h3 className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-2">
            Per Sezione (intero canale)
          </h3>
          <div className="space-y-1.5">
            {sectionTotals.map(s => {
              if (s.prod === 0 && s.usedProd === 0) return null;
              return <BudgetBar key={s.key} label={s.short} used={s.usedProd} budget={s.prod} />;
            })}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {repartoBudgets.map(r => {
          const color = budgetColor(r.usedProdTot, r.totalProd);
          const dotColors = { green: 'bg-emerald-500', yellow: 'bg-amber-400', red: 'bg-red-500', gray: 'bg-gray-300' };
          return (
            <div key={r.code} className="px-4 py-2.5">
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`w-2 h-2 rounded-full ${dotColors[color]}`} />
                <span className="text-xs font-semibold text-dimar-dark truncate flex-1">{r.name}</span>
                <span className="text-[10px] text-gray-400 tabular-nums">{r.familyCount}</span>
              </div>
              <div className="space-y-1 pl-4">
                {sections.map(sec => {
                  const sb = r.sectionBudgets?.[sec.key];
                  if (!sb || (sb.prod === 0 && sb.usedProd === 0)) return null;
                  return <BudgetBar key={sec.key} label={sec.short} used={sb.usedProd} budget={sb.prod} />;
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-dimar-dark text-white px-4 py-3 border-t">
        <h3 className="text-xs font-bold uppercase tracking-wide mb-2">Totale Promo</h3>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div>
            <div className="text-lg font-bold tabular-nums">{totalBudget.usedProd}</div>
            <div className="text-[10px] opacity-70">/ {totalBudget.prod} PROD</div>
          </div>
          <div>
            <div className="text-lg font-bold tabular-nums">{totalBudget.usedCard}</div>
            <div className="text-[10px] opacity-70">/ {totalBudget.card} CARD</div>
          </div>
        </div>
      </div>
    </div>
  );
}
