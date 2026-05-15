import { fmtEuro, fmtPct, sparklinePath } from '../../utils';

const ICONS = {
  sales: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 14l4-4 4 4 5-5" />
    </svg>
  ),
  margin: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2m0-8a4 4 0 100 8" />
    </svg>
  ),
  scontrini: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
    </svg>
  ),
  season: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  theme: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.539 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  role: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  warning: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  low: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
  ),
};

function ScoreBar({ label, value, color }) {
  const colors = {
    red: 'bg-dimar-red',
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    purple: 'bg-purple-500',
    indigo: 'bg-indigo-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    cyan: 'bg-cyan-500',
  };
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="w-20 text-gray-500 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${colors[color]} rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right font-mono tabular-nums text-gray-600">{value.toFixed(2)}</span>
    </div>
  );
}

function MiniSpark({ values }) {
  return (
    <svg viewBox="0 0 60 20" className="w-[60px] h-[18px]">
      <path d={sparklinePath(values)} fill="none" stroke="#E1261C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ConfidenceBadge({ value }) {
  const pct = Math.round(value * 100);
  let label, cls;
  if (pct >= 80) { label = 'ALTA'; cls = 'bg-emerald-100 text-emerald-700 border-emerald-200'; }
  else if (pct >= 55) { label = 'MEDIA'; cls = 'bg-amber-100 text-amber-700 border-amber-200'; }
  else { label = 'BASSA'; cls = 'bg-orange-100 text-orange-700 border-orange-200'; }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
      {label} · {pct}%
    </span>
  );
}

function ReasonRow({ r, isWarning = false }) {
  const colorClass = isWarning
    ? (r.severity === 'high' ? 'text-red-600' : r.severity === 'medium' ? 'text-amber-600' : 'text-gray-500')
    : (r.strength === 'high' ? 'text-emerald-600' : 'text-emerald-500');
  return (
    <div className="flex items-start gap-2 text-[11px]">
      <span className={`shrink-0 mt-0.5 ${colorClass}`}>{ICONS[r.icon] || ICONS.warning}</span>
      <span className={isWarning ? 'text-gray-700' : 'text-gray-700'}>{r.text}</span>
    </div>
  );
}

export default function AISuggestionCard({ suggestion, accepted, onToggle }) {
  const s = suggestion;
  const colorMap = {
    red: 'from-dimar-red to-rose-500 text-white',
    orange: 'from-orange-600 to-orange-400 text-white',
    amber: 'from-amber-600 to-amber-400 text-white',
    green: 'from-emerald-600 to-emerald-400 text-white',
    teal: 'from-teal-600 to-teal-400 text-white',
    blue: 'from-blue-600 to-blue-400 text-white',
  };
  const sectionColor = colorMap[s.sectionColor] || colorMap.red;

  return (
    <div
      className={`bg-white border rounded-xl overflow-hidden transition-all ${
        accepted === false
          ? 'border-gray-200 opacity-50'
          : accepted === true
            ? 'border-emerald-300 shadow-md shadow-emerald-100/60'
            : 'border-gray-200 hover:border-violet-200 hover:shadow-sm'
      }`}
    >
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full bg-gradient-to-r ${sectionColor}`}>
              {s.sectionShort}
            </span>
            {s.isCard ? (
              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-rose-100 text-rose-700">CARD</span>
            ) : null}
            <ConfidenceBadge value={s.confidence} />
            {s.usageBefore > 0 && (
              <span className="text-[10px] text-amber-600 font-semibold">
                {s.usageBefore}× nel piano
              </span>
            )}
          </div>
          <h4 className="text-sm font-bold text-dimar-dark leading-tight truncate" title={s.family.fn}>
            {s.family.fn}
          </h4>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5 truncate">
            {s.repartoName} · {s.family.sn}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="text-2xl font-bold text-violet-600 tabular-nums leading-none">
            {(s.score * 100).toFixed(0)}
          </div>
          <div className="text-[9px] text-gray-400 uppercase tracking-wider">Score</div>
        </div>
      </div>

      {/* Metrics strip */}
      <div className="px-4 pb-2 flex items-center gap-3 text-[11px]">
        <div className="flex items-baseline gap-1">
          <span className="text-gray-400">€</span>
          <span className="font-mono font-semibold tabular-nums">{fmtEuro(s.family.v)}</span>
        </div>
        <div className="h-3 w-px bg-gray-200" />
        <div className="flex items-baseline gap-1">
          <span className="text-gray-400">M.</span>
          <span className="font-mono font-semibold text-emerald-600 tabular-nums">{fmtPct(s.family.margine)}</span>
        </div>
        <div className="h-3 w-px bg-gray-200" />
        <div className="flex items-baseline gap-1">
          <span className="text-gray-400">S.</span>
          <span className="font-mono font-semibold text-gray-600 tabular-nums">{fmtPct(s.family.ps)}</span>
        </div>
        <div className="ml-auto">
          <MiniSpark values={[s.family.m1, s.family.m2, s.family.m3, s.family.m4]} />
        </div>
      </div>

      {/* Score breakdown */}
      <div className="px-4 pb-3 pt-1 border-t border-gray-50 bg-gray-50/40">
        <div className="text-[9px] uppercase tracking-wider font-bold text-gray-500 mb-1.5">Componenti score</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <ScoreBar label="Vendite" value={s.components.sales} color="red" />
          <ScoreBar label="Margine" value={s.components.margin} color="emerald" />
          <ScoreBar label="Scontrini" value={s.components.ps} color="cyan" />
          <ScoreBar label="Stagionalità" value={s.components.seasonality} color="amber" />
          <ScoreBar label="Affinità tema" value={s.components.affinity} color="purple" />
          <ScoreBar label="Ruolo" value={s.components.role} color="indigo" />
        </div>
        {s.components.recPenalty > 0.1 && (
          <div className="mt-1.5 text-[10px] text-red-600 flex items-center gap-1">
            <span>−</span>
            <span>Penalty recency: {s.components.recPenalty.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Reasoning */}
      {(s.reasons.length > 0 || s.warnings.length > 0) && (
        <div className="px-4 py-3 border-t border-gray-50 space-y-1.5">
          {s.reasons.slice(0, 4).map((r, i) => (
            <ReasonRow key={`r${i}`} r={r} />
          ))}
          {s.warnings.map((r, i) => (
            <ReasonRow key={`w${i}`} r={r} isWarning />
          ))}
        </div>
      )}

      {/* Predicted impact */}
      <div className="px-4 py-3 border-t border-gray-50 bg-violet-50/30">
        <div className="text-[9px] uppercase tracking-wider font-bold text-violet-600 mb-1.5">Impatto previsto (sim.)</div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-sm font-bold text-violet-700 tabular-nums">
              € {Math.round(s.impact.expectedRevenue / 1000)}k
            </div>
            <div className="text-[9px] text-gray-500">ricavo atteso</div>
          </div>
          <div>
            <div className="text-sm font-bold text-rose-600 tabular-nums">
              {(s.impact.cardProb * 100).toFixed(0)}%
            </div>
            <div className="text-[9px] text-gray-500">prob. card</div>
          </div>
          <div>
            <div className="text-sm font-bold text-indigo-600 tabular-nums">
              {(s.impact.engagement * 100).toFixed(0)}%
            </div>
            <div className="text-[9px] text-gray-500">engagement</div>
          </div>
        </div>
      </div>

      {/* Alternatives */}
      {s.alternatives && s.alternatives.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-50">
          <div className="text-[9px] uppercase tracking-wider font-bold text-gray-500 mb-1.5">
            Alternative considerate
          </div>
          <div className="space-y-1">
            {s.alternatives.slice(0, 3).map((alt, i) => (
              <div key={alt.fc} className="flex items-center gap-2 text-[11px]">
                <span className="w-4 text-gray-300 tabular-nums text-right">#{i + 2}</span>
                <span className="flex-1 truncate text-gray-600" title={alt.fn}>{alt.fn}</span>
                <span className="text-gray-400 font-mono tabular-nums text-[10px]">€ {fmtEuro(alt.v)}</span>
                <span className="font-mono tabular-nums text-gray-500 w-10 text-right">{(alt.score * 100).toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex gap-2">
        <button
          onClick={() => onToggle(false)}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
            accepted === false
              ? 'bg-red-500 text-white border-red-500'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
          }`}
        >
          {accepted === false ? '✗ Rifiutato' : 'Rifiuta'}
        </button>
        <button
          onClick={() => onToggle(true)}
          className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
            accepted === true
              ? 'bg-emerald-500 text-white border-emerald-500'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200'
          }`}
        >
          {accepted === true ? '✓ Accettato' : 'Accetta'}
        </button>
      </div>
    </div>
  );
}
