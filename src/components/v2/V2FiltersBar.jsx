import { useState, useRef, useEffect } from 'react';
import REPARTI from '../../data/reparti';

export default function V2FiltersBar({
  searchText,
  onSearchChange,
  repartoFilter,
  onRepartoFilterChange,
  sortBy,
  onSortChange,
  showOnlyAssigned,
  onShowOnlyAssignedChange,
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
    <div className="flex items-center gap-3 px-6 py-3 bg-white/80 backdrop-blur border-b border-gray-100">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Cerca famiglia merceologica..."
          value={searchText}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-all"
        />
      </div>

      {/* Reparto filter */}
      <div className="relative" ref={dropRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Reparti
          {repartoFilter.length > 0 && (
            <span className="bg-indigo-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {repartoFilter.length}
            </span>
          )}
        </button>

        {dropdownOpen && (
          <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-40 max-h-72 overflow-y-auto">
            <div className="p-2 border-b border-gray-100">
              <button
                onClick={() => onRepartoFilterChange([])}
                className="text-xs text-indigo-600 hover:underline"
              >
                Deseleziona tutti
              </button>
            </div>
            {REPARTI.map(r => (
              <label
                key={r.code}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={repartoFilter.includes(r.code)}
                  onChange={() => toggleReparto(r.code)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
                {r.name}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Sort */}
      <select
        value={sortBy}
        onChange={e => onSortChange(e.target.value)}
        className="text-sm border border-gray-200 rounded-xl bg-white px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <option value="default">Ordine standard</option>
        <option value="vendite">Vendite (alto→basso)</option>
        <option value="margine">Margine (alto→basso)</option>
        <option value="assigned">Assegnate prima</option>
      </select>

      {/* Only assigned toggle */}
      <button
        onClick={() => onShowOnlyAssignedChange(!showOnlyAssigned)}
        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-xl border transition-all ${
          showOnlyAssigned
            ? 'bg-indigo-600 text-white border-indigo-600'
            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
        }`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Solo assegnate
      </button>
    </div>
  );
}
