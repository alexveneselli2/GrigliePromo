import { useState, useMemo } from 'react';
import FAMIGLIE from '../data/famiglie';

export default function AISuggestions({ columns, volKeys, onApply, onReset }) {
  const [open, setOpen] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [ready, setReady] = useState(false);

  const suggestions = useMemo(() => {
    // Score = normalized margin + normalized sales + normalized scontrini
    const maxV = Math.max(...FAMIGLIE.map(f => f.v));
    const maxM = Math.max(...FAMIGLIE.map(f => f.m));
    const maxPs = Math.max(...FAMIGLIE.map(f => f.ps));

    return FAMIGLIE
      .filter(f => f.v > 0)
      .map(f => {
        const scoreV = f.v / maxV;
        const scoreM = f.m / maxM;
        const scorePs = f.ps / maxPs;
        const score = scoreV * 0.4 + scoreM * 0.3 + scorePs * 0.3;
        let motivo = '';
        if (scoreV > 0.5 && scoreM > 0.3) motivo = 'Alte vendite e buon margine';
        else if (scoreV > 0.5) motivo = 'Volume vendite elevato';
        else if (scoreM > 0.5) motivo = 'Margine sopra la media';
        else if (scorePs > 0.5) motivo = 'Alta penetrazione scontrini';
        else motivo = 'Buon equilibrio vendite/margine';
        return { ...f, score, motivo };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, []);

  const handleOpen = () => {
    setOpen(true);
    if (!ready) {
      setThinking(true);
      setTimeout(() => {
        setThinking(false);
        setReady(true);
      }, 1500);
    }
  };

  const handleApply = () => {
    const newSelections = {};
    for (const s of suggestions) {
      const row = {};
      // Check the "tema" column for each suggestion
      if (volKeys.includes('tema')) row.tema = 1;
      newSelections[s.fc] = row;
    }
    onApply(newSelections);
    setOpen(false);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex items-center gap-2 text-sm font-semibold"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
        Suggerimenti AI
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-[420px] bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-slide-in">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-indigo-600">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold text-lg flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  Suggerimenti AI
                </h2>
                <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-purple-100 text-xs mt-1">Top 10 famiglie consigliate per questa promozione</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {thinking ? (
                <div className="flex flex-col items-center justify-center h-48 gap-4">
                  <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <p className="text-sm text-gray-500">Analisi dei dati in corso...</p>
                </div>
              ) : ready ? (
                <div className="space-y-3">
                  {suggestions.map((s, i) => (
                    <div key={s.fc} className="border border-gray-100 rounded-lg p-3 hover:border-purple-200 hover:bg-purple-50/30 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-dimar-dark leading-tight">{s.fn}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{s.rn}</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full shrink-0">
                          {(s.score * 100).toFixed(0)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5 pl-8">{s.motivo}</p>
                      <div className="flex gap-3 mt-1.5 pl-8 text-[10px] text-gray-400">
                        <span>Vendite: {s.v.toLocaleString('it-IT', { maximumFractionDigits: 0 })} &euro;</span>
                        <span>Margine: {(s.m * 100).toFixed(1)}%</span>
                        <span>Scontrini: {(s.ps * 100).toFixed(2)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Footer actions */}
            {ready && (
              <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
                <button
                  onClick={handleApply}
                  className="flex-1 bg-purple-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Applica suggerimenti
                </button>
                <button
                  onClick={() => { onReset(); setOpen(false); }}
                  className="px-4 bg-gray-100 text-gray-600 text-sm font-semibold py-2.5 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Azzera tutto
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
