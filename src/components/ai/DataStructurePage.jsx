import { useMemo, useState } from 'react';
import ANAGRAFICA from '../../data/anagrafica';
import PROMOZIONI from '../../data/promozioni';
import METRICS from '../../data/metrics';
import REPARTI from '../../data/reparti';
import { REPARTO_TO_SPAZI } from '../../data/reparti';

function StatCard({ label, value, sub, color = 'violet' }) {
  const bg = {
    violet: 'bg-violet-50 border-violet-200 text-violet-700',
    rose: 'bg-rose-50 border-rose-200 text-rose-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
  };
  return (
    <div className={`rounded-xl border p-4 ${bg[color]}`}>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wider mt-1 opacity-80">{label}</div>
      {sub && <div className="text-[10px] mt-1 opacity-60">{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h3 className="text-sm font-bold text-dimar-dark uppercase tracking-wider flex items-center gap-2 mb-3 mt-8">
      <div className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-600 to-fuchsia-600" />
      {children}
    </h3>
  );
}

function DataTable({ columns, rows, maxRows = 10 }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, maxRows);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {columns.map((c) => (
                <th key={c.key} className="text-left px-3 py-2 font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-violet-50/30">
                {columns.map((c) => (
                  <td key={c.key} className="px-3 py-1.5 text-gray-700 whitespace-nowrap">
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > maxRows && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2 text-xs font-semibold text-violet-600 hover:bg-violet-50 border-t border-gray-100"
        >
          {expanded ? 'Mostra meno' : `Mostra tutti (${rows.length})`}
        </button>
      )}
    </div>
  );
}

function SchemaBlock({ title, fields }) {
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
      <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">{title}</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
        {fields.map((f) => (
          <div key={f.name} className="flex items-baseline gap-1.5 text-[11px]">
            <code className="text-violet-700 font-bold">{f.name}</code>
            <span className="text-gray-400">{f.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DataStructurePage({ onClose }) {
  const stats = useMemo(() => {
    const nFamilies = ANAGRAFICA.length;
    const nReparti = REPARTI.length;
    const nPromos = PROMOZIONI.length;
    const promoKeys = Object.keys(METRICS);
    const nMetrics = promoKeys.reduce((s, k) => s + Object.keys(METRICS[k] || {}).length, 0);
    const channels = [...new Set(PROMOZIONI.map((p) => p.canale))];
    return { nFamilies, nReparti, nPromos, nMetrics, channels };
  }, []);

  const familyRows = useMemo(() => ANAGRAFICA.slice(0, 307), []);

  const repartoRows = useMemo(
    () =>
      REPARTI.map((r) => ({
        ...r,
        families: ANAGRAFICA.filter((a) => a.rc === r.code).length,
        spazi: (REPARTO_TO_SPAZI[r.code] || []).join(', '),
      })),
    []
  );

  const promoRows = useMemo(() => PROMOZIONI, []);

  const sampleMetric = useMemo(() => {
    const pk = Object.keys(METRICS)[0];
    if (!pk) return [];
    const fam = METRICS[pk];
    return Object.entries(fam)
      .slice(0, 10)
      .map(([fc, m]) => ({
        promoCode: pk,
        fc,
        fn: ANAGRAFICA.find((a) => a.fc === fc)?.fn || fc,
        v: Math.round(m.v || 0),
        m: ((m.m || 0) * 100).toFixed(1),
        ps: ((m.ps || 0) * 100).toFixed(2),
        m1: Math.round(m.m1 || 0),
        m2: Math.round(m.m2 || 0),
        m3: Math.round(m.m3 || 0),
        m4: Math.round(m.m4 || 0),
        nVol: m.nVol || 0,
        ultima: m.ultima || '—',
      }));
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 px-6 py-4 flex items-center justify-between shadow-md">
        <div>
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
            Struttura Dati
          </h2>
          <p className="text-violet-100 text-xs mt-0.5">Architettura completa dei dati che alimentano il motore AI</p>
        </div>
        <button onClick={onClose} className="text-white/80 hover:text-white p-1">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-12">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
          <StatCard label="Famiglie" value={stats.nFamilies} sub="IV livello ECR" color="violet" />
          <StatCard label="Reparti" value={stats.nReparti} sub="Raggruppamento merceologico" color="rose" />
          <StatCard label="Promozioni" value={stats.nPromos} sub={stats.channels.join(', ')} color="emerald" />
          <StatCard label="Metriche" value={stats.nMetrics.toLocaleString()} sub="promo × famiglia" color="blue" />
          <StatCard label="Canali" value={stats.channels.length} sub={stats.channels.join(', ')} color="amber" />
        </div>

        {/* Schema overview */}
        <SectionTitle>Schema entità</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SchemaBlock
            title="Anagrafica famiglia (307 record)"
            fields={[
              { name: 'fc', type: 'string — codice famiglia' },
              { name: 'fn', type: 'string — nome' },
              { name: 'rc/rn', type: 'reparto cod/nome' },
              { name: 'gc/gn', type: 'gruppo cod/nome' },
              { name: 'sc/sn', type: 'sottogruppo cod/nome' },
            ]}
          />
          <SchemaBlock
            title="Metriche (per promo × famiglia)"
            fields={[
              { name: 'v', type: 'number — vendite €' },
              { name: 'm', type: 'number — margine %' },
              { name: 'ps', type: 'number — penetraz. scontrini' },
              { name: 'm1..m4', type: 'number — vendite mensili' },
              { name: 'nVol', type: 'number — apparizioni volant.' },
              { name: 'ultima', type: 'string? — ultima promo' },
            ]}
          />
          <SchemaBlock
            title="Promozione (9 record)"
            fields={[
              { name: 'codice', type: 'string — ID' },
              { name: 'canale', type: 'string — canale' },
              { name: 'tema', type: 'string — tema promo' },
              { name: 'quadrimestre', type: '1|2|3' },
              { name: 'dataInizio/Fine', type: 'date — periodo' },
              { name: 'ruoloTema', type: 'A/B/C' },
            ]}
          />
          <SchemaBlock
            title="Dati arricchiti (enriched.js)"
            fields={[
              { name: 'description', type: 'string — descr. prodotto' },
              { name: 'avgPrice', type: 'number — prezzo medio €' },
              { name: 'targetDemo', type: 'string — target cliente' },
              { name: 'promoElasticity', type: '0-1 — resp. promo' },
              { name: 'crossSellFamilies', type: 'fc[] — abbinamenti' },
              { name: 'marginTrend', type: 'up|stable|down' },
            ]}
          />
        </div>

        {/* ER diagram simplified */}
        <SectionTitle>Relazioni</SectionTitle>
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 text-xs text-gray-600 font-mono leading-relaxed">
          <pre className="whitespace-pre-wrap">{`PROMOZIONE (codice) ─┐
  canale, tema, date   │
                       ├──► METRICHE [promoCode × fc]
FAMIGLIA (fc) ─────────┘     vendite, margine, scontrini, m1-m4
  reparto, gruppo,            nVol, ultimaPromo
  sottogruppo
     │
     └──► PROFILO ARRICCHITO [fc]
           descrizione, prezzo, target, elasticità,
           cross-sell, trend margine, rischio stock

REPARTO (code) ──► BENCHMARK
  margine medio, lift promo, card penetration, trend

PROMO ──► CONTESTO STORICO
  risultati anno precedente, concorrenza, stagione`}</pre>
        </div>

        {/* Data tables */}
        <SectionTitle>Reparti ({stats.nReparti})</SectionTitle>
        <DataTable
          columns={[
            { key: 'code', label: 'Cod.' },
            { key: 'name', label: 'Nome' },
            { key: 'families', label: 'Famiglie' },
            { key: 'spazi', label: 'Spazi fisici' },
          ]}
          rows={repartoRows}
          maxRows={20}
        />

        <SectionTitle>Promozioni ({stats.nPromos})</SectionTitle>
        <DataTable
          columns={[
            { key: 'codice', label: 'Codice' },
            { key: 'canale', label: 'Canale' },
            { key: 'tema', label: 'Tema', render: (r) => (r.tema || '').split(' - ')[0]?.slice(0, 40) },
            { key: 'quadrimestre', label: 'Q' },
            { key: 'dataInizio', label: 'Inizio' },
            { key: 'dataFine', label: 'Fine' },
            { key: 'ruoloTema', label: 'Ruolo' },
          ]}
          rows={promoRows}
          maxRows={10}
        />

        <SectionTitle>Famiglie anagrafiche (campione)</SectionTitle>
        <DataTable
          columns={[
            { key: 'fc', label: 'FC' },
            { key: 'fn', label: 'Nome famiglia' },
            { key: 'rn', label: 'Reparto' },
            { key: 'sn', label: 'Sottogruppo' },
          ]}
          rows={familyRows}
          maxRows={15}
        />

        <SectionTitle>Metriche KPI (campione: prima promo)</SectionTitle>
        <DataTable
          columns={[
            { key: 'fc', label: 'FC' },
            { key: 'fn', label: 'Famiglia' },
            { key: 'v', label: 'Vendite €' },
            { key: 'm', label: 'Margine %' },
            { key: 'ps', label: 'Scontrini %' },
            { key: 'm1', label: 'M1' },
            { key: 'm2', label: 'M2' },
            { key: 'm3', label: 'M3' },
            { key: 'm4', label: 'M4' },
            { key: 'nVol', label: 'nVol' },
            { key: 'ultima', label: 'Ultima' },
          ]}
          rows={sampleMetric}
          maxRows={10}
        />

        {/* Pipeline description */}
        <SectionTitle>Pipeline AI</SectionTitle>
        <div className="bg-violet-50 rounded-xl border border-violet-200 p-5 text-xs text-gray-700 space-y-3">
          <div className="flex items-start gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">1</span>
            <div><strong>Prefiltro</strong> — Per ogni sezione×reparto, il motore calcola uno score euristico per tutte le famiglie e seleziona i top-15 candidati. I dati arricchiti (elasticità, target, trend) sono inclusi nel payload.</div>
          </div>
          <div className="flex items-start gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">2</span>
            <div><strong>Invio a Claude</strong> — Il payload (candidati + budget + KPI + contesto storico + pesi utente) viene inviato a claude-opus-4-8 con ragionamento esteso. Il system prompt è messo in cache per ridurre costi.</div>
          </div>
          <div className="flex items-start gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">3</span>
            <div><strong>Output strutturato</strong> — Claude restituisce picks[] (fc, slot, score, confidence, reasons[], impact) + insight, validati contro uno schema Zod.</div>
          </div>
          <div className="flex items-start gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">4</span>
            <div><strong>Clamp budget</strong> — Il frontend clampa prodCount/cardCount ai budget reali della sezione/reparto, poi assembla le card con KPI fattuali + stime AI.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
