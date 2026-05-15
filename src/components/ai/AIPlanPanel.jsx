import { useState, useMemo, useEffect } from 'react';
import {
  generateRichPlan,
  generatePlanInsights,
  buildSelectionsFromAccepted,
  DEFAULT_WEIGHTS,
} from '../../ai/engine';
import PROMOZIONI from '../../data/promozioni';
import AISuggestionCard from './AISuggestionCard';
import AIWeightsTab from './AIWeightsTab';

const THINKING_STEPS = [
  '🔍 Analisi anagrafica famiglie...',
  '📊 Calcolo normalizzazioni per reparto...',
  '📅 Valutazione stagionalità M1-M4...',
  '🎯 Match keyword tematici...',
  '⏱  Calcolo recency penalty...',
  '🔄 Ottimizzazione rotazione cross-promo...',
  '⚖️  Bilanciamento budget per sezione...',
  '✨ Generazione confidence + reasoning...',
];

function ThinkingAnimation({ done }) {
  const [stepIdx, setStepIdx] = useState(0);
  useEffect(() => {
    if (done) return;
    const t = setInterval(() => {
      setStepIdx(s => (s + 1) % THINKING_STEPS.length);
    }, 350);
    return () => clearInterval(t);
  }, [done]);

  return (
    <div className="flex flex-col items-center justify-center h-64 gap-5">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
        <div className="absolute inset-2 rounded-full border-2 border-fuchsia-200 border-b-fuchsia-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
      </div>
      <div className="text-center min-h-[2rem]">
        <p className="text-sm text-violet-700 font-semibold animate-pulse">{THINKING_STEPS[stepIdx]}</p>
        <p className="text-xs text-gray-400 mt-1">Il modello sta ragionando sull'intero portafoglio</p>
      </div>
    </div>
  );
}

function PromoTab({ promo, count, accepted, rejected, isActive, onClick }) {
  const decided = accepted + rejected;
  const ratio = count > 0 ? decided / count : 0;
  return (
    <button
      onClick={onClick}
      className={`text-left px-3 py-2.5 rounded-lg transition-all border ${
        isActive
          ? 'bg-violet-50 border-violet-300 shadow-sm'
          : 'bg-white border-gray-200 hover:border-violet-200 hover:bg-violet-50/30'
      }`}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <span className={`font-bold text-sm ${isActive ? 'text-violet-700' : 'text-dimar-dark'}`}>{promo.codice}</span>
        <span className="text-[10px] text-gray-400">Q{promo.quadrimestre}</span>
        {promo.ruoloTemaCod && (
          <span className="ml-auto px-1.5 py-0.5 bg-red-50 text-dimar-red text-[9px] font-bold rounded">
            {promo.ruoloTemaCod}
          </span>
        )}
      </div>
      <div className="text-[11px] text-gray-500 truncate">{promo.tema?.split(' - ')[0]}</div>
      <div className="flex items-center gap-2 mt-1.5">
        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${ratio * 100}%` }} />
        </div>
        <span className="text-[9px] font-mono tabular-nums text-gray-500">{decided}/{count}</span>
      </div>
    </button>
  );
}

const INSIGHT_ICONS = {
  confidence: '🎯',
  revenue: '💰',
  diversity: '🌈',
  season: '📅',
  warning: '⚠️',
};

function InsightCard({ insight }) {
  const colors = {
    positive: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    neutral: 'bg-blue-50 border-blue-200 text-blue-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
  };
  return (
    <div className={`rounded-lg border p-3 ${colors[insight.type]}`}>
      <div className="flex items-start gap-2.5">
        <span className="text-lg shrink-0">{INSIGHT_ICONS[insight.icon] || '✨'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider opacity-80">{insight.title}</h4>
            <span className="text-sm font-bold tabular-nums shrink-0">{insight.value}</span>
          </div>
          <p className="text-xs mt-0.5 opacity-90 leading-relaxed">{insight.text}</p>
        </div>
      </div>
    </div>
  );
}

export default function AIPlanPanel({ channel, gridState, onClose, onSelectPromo }) {
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [thinking, setThinking] = useState(false);
  const [plan, setPlan] = useState(null);
  const [activePromo, setActivePromo] = useState(null);
  const [filterMode, setFilterMode] = useState('all'); // all | warnings | high-conf | low-conf | pending
  const [tab, setTab] = useState('plan');
  // accepted[promoCode][`${fc}::${sectionKey}`] = true | false
  const [accepted, setAccepted] = useState({});

  const channelPromos = useMemo(
    () => PROMOZIONI.filter(p => p.canale === channel)
      .sort((a, b) => (a.dataInizio || '').localeCompare(b.dataInizio || '')),
    [channel]
  );

  const runPlan = () => {
    setThinking(true);
    setPlan(null);
    setAccepted({});
    setTimeout(() => {
      const result = generateRichPlan(channel, weights);
      const insights = generatePlanInsights(result.richByPromo, result.channelPromos);
      // Pre-accept all suggestions by default
      const preAccepted = {};
      for (const promoCode of Object.keys(result.richByPromo)) {
        preAccepted[promoCode] = {};
        for (const s of result.richByPromo[promoCode]) {
          preAccepted[promoCode][`${s.fc}::${s.sectionKey}`] = true;
        }
      }
      setAccepted(preAccepted);
      setPlan({ ...result, insights });
      setActivePromo(result.channelPromos[0]?.codice || null);
      setThinking(false);
    }, 2500);
  };

  const toggleAccept = (promoCode, fc, sectionKey, value) => {
    setAccepted(prev => {
      const key = `${fc}::${sectionKey}`;
      const cur = prev[promoCode] || {};
      return { ...prev, [promoCode]: { ...cur, [key]: value } };
    });
  };

  const acceptAllInPromo = (promoCode) => {
    if (!plan?.richByPromo[promoCode]) return;
    const map = {};
    for (const s of plan.richByPromo[promoCode]) {
      map[`${s.fc}::${s.sectionKey}`] = true;
    }
    setAccepted(prev => ({ ...prev, [promoCode]: map }));
  };

  const rejectAllInPromo = (promoCode) => {
    if (!plan?.richByPromo[promoCode]) return;
    const map = {};
    for (const s of plan.richByPromo[promoCode]) {
      map[`${s.fc}::${s.sectionKey}`] = false;
    }
    setAccepted(prev => ({ ...prev, [promoCode]: map }));
  };

  const statsByPromo = useMemo(() => {
    const out = {};
    if (!plan) return out;
    for (const promoCode of Object.keys(plan.richByPromo)) {
      const sugs = plan.richByPromo[promoCode];
      const acc = accepted[promoCode] || {};
      let aCount = 0, rCount = 0, slotsAcc = 0;
      for (const s of sugs) {
        const v = acc[`${s.fc}::${s.sectionKey}`];
        if (v === true) {
          aCount++;
          slotsAcc += (s.prodCount || 1);
        } else if (v === false) rCount++;
      }
      out[promoCode] = { total: sugs.length, accepted: aCount, rejected: rCount, slotsAcc };
    }
    return out;
  }, [plan, accepted]);

  const overallStats = useMemo(() => {
    let total = 0, acc = 0, rej = 0, slots = 0;
    for (const s of Object.values(statsByPromo)) {
      total += s.total; acc += s.accepted; rej += s.rejected; slots += s.slotsAcc || 0;
    }
    return { total, accepted: acc, rejected: rej, slots };
  }, [statsByPromo]);

  const filteredSuggestions = useMemo(() => {
    if (!plan?.richByPromo[activePromo]) return [];
    const sugs = plan.richByPromo[activePromo];
    const acc = accepted[activePromo] || {};
    return sugs.filter(s => {
      const v = acc[`${s.fc}::${s.sectionKey}`];
      if (filterMode === 'pending') return v === undefined || v === null;
      if (filterMode === 'warnings') return s.warnings.length > 0;
      if (filterMode === 'high-conf') return s.confidence >= 0.75;
      if (filterMode === 'low-conf') return s.confidence < 0.55;
      return true;
    });
  }, [plan, activePromo, accepted, filterMode]);

  const applyAccepted = () => {
    if (!plan) return;
    const selections = buildSelectionsFromAccepted(accepted, plan.richByPromo);
    gridState.applyMultiPromoSuggestions(selections);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative ml-auto w-[1100px] max-w-[95vw] bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-slide-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                AI Plan – {channel}
              </h2>
              <p className="text-violet-100 text-xs mt-1">
                Motore predittivo multi-KPI · valutazione singolare di ogni suggerimento
              </p>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white p-1">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 bg-white">
          <button onClick={() => setTab('plan')} className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === 'plan' ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-dimar-dark'}`}>
            Suggerimenti
          </button>
          <button onClick={() => setTab('weights')} className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === 'weights' ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-dimar-dark'}`}>
            Pesi KPI
          </button>
          <button onClick={() => setTab('about')} className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === 'about' ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-dimar-dark'}`}>
            Come funziona
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {tab === 'plan' && (
            <>
              {!plan && !thinking && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <div className="text-5xl mb-4">✨</div>
                    <h3 className="text-lg font-bold text-dimar-dark mb-2">
                      Pronto a generare il piano
                    </h3>
                    <p className="text-sm text-gray-500 mb-6">
                      L'AI analizzerà <strong>{channelPromos.length} promo</strong> del canale {channel}, attraversando 307 famiglie merceologiche, 6 sezioni promozionali e 8 KPI per generare suggerimenti con confidenza, reasoning e impatto stimato.
                    </p>
                    <button
                      onClick={runPlan}
                      className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                    >
                      🚀 Avvia analisi
                    </button>
                  </div>
                </div>
              )}

              {thinking && <div className="flex-1 flex items-center justify-center"><ThinkingAnimation /></div>}

              {plan && (
                <>
                  {/* Left: promo navigator */}
                  <aside className="w-64 shrink-0 border-r border-gray-200 bg-gray-50/60 overflow-y-auto p-3 space-y-2">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-gray-500 px-1 mb-1">
                      Promo del canale
                    </div>
                    {channelPromos.map(p => {
                      const stat = statsByPromo[p.codice] || { total: 0, accepted: 0, rejected: 0 };
                      return (
                        <PromoTab
                          key={p.codice}
                          promo={p}
                          count={stat.total}
                          accepted={stat.accepted}
                          rejected={stat.rejected}
                          isActive={activePromo === p.codice}
                          onClick={() => setActivePromo(p.codice)}
                        />
                      );
                    })}

                    <button
                      onClick={runPlan}
                      className="w-full mt-2 px-3 py-2 text-xs font-semibold text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50 flex items-center justify-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0114-3l2 3M20 15a9 9 0 01-14 3l-2-3" />
                      </svg>
                      Re-genera piano
                    </button>
                  </aside>

                  {/* Right: insights + suggestions */}
                  <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-violet-50/20">
                    {/* Insights */}
                    <div className="px-5 py-4 border-b border-gray-100 bg-white">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
                        <span className="text-violet-600">🤖</span> AI Insights sul piano
                      </h3>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                        {plan.insights.map((ins, i) => (
                          <InsightCard key={i} insight={ins} />
                        ))}
                      </div>
                    </div>

                    {/* Promo toolbar */}
                    {activePromo && (
                      <div className="px-5 py-3 border-b border-gray-100 bg-white flex items-center gap-3 flex-wrap">
                        <div>
                          <div className="text-xs text-gray-500">
                            Suggerimenti per <strong className="text-dimar-dark">{activePromo}</strong>
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {filteredSuggestions.length} su {plan.richByPromo[activePromo]?.length || 0} mostrati
                            {' · '}
                            <span className="text-emerald-600 font-semibold">
                              {statsByPromo[activePromo]?.accepted || 0} accettati
                            </span>
                            {' · '}
                            <span className="text-red-500 font-semibold">
                              {statsByPromo[activePromo]?.rejected || 0} rifiutati
                            </span>
                          </div>
                        </div>

                        <select
                          value={filterMode}
                          onChange={e => setFilterMode(e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white cursor-pointer"
                        >
                          <option value="all">Tutti</option>
                          <option value="warnings">Solo con avvisi</option>
                          <option value="high-conf">Alta confidenza (≥80%)</option>
                          <option value="low-conf">Bassa confidenza (&lt;55%)</option>
                          <option value="pending">Da decidere</option>
                        </select>

                        <button
                          onClick={() => onSelectPromo(activePromo)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50"
                        >
                          Apri griglia
                        </button>

                        <div className="ml-auto flex items-center gap-2">
                          <button
                            onClick={() => acceptAllInPromo(activePromo)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50"
                          >
                            ✓ Accetta tutti
                          </button>
                          <button
                            onClick={() => rejectAllInPromo(activePromo)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                          >
                            ✗ Rifiuta tutti
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Suggestions grid */}
                    <div className="px-5 py-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
                      {filteredSuggestions.map(s => {
                        const key = `${s.fc}::${s.sectionKey}`;
                        const accVal = accepted[activePromo]?.[key];
                        return (
                          <AISuggestionCard
                            key={`${s.fc}-${s.sectionKey}-${s.repartoCode}`}
                            suggestion={s}
                            accepted={accVal}
                            onToggle={(v) => toggleAccept(activePromo, s.fc, s.sectionKey, v)}
                          />
                        );
                      })}
                      {filteredSuggestions.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-400 text-sm">
                          Nessun suggerimento corrisponde al filtro corrente
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {tab === 'weights' && (
            <AIWeightsTab
              weights={weights}
              onChange={setWeights}
              onReset={() => setWeights(DEFAULT_WEIGHTS)}
            />
          )}

          {tab === 'about' && (
            <div className="flex-1 overflow-y-auto p-6 max-w-3xl text-xs text-gray-600 space-y-4 leading-relaxed">
              <div>
                <h3 className="text-sm font-bold text-dimar-dark mb-2">🤖 Modello multi-KPI predittivo</h3>
                <p>
                  Per ogni combinazione <strong>(famiglia × promo × sezione)</strong> il motore calcola
                  uno <strong>score</strong> aggregando 6 segnali positivi e 2 penalty:
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <h4 className="text-xs font-bold text-emerald-800 mb-1">Segnali positivi</h4>
                  <ul className="text-[11px] space-y-1 text-emerald-900">
                    <li>📊 Vendite normalizzate per reparto</li>
                    <li>💰 Margine</li>
                    <li>🧾 Penetrazione scontrini (% cassieri)</li>
                    <li>📅 Stagionalità (Gaussiana sul mese dominante)</li>
                    <li>🎯 Affinità tematica (keyword matching)</li>
                    <li>⭐ Boost ruolo (A/B/C)</li>
                  </ul>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <h4 className="text-xs font-bold text-amber-800 mb-1">Penalty</h4>
                  <ul className="text-[11px] space-y-1 text-amber-900">
                    <li>⏱  Recency: penalizza famiglie già in volantino recente</li>
                    <li>🔄 Saturazione: penalizza riuso eccessivo nel piano</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-dimar-dark mb-2">🎯 Confidence</h3>
                <p>
                  Per ogni suggerimento viene calcolata una <strong>confidenza</strong>
                  che misura quanto è chiaro il "vincitore" rispetto alle alternative:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Alta (≥80%)</strong>: chiaro vincitore, gap netto vs alternative</li>
                  <li><strong>Media (55-79%)</strong>: scelta solida ma alternative vicine</li>
                  <li><strong>Bassa (&lt;55%)</strong>: caso ambiguo, suggerita review manuale</li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-bold text-dimar-dark mb-2">📈 Impatto previsto (simulato)</h3>
                <p>
                  Per ogni suggerimento viene simulato l'impatto atteso:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Ricavo atteso</strong>: vendite/giorno × durata × uplift tematico+stagionale</li>
                  <li><strong>Probabilità card</strong>: derivata dalla penetrazione scontrini</li>
                  <li><strong>Engagement</strong>: mix scontrini + affinità tematica</li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-bold text-dimar-dark mb-2">🌐 Ottimizzazione di portafoglio</h3>
                <p>
                  Le promo del canale sono processate in <strong>ordine cronologico</strong>.
                  Per ogni (sezione × reparto) si selezionano le top-N famiglie con punteggio
                  più alto fino al budget PROD. Le CARD sono assegnate alle PROD con miglior
                  mix vendite/scontrini.
                </p>
                <p className="mt-2">
                  Una famiglia usata in promo precedenti del piano riceve una penalty crescente,
                  garantendo <strong>rotazione tra volantini</strong>.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-dimar-dark mb-2">✅ Workflow umano-AI</h3>
                <p>
                  Il piano viene proposto con <strong>tutti i suggerimenti pre-accettati</strong>.
                  L'utente può rifiutare individualmente quelli problematici, filtrare per
                  confidenza/avvisi, e infine applicare solo gli accettati a tutte le promo
                  con un click.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {plan && tab === 'plan' && (
          <div className="px-6 py-3 border-t border-gray-200 flex items-center gap-3 bg-gray-50">
            <div className="text-xs">
              <span className="text-gray-500">Su </span>
              <strong className="text-dimar-dark">{overallStats.total}</strong>
              <span className="text-gray-500"> proposte · </span>
              <strong className="text-emerald-600">{overallStats.accepted}</strong>
              <span className="text-gray-500"> accettate </span>
              <span className="text-violet-600 font-bold">({overallStats.slots} slot)</span>
              <span className="text-gray-500"> · </span>
              <strong className="text-red-500">{overallStats.rejected}</strong>
              <span className="text-gray-500"> rifiutate</span>
            </div>
            <button
              onClick={applyAccepted}
              disabled={overallStats.accepted === 0}
              className="ml-auto px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-bold rounded-lg hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Applica {overallStats.accepted} proposte ({overallStats.slots} slot)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
