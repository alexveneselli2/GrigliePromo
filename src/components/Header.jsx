import PROMOZIONI from '../data/promozioni';

export default function Header({ selectedPromoIdx, onPromoChange }) {
  const promo = PROMOZIONI[selectedPromoIdx];

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

        {/* Insegna */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Insegna</label>
          <select className="text-sm font-medium bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-dimar-dark">
            <option>Ipermercati</option>
          </select>
        </div>

        {/* Promozione */}
        <div className="flex flex-col gap-0.5 min-w-[320px]">
          <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Promozione</label>
          <select
            className="text-sm font-medium bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-dimar-dark"
            value={selectedPromoIdx}
            onChange={e => onPromoChange(Number(e.target.value))}
          >
            {PROMOZIONI.map((p, i) => (
              <option key={p.codice} value={i}>{p.label}</option>
            ))}
          </select>
        </div>

        <div className="h-8 w-px bg-gray-200" />

        {/* Promo info pills */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 rounded-full bg-red-50 text-dimar-red font-medium">{promo.ruolo}</span>
          <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">{promo.formato}</span>
          {promo.tot_prod != null && (
            <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">
              {promo.tot_prod} ref.
            </span>
          )}
          {promo.temi_nofood && (
            <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-medium truncate max-w-[200px]" title={promo.temi_nofood}>
              {promo.temi_nofood}
            </span>
          )}
        </div>
      </div>

      {/* Promo detail bar */}
      <div className="flex items-center gap-6 px-6 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-600">
        <span><strong>Periodo:</strong> {promo.periodo}</span>
        <span><strong>Tema:</strong> {promo.tema}</span>
        {promo.speciale1 !== 'NA' && <span><strong>Spec. 1:</strong> {promo.speciale1}</span>}
        {promo.speciale2 !== 'NA' && <span><strong>Spec. 2:</strong> {promo.speciale2}</span>}
        {promo.speciale4 !== 'NA' && <span><strong>Spec. 4:</strong> {promo.speciale4}</span>}
        {promo.sotto_tema !== 'NA' && <span><strong>Sotto-tema:</strong> {promo.sotto_tema}</span>}
        {promo.tema_prod != null && (
          <>
            <span className="ml-auto"><strong>Budget Tema:</strong> {promo.tema_prod}</span>
            <span><strong>Card:</strong> {promo.tema_card}</span>
            <span><strong>Spec1:</strong> {promo.spec1_prod}</span>
            <span><strong>Spec2:</strong> {promo.spec2_prod}</span>
          </>
        )}
      </div>
    </header>
  );
}
