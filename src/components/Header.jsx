import PROMOZIONI from '../data/promozioni';
import CANALI from '../data/canali';

function formatDateTime(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Header({
  selectedChannel,
  onChannelChange,
  selectedPromoCode,
  onPromoChange,
  view,
  onViewChange,
  onOpenAI,
  onSave,
  onSendData,
  lastSavedAt,
  lastSentAt,
  saving,
  sending,
}) {
  const channelPromos = PROMOZIONI.filter(p => p.canale === selectedChannel);
  const promo = channelPromos.find(p => p.codice === selectedPromoCode) || channelPromos[0];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center gap-6 px-6 py-3">
        {/* Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 bg-dimar-red rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">D</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-dimar-dark leading-tight">Dimar</h1>
            <p className="text-xs text-gray-500 leading-tight">Griglie Promozionali</p>
          </div>
        </div>

        <div className="h-8 w-px bg-gray-200" />

        {/* Insegna / Canale */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Canale</label>
          <select
            className="text-sm font-medium bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-dimar-dark cursor-pointer"
            value={selectedChannel}
            onChange={e => onChannelChange(e.target.value)}
          >
            {CANALI.map(c => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Promozione */}
        <div className="flex flex-col gap-0.5 min-w-[280px]">
          <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Promozione</label>
          <select
            className="text-sm font-medium bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-dimar-dark cursor-pointer"
            value={promo?.codice || ''}
            onChange={e => onPromoChange(e.target.value)}
          >
            {channelPromos.map(p => (
              <option key={p.codice} value={p.codice}>
                {p.codice} · Q{p.quadrimestre} · {p.tema}
              </option>
            ))}
          </select>
        </div>

        <div className="h-8 w-px bg-gray-200" />

        {/* Promo info pills */}
        <div className="flex flex-wrap gap-1.5 text-xs">
          {promo?.ruoloTema && (
            <span className="px-2 py-1 rounded-full bg-red-50 text-dimar-red font-medium">{promo.ruoloTema}</span>
          )}
          {promo?.formato && (
            <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">{promo.formato}</span>
          )}
          {promo?.quadrimestre && (
            <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">Q{promo.quadrimestre}</span>
          )}
        </div>

        {/* AI button */}
        {onOpenAI && (
          <button
            onClick={onOpenAI}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-semibold shadow-sm hover:shadow-md transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            AI Plan
          </button>
        )}

        {/* Save + Send + View toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Save */}
          <button
            onClick={onSave}
            disabled={saving}
            title={lastSavedAt ? `Ultimo salvataggio locale: ${formatDateTime(lastSavedAt)}` : 'Salva le selezioni'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              saving
                ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-600'
            }`}
          >
            {saving ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Salvato
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Salva
              </>
            )}
          </button>

          {/* Send to DWH */}
          <div className="flex flex-col items-end">
            <button
              onClick={onSendData}
              disabled={sending}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                sending
                  ? 'bg-indigo-100 text-indigo-700 cursor-wait'
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm hover:shadow-md'
              }`}
            >
              {sending ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="40 60" />
                  </svg>
                  Invio...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Invia Dati
                </>
              )}
            </button>
            <span className="text-[9px] text-gray-400 mt-0.5 leading-none">
              DWH: {lastSentAt ? formatDateTime(lastSentAt) : 'mai inviato'}
            </span>
          </div>

          {/* View toggle */}
          {view && onViewChange && (
            <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
              <button
                onClick={() => onViewChange('v1')}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                  view === 'v1' ? 'bg-white text-dimar-dark shadow-sm' : 'text-gray-500 hover:text-dimar-dark'
                }`}
              >
                Classic
              </button>
              <button
                onClick={() => onViewChange('v2')}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-all flex items-center gap-1 ${
                  view === 'v2' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-dimar-dark'
                }`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Nuova UI
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Promo detail bar */}
      <div className="flex items-center gap-x-5 gap-y-1 flex-wrap px-6 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-600">
        {promo?.dataInizio && (
          <span><strong>Periodo:</strong> {promo.dataInizio} → {promo.dataFine}</span>
        )}
        {promo?.tema && <span><strong>Tema:</strong> {promo.tema}</span>}
        {promo?.sottotema && <span><strong>Sottotema:</strong> {promo.sottotema}</span>}
        {promo?.speciale1 && <span><strong>Spec.1:</strong> {promo.speciale1}</span>}
        {promo?.speciale2 && <span><strong>Spec.2:</strong> {promo.speciale2}</span>}
        {promo?.speciale3 && <span><strong>Spec.3:</strong> {promo.speciale3}</span>}
        {promo?.speciale4Aff && <span><strong>Aff.:</strong> {promo.speciale4Aff}</span>}
      </div>
    </header>
  );
}
