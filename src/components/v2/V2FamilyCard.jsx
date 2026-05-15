import { fmtEuro, fmtPct, sparklinePath } from '../../utils';

function MiniSparkline({ values }) {
  const path = sparklinePath(values);
  return (
    <svg viewBox="0 0 60 20" className="w-[60px] h-[18px]">
      <defs>
        <linearGradient id="spark-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#E1261C" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#E1261C" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L60,20 L0,20 Z`} fill="url(#spark-grad)" />
      <path d={path} fill="none" stroke="#E1261C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const COLOR_CLASSES = {
  red:    { activeP: 'bg-dimar-red text-white border-dimar-red',    activeC: 'bg-rose-500 text-white border-rose-500',    accent: 'text-dimar-red',  bar: 'bg-dimar-red' },
  orange: { activeP: 'bg-orange-600 text-white border-orange-600',  activeC: 'bg-orange-400 text-white border-orange-400', accent: 'text-orange-600', bar: 'bg-orange-600' },
  amber:  { activeP: 'bg-amber-600 text-white border-amber-600',    activeC: 'bg-amber-400 text-white border-amber-400',   accent: 'text-amber-600',  bar: 'bg-amber-600' },
  green:  { activeP: 'bg-emerald-600 text-white border-emerald-600', activeC: 'bg-emerald-400 text-white border-emerald-400', accent: 'text-emerald-600', bar: 'bg-emerald-600' },
  teal:   { activeP: 'bg-teal-600 text-white border-teal-600',      activeC: 'bg-teal-400 text-white border-teal-400',     accent: 'text-teal-600',   bar: 'bg-teal-600' },
  blue:   { activeP: 'bg-blue-600 text-white border-blue-600',      activeC: 'bg-blue-400 text-white border-blue-400',     accent: 'text-blue-600',   bar: 'bg-blue-600' },
};

function SectionChips({ section, value, onToggle }) {
  const cc = COLOR_CLASSES[section.color] || COLOR_CLASSES.red;
  const pActive = !!value?.p;
  const cActive = !!value?.c;

  return (
    <div className="flex items-center gap-1">
      {/* PROD chip */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(section.key, 'p'); }}
        title={`${section.label} (PROD)`}
        className={`text-[10px] font-semibold pl-1.5 pr-2 py-1 rounded-l-full border transition-all duration-150 flex items-center gap-1 ${
          pActive
            ? `${cc.activeP} shadow-sm`
            : `bg-white text-gray-500 border-gray-200 hover:${cc.accent}`
        }`}
      >
        {pActive && (
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {section.short}
      </button>
      {/* CARD chip - smaller, only if PROD active */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(section.key, 'c'); }}
        disabled={!pActive && !cActive}
        title={`${section.label} (CARD)`}
        className={`text-[9px] font-bold w-5 h-[26px] rounded-r-full border-y border-r transition-all duration-150 flex items-center justify-center -ml-1 ${
          cActive
            ? `${cc.activeC} shadow-sm`
            : pActive
              ? `bg-white text-gray-400 border-gray-200 hover:bg-gray-50`
              : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed opacity-50'
        }`}
      >
        C
      </button>
    </div>
  );
}

export default function V2FamilyCard({ family, sections, selections, onToggle, totals }) {
  const isActive = totals.totSlot > 0;
  const mainSections = sections.filter(s => s.group !== 'aff');
  const affSections = sections.filter(s => s.group === 'aff');

  return (
    <div
      className={`group bg-white rounded-xl border transition-all duration-200 overflow-hidden ${
        isActive
          ? 'border-dimar-red/40 shadow-md shadow-red-100/40 ring-1 ring-dimar-red/10'
          : 'border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200'
      }`}
    >
      {/* Top: name + totals badge */}
      <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-dimar-dark leading-tight truncate" title={family.fn}>
            {family.fn}
          </h4>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5 truncate" title={family.sn}>
            {family.sn}
          </p>
        </div>
        {isActive && (
          <div className="shrink-0 flex items-center gap-1 px-2 py-0.5 bg-dimar-red text-white rounded-full text-[10px] font-bold">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {totals.totSlot}
          </div>
        )}
      </div>

      {/* Metrics row */}
      <div className="px-4 pb-2 flex items-center gap-3 text-[11px]">
        <div className="flex items-baseline gap-1">
          <span className="text-gray-400">€</span>
          <span className="font-mono font-semibold text-dimar-dark tabular-nums">{fmtEuro(family.v)}</span>
        </div>
        <div className="h-3 w-px bg-gray-200" />
        <div className="flex items-baseline gap-1">
          <span className="text-gray-400">M.</span>
          <span className="font-mono font-semibold text-emerald-600 tabular-nums">{fmtPct(family.margine)}</span>
        </div>
        <div className="h-3 w-px bg-gray-200" />
        <div className="flex items-baseline gap-1">
          <span className="text-gray-400">S.</span>
          <span className="font-mono font-semibold text-gray-600 tabular-nums">{fmtPct(family.ps)}</span>
        </div>
        <div className="ml-auto">
          <MiniSparkline values={[family.m1, family.m2, family.m3, family.m4]} />
        </div>
      </div>

      {/* Section chips */}
      {mainSections.length > 0 && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-1 h-3 bg-dimar-red rounded-full" />
            <span className="text-[9px] uppercase tracking-wider font-bold text-dimar-red">Sezioni</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {mainSections.map(sec => (
              <SectionChips
                key={sec.key}
                section={sec}
                value={selections[sec.key]}
                onToggle={onToggle}
              />
            ))}
          </div>
        </div>
      )}

      {affSections.length > 0 && (
        <div className="px-4 pb-3 border-t border-gray-50 pt-2 mt-1">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-1 h-3 bg-blue-600 rounded-full" />
            <span className="text-[9px] uppercase tracking-wider font-bold text-blue-600">Affiancamento</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {affSections.map(sec => (
              <SectionChips
                key={sec.key}
                section={sec}
                value={selections[sec.key]}
                onToggle={onToggle}
              />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-1.5 bg-gray-50/60 flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-50">
        <div className="flex items-center gap-2">
          {family.nVol > 0 && (
            <span title="Volte in volantino"><span className="font-semibold text-gray-500">{family.nVol}</span>× vol</span>
          )}
          {family.ultimaPromo && (
            <span className="truncate max-w-[160px]" title={`Ultima: ${family.ultimaPromo}`}>
              Ultima: {family.ultimaPromo}
            </span>
          )}
        </div>
        {isActive && (
          <div className="flex gap-1.5 font-mono">
            {totals.totProd > 0 && <span className="text-dimar-red font-bold">P{totals.totProd}</span>}
            {totals.totCard > 0 && <span className="text-rose-500 font-bold">C{totals.totCard}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
