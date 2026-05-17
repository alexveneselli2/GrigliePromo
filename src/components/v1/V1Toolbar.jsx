import { useState, useRef, useEffect } from 'react';
import REPARTI from '../../data/reparti';

export default function V1Toolbar({
  searchText, onSearchChange,
  repartoFilter, onRepartoFilterChange,
  totalCount, visibleCount,
  sortBy, onSortChange,
  showOnlyAssigned, onShowOnlyAssignedChange,
  allCollapsed, onExpandAll, onCollapseAll,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleReparto = (code) => {
    if (repartoFilter.includes(code)) {
      onRepartoFilterChange(repartoFilter.filter(c => c !== code));
    } else {
      onRepartoFilterChange([...repartoFilter, code]);
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 max-w-xs min-w-[160px]">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Cerca famiglia..."
          value={searchText}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-dimar-red/30 focus:border-dimar-red"
        />
        {searchText && (
          <button onClick={() => onSearchChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      {/* Reparto filter */}
      <div className="relative" ref={dropRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
          Reparti
          {repartoFilter.length > 0 && (
            <span className="bg-dimar-red text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {repartoFilter.length}
            </span>
          )}
        </button>
        {dropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-40 max-h-80 overflow-y-auto">
            <div className="p-2 border-b border-gray-100 flex justify-between">
              <button onClick={() => onRepartoFilterChange([])} className="text-xs text-dimar-red hover:underline">Deseleziona</button>
              <button onClick={() => onRepartoFilterChange(REPARTI.map(r => r.code))} className="text-xs text-gray-500 hover:underline">Seleziona tutti</button>
            </div>
            {REPARTI.map(r => (
              <label key={r.code} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-xs">
                <input type="checkbox" checked={repartoFilter.includes(r.code)} onChange={() => toggleReparto(r.code)} className="rounded border-gray-300 text-dimar-red focus:ring-dimar-red" />
                <span className="truncate flex-1">{r.name}</span>
                <span className="text-[10px] text-gray-400">{r.count}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Sort */}
      <select
        value={sortBy}
        onChange={e => onSortChange(e.target.value)}
        className="text-xs border border-gray-200 rounded-lg bg-gray-50 px-2.5 py-1.5 cursor-pointer hover:bg-gray-100 transition-colors"
      >
        <option value="default">Ordine standard</option>
        <option value="vendite">Vendite</option>
        <option value="margine">Margine</option>
        <option value="assigned">Assegnate prima</option>
      </select>

      {/* Only assigned */}
      <button
        onClick={() => onShowOnlyAssignedChange(!showOnlyAssigned)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-all ${
          showOnlyAssigned
            ? 'bg-dimar-red text-white border-dimar-red'
            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Solo assegnate
      </button>

      {/* Expand/Collapse all */}
      <button
        onClick={allCollapsed ? onExpandAll : onCollapseAll}
        title={allCollapsed ? 'Espandi tutti i reparti' : 'Collassa tutti i reparti'}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d={allCollapsed ? "M12 4v16m8-8H4" : "M20 12H4"} />
        </svg>
        {allCollapsed ? 'Espandi' : 'Collassa'}
      </button>

      {/* Counter */}
      <span className="ml-auto text-[10px] text-gray-400 shrink-0">
        <strong className="text-gray-600">{visibleCount}</strong>/{totalCount}
      </span>
    </div>
  );
}
