import { useState, useMemo } from 'react';
import { generateChannelPlan, DEFAULT_WEIGHTS, getTopSuggestionsForPromo } from '../../ai/engine';
import PROMOZIONI from '../../data/promozioni';
import { fmtEuro, fmtPct } from '../../utils';

function WeightSlider({ label, value, onChange, color = 'indigo', sub }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-semibold text-dimar-dark">{label}</span>
        <span className="font-mono text-gray-500 tabular-nums">{(value * 100).toFixed(0)}</span>
      </div>
      {sub && <p className="text-[10px] text-gray-400 mb-1">{sub}</p>}
      <input
        type="range"
        min="0" max="0.4" step="0.01"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className={`w-full accent-${color}-600`}
      />
    </div>
  );
}

function PromoPlanRow({ promo, picks, onSelectPromo, isExpanded, onToggleExpand }) {
  const totalProd = picks.length;
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={onToggleExpand}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50/50 transition-colors"
      >
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-dimar-dark">{promo.codice}</span>
            <span className="text-[10px] text-gray-400">Q{promo.quadrimestre}</span>
            {promo.ruoloTema && (
              <span className="px-1.5 py-0.5 bg-red-50 text-dimar-red text-[10px] font-bold rounded">
                {promo.ruoloTemaCod}
              </span>
            )}
          </div>
          <div className="text-[11px] text-gray-500 truncate">{promo.tema}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-violet-600 tabular-nums">{totalProd}</div>
          <div className="text-[10px] text-gray-400">slot suggeriti</div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onSelectPromo(promo.codice); }}
          className="ml-2 px-2 py-1 text-[11px] font-semibold text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50"
        >
          Apri
        </button>
      </button>

      {isExpanded && picks.length > 0 && (
        <div className="border-t border-gray-100 max-h-64 overflow-y-auto">
          {picks.slice(0, 30).map((p, i) => (
            <div key={`${p.fc}-${i}`} className="px-4 py-1.5 flex items-center gap-2 text-[11px] hover:bg-gray-50">
              <span className="w-5 text-gray-300 tabular-nums text-right">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-dimar-dark truncate" title={p.fn}>{p.fn}</div>
                <div className="text-gray-400 text-[10px]">{p.rn} · {p.section}</div>
              </div>
              <span className="font-mono tabular-nums text-violet-600 font-bold">
                {(p.score * 100).toFixed(0)}
              </span>
            </div>
          ))}
          {picks.length > 30 && (
            <div className="px-4 py-1.5 text-[10px] text-gray-400 text-center">
              + {picks.length - 30} altri
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AIPlanPanel({ channel, gridState, onClose, onSelectPromo }) {
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [thinking, setThinking] = useState(false);
  const [plan, setPlan] = useState(null);
  const [expandedPromo, setExpandedPromo] = useState(null);
  const [tab, setTab] = useState('plan'); // 'plan' | 'weights'

  const channelPromos = useMemo(
    () => PROMOZIONI.filter(p => p.canale === channel)
      .sort((a, b) => (a.dataInizio || '').localeCompare(b.dataInizio || '')),
    [channel]
  );

  const runPlan = () => {
    setThinking(true);
    setPlan(null);
    setTimeout(() => {
      const result = generateChannelPlan(channel, weights);
      setPlan(result);
      setThinking(false);
    }, 300);
  };

  // Group scoreLog by promo
  const picksByPromo = useMemo(() => {
    if (!plan) return {};
    const out = {};
    for (const e of plan.scoreLog) {
      if (!out[e.promoCode]) out[e.promoCode] = [];
      out[e.promoCode].push(e);
    }
    // Sort each promo by score desc
    for (const k of Object.keys(out)) {
      out[k].sort((a, b) => b.score - a.score);
    }
    return out;
  }, [plan]);

  const applyAll = () => {
    if (!plan) return;
    gridState.applyMultiPromoSuggestions(plan.selectionsByPromo);
    onClose();
  };

  const applyOne = (promoCode) => {
    if (!plan?.selectionsByPromo[promoCode]) return;
    gridState.applyMultiPromoSuggestions({ [promoCode]: plan.selectionsByPromo[promoCode] });
  };

  const setW = (k, v) => setWeights(w => ({ ...w, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative ml-auto w-[560px] bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-slide-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-violet-600 to-fuchsia-600">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                AI Plan – {channel}
              </h2>
              <p className="text-violet-100 text-xs mt-1">
                Pianificazione predittiva dell'intero quadrimestre con ottimizzazione multi-KPI
              </p>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setTab('plan')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'plan' ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-dimar-dark'
            }`}
          >
            Piano Multi-Promo
          </button>
          <button
            onClick={() => setTab('weights')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'weights' ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-dimar-dark'
            }`}
          >
            Pesi KPI
          </button>
          <button
            onClick={() => setTab('about')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'about' ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-dimar-dark'
            }`}
          >
            Logica
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab === 'plan' && (
            <>
              {!plan && !thinking && (
                <div className="text-center py-8">
                  <button
                    onClick={runPlan}
                    className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                  >
                    ✨ Genera piano per {channelPromos.length} promo
                  </button>
                  <p className="text-xs text-gray-400 mt-3">
                    L'AI ottimizzerà l'intero portafoglio considerando KPI, stagionalità,
                    affinità tematica, recency e saturazione del piano.
                  </p>
                </div>
              )}

              {thinking && (
                <div className="flex flex-col items-center justify-center h-48 gap-4">
                  <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2.5 h-2.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2.5 h-2.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <p className="text-sm text-gray-500">Ottimizzazione del piano in corso...</p>
                </div>
              )}

              {plan && (
                <>
                  {/* Summary card */}
                  <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-100 rounded-xl p-4 mb-4">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <div className="text-2xl font-bold text-violet-600 tabular-nums">{plan.summary.promoCount}</div>
                        <div className="text-[10px] uppercase text-gray-500 tracking-wider mt-0.5">Promo</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-fuchsia-600 tabular-nums">{plan.summary.totalAssignments}</div>
                        <div className="text-[10px] uppercase text-gray-500 tracking-wider mt-0.5">Slot Tot.</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-pink-600 tabular-nums">{plan.summary.distinctFamiglie || plan.summary.distinctFamilies}</div>
                        <div className="text-[10px] uppercase text-gray-500 tracking-wider mt-0.5">Famiglie</div>
                      </div>
                    </div>
                  </div>

                  {/* Per-promo list */}
                  <div className="space-y-2">
                    {channelPromos.map(p => (
                      <PromoPlanRow
                        key={p.codice}
                        promo={p}
                        picks={picksByPromo[p.codice] || []}
                        onSelectPromo={onSelectPromo}
                        isExpanded={expandedPromo === p.codice}
                        onToggleExpand={() => setExpandedPromo(expandedPromo === p.codice ? null : p.codice)}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {tab === 'weights' && (
            <div className="space-y-5">
              <p className="text-xs text-gray-500">
                Modifica i pesi per influenzare il comportamento dell'AI.
                Premi <strong>Genera piano</strong> per vedere l'effetto.
              </p>
              <WeightSlider
                label="Vendite (normalizzate per reparto)"
                value={weights.sales}
                onChange={v => setW('sales', v)}
                sub="Quanto pesa il volume di vendite"
              />
              <WeightSlider
                label="Margine"
                value={weights.margin}
                onChange={v => setW('margin', v)}
                sub="Marginalità della famiglia"
              />
              <WeightSlider
                label="Penetrazione scontrini"
                value={weights.scontrini}
                onChange={v => setW('scontrini', v)}
                sub="Quanto la famiglia entra negli scontrini"
              />
              <WeightSlider
                label="Stagionalità"
                value={weights.seasonality}
                onChange={v => setW('seasonality', v)}
                sub="Allineamento M1-M4 con il periodo della promo"
              />
              <WeightSlider
                label="Affinità tematica"
                value={weights.themeAffinity}
                onChange={v => setW('themeAffinity', v)}
                sub="Match keyword tra nome famiglia e tema/speciale"
              />
              <WeightSlider
                label="Boost ruolo (A/B/C)"
                value={weights.roleBoost}
                onChange={v => setW('roleBoost', v)}
                sub="A → top family; B → medie; C → spread"
              />
              <WeightSlider
                label="Penalty recency"
                value={weights.recencyPenalty}
                onChange={v => setW('recencyPenalty', v)}
                sub="Penalizza famiglie già in volantino di recente"
              />
              <WeightSlider
                label="Penalty saturazione piano"
                value={weights.saturationPenalty}
                onChange={v => setW('saturationPenalty', v)}
                sub="Penalizza riuso eccessivo nello stesso piano"
              />
              <button
                onClick={() => setWeights(DEFAULT_WEIGHTS)}
                className="text-xs text-violet-600 hover:underline"
              >
                Reset ai valori predefiniti
              </button>
            </div>
          )}

          {tab === 'about' && (
            <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
              <h3 className="text-sm font-bold text-dimar-dark">Motore predittivo multi-KPI</h3>
              <p>
                L'engine assegna a ogni famiglia un <strong>score</strong> per ogni
                combinazione (promo × sezione × tipo) basato su 8 dimensioni:
              </p>
              <ol className="list-decimal pl-4 space-y-1">
                <li><strong>Vendite normalizzate</strong> per reparto: evita di favorire reparti grandi</li>
                <li><strong>Margine</strong>: marginalità della famiglia</li>
                <li><strong>Penetrazione scontrini</strong>: rilevanza per il cliente</li>
                <li><strong>Stagionalità</strong>: allinea M1-M4 con il mese della promo (campana gaussiana)</li>
                <li><strong>Affinità tematica</strong>: keyword matching nome famiglia ↔ tema</li>
                <li><strong>Boost ruolo</strong>: A-promo → top families; C → spread</li>
                <li><strong>Penalty recency</strong>: penalizza famiglie già usate di recente</li>
                <li><strong>Penalty saturazione</strong>: evita di sovraccaricare le stesse famiglie nel piano</li>
              </ol>
              <h3 className="text-sm font-bold text-dimar-dark mt-4">Ottimizzazione di portafoglio</h3>
              <p>
                Le promo sono processate in ordine cronologico. Per ogni
                (sezione × reparto), l'AI seleziona le top-N famiglie con punteggio
                più alto, fino al budget PROD. Le CARD sono assegnate alle famiglie
                PROD con migliore mix vendite/scontrini.
              </p>
              <p>
                Una famiglia usata in promo precedenti riceve una <strong>penalty crescente</strong>,
                garantendo rotazione nel piano e diversità tra volantini.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {plan && tab === 'plan' && (
          <div className="px-6 py-4 border-t border-gray-200 flex gap-3 bg-gray-50">
            <button
              onClick={runPlan}
              className="px-3 py-2 text-xs font-semibold text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50"
            >
              Re-genera
            </button>
            <button
              onClick={applyAll}
              className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-bold py-2.5 rounded-lg hover:shadow-md transition-all"
            >
              Applica a tutte le {channelPromos.length} promo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
