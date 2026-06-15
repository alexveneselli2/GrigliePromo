import { useState, useMemo, useEffect } from 'react';
import {
  generateRichPlan,
  generatePlanInsights,
  buildSelectionsFromAccepted,
  buildAIChannelPayload,
  assembleAIPlan,
  DEFAULT_WEIGHTS,
} from '../../ai/engine';
import { isAIConfigured, requestAIPlan, aiProxyUrl } from '../../ai/anthropicClient';
import PROMOZIONI from '../../data/promozioni';
import AISuggestionCard from './AISuggestionCard';
import AIWeightsTab from './AIWeightsTab';
import AIDetailReport from './AIDetailReport';
import DataStructurePage from './DataStructurePage';

// Real progress steps for AI mode (each maps to an actual action in runAIPlan)
const AI_STEPS = [
  { key: 'prepare', label: 'Preparazione dati e profili arricchiti', pct: 5 },
  { key: 'payload', label: 'Costruzione payload (top-10 candidati × sezione)', pct: 10 },
  { key: 'send', label: 'Invio a Claude Opus 4.8 con extended thinking', pct: 15 },
  { key: 'thinking', label: 'Claude sta analizzando i candidati…', pct: 30 },
  { key: 'waiting', label: 'Ragionamento in corso — allocazione budget…', pct: 55 },
  { key: 'received', label: 'Risposta ricevuta — validazione schema', pct: 85 },
  { key: 'assemble', label: 'Assemblaggio piano e verifica budget', pct: 95 },
  { key: 'done', label: 'Piano completato', pct: 100 },
];

function AIThinkingPanel({ progress }) {
  const step = progress?.step ? AI_STEPS.find(s => s.key === progress.step) : null;
  const pct = step?.pct ?? 0;
  const promoCode = progress?.promoCode;
  const tema = progress?.tema;
  const stats = progress?.stats;

  // Elapsed timer — shows how long Claude has been thinking
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    setElapsed(0);
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [progress?.step]);

  const isThinking = step?.key === 'thinking' || step?.key === 'waiting';
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const elapsedStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-full max-w-md px-6">
        {/* Spinner */}
        <div className="flex justify-center mb-5">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-fuchsia-200 border-b-fuchsia-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          </div>
        </div>

        {/* Promo info */}
        {promoCode && (
          <div className="text-center mb-4">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-lg">
              <span className="text-sm font-bold text-violet-700">{promoCode}</span>
              {tema && <span className="text-xs text-gray-500">{tema.split(' - ')[0]?.slice(0, 30)}</span>}
            </span>
          </div>
        )}

        {/* Progress bar */}
        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full transition-all duration-700 ease-out ${isThinking ? 'animate-pulse' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Percentage + step label */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-600 font-medium">{step?.label || 'Inizializzazione…'}</span>
          <span className="text-xs font-bold text-violet-600 tabular-nums">{pct}%</span>
        </div>

        {/* Elapsed timer — especially useful during long thinking phase */}
        {isThinking && (
          <div className="text-center mb-4">
            <span className="text-[11px] text-gray-400">
              Tempo trascorso: <span className="font-mono tabular-nums text-gray-600">{elapsedStr}</span>
              {elapsed > 30 && <span className="text-violet-500"> — Claude sta analizzando {stats?.candidates || ''} candidati con ragionamento esteso</span>}
            </span>
          </div>
        )}

        {/* Stats about the request */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="text-center bg-gray-50 rounded-lg p-2 border border-gray-100">
              <div className="text-lg font-bold text-violet-700 tabular-nums">{stats.sections}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Sezioni</div>
            </div>
            <div className="text-center bg-gray-50 rounded-lg p-2 border border-gray-100">
              <div className="text-lg font-bold text-violet-700 tabular-nums">{stats.candidates}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Candidati</div>
            </div>
            <div className="text-center bg-gray-50 rounded-lg p-2 border border-gray-100">
              <div className="text-lg font-bold text-violet-700 tabular-nums">{stats.reparti}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Reparti</div>
            </div>
          </div>
        )}

        {/* Steps completed */}
        <div className="mt-5 space-y-1.5">
          {AI_STEPS.filter(s => s.pct <= pct && s.key !== 'done').map(s => (
            <div key={s.key} className="flex items-center gap-2 text-[11px]">
              <span className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
                s.pct < pct ? 'bg-emerald-500 text-white' : 'bg-violet-100 text-violet-600 animate-pulse'
              }`}>
                {s.pct < pct
                  ? <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  : <div className="w-1.5 h-1.5 rounded-full bg-violet-600" />
                }
              </span>
              <span className={s.pct < pct ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeuristicThinking() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-4 border-gray-200 border-t-gray-600 animate-spin" />
      </div>
      <p className="text-sm text-gray-600 font-semibold">Calcolo euristico in corso…</p>
    </div>
  );
}

const SECTION_GRADIENTS = {
  red: 'from-dimar-red to-rose-500',
  orange: 'from-orange-600 to-orange-400',
  amber: 'from-amber-600 to-amber-400',
  green: 'from-emerald-600 to-emerald-400',
  teal: 'from-teal-600 to-teal-400',
  blue: 'from-blue-600 to-blue-400',
};
const SECTION_RING = {
  red: 'ring-dimar-red/40',
  orange: 'ring-orange-500/40',
  amber: 'ring-amber-500/40',
  green: 'ring-emerald-500/40',
  teal: 'ring-teal-500/40',
  blue: 'ring-blue-500/40',
};

function SectionChip({ label, count, slots, color, isActive, onClick }) {
  const gradient = color ? SECTION_GRADIENTS[color] : 'from-gray-700 to-gray-500';
  const ring = color ? SECTION_RING[color] : 'ring-gray-300';
  return (
    <button
      onClick={onClick}
      className={`group inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full border text-xs font-semibold transition-all ${
        isActive
          ? `bg-gradient-to-r ${gradient} text-white border-transparent shadow-sm ring-2 ${ring}`
          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      {color && (
        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white/80' : `bg-gradient-to-r ${gradient}`}`} />
      )}
      <span>{label}</span>
      <span className={`text-[10px] tabular-nums font-bold px-1.5 py-0.5 rounded-full ${
        isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
      }`}>
        {count}{slots != null && slots !== count ? `·${slots}sl` : ''}
      </span>
    </button>
  );
}

function GroupHeader({ label, color, count, slots, groupBy }) {
  const gradient = color ? SECTION_GRADIENTS[color] : 'from-gray-700 to-gray-500';
  return (
    <div className="flex items-center gap-2 mb-2 pb-1.5 border-b-2 border-gray-100">
      <div className={`w-1 h-5 rounded-full ${color ? `bg-gradient-to-b ${gradient}` : 'bg-gray-400'}`} />
      <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
        {groupBy === 'section' ? 'Sezione' : 'Reparto'}
      </span>
      <h4 className="text-sm font-bold text-dimar-dark">{label}</h4>
      <span className="text-[10px] text-gray-400">
        {count} {count === 1 ? 'proposta' : 'proposte'}{slots != null && slots !== count ? ` · ${slots} slot` : ''}
      </span>
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

export default function AIPlanPanel({ channel, selectedPromoCode, gridState, aiState, onClose, onSelectPromo }) {
  // Persistent state (survives panel close/reopen) from useAIState in App
  const {
    aiAvailable,
    weights, setWeights,
    engine, setEngine,
    plan, setPlan,
    accepted, setAccepted,
    activePromo, setActivePromo,
    lastPayload, setLastPayload,
    lastAiResult, setLastAiResult,
    aiError, setAiError,
  } = aiState;

  // Transient state (resets each time panel opens — that's fine)
  const [thinking, setThinking] = useState(false);
  const [filterMode, setFilterMode] = useState('all');
  const [activeSection, setActiveSection] = useState('all');
  const [groupBy, setGroupBy] = useState('section');
  const [tab, setTab] = useState('plan');
  const [aiProgress, setAiProgress] = useState(null);
  const [showDetailReport, setShowDetailReport] = useState(false);
  const [showDataStructure, setShowDataStructure] = useState(false);

  const channelPromos = useMemo(
    () => PROMOZIONI.filter(p => p.canale === channel)
      .sort((a, b) => (a.dataInizio || '').localeCompare(b.dataInizio || '')),
    [channel]
  );

  // The AI works on a single promo: the one currently selected (falls back to
  // the first of the channel if none is selected).
  const targetPromo = useMemo(
    () => channelPromos.find(p => p.codice === selectedPromoCode) || channelPromos[0] || null,
    [channelPromos, selectedPromoCode]
  );

  const finishPlan = (result, insights) => {
    const preAccepted = {};
    for (const promoCode of Object.keys(result.richByPromo)) {
      preAccepted[promoCode] = {};
      for (const s of result.richByPromo[promoCode]) {
        preAccepted[promoCode][`${s.fc}::${s.sectionKey}`] = true;
      }
    }
    setAccepted(preAccepted);
    setPlan({ ...result, insights });
    // Focus the first promo that actually has suggestions (the analysed one).
    const firstWithSuggestions = Object.keys(result.richByPromo)
      .find(code => (result.richByPromo[code] || []).length > 0);
    setActivePromo(firstWithSuggestions || result.channelPromos[0]?.codice || null);
    setThinking(false);
  };

  const runHeuristicPlan = () => {
    setThinking(true);
    setPlan(null);
    setAccepted({});
    setAiError(null);
    setTimeout(() => {
      const result = generateRichPlan(channel, weights);
      const insights = generatePlanInsights(result.richByPromo, result.channelPromos);
      finishPlan(result, insights);
    }, 1200);
  };

  const runAIPlan = async () => {
    setThinking(true);
    setPlan(null);
    setAccepted({});
    setAiError(null);
    const promoCode = targetPromo?.codice;
    const tema = targetPromo?.tema;
    const setStep = (step, stats) => setAiProgress({ step, promoCode, tema, stats });
    try {
      if (!targetPromo) {
        setThinking(false);
        setAiError('Nessuna promo selezionata da analizzare.');
        return;
      }

      // Step 1: prepare
      setStep('prepare');
      await new Promise(r => setTimeout(r, 200)); // let UI render

      // Step 2: build payload with top-15 candidates
      setStep('payload');
      const currentSelections = gridState.allSelections[promoCode] || {};
      const payload = buildAIChannelPayload(channel, weights, 10, promoCode, currentSelections);
      if (payload.promos.length === 0) {
        setThinking(false);
        setAiError(`La promo ${promoCode} non ha sezioni/candidati da analizzare.`);
        return;
      }
      setLastPayload(payload);

      // Compute stats to show user what's being sent
      const promoPayload = payload.promos[0];
      const nSections = promoPayload.sections.length;
      const nReparti = new Set(promoPayload.sections.flatMap(s => s.reparti.map(r => r.repartoCode))).size;
      const nCandidates = promoPayload.sections.reduce((s, sec) => s + sec.reparti.reduce((t, r) => t + r.candidates.length, 0), 0);
      const stats = { sections: nSections, candidates: nCandidates, reparti: nReparti };

      // Step 3: send to Claude
      setStep('send', stats);
      await new Promise(r => setTimeout(r, 300));

      // Step 4: thinking (set before await — the model is working)
      setStep('thinking', stats);

      // Kick off a timer that moves to 'waiting' after a few seconds to
      // indicate the model is still reasoning.
      const waitingTimer = setTimeout(() => setStep('waiting', stats), 8000);

      const aiResult = await requestAIPlan(payload);
      clearTimeout(waitingTimer);

      // Step 5: received
      setStep('received', stats);
      setLastAiResult(aiResult);
      await new Promise(r => setTimeout(r, 200));

      // Step 6: assemble
      setStep('assemble', stats);
      const result = assembleAIPlan(channel, aiResult, weights);
      await new Promise(r => setTimeout(r, 200));

      // Step 7: done
      setStep('done', stats);
      finishPlan(result, result.insights);
      setAiProgress(null);
    } catch (err) {
      setThinking(false);
      setAiProgress(null);
      setAiError(err?.message || 'Errore durante la chiamata AI');
    }
  };

  const runPlan = () => {
    if (engine === 'ai') {
      if (!aiAvailable) { setAiError('AI proxy non configurato.'); return; }
      runAIPlan();
    } else {
      runHeuristicPlan();
    }
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

  // Sections present in the active promo's suggestions, with counts
  const sectionsForActivePromo = useMemo(() => {
    if (!plan?.richByPromo[activePromo]) return [];
    const sugs = plan.richByPromo[activePromo];
    const order = ['tema', 'sotto', 's1', 's2', 's3', 's4'];
    const map = {};
    for (const s of sugs) {
      if (!map[s.sectionKey]) {
        map[s.sectionKey] = {
          key: s.sectionKey,
          short: s.sectionShort,
          label: s.sectionLabel,
          color: s.sectionColor,
          total: 0,
          totalSlots: 0,
        };
      }
      map[s.sectionKey].total += 1;
      map[s.sectionKey].totalSlots += s.prodCount || 1;
    }
    return order.filter(k => map[k]).map(k => map[k]);
  }, [plan, activePromo]);

  // Reset section filter when changing promo
  useEffect(() => {
    setActiveSection('all');
  }, [activePromo]);

  const filteredSuggestions = useMemo(() => {
    if (!plan?.richByPromo[activePromo]) return [];
    const sugs = plan.richByPromo[activePromo];
    const acc = accepted[activePromo] || {};
    return sugs.filter(s => {
      if (activeSection !== 'all' && s.sectionKey !== activeSection) return false;
      const v = acc[`${s.fc}::${s.sectionKey}`];
      if (filterMode === 'pending') return v === undefined || v === null;
      if (filterMode === 'warnings') return s.warnings.length > 0;
      if (filterMode === 'high-conf') return s.confidence >= 0.75;
      if (filterMode === 'low-conf') return s.confidence < 0.55;
      return true;
    });
  }, [plan, activePromo, accepted, filterMode, activeSection]);

  // Grouped suggestions for rendering
  const groupedSuggestions = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: null, items: filteredSuggestions }];
    }
    const groups = {};
    const order = [];
    for (const s of filteredSuggestions) {
      let key, label, color;
      if (groupBy === 'section') {
        key = s.sectionKey;
        label = s.sectionShort;
        color = s.sectionColor;
      } else {
        key = s.repartoCode;
        label = s.family.rn;
      }
      if (!groups[key]) {
        groups[key] = { key, label, color, items: [] };
        order.push(key);
      }
      groups[key].items.push(s);
    }
    // Custom ordering when grouping by section
    if (groupBy === 'section') {
      const sectionOrder = ['tema', 'sotto', 's1', 's2', 's3', 's4'];
      order.sort((a, b) => sectionOrder.indexOf(a) - sectionOrder.indexOf(b));
    }
    return order.map(k => groups[k]);
  }, [filteredSuggestions, groupBy]);

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
          {plan && lastAiResult && (
            <button onClick={() => setShowDetailReport(true)} className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors border-transparent text-gray-500 hover:text-violet-600`}>
              Report dettaglio
            </button>
          )}
          <button onClick={() => setShowDataStructure(true)} className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors border-transparent text-gray-500 hover:text-violet-600`}>
            Struttura dati
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
                  <div className="text-center max-w-lg">
                    <div className="text-5xl mb-4">✨</div>
                    <h3 className="text-lg font-bold text-dimar-dark mb-2">
                      Pronto a generare il piano
                    </h3>
                    <p className="text-sm text-gray-500 mb-5">
                      {engine === 'ai'
                        ? <>Claude analizzerà la promo <strong>{targetPromo?.codice || '—'}</strong>{targetPromo?.tema ? <> ({targetPromo.tema.split(' - ')[0]})</> : null} del canale {channel} e proporrà famiglie e quantità di spazi per ogni sezione, rispettando i budget.</>
                        : <>Il motore euristico locale analizzerà le <strong>{channelPromos.length} promo</strong> del canale {channel} con 8 KPI per generare suggerimenti con confidenza, reasoning e impatto stimato.</>}
                    </p>

                    {/* Engine selector */}
                    <div className="inline-flex items-center bg-gray-100 rounded-xl p-1 mb-5">
                      <button
                        onClick={() => setEngine('heuristic')}
                        className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${engine === 'heuristic' ? 'bg-white shadow-sm text-dimar-dark' : 'text-gray-500 hover:text-dimar-dark'}`}
                      >
                        Euristico locale
                      </button>
                      <button
                        onClick={() => setEngine('ai')}
                        disabled={!aiAvailable}
                        title={aiAvailable ? '' : 'Configura il proxy AI per abilitarlo'}
                        className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                          engine === 'ai'
                            ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm'
                            : aiAvailable ? 'text-gray-500 hover:text-dimar-dark' : 'text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        AI (Claude)
                      </button>
                    </div>

                    <div>
                      <button
                        onClick={runPlan}
                        disabled={engine === 'ai' && !aiAvailable}
                        className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        🚀 Avvia analisi
                      </button>
                    </div>

                    {engine === 'ai' && !aiAvailable && (
                      <div className="mt-5 text-left bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900">
                        <p className="font-bold mb-1">⚠️ Proxy AI non configurato</p>
                        <p className="leading-relaxed">
                          Per usare Claude serve il backend proxy (la API key non può stare nel browser).
                          Avvia <code className="bg-amber-100 px-1 rounded">server/</code> e imposta
                          {' '}<code className="bg-amber-100 px-1 rounded">VITE_AI_PROXY_URL</code> nel file
                          {' '}<code className="bg-amber-100 px-1 rounded">.env.local</code>. Vedi <code className="bg-amber-100 px-1 rounded">server/README.md</code>.
                          Nel frattempo usa il motore euristico locale.
                        </p>
                      </div>
                    )}

                    {aiError && (
                      <div className="mt-5 text-left bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-800">
                        <p className="font-bold mb-1">Errore AI</p>
                        <p className="leading-relaxed">{aiError}</p>
                        <p className="mt-2 text-red-600">Verifica che il proxy ({aiProxyUrl() || 'non impostato'}) sia attivo e che la chiave sia valida.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {thinking && (engine === 'ai' && aiProgress ? <AIThinkingPanel progress={aiProgress} /> : <div className="flex-1 flex items-center justify-center"><HeuristicThinking /></div>)}

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

                    {/* Promo toolbar (top) */}
                    {activePromo && (
                      <div className="px-5 py-3 border-b border-gray-100 bg-white">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div>
                            <div className="text-xs text-gray-500">
                              Suggerimenti per <strong className="text-dimar-dark">{activePromo}</strong>
                            </div>
                            <div className="text-[10px] text-gray-400">
                              {filteredSuggestions.length} di {plan.richByPromo[activePromo]?.length || 0} visibili
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

                          <button
                            onClick={() => onSelectPromo(activePromo)}
                            className="ml-auto px-2.5 py-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50"
                          >
                            Apri griglia
                          </button>
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

                        {/* Section navigation chips */}
                        {sectionsForActivePromo.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                            <SectionChip
                              label="Tutte"
                              count={plan.richByPromo[activePromo]?.length || 0}
                              isActive={activeSection === 'all'}
                              onClick={() => setActiveSection('all')}
                            />
                            {sectionsForActivePromo.map(sec => (
                              <SectionChip
                                key={sec.key}
                                label={sec.short}
                                count={sec.total}
                                slots={sec.totalSlots}
                                color={sec.color}
                                isActive={activeSection === sec.key}
                                onClick={() => setActiveSection(sec.key)}
                              />
                            ))}
                          </div>
                        )}

                        {/* Secondary filter row: confidence / group-by */}
                        <div className="flex items-center gap-2 mt-3 text-xs">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Filtra:</span>
                          <select
                            value={filterMode}
                            onChange={e => setFilterMode(e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white cursor-pointer"
                          >
                            <option value="all">Tutti</option>
                            <option value="warnings">Solo con avvisi</option>
                            <option value="high-conf">Alta confidenza (≥80%)</option>
                            <option value="low-conf">Bassa confidenza (&lt;55%)</option>
                            <option value="pending">Da decidere</option>
                          </select>

                          <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 ml-2">Raggruppa per:</span>
                          <div className="inline-flex items-center bg-gray-100 rounded-lg p-0.5">
                            <button
                              onClick={() => setGroupBy('section')}
                              className={`px-2 py-0.5 text-[11px] font-semibold rounded ${groupBy === 'section' ? 'bg-white shadow-sm text-violet-700' : 'text-gray-500 hover:text-dimar-dark'}`}
                            >
                              Sezione
                            </button>
                            <button
                              onClick={() => setGroupBy('reparto')}
                              className={`px-2 py-0.5 text-[11px] font-semibold rounded ${groupBy === 'reparto' ? 'bg-white shadow-sm text-violet-700' : 'text-gray-500 hover:text-dimar-dark'}`}
                            >
                              Reparto
                            </button>
                            <button
                              onClick={() => setGroupBy('none')}
                              className={`px-2 py-0.5 text-[11px] font-semibold rounded ${groupBy === 'none' ? 'bg-white shadow-sm text-violet-700' : 'text-gray-500 hover:text-dimar-dark'}`}
                            >
                              Nessuno
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Suggestions: grouped or flat */}
                    <div className="px-5 py-4">
                      {filteredSuggestions.length === 0 && (
                        <div className="text-center py-12 text-gray-400 text-sm">
                          Nessun suggerimento corrisponde al filtro corrente
                        </div>
                      )}

                      {groupedSuggestions.map(group => (
                        <div key={group.key} className="mb-5">
                          {group.label && (
                            <GroupHeader
                              label={group.label}
                              color={group.color}
                              count={group.items.length}
                              slots={group.items.reduce((s, x) => s + (x.prodCount || 1), 0)}
                              groupBy={groupBy}
                            />
                          )}
                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                            {group.items.map(s => {
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
                          </div>
                        </div>
                      ))}
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

      {showDetailReport && plan && lastAiResult && (
        <div className="fixed inset-0 z-[60] bg-white overflow-y-auto">
          <AIDetailReport
            promoCode={targetPromo?.codice}
            plan={plan}
            payload={lastPayload}
            weights={weights}
            aiResult={lastAiResult}
            onClose={() => setShowDetailReport(false)}
          />
        </div>
      )}

      {showDataStructure && (
        <DataStructurePage onClose={() => setShowDataStructure(false)} />
      )}
    </div>
  );
}
