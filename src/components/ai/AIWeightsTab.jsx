import { DEFAULT_WEIGHTS } from '../../ai/engine';

// KPI metadata with rich explanations
const KPI_DEFS = {
  sales: {
    group: 'positive',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 14l4-4 4 4 5-5" />
      </svg>
    ),
    color: 'red',
    title: 'Vendite',
    tagline: 'Volume netto della famiglia',
    description: 'Quanto la famiglia incassa nel reparto, normalizzata per evitare di favorire reparti più grandi.',
    effectHigh: 'Top seller dominano (es. acqua minerale 1.5L)',
    effectLow: 'Apre spazio a prodotti emergenti o di nicchia',
  },
  margin: {
    group: 'positive',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2m0-8a4 4 0 100 8" />
      </svg>
    ),
    color: 'emerald',
    title: 'Margine',
    tagline: 'Profitto netto medio',
    description: 'Marginalità della famiglia. Famiglie più redditizie ricevono priorità a parità di vendite.',
    effectHigh: 'Privilegia profitto (es. marche premium, MDD)',
    effectLow: 'Si concentra sui driver di traffico, anche se a basso margine',
  },
  scontrini: {
    group: 'positive',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    color: 'cyan',
    title: 'Penetrazione scontrini',
    tagline: 'Diffusione nel paniere cliente',
    description: 'Percentuale di scontrini che contengono la famiglia. Misura quanto è "presa di mano" dalla clientela.',
    effectHigh: 'Promo orientate a fidelizzazione e Card (alto pick-up)',
    effectLow: 'Promo di acquisizione su prodotti meno penetranti',
  },
  seasonality: {
    group: 'positive',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    color: 'amber',
    title: 'Stagionalità',
    tagline: 'Allineamento M1-M4 col periodo',
    description: 'Match tra le vendite mensili e il mese effettivo della promo. Una famiglia "estiva" pesa di più in promo di luglio.',
    effectHigh: 'Promo perfettamente stagionali (gelati a giugno, panettone a dicembre)',
    effectLow: 'Mix più trasversale tra le stagioni',
  },
  themeAffinity: {
    group: 'positive',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.539 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    color: 'purple',
    title: 'Affinità tematica',
    tagline: 'Match keyword famiglia ↔ tema',
    description: 'L\'AI cerca corrispondenze tra il nome della famiglia e il tema. Es. "BIRRA" → "Aperitivo".',
    effectHigh: 'Forte coerenza tema-prodotto (es. Aperitivo, Colazione, Gelati)',
    effectLow: 'Approccio generalista (Sottocosto, Evento)',
  },
  roleBoost: {
    group: 'positive',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.539 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    color: 'indigo',
    title: 'Boost ruolo promo',
    tagline: 'Differenzia A / B / C',
    description: 'Adatta la selezione in base al ruolo: A → top-tier (volume + brand), B → media, C → spread su molte famiglie.',
    effectHigh: 'Differenziazione netta tra promo flagship e promo "tappa"',
    effectLow: 'Trattamento uniforme tra ruoli',
  },
  recencyPenalty: {
    group: 'penalty',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'orange',
    title: 'Penalty recency',
    tagline: 'Evita famiglie usate di recente',
    description: 'Penalizza famiglie già a volantino nelle ultime promo (UltimaPromoVolantino, NumeroVolteVolantino).',
    effectHigh: 'Piano molto rotativo, freschezza alta',
    effectLow: 'Conferma i "campioni" del periodo precedente',
  },
  saturationPenalty: {
    group: 'penalty',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    color: 'rose',
    title: 'Penalty saturazione piano',
    tagline: 'Rotazione cross-promo',
    description: 'Penalizza famiglie usate in promo precedenti dello stesso piano. Cresce col numero di slot già assegnati.',
    effectHigh: 'Massima diversità tra le 3 promo del canale',
    effectLow: 'Stessa famiglia può tornare in più promo',
  },
};

const COLORS = {
  red:     { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-dimar-red',    accent: 'accent-dimar-red',    fill: 'bg-dimar-red',    icon: 'bg-red-100 text-dimar-red' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700',  accent: 'accent-emerald-600',  fill: 'bg-emerald-600',  icon: 'bg-emerald-100 text-emerald-700' },
  cyan:    { bg: 'bg-cyan-50',    border: 'border-cyan-200',    text: 'text-cyan-700',     accent: 'accent-cyan-600',     fill: 'bg-cyan-600',     icon: 'bg-cyan-100 text-cyan-700' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',    accent: 'accent-amber-600',    fill: 'bg-amber-600',    icon: 'bg-amber-100 text-amber-700' },
  purple:  { bg: 'bg-purple-50',  border: 'border-purple-200',  text: 'text-purple-700',   accent: 'accent-purple-600',   fill: 'bg-purple-600',   icon: 'bg-purple-100 text-purple-700' },
  indigo:  { bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-700',   accent: 'accent-indigo-600',   fill: 'bg-indigo-600',   icon: 'bg-indigo-100 text-indigo-700' },
  orange:  { bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-700',   accent: 'accent-orange-600',   fill: 'bg-orange-600',   icon: 'bg-orange-100 text-orange-700' },
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700',     accent: 'accent-rose-600',     fill: 'bg-rose-600',     icon: 'bg-rose-100 text-rose-700' },
};

// Presets
const PRESETS = {
  balanced: {
    label: 'Bilanciato',
    desc: 'Setup predefinito raccomandato',
    weights: DEFAULT_WEIGHTS,
  },
  volume: {
    label: 'Volume-driven',
    desc: 'Massimizza vendite e penetrazione',
    weights: { sales: 0.32, margin: 0.10, scontrini: 0.22, seasonality: 0.10, themeAffinity: 0.12, roleBoost: 0.06, recencyPenalty: 0.15, saturationPenalty: 0.20 },
  },
  margin: {
    label: 'Margine-first',
    desc: 'Privilegia marginalità anche su volumi minori',
    weights: { sales: 0.12, margin: 0.32, scontrini: 0.10, seasonality: 0.10, themeAffinity: 0.18, roleBoost: 0.06, recencyPenalty: 0.20, saturationPenalty: 0.25 },
  },
  seasonal: {
    label: 'Stagionale',
    desc: 'Sfrutta i picchi mese su mese',
    weights: { sales: 0.18, margin: 0.14, scontrini: 0.10, seasonality: 0.28, themeAffinity: 0.22, roleBoost: 0.05, recencyPenalty: 0.20, saturationPenalty: 0.22 },
  },
  rotation: {
    label: 'Rotativo',
    desc: 'Massima varietà tra le promo',
    weights: { sales: 0.18, margin: 0.16, scontrini: 0.14, seasonality: 0.10, themeAffinity: 0.16, roleBoost: 0.06, recencyPenalty: 0.32, saturationPenalty: 0.38 },
  },
};

function WeightCard({ kpiKey, value, onChange }) {
  const def = KPI_DEFS[kpiKey];
  const cc = COLORS[def.color];
  const pctOfMax = Math.round((value / 0.4) * 100);

  return (
    <div className={`rounded-xl border ${cc.border} ${cc.bg} p-4 transition-all hover:shadow-sm`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`${cc.icon} w-9 h-9 rounded-lg flex items-center justify-center shrink-0`}>
          {def.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-dimar-dark leading-tight">{def.title}</h4>
            <span className={`text-lg font-bold ${cc.text} tabular-nums font-mono leading-none`}>
              {(value * 100).toFixed(0)}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5">{def.tagline}</p>
        </div>
      </div>

      {/* Slider with mini scale */}
      <div className="mb-3">
        <input
          type="range"
          min="0" max="0.4" step="0.01"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className={`w-full h-1.5 ${cc.accent} rounded-full cursor-pointer`}
        />
        <div className="flex justify-between mt-1 text-[9px] text-gray-400">
          <span>0</span>
          <span className={pctOfMax >= 50 ? cc.text : ''}>20</span>
          <span>40</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-[11px] text-gray-600 leading-relaxed mb-2">
        {def.description}
      </p>

      {/* Effect indicators */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div className="bg-white/60 rounded-lg p-2 border border-white">
          <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold text-gray-400 mb-0.5">
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 5l5 5h-3v5H8v-5H5l5-5z" />
            </svg>
            Alto
          </div>
          <p className="text-[10px] text-gray-700 leading-tight">{def.effectHigh}</p>
        </div>
        <div className="bg-white/60 rounded-lg p-2 border border-white">
          <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold text-gray-400 mb-0.5">
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 15l-5-5h3V5h4v5h3l-5 5z" />
            </svg>
            Basso
          </div>
          <p className="text-[10px] text-gray-700 leading-tight">{def.effectLow}</p>
        </div>
      </div>
    </div>
  );
}

function WeightDistributionBar({ weights }) {
  const order = ['sales', 'margin', 'scontrini', 'seasonality', 'themeAffinity', 'roleBoost', 'recencyPenalty', 'saturationPenalty'];
  const total = order.reduce((s, k) => s + weights[k], 0);
  if (total === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Distribuzione pesi</span>
        <span className="text-[10px] text-gray-400 font-mono">somma {(total * 100).toFixed(0)}</span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden border border-gray-200">
        {order.map(k => {
          const w = weights[k];
          const pct = (w / total) * 100;
          if (pct < 1) return null;
          const def = KPI_DEFS[k];
          const cc = COLORS[def.color];
          return (
            <div
              key={k}
              className={`${cc.fill} relative group`}
              style={{ width: `${pct}%` }}
              title={`${def.title}: ${(w * 100).toFixed(0)} (${pct.toFixed(0)}%)`}
            />
          );
        })}
      </div>
      <div className="flex gap-3 mt-2 flex-wrap text-[10px]">
        {order.map(k => {
          const def = KPI_DEFS[k];
          const cc = COLORS[def.color];
          return (
            <div key={k} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-sm ${cc.fill}`} />
              <span className="text-gray-600">{def.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AIWeightsTab({ weights, onChange, onReset }) {
  const setW = (k, v) => onChange({ ...weights, [k]: v });
  const applyPreset = (preset) => onChange({ ...PRESETS[preset].weights });

  const positiveKeys = Object.keys(KPI_DEFS).filter(k => KPI_DEFS[k].group === 'positive');
  const penaltyKeys = Object.keys(KPI_DEFS).filter(k => KPI_DEFS[k].group === 'penalty');

  // Check which preset is active
  const activePreset = Object.keys(PRESETS).find(k => {
    const p = PRESETS[k].weights;
    return Object.keys(p).every(wk => Math.abs(weights[wk] - p[wk]) < 0.005);
  });

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-violet-50/20">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Intro */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-dimar-dark">Configura il comportamento dell'AI</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Ogni KPI contribuisce al punteggio finale di ciascun suggerimento.
                Modifica i pesi qui sotto, poi <strong>re-genera il piano</strong> nella tab Suggerimenti per
                vedere i nuovi suggerimenti.
              </p>
            </div>
          </div>
        </div>

        {/* Presets */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-dimar-dark">Preset rapidi</h3>
              <p className="text-xs text-gray-500">Configurazioni tipiche per scenari diversi</p>
            </div>
            <button
              onClick={onReset}
              className="text-xs text-violet-600 hover:underline font-semibold"
            >
              Ripristina valori
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
            {Object.entries(PRESETS).map(([key, p]) => (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className={`text-left px-3 py-2.5 rounded-lg border transition-all ${
                  activePreset === key
                    ? 'bg-violet-50 border-violet-300 shadow-sm'
                    : 'bg-white border-gray-200 hover:border-violet-300 hover:bg-violet-50/30'
                }`}
              >
                <div className={`text-xs font-bold ${activePreset === key ? 'text-violet-700' : 'text-dimar-dark'}`}>
                  {p.label}
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Distribution bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <WeightDistributionBar weights={weights} />
        </div>

        {/* Positive signals */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-dimar-dark uppercase tracking-wide">
              Segnali positivi
            </h3>
            <span className="text-xs text-gray-400">— aumentano lo score di una famiglia</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {positiveKeys.map(k => (
              <WeightCard key={k} kpiKey={k} value={weights[k]} onChange={(v) => setW(k, v)} />
            ))}
          </div>
        </div>

        {/* Penalty signals */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md bg-orange-100 text-orange-700 flex items-center justify-center">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-dimar-dark uppercase tracking-wide">
              Penalty
            </h3>
            <span className="text-xs text-gray-400">— riducono lo score per evitare comportamenti indesiderati</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {penaltyKeys.map(k => (
              <WeightCard key={k} kpiKey={k} value={weights[k]} onChange={(v) => setW(k, v)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
