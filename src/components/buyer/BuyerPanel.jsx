import { useState, useMemo } from 'react';
import {
  SOTTOGRUPPO, FAMIGLIE, SECTIONS, SLOT_PLAN, ARTICOLI,
  SEGMENTO_LABELS, buildSlots,
} from '../../data/articoli';

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

const SECTION_GRADIENTS = {
  red: 'from-dimar-red to-rose-500',
  orange: 'from-orange-600 to-orange-400',
  amber: 'from-amber-600 to-amber-400',
  green: 'from-emerald-600 to-emerald-400',
  teal: 'from-teal-600 to-teal-400',
};

const SEGMENTO_STYLE = {
  premium: 'bg-violet-100 text-violet-700 border-violet-200',
  mainstream: 'bg-blue-100 text-blue-700 border-blue-200',
  'primo-prezzo': 'bg-gray-100 text-gray-600 border-gray-200',
  'private-label': 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const GIACENZA_STYLE = {
  ok: { label: 'Disponibile', cls: 'text-emerald-600' },
  basso: { label: 'Scorta bassa', cls: 'text-amber-600' },
  critico: { label: 'Scorta critica', cls: 'text-red-600' },
};

const eur = (n) => `€ ${n.toFixed(2).replace('.', ',')}`;

function SectionBadge({ sectionKey, className = '' }) {
  const sec = SECTIONS.find((s) => s.key === sectionKey);
  const grad = SECTION_GRADIENTS[sec?.color] || 'from-gray-600 to-gray-400';
  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full bg-gradient-to-r ${grad} text-white ${className}`}>
      {sec?.short || sectionKey}
    </span>
  );
}

function TipoBadge({ tipo }) {
  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
      tipo === 'PROD' ? 'bg-dimar-red text-white' : 'bg-rose-400 text-white'
    }`}>
      {tipo}
    </span>
  );
}

function SegmentoChip({ segmento }) {
  return (
    <span className={`px-1.5 py-0.5 text-[9px] font-semibold rounded border ${SEGMENTO_STYLE[segmento] || ''}`}>
      {SEGMENTO_LABELS[segmento] || segmento}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Article picker drawer
// ---------------------------------------------------------------------------

function ArticlePicker({ slot, assignments, onPick, onClose }) {
  const [search, setSearch] = useState('');
  const [segmento, setSegmento] = useState('all');
  const [sortBy, setSortBy] = useState('rotazione');

  const fam = FAMIGLIE.find((f) => f.fc === slot.fc);
  const sec = SECTIONS.find((s) => s.key === slot.sectionKey);

  // EANs already used elsewhere in the SAME section (duplicate guard)
  const usedInSection = useMemo(() => {
    const set = new Set();
    for (const [slotId, art] of Object.entries(assignments)) {
      if (!art) continue;
      const [, secKey] = slotId.split('|');
      if (secKey === slot.sectionKey && slotId !== slot.id) set.add(art.ean);
    }
    return set;
  }, [assignments, slot]);

  const list = useMemo(() => {
    let out = ARTICOLI.filter((a) => a.fc === slot.fc);
    if (segmento !== 'all') out = out.filter((a) => a.segmento === segmento);
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(
        (a) => a.descrizione.toLowerCase().includes(q) || a.marca.toLowerCase().includes(q) || a.ean.includes(q)
      );
    }
    const rotOrder = { A: 0, B: 1, C: 2 };
    out = [...out].sort((a, b) => {
      if (sortBy === 'rotazione') return rotOrder[a.rotazione] - rotOrder[b.rotazione];
      if (sortBy === 'margine') return b.margineePct - a.margineePct;
      if (sortBy === 'prezzo') return a.prezzoPromo - b.prezzoPromo;
      if (sortBy === 'quota') return b.quotaMercato - a.quotaMercato;
      return 0;
    });
    return out;
  }, [slot.fc, segmento, search, sortBy]);

  return (
    <div className="fixed inset-0 z-[70] flex">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-[720px] max-w-[95vw] bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-dimar-red to-rose-500 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <SectionBadge sectionKey={slot.sectionKey} className="ring-1 ring-white/40" />
                <TipoBadge tipo={slot.tipo} />
                <span className="text-[11px] text-white/80">slot #{slot.idx + 1}</span>
              </div>
              <h3 className="font-bold text-base">{fam?.fn}</h3>
              <p className="text-[11px] text-white/80 mt-0.5">{sec?.label} — {sec?.tema}</p>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 space-y-2">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per descrizione, marca o EAN…"
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-dimar-red/30"
          />
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Segmento:</span>
            <button
              onClick={() => setSegmento('all')}
              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                segmento === 'all' ? 'bg-dimar-dark text-white border-dimar-dark' : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              Tutti
            </button>
            {Object.entries(SEGMENTO_LABELS).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setSegmento(k)}
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                  segmento === k ? 'bg-dimar-dark text-white border-dimar-dark' : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 ml-auto">Ordina:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white cursor-pointer"
            >
              <option value="rotazione">Rotazione</option>
              <option value="margine">Margine</option>
              <option value="prezzo">Prezzo promo</option>
              <option value="quota">Quota mercato</option>
            </select>
          </div>
        </div>

        {/* Article list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {list.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-10">Nessun articolo corrisponde ai filtri</p>
          )}
          {list.map((a) => {
            const dup = usedInSection.has(a.ean);
            const sconto = Math.round((1 - a.prezzoPromo / a.prezzoListino) * 100);
            const giac = GIACENZA_STYLE[a.giacenza];
            return (
              <button
                key={a.ean}
                onClick={() => onPick(a)}
                className={`w-full text-left border rounded-xl p-3 transition-all hover:shadow-md ${
                  dup ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200 hover:border-dimar-red/40 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className="font-bold text-sm text-dimar-dark">{a.marca}</span>
                      <SegmentoChip segmento={a.segmento} />
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                        a.rotazione === 'A' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : a.rotazione === 'B' ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>Rot. {a.rotazione}</span>
                      {a.novita && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-fuchsia-100 text-fuchsia-700">NOVITÀ</span>}
                      {a.green && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700">GREEN</span>}
                      {dup && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-800">GIÀ IN SEZIONE</span>}
                    </div>
                    <p className="text-xs text-gray-700 truncate">{a.descrizione}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                      EAN {a.ean} · {a.formato} · {a.strappi} strappi · {a.fornitore}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-gray-400 line-through">{eur(a.prezzoListino)}</div>
                    <div className="text-base font-bold text-dimar-red tabular-nums">{eur(a.prezzoPromo)}</div>
                    <div className="text-[10px] font-bold text-emerald-600">−{sconto}%</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-50 text-[10px]">
                  <span className="text-gray-500">Margine <strong className="text-emerald-600">{a.margineePct}%</strong></span>
                  <span className="text-gray-500">Quota <strong className="text-gray-700">{a.quotaMercato}%</strong></span>
                  <span className={giac.cls}>● {giac.label}</span>
                  {a.ultimaPromo && <span className="ml-auto text-amber-600">Ultima promo {a.ultimaPromo}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slot card
// ---------------------------------------------------------------------------

function SlotCard({ slot, article, onOpen, onClear, duplicate }) {
  const sconto = article ? Math.round((1 - article.prezzoPromo / article.prezzoListino) * 100) : 0;
  return (
    <div
      className={`border rounded-xl p-3 transition-all ${
        article
          ? duplicate ? 'border-amber-300 bg-amber-50/40' : 'border-emerald-300 bg-emerald-50/30'
          : 'border-dashed border-gray-300 bg-gray-50 hover:border-dimar-red/50 hover:bg-red-50/30'
      }`}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <TipoBadge tipo={slot.tipo} />
        <span className="text-[10px] text-gray-400">slot #{slot.idx + 1}</span>
        {article && (
          <button onClick={onClear} className="ml-auto text-[10px] text-gray-400 hover:text-red-500 font-semibold">
            Svuota
          </button>
        )}
      </div>

      {article ? (
        <button onClick={onOpen} className="w-full text-left group">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="font-bold text-xs text-dimar-dark group-hover:text-dimar-red">{article.marca}</span>
            <SegmentoChip segmento={article.segmento} />
          </div>
          <p className="text-[11px] text-gray-700 leading-snug">{article.descrizione}</p>
          <p className="text-[9px] text-gray-400 font-mono mt-0.5">EAN {article.ean}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-sm font-bold text-dimar-red tabular-nums">{eur(article.prezzoPromo)}</span>
            <span className="text-[10px] text-gray-400 line-through">{eur(article.prezzoListino)}</span>
            <span className="text-[10px] font-bold text-emerald-600">−{sconto}%</span>
            <span className="ml-auto text-[10px] text-gray-500">M. {article.margineePct}%</span>
          </div>
          {duplicate && (
            <p className="text-[10px] text-amber-700 mt-1.5 font-semibold">⚠ Stesso EAN già usato in questa sezione</p>
          )}
        </button>
      ) : (
        <button onClick={onOpen} className="w-full py-3 flex flex-col items-center gap-1 text-gray-400 hover:text-dimar-red">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-[11px] font-semibold">Seleziona articolo</span>
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export default function BuyerPanel({ onClose }) {
  const slots = useMemo(() => buildSlots(), []);
  // assignments[slotId] = article | undefined
  const [assignments, setAssignments] = useState({});
  const [openSlot, setOpenSlot] = useState(null);
  const [activeFam, setActiveFam] = useState(FAMIGLIE[0].fc);

  const assign = (slotId, article) => {
    setAssignments((prev) => ({ ...prev, [slotId]: article }));
    setOpenSlot(null);
  };
  const clear = (slotId) => setAssignments((prev) => { const n = { ...prev }; delete n[slotId]; return n; });

  // Duplicate detection: same EAN twice within the same section
  const duplicateSlotIds = useMemo(() => {
    const bySection = {};
    for (const [slotId, art] of Object.entries(assignments)) {
      if (!art) continue;
      const [, secKey] = slotId.split('|');
      (bySection[secKey] = bySection[secKey] || []).push({ slotId, ean: art.ean });
    }
    const dup = new Set();
    for (const entries of Object.values(bySection)) {
      const seen = {};
      for (const e of entries) {
        if (seen[e.ean]) { dup.add(e.slotId); dup.add(seen[e.ean]); }
        else seen[e.ean] = e.slotId;
      }
    }
    return dup;
  }, [assignments]);

  const filled = Object.values(assignments).filter(Boolean).length;
  const total = slots.length;
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;

  // Aggregate KPIs over assigned articles
  const kpi = useMemo(() => {
    const arts = Object.values(assignments).filter(Boolean);
    if (arts.length === 0) return null;
    const avgMargine = arts.reduce((s, a) => s + a.margineePct, 0) / arts.length;
    const avgSconto = arts.reduce((s, a) => s + (1 - a.prezzoPromo / a.prezzoListino) * 100, 0) / arts.length;
    const marche = new Set(arts.map((a) => a.marca)).size;
    const pl = arts.filter((a) => a.segmento === 'private-label').length;
    return { avgMargine, avgSconto, marche, plQuota: (pl / arts.length) * 100 };
  }, [assignments]);

  const famSlots = slots.filter((s) => s.fc === activeFam);
  const famData = FAMIGLIE.find((f) => f.fc === activeFam);

  return (
    <div className="fixed inset-0 z-[55] bg-gray-50 overflow-y-auto">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-3 flex items-center gap-3">
          <button onClick={onClose} className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-dimar-dark px-2 py-1.5 rounded-lg hover:bg-gray-100">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Torna alla griglia
          </button>
          <div className="flex-1" />
          <div className="text-xs text-gray-500">
            <strong className={filled === total ? 'text-emerald-600' : 'text-dimar-dark'}>{filled}</strong>
            <span> / {total} slot assegnati</span>
          </div>
          <div className="w-40 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${filled === total ? 'bg-emerald-500' : 'bg-gradient-to-r from-dimar-red to-rose-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-bold text-dimar-dark tabular-nums w-9 text-right">{pct}%</span>
          <button
            disabled={filled !== total}
            className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-dimar-red to-rose-500 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md transition-all"
          >
            Conferma assortimento
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Header card */}
        <div className="rounded-2xl overflow-hidden shadow-lg mb-6">
          <div className="bg-gradient-to-r from-dimar-red via-rose-500 to-pink-500 px-6 py-5 text-white">
            <p className="text-white/80 text-xs font-semibold uppercase tracking-widest mb-1">
              Pannello Buyer · Selezione articoli
            </p>
            <h1 className="text-2xl font-extrabold">{SOTTOGRUPPO.name}</h1>
            <p className="text-white/90 text-sm mt-1">
              {SOTTOGRUPPO.reparto} › {SOTTOGRUPPO.gruppo} › {SOTTOGRUPPO.name}
            </p>
          </div>
          <div className="bg-white px-6 py-3 flex items-center gap-6 flex-wrap text-[11px]">
            <span><span className="text-gray-400">Sottofamiglie:</span> <strong className="text-dimar-dark">{FAMIGLIE.length}</strong></span>
            <span><span className="text-gray-400">Slot totali:</span> <strong className="text-dimar-dark">{total}</strong></span>
            <span><span className="text-gray-400">Articoli a catalogo:</span> <strong className="text-dimar-dark">{ARTICOLI.length}</strong></span>
            <span><span className="text-gray-400">Sezioni promo:</span> <strong className="text-dimar-dark">{SECTIONS.length}</strong></span>
          </div>
        </div>

        {/* KPI strip */}
        {kpi && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="text-2xl font-bold text-emerald-600 tabular-nums">{kpi.avgMargine.toFixed(1)}%</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Margine medio</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="text-2xl font-bold text-dimar-red tabular-nums">−{kpi.avgSconto.toFixed(0)}%</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Sconto medio</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="text-2xl font-bold text-violet-600 tabular-nums">{kpi.marche}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Marche distinte</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="text-2xl font-bold text-blue-600 tabular-nums">{kpi.plQuota.toFixed(0)}%</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Quota private label</div>
            </div>
          </div>
        )}

        {/* Famiglia tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {FAMIGLIE.map((f) => {
            const fs = slots.filter((s) => s.fc === f.fc);
            const done = fs.filter((s) => assignments[s.id]).length;
            const active = activeFam === f.fc;
            return (
              <button
                key={f.fc}
                onClick={() => setActiveFam(f.fc)}
                className={`text-left px-4 py-2.5 rounded-xl border transition-all ${
                  active ? 'bg-white border-dimar-red shadow-sm' : 'bg-white/60 border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-sm ${active ? 'text-dimar-red' : 'text-dimar-dark'}`}>{f.fn}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    done === fs.length ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}>{done}/{fs.length}</span>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5 font-mono">
                  {f.fc} · € {Math.round(f.vendite).toLocaleString('it-IT')} · M. {f.marginePct}%
                </div>
              </button>
            );
          })}
        </div>

        {/* Slots grouped by section */}
        {SECTIONS.map((sec) => {
          const secSlots = famSlots.filter((s) => s.sectionKey === sec.key);
          if (secSlots.length === 0) return null;
          const plan = SLOT_PLAN[activeFam][sec.key];
          const done = secSlots.filter((s) => assignments[s.id]).length;
          return (
            <div key={sec.key} className="mb-5">
              <div className="flex items-center gap-2 mb-2 pb-1.5 border-b-2 border-gray-100">
                <div className={`w-1 h-5 rounded-full bg-gradient-to-b ${SECTION_GRADIENTS[sec.color]}`} />
                <h4 className="text-sm font-bold text-dimar-dark">{sec.label}</h4>
                <span className="text-[11px] text-gray-400">{sec.tema}</span>
                <span className="ml-auto text-[10px] text-gray-500">
                  PROD {plan.prod} · CARD {plan.card} ·{' '}
                  <strong className={done === secSlots.length ? 'text-emerald-600' : 'text-gray-600'}>
                    {done}/{secSlots.length}
                  </strong>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {secSlots.map((slot) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    article={assignments[slot.id]}
                    duplicate={duplicateSlotIds.has(slot.id)}
                    onOpen={() => setOpenSlot(slot)}
                    onClear={() => clear(slot.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        <p className="text-[11px] text-gray-400 text-center mt-8 pb-4">
          {famData?.fn} · {famSlots.length} slot da assortire · dati articolo dimostrativi
        </p>
      </div>

      {openSlot && (
        <ArticlePicker
          slot={openSlot}
          assignments={assignments}
          onPick={(a) => assign(openSlot.id, a)}
          onClose={() => setOpenSlot(null)}
        />
      )}
    </div>
  );
}
