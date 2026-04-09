import { budgetColor } from '../utils';

function BudgetBar({ label, used, budget }) {
  if (budget === 0 && used === 0) return null;
  const pct = budget > 0 ? Math.min((used / budget) * 100, 150) : 0;
  const color = budgetColor(used, budget);
  const barColors = {
    green: 'bg-emerald-500',
    yellow: 'bg-amber-400',
    red: 'bg-red-500',
    gray: 'bg-gray-300',
  };
  const textColors = {
    green: 'text-emerald-700',
    yellow: 'text-amber-700',
    red: 'text-red-600',
    gray: 'text-gray-500',
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-12 text-gray-500 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColors[color]}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className={`w-14 text-right font-mono font-medium ${textColors[color]}`}>
        {used}/{budget}
      </span>
    </div>
  );
}

export default function BudgetDashboard({ repartoBudgets, totalBudget }) {
  return (
    <div className="w-72 shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 z-10">
        <h2 className="text-sm font-bold text-dimar-dark uppercase tracking-wide">Budget Reparti</h2>
      </div>

      <div className="divide-y divide-gray-100">
        {repartoBudgets.map(r => {
          const totalUsed = r.usedVol + r.usedAff;
          const totalBudgetR = r.budget_vol + r.budget_aff;
          const color = budgetColor(totalUsed, totalBudgetR);
          const dotColors = {
            green: 'bg-emerald-500',
            yellow: 'bg-amber-400',
            red: 'bg-red-500',
            gray: 'bg-gray-300',
          };

          return (
            <div key={r.code} className="px-4 py-2.5">
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`w-2 h-2 rounded-full ${dotColors[color]}`} />
                <span className="text-xs font-semibold text-dimar-dark">{r.name}</span>
              </div>
              <div className="space-y-1 pl-4">
                <BudgetBar label="Vol." used={r.usedVol} budget={r.budget_vol} />
                <BudgetBar label="Aff." used={r.usedAff} budget={r.budget_aff} />
                <BudgetBar label="Card" used={r.usedCard} budget={r.budget_card} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Totale generale */}
      <div className="sticky bottom-0 bg-dimar-dark text-white px-4 py-3 border-t">
        <h3 className="text-xs font-bold uppercase tracking-wide mb-2">Totale Generale</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-bold">{totalBudget.usedVol}</div>
            <div className="text-[10px] opacity-70">/ {totalBudget.budgetVol} Vol.</div>
          </div>
          <div>
            <div className="text-lg font-bold">{totalBudget.usedAff}</div>
            <div className="text-[10px] opacity-70">/ {totalBudget.budgetAff} Aff.</div>
          </div>
          <div>
            <div className="text-lg font-bold">{totalBudget.usedCard}</div>
            <div className="text-[10px] opacity-70">/ {totalBudget.budgetCard} Card</div>
          </div>
        </div>
      </div>
    </div>
  );
}
