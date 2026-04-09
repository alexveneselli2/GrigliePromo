import { useState, useRef, useEffect } from 'react';
import REPARTI from '../data/reparti';

export default function GridFilters({ searchText, onSearchChange, repartoFilter, onRepartoFilterChange }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setDropdownOpen(false);
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
    <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200">
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Cerca famiglia..."
          value={searchText}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-dimar-red/30 focus:border-dimar-red"
        />
        {searchText && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Reparto filter */}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Reparti
          {repartoFilter.length > 0 && (
            <span className="bg-dimar-red text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {repartoFilter.length}
            </span>
          )}
        </button>

        {dropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-40 max-h-64 overflow-y-auto">
            <div className="p-2 border-b border-gray-100">
              <button
                onClick={() => onRepartoFilterChange([])}
                className="text-xs text-dimar-red hover:underline"
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
                  className="rounded border-gray-300 text-dimar-red focus:ring-dimar-red"
                />
                {r.name}
              </label>
            ))}
          </div>
        )}
      </div>

      {repartoFilter.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {repartoFilter.map(code => {
            const r = REPARTI.find(r => r.code === code);
            return (
              <span key={code} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-dimar-red text-xs rounded-full">
                {r?.name || code}
                <button onClick={() => toggleReparto(code)} className="hover:text-red-800">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
