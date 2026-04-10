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

function SlotChip({ label, active, group, onClick }) {
  const activeColors = {
    vol: 'bg-dimar-red text-white border-dimar-red shadow-sm shadow-red-200',
    aff: 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200',
  };
  const inactiveColors = {
    vol: 'bg-white text-gray-500 border-gray-200 hover:border-dimar-red/50 hover:text-dimar-red',
    aff: 'bg-white text-gray-500 border-gray-200 hover:border-blue-500/50 hover:text-blue-600',
  };

  const shortLabel = label.length > 14 ? label.slice(0, 13) + '…' : label;

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={label}
      className={`text-[10px] font-semibold px-2 py-1 rounded-full border transition-all duration-150 flex items-center gap-1 ${
        active ? activeColors[group] : inactiveColors[group]
      }`}
    >
      {active && (
        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {shortLabel}
    </button>
  );
}

export default function V2FamilyCard({ family, columns, selections, onToggle, totals, expanded, onToggleExpand }) {
  const volCols = columns.filter(c => c.group === 'vol');
  const affCols = columns.filter(c => c.group === 'aff');
  const isActive = totals.totPromo > 0;

  // Count active chips for collapsed preview
  const activeVolChips = volCols.filter(c => selections[c.key]).map(c => c.label);
  const activeAffChips = affCols.filter(c => selections[c.key]).map(c => c.label);

  return (
    <div
      className={`group bg-white rounded-xl border transition-all duration-200 overflow-hidden ${
        isActive
          ? 'border-dimar-red/40 shadow-md shadow-red-100/40 ring-1 ring-dimar-red/10'
          : 'border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200'
      }`}
    >
      {/* Header - always visible, clickable to expand/collapse */}
      <button
        onClick={onToggleExpand}
        className="w-full text-left px-4 pt-3 pb-2.5 flex items-center gap-3 hover:bg-gray-50/50 transition-colors"
      >
        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>

        {/* Name + reparto */}
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-dimar-dark leading-tight truncate" title={family.fn}>
            {family.fn}
          </h4>
          {!expanded && (
            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
              <span className="font-mono tabular-nums">€ {fmtEuro(family.v)}</span>
              <span className="text-gray-300">·</span>
              <span className="font-mono tabular-nums text-emerald-600">{fmtPct(family.m)}</span>
              {activeVolChips.length > 0 && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-dimar-red font-semibold truncate" title={activeVolChips.join(', ')}>
                    {activeVolChips.slice(0, 2).join(', ')}{activeVolChips.length > 2 ? ` +${activeVolChips.length - 2}` : ''}
                  </span>
                </>
              )}
              {activeAffChips.length > 0 && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-blue-600 font-semibold">Aff: {activeAffChips.length}</span>
                </>
              )}
            </div>
          )}
          {expanded && (
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">{family.rn}</p>
          )}
        </div>

        {/* Right side: mini sparkline (only collapsed) + active badge */}
        {!expanded && (
          <div className="shrink-0">
            <MiniSparkline values={[family.m1, family.m2, family.m3, family.m4]} />
          </div>
        )}
        {isActive && (
          <div className="shrink-0 flex items-center gap-1 px-2 py-0.5 bg-dimar-red text-white rounded-full text-[10px] font-bold">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {totals.totPromo}
          </div>
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="animate-expand">
          {/* Metrics row */}
          <div className="px-4 pb-2 flex items-center gap-3 text-[11px]">
            <div className="flex items-baseline gap-1">
              <span className="text-gray-400">€</span>
              <span className="font-mono font-semibold text-dimar-dark tabular-nums">{fmtEuro(family.v)}</span>
            </div>
            <div className="h-3 w-px bg-gray-200" />
            <div className="flex items-baseline gap-1">
              <span className="text-gray-400">M.</span>
              <span className="font-mono font-semibold text-emerald-600 tabular-nums">{fmtPct(family.m)}</span>
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

          {/* Slot chips - Volantino */}
          <div className="px-4 pb-2">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-1 h-3 bg-dimar-red rounded-full" />
              <span className="text-[9px] uppercase tracking-wider font-bold text-dimar-red">Volantino</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {volCols.map(col => (
                <SlotChip
                  key={col.key}
                  label={col.label}
                  active={!!selections[col.key]}
                  group="vol"
                  onClick={() => onToggle(col.key)}
                />
              ))}
            </div>
          </div>

          {/* Slot chips - Affiancamento */}
          {affCols.length > 0 && (
            <div className="px-4 pb-3 border-t border-gray-50 pt-2 mt-1">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-1 h-3 bg-blue-600 rounded-full" />
                <span className="text-[9px] uppercase tracking-wider font-bold text-blue-600">Affiancamento</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {affCols.map(col => (
                  <SlotChip
                    key={col.key}
                    label={col.label}
                    active={!!selections[col.key]}
                    group="aff"
                    onClick={() => onToggle(col.key)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Footer: history indicators */}
          <div className="px-4 py-1.5 bg-gray-50/60 flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-50">
            <div className="flex items-center gap-2">
              {family.storicoVol > 0 && (
                <span title="Volte in volantino negli ultimi periodi">
                  <span className="font-semibold text-gray-500">{family.storicoVol}</span>× vol
                </span>
              )}
              {family.ultimaPromo && (
                <span className="truncate max-w-[140px]" title={`Ultima: ${family.ultimaPromo}`}>
                  Ultima: {family.ultimaPromo}
                </span>
              )}
            </div>
            {isActive && (
              <div className="flex gap-1.5 font-mono">
                {totals.totVol > 0 && <span className="text-dimar-red font-bold">V{totals.totVol}</span>}
                {totals.totAff > 0 && <span className="text-blue-600 font-bold">A{totals.totAff}</span>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
