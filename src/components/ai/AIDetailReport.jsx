import { useState, useMemo } from 'react';
import { fmtEuro, fmtPct, fmtInt } from '../../utils';

// ─── Constants ───────────────────────────────────────────────────────────────

const SECTION_GRADIENTS = {
  red:    'from-dimar-red to-rose-500',
  orange: 'from-orange-600 to-orange-400',
  amber:  'from-amber-600 to-amber-400',
  green:  'from-emerald-600 to-emerald-400',
  teal:   'from-teal-600 to-teal-400',
  blue:   'from-blue-600 to-blue-400',
};

const SECTION_COLOR_MAP = {
  tema:   'red',
  sotto:  'orange',
  s1:     'amber',
  s2:     'green',
  s3:     'teal',
  s4:     'blue',
};

const WEIGHT_LABELS = {
  sales:             'Vendite',
  margin:            'Margine',
  scontrini:         'Scontrini',
  seasonality:       'Stagionalità',
  themeAffinity:     'Affinità tema',
  roleBoost:         'Ruolo',
  recencyPenalty:    'Recency penalty',
  saturationPenalty: 'Saturaz. penalty',
};

const WEIGHT_COLORS = {
  sales:             'bg-dimar-red',
  margin:            'bg-emerald-500',
  scontrini:         'bg-blue-500',
  seasonality:       'bg-amber-500',
  themeAffinity:     'bg-purple-500',
  roleBoost:         'bg-pink-500',
  recencyPenalty:    'bg-orange-400',
  saturationPenalty: 'bg-gray-400',
};

// ─── Small helpers ────────────────────────────────────────────────────────────

function confidenceBand(v) {
  // v may be 0-1 or 0-100 from Claude
  const n = v > 1 ? v / 100 : v;
  if (n >= 0.75) return { label: 'Alta',  cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  if (n >= 0.5)  return { label: 'Media', cls: 'bg-amber-100   text-amber-700   border-amber-200'   };
  return              { label: 'Bassa', cls: 'bg-orange-100  text-orange-700  border-orange-200'  };
}

function normScore(v) {
  return v > 1 ? v / 100 : v;   // normalise Claude's 0-100 to 0-1 if needed
}

function sectionColorKey(sectionKey) {
  return SECTION_COLOR_MAP[sectionKey] ?? 'blue';
}

function SectionBadge({ sectionKey, label }) {
  const colorKey = sectionColorKey(sectionKey);
  const grad = SECTION_GRADIENTS[colorKey] ?? SECTION_GRADIENTS.blue;
  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full bg-gradient-to-r ${grad} text-white`}>
      {label ?? sectionKey}
    </span>
  );
}

function ConfidenceBadge({ value }) {
  const { label, cls } = confidenceBand(value);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${cls}`}>
      {label}
    </span>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function ReportSection({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="mb-6 print:mb-4 break-inside-avoid-page">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 text-left mb-3 group print:pointer-events-none"
      >
        <span className="text-base">{icon}</span>
        <h2 className="text-sm font-bold text-dimar-dark tracking-wide uppercase flex-1">
          {title}
        </h2>
        <span className="text-gray-300 group-hover:text-gray-500 transition-colors print:hidden text-xs">
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && <div className="animate-expand">{children}</div>}
    </section>
  );
}

// ─── Section 1 helpers ────────────────────────────────────────────────────────

function HeaderSection({ promoCode, plan, aiResult, payload }) {
  const promo = plan?.channelPromos?.find(p => p.codicePromo === promoCode);
  const ts = new Date().toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const canale = payload?.promos?.[0]?.canale ?? promo?.canale ?? '—';
  const tema   = payload?.promos?.[0]?.tema   ?? promo?.tema   ?? '—';
  const di     = promo?.dataInizio ?? payload?.promos?.[0]?.dataInizio ?? '';
  const df     = promo?.dataFine   ?? payload?.promos?.[0]?.dataFine   ?? '';

  const fmtDate = s => s
    ? new Date(s).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return (
    <header className="rounded-2xl overflow-hidden mb-6 shadow-lg print:shadow-none print:rounded-none print:border print:border-gray-200">
      {/* Gradient bar */}
      <div className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-violet-200 text-xs font-semibold uppercase tracking-widest mb-1">
              Report Analisi AI
            </p>
            <h1 className="text-white text-2xl font-extrabold leading-tight tracking-tight">
              {promoCode}
            </h1>
            {tema && (
              <p className="text-violet-100 text-sm mt-1 font-medium">{tema}</p>
            )}
            {(di || df) && (
              <p className="text-violet-200 text-xs mt-1">
                {fmtDate(di)} → {fmtDate(df)}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 min-w-max">
            {/* Engine badge */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-[11px] font-semibold border border-white/20">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              thinking: adaptive · top-15
            </span>
            {canale && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-white text-[11px] font-medium border border-white/20">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                </svg>
                {canale}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Meta strip */}
      <div className="bg-white px-6 py-3 flex items-center gap-6 flex-wrap border-t border-gray-100">
        <div className="flex items-center gap-2 text-[11px]">
          <svg className="w-3.5 h-3.5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
          </svg>
          <span className="text-gray-400">Modello</span>
          <span className="font-semibold text-dimar-dark">
            {aiResult?.model ?? 'claude-opus-4-8'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <svg className="w-3.5 h-3.5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-gray-400">Generato</span>
          <span className="font-semibold text-dimar-dark">{ts}</span>
        </div>
        <div className="ml-auto">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
            AI · claude-opus-4-8
          </span>
        </div>
      </div>
    </header>
  );
}

// ─── Section 2: Input Data ────────────────────────────────────────────────────

function InputDataSection({ payload, weights }) {
  const [expandCandidates, setExpandCandidates] = useState(false);

  const promoPayload = payload?.promos?.[0];
  const sections = promoPayload?.sections ?? [];

  // Aggregate stats
  const totalCandidates = useMemo(() =>
    sections.reduce((sum, s) =>
      sum + (s.reparti ?? []).reduce((rs, r) => rs + (r.candidates ?? []).length, 0), 0),
    [sections]);

  const totalReparti = useMemo(() =>
    sections.reduce((sum, s) => sum + (s.reparti ?? []).length, 0),
    [sections]);

  // Flatten top-3 candidates per section for the table
  const topCandidates = useMemo(() =>
    sections.flatMap(s =>
      (s.reparti ?? []).flatMap(r =>
        (r.candidates ?? []).slice(0, 3).map(c => ({
          ...c,
          sectionKey:   s.key,
          sectionLabel: s.label ?? s.key,
          repartoName:  r.repartoName,
        }))
      )
    ),
    [sections]);

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Candidati totali', value: fmtInt(totalCandidates), icon: '🧾', color: 'violet' },
          { label: 'Sezioni',          value: fmtInt(sections.length),  icon: '📂', color: 'fuchsia' },
          { label: 'Reparti',          value: fmtInt(totalReparti),     icon: '🏷️', color: 'pink'    },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm text-center">
            <div className="text-xl mb-1">{icon}</div>
            <div className={`text-2xl font-extrabold text-${color}-600 tabular-nums`}>{value}</div>
            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Budget per section table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            Budget per sezione / reparto
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-2 font-semibold text-gray-400">Sezione</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-400">Reparto</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-400">Slot PROD</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-400">Slot CARD</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-400">Candidati</th>
              </tr>
            </thead>
            <tbody>
              {sections.flatMap(s =>
                (s.reparti ?? []).map((r, ri) => (
                  <tr key={`${s.key}-${r.repartoCode}`} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                    {ri === 0 && (
                      <td className="px-4 py-2 align-top" rowSpan={s.reparti.length}>
                        <SectionBadge sectionKey={s.key} label={s.label ?? s.short ?? s.key} />
                      </td>
                    )}
                    <td className="px-4 py-2 text-gray-600 font-medium">{r.repartoName}</td>
                    <td className="px-4 py-2 text-right">
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded bg-dimar-red text-white">
                        {r.budgetProd ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-500 text-white">
                        {r.budgetCard ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500 tabular-nums font-mono">
                      {(r.candidates ?? []).length}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Candidate KPI table – collapsible */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          onClick={() => setExpandCandidates(o => !o)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100 hover:bg-gray-100 transition-colors"
        >
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            Top candidati per sezione (KPI)
          </span>
          <span className="text-[10px] text-gray-400 font-medium print:hidden">
            {expandCandidates ? '▲ Comprimi' : '▼ Espandi'}
          </span>
        </button>
        {expandCandidates && (
          <div className="overflow-x-auto animate-expand">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-2 font-semibold text-gray-400">FC</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-400">Famiglia</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-400">Sezione</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-400">Reparto</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-400">Vendite (€)</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-400">Margine</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-400">Scontrini</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-400">M1</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-400">M2</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-400">M3</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-400">M4</th>
                </tr>
              </thead>
              <tbody>
                {topCandidates.map((c, idx) => (
                  <tr key={`${c.fc}-${idx}`} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-2 font-mono font-bold text-dimar-dark">{c.fc}</td>
                    <td className="px-4 py-2 text-gray-700 max-w-[160px] truncate">{c.fn}</td>
                    <td className="px-4 py-2">
                      <SectionBadge sectionKey={c.sectionKey} label={c.sectionLabel} />
                    </td>
                    <td className="px-4 py-2 text-gray-500">{c.repartoName}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-dimar-dark font-semibold">
                      {fmtEuro(c.vendite)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-emerald-600">
                      {c.marginePct != null ? `${c.marginePct.toLocaleString('it-IT', { maximumFractionDigits: 1 })}%` : '—'}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-blue-600">
                      {c.scontriniPct != null ? fmtPct(c.scontriniPct / 100) : '—'}
                    </td>
                    {(c.m ?? [0, 0, 0, 0]).map((mv, mi) => (
                      <td key={mi} className="px-4 py-2 text-right font-mono tabular-nums text-gray-500">
                        {fmtInt(mv)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* KPI Weights */}
      {weights && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Pesi KPI utilizzati</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2">
            {Object.entries(WEIGHT_LABELS).map(([key, label]) => {
              const val = weights[key] ?? 0;
              const pct = Math.round(val * 100);
              return (
                <div key={key} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-gray-500 truncate">{label}</span>
                    <span className="font-bold text-dimar-dark tabular-nums font-mono ml-1">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${WEIGHT_COLORS[key] ?? 'bg-gray-400'}`}
                      style={{ width: `${Math.min(100, pct * 5)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section 3: AI Reasoning ──────────────────────────────────────────────────

function ConfidenceHistogram({ picks }) {
  const bands = [
    { key: 'alta',  label: 'Alta (≥75%)',  min: 0.75, color: 'bg-emerald-400' },
    { key: 'media', label: 'Media (50–74%)', min: 0.5, color: 'bg-amber-400'   },
    { key: 'bassa', label: 'Bassa (<50%)',   min: 0,   color: 'bg-orange-400'  },
  ];

  const counts = bands.map(b => ({
    ...b,
    count: picks.filter(p => {
      const n = normScore(p.confidence ?? 0);
      return n >= b.min && (b.min === 0 || n < (b.min === 0.75 ? 999 : 0.75));
    }).length,
  }));

  // Fix: first band catches >=0.75, second 0.5–0.74, third <0.5
  const correctCounts = [
    { ...bands[0], count: picks.filter(p => normScore(p.confidence ?? 0) >= 0.75).length },
    { ...bands[1], count: picks.filter(p => { const n = normScore(p.confidence ?? 0); return n >= 0.5 && n < 0.75; }).length },
    { ...bands[2], count: picks.filter(p => normScore(p.confidence ?? 0) < 0.5).length },
  ];

  const maxCount = Math.max(...correctCounts.map(c => c.count), 1);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
        Distribuzione confidence ({picks.length} picks)
      </p>
      <div className="flex items-end gap-3 h-20">
        {correctCounts.map(({ key, label, count, color }) => (
          <div key={key} className="flex flex-col items-center gap-1 flex-1">
            <span className="text-[10px] font-bold text-dimar-dark tabular-nums">{count}</span>
            <div className="w-full bg-gray-100 rounded-t overflow-hidden" style={{ height: '48px' }}>
              <div
                className={`w-full ${color} rounded-t transition-all duration-500`}
                style={{ height: `${(count / maxCount) * 48}px`, marginTop: 'auto' }}
              />
            </div>
            <span className="text-[9px] text-gray-400 text-center leading-tight">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AIReasoningSection({ promoCode, aiResult, plan }) {
  const promoAI  = aiResult?.promos?.find(p => p.promoCode === promoCode);
  const insight  = promoAI?.insight ?? plan?.insights?.find(i => i.type === 'positive')?.text;
  const picks    = promoAI?.picks ?? [];

  return (
    <div className="space-y-4">
      {/* Overall insight */}
      {insight && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <span className="text-violet-500 mt-0.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </span>
            <p className="text-sm text-violet-900 leading-relaxed font-medium">{insight}</p>
          </div>
        </div>
      )}

      {/* Confidence histogram */}
      {picks.length > 0 && <ConfidenceHistogram picks={picks} />}

      {/* Per-pick reasoning */}
      {picks.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Ragionamento per pick
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {picks.map((pick, idx) => {
              const reasons = pick.reasons?.length ? pick.reasons : (pick.reason ? [pick.reason] : []);
              return (
                <div key={`${pick.fc}-${idx}`} className="px-4 py-3 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-mono font-bold text-[12px] text-dimar-dark">{pick.fc}</span>
                    <SectionBadge sectionKey={pick.sectionKey} label={pick.sectionKey} />
                    <ConfidenceBadge value={pick.confidence ?? 0} />
                    <span className="text-[10px] text-gray-400 font-mono tabular-nums ml-auto">
                      score: <strong className="text-dimar-dark">{Math.round(normScore(pick.score ?? 0) * 100)}</strong>/100
                    </span>
                  </div>
                  {reasons.length > 0 && (
                    <ul className="space-y-0.5 mb-2">
                      {reasons.map((r, ri) => (
                        <li key={ri} className="flex items-start gap-1.5 text-[11px] text-gray-600">
                          <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                          <span>{typeof r === 'string' ? r : r.text ?? ''}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {pick.warning && (
                    <div className="flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-1">
                      <svg className="w-3 h-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>{pick.warning}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!picks.length && !insight && (
        <p className="text-sm text-gray-400 italic py-4 text-center">
          Nessun dato di ragionamento disponibile.
        </p>
      )}
    </div>
  );
}

// ─── Section 4: Risultati ─────────────────────────────────────────────────────

function BudgetProgressBar({ used, total, label }) {
  const pct = total > 0 ? Math.min(1, used / total) : 0;
  const isOver = used > total;
  const barColor = isOver ? 'bg-dimar-red' : pct >= 0.9 ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div className="flex items-center gap-3 text-[11px]">
      <span className="w-24 text-gray-500 truncate shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <span className="w-20 text-right font-mono tabular-nums text-gray-600 shrink-0">
        {used}/{total} slot
      </span>
      <span className={`w-10 text-right font-bold tabular-nums shrink-0 ${isOver ? 'text-dimar-red' : pct >= 0.9 ? 'text-amber-600' : 'text-emerald-600'}`}>
        {Math.round(pct * 100)}%
      </span>
    </div>
  );
}

function ResultsSection({ promoCode, aiResult, plan, payload }) {
  const promoAI  = aiResult?.promos?.find(p => p.promoCode === promoCode);
  const picks    = promoAI?.picks ?? [];
  const sections = payload?.promos?.[0]?.sections ?? [];

  // Aggregate totals
  const totalProd  = picks.reduce((s, p) => s + (p.prodCount ?? 0), 0);
  const totalCard  = picks.reduce((s, p) => s + (p.cardCount ?? 0), 0);
  const totalFam   = new Set(picks.map(p => p.fc)).size;

  // Budget utilisation per section
  const sectionBudgets = useMemo(() => sections.map(s => {
    const budProd = (s.reparti ?? []).reduce((sum, r) => sum + (r.budgetProd ?? 0), 0);
    const budCard = (s.reparti ?? []).reduce((sum, r) => sum + (r.budgetCard ?? 0), 0);
    const sectionPicks = picks.filter(p => p.sectionKey === s.key);
    const usedProd = sectionPicks.reduce((sum, p) => sum + (p.prodCount ?? 0), 0);
    const usedCard = sectionPicks.reduce((sum, p) => sum + (p.cardCount ?? 0), 0);
    return { key: s.key, label: s.label ?? s.short ?? s.key, budProd, budCard, usedProd, usedCard };
  }), [sections, picks]);

  // Impact aggregates
  const totalRevK  = picks.reduce((s, p) => s + (p.impact?.expectedRevenueK ?? 0), 0);
  const avgCardProb = picks.length
    ? picks.reduce((s, p) => s + (p.impact?.cardProb ?? 0), 0) / picks.length
    : 0;
  const avgEngagement = picks.length
    ? picks.reduce((s, p) => s + (p.impact?.engagement ?? 0), 0) / picks.length
    : 0;

  // Enrich picks with family name from suggestions
  const suggestions = plan?.richByPromo?.[promoCode] ?? [];
  const enrichedPicks = picks.map(pick => {
    const sug = suggestions.find(s => s.fc === pick.fc && s.sectionKey === pick.sectionKey)
             ?? suggestions.find(s => s.fc === pick.fc);
    return {
      ...pick,
      fn: sug?.family?.fn ?? pick.fn ?? pick.fc,
      sectionLabel: sug?.sectionLabel ?? pick.sectionKey,
    };
  });

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Famiglie sel.',  value: fmtInt(totalFam),  color: 'violet',  icon: '🛒' },
          { label: 'Slot PROD tot.', value: fmtInt(totalProd), color: 'dimar',   icon: '📋' },
          { label: 'Slot CARD tot.', value: fmtInt(totalCard), color: 'rose',    icon: '🃏' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm text-center">
            <div className="text-xl mb-1">{icon}</div>
            <div className={`text-2xl font-extrabold tabular-nums ${color === 'dimar' ? 'text-dimar-red' : color === 'rose' ? 'text-rose-500' : 'text-violet-600'}`}>
              {value}
            </div>
            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Budget utilisation per section */}
      {sectionBudgets.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
            Utilizzo budget per sezione
          </p>
          <div className="space-y-2.5">
            {sectionBudgets.map(sb => (
              <div key={sb.key} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <SectionBadge sectionKey={sb.key} label={sb.label} />
                </div>
                {sb.budProd > 0 && (
                  <BudgetProgressBar used={sb.usedProd} total={sb.budProd} label="PROD" />
                )}
                {sb.budCard > 0 && (
                  <BudgetProgressBar used={sb.usedCard} total={sb.budCard} label="CARD" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top picks table */}
      {enrichedPicks.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Selezioni AI — dettaglio
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-2 font-semibold text-gray-400">FC</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-400">Famiglia</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-400">Sezione</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-400">PROD</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-400">CARD</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-400">Score</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-400">Confidence</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-400">Motivazione principale</th>
                </tr>
              </thead>
              <tbody>
                {enrichedPicks.map((pick, idx) => {
                  const firstReason = pick.reasons?.[0];
                  const reasonText = typeof firstReason === 'string'
                    ? firstReason
                    : firstReason?.text ?? pick.reason ?? '—';
                  return (
                    <tr key={`${pick.fc}-${idx}`} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-2 font-mono font-bold text-dimar-dark">{pick.fc}</td>
                      <td className="px-4 py-2 text-gray-700 max-w-[140px] truncate">{pick.fn}</td>
                      <td className="px-4 py-2">
                        <SectionBadge sectionKey={pick.sectionKey} label={pick.sectionLabel} />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded bg-dimar-red text-white">
                          {pick.prodCount ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-500 text-white">
                          {pick.cardCount ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums font-bold text-dimar-dark">
                        {Math.round(normScore(pick.score ?? 0) * 100)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <ConfidenceBadge value={pick.confidence ?? 0} />
                      </td>
                      <td className="px-4 py-2 text-gray-500 max-w-[200px] truncate">{reasonText}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Impact summary */}
      {picks.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
            Impatto atteso (stima AI)
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] text-gray-400 mb-1">Revenue atteso</p>
              <p className="text-lg font-extrabold text-dimar-dark tabular-nums">
                €{totalRevK > 0 ? fmtEuro(totalRevK) : '—'}k
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 mb-1">Prob. volantino media</p>
              <p className="text-lg font-extrabold text-emerald-600 tabular-nums">
                {avgCardProb > 0 ? fmtPct(avgCardProb > 1 ? avgCardProb / 100 : avgCardProb) : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 mb-1">Engagement medio</p>
              <p className="text-lg font-extrabold text-violet-600 tabular-nums">
                {avgEngagement > 0 ? fmtPct(avgEngagement > 1 ? avgEngagement / 100 : avgEngagement) : '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      {picks.length === 0 && (
        <p className="text-sm text-gray-400 italic py-4 text-center">
          Nessuna selezione AI trovata per questa promozione.
        </p>
      )}
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function ReportFooter({ aiResult, onExportPDF }) {
  const ts = new Date().toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const model = aiResult?.model ?? 'claude-opus-4-8';

  return (
    <footer className="mt-8 pt-4 border-t border-gray-200 flex items-center justify-between flex-wrap gap-3 print:mt-4">
      <p className="text-[11px] text-gray-400">
        Generato da{' '}
        <span className="font-semibold text-violet-600">Claude</span>
        {' '}({model}) · {ts}
      </p>
      <button
        onClick={onExportPDF}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-bold shadow-md hover:shadow-lg active:scale-95 transition-all print:hidden"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Esporta PDF
      </button>
    </footer>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function AIDetailReport({
  promoCode,
  plan,
  payload,
  weights,
  aiResult,
  onClose,
}) {
  function handleExportPDF() {
    window.print();
  }

  return (
    <div className="min-h-screen bg-dimar-gray print:bg-white">
      {/* Print styles */}
      <style>{`
        @media print {
          @page { margin: 16mm 12mm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Top navigation bar (hidden on print) */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm px-4 py-3 flex items-center gap-3 print:hidden">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-dimar-dark transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-100"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Torna al piano
        </button>
        <span className="text-gray-200">|</span>
        <span className="text-xs font-bold text-dimar-dark">
          Report AI — {promoCode}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-violet-50 text-violet-700 text-[10px] font-bold border border-violet-200">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
            {aiResult?.model ?? 'claude-opus-4-8'}
          </span>
        </div>
      </div>

      {/* Page content */}
      <div className="max-w-5xl mx-auto px-4 py-6 print:px-0 print:py-0 print:max-w-full">

        {/* 1 — Header */}
        <HeaderSection
          promoCode={promoCode}
          plan={plan}
          aiResult={aiResult}
          payload={payload}
        />

        {/* 2 — Input Data */}
        <ReportSection title="Dati di input" icon="📥" defaultOpen={true}>
          <InputDataSection payload={payload} weights={weights} />
        </ReportSection>

        {/* 3 — AI Reasoning */}
        <ReportSection title="Ragionamento AI" icon="🧠" defaultOpen={true}>
          <AIReasoningSection promoCode={promoCode} aiResult={aiResult} plan={plan} />
        </ReportSection>

        {/* 4 — Results */}
        <ReportSection title="Risultati" icon="📊" defaultOpen={true}>
          <ResultsSection
            promoCode={promoCode}
            aiResult={aiResult}
            plan={plan}
            payload={payload}
          />
        </ReportSection>

        {/* 5 — Footer */}
        <ReportFooter aiResult={aiResult} onExportPDF={handleExportPDF} />
      </div>
    </div>
  );
}
