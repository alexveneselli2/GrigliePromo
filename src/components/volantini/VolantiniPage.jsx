import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

const CANALI = ['Mercatò', 'Mercatò Local', 'Mercatò Big', 'Mercatò Extra'];
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

// The proxy lives on the same origin in production and on VITE_AI_PROXY_URL in
// local dev — reuse exactly the rule the AI client already follows.
const BASE = (import.meta.env.VITE_AI_PROXY_URL || '').replace(/\/$/, '');
const api = (path) => `${BASE}/api/volantini${path}`;

async function readJson0(url) {
  return readJson(await fetch(url));
}

async function readJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Errore ${res.status}`);
  if (data && data.error) throw new Error(data.error);
  return data;
}

// ---------------------------------------------------------------------------

function StatCard({ label, value, sub, tone = 'slate' }) {
  const tones = {
    slate: 'bg-white border-gray-100 text-dimar-dark',
    red: 'bg-red-50 border-red-200 text-dimar-red',
    violet: 'bg-violet-50 border-violet-200 text-violet-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  };
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${tones[tone]}`}>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider mt-0.5 opacity-70 font-semibold">{label}</div>
      {sub && <div className="text-[10px] opacity-60 mt-0.5">{sub}</div>}
    </div>
  );
}

function StatoBadge({ stato }) {
  const map = {
    in_analisi: { label: 'In analisi', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    completato: { label: 'Completato', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    errore: { label: 'Errore', cls: 'bg-red-100 text-red-700 border-red-200' },
  };
  const s = map[stato] || { label: stato, cls: 'bg-gray-100 text-gray-600 border-gray-200' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Upload form
// ---------------------------------------------------------------------------

function UploadForm({ onDone, onError }) {
  const now = new Date();
  const [file, setFile] = useState(null);
  const [nome, setNome] = useState('');
  const [canali, setCanali] = useState([]);
  const [mese, setMese] = useState(now.getMonth() + 1);
  const [anno, setAnno] = useState(now.getFullYear());
  const [progressivo, setProgressivo] = useState(1);
  const [nota, setNota] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const toggleCanale = (c) =>
    setCanali((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const valido = file && nome.trim() && canali.length > 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!valido || busy) return;
    setBusy(true);
    onError(null);
    try {
      const fd = new FormData();
      fd.append('pdf', file);
      fd.append('nome', nome.trim());
      fd.append('canali', JSON.stringify(canali));
      fd.append('mese', String(mese));
      fd.append('anno', String(anno));
      fd.append('progressivo', String(progressivo));
      fd.append('nota', nota);
      const data = await readJson(await fetch(api('/'), { method: 'POST', body: fd }));
      setFile(null); setNome(''); setNota('');
      if (inputRef.current) inputRef.current.value = '';
      onDone(data.volantino);
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
      <h3 className="text-sm font-bold text-dimar-dark">Nuovo volantino</h3>

      {/* Dropzone */}
      <label className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
        file ? 'border-emerald-300 bg-emerald-50/40' : 'border-gray-300 hover:border-dimar-red/50 hover:bg-red-50/30'
      }`}>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        {file ? (
          <div>
            <p className="text-sm font-semibold text-emerald-700">{file.name}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{(file.size / 1024 / 1024).toFixed(1)} MB — clicca per cambiare</p>
          </div>
        ) : (
          <div className="text-gray-500">
            <svg className="w-7 h-7 mx-auto mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.9A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm font-semibold">Trascina o seleziona il PDF del volantino</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Massimo 60 MB</p>
          </div>
        )}
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Nome *</label>
          <input
            value={nome} onChange={(e) => setNome(e.target.value)}
            placeholder="es. Volantino Sottocosto Novembre"
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-dimar-red/30"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Canali *</label>
          <div className="flex flex-wrap gap-1.5">
            {CANALI.map((c) => (
              <button
                key={c} type="button" onClick={() => toggleCanale(c)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                  canali.includes(c)
                    ? 'bg-dimar-red text-white border-dimar-red'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Periodo *</label>
          <div className="flex gap-2">
            <select value={mese} onChange={(e) => setMese(Number(e.target.value))}
              className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-2 bg-white">
              {MESI.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <input type="number" value={anno} onChange={(e) => setAnno(Number(e.target.value))}
              min={2000} max={2100}
              className="w-24 text-sm border border-gray-300 rounded-lg px-2 py-2" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Progressivo *</label>
          <input type="number" value={progressivo} onChange={(e) => setProgressivo(Number(e.target.value))}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2" />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Nota</label>
          <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2}
            placeholder="Annotazioni libere su questo volantino…"
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-none" />
        </div>
      </div>

      <button
        type="submit" disabled={!valido || busy}
        className="w-full py-2.5 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-dimar-red to-rose-500 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md transition-all"
      >
        {busy ? 'Caricamento…' : 'Carica e analizza'}
      </button>
      <p className="text-[10px] text-gray-400 text-center">
        L'analisi prosegue in background: puoi chiudere e tornare più tardi.
      </p>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------

function ReviewRow({ art, onFix, tassonomia }) {
  const [reparto, setReparto] = useState(art.reparto || '');
  const [famiglia, setFamiglia] = useState(art.famiglia || '');
  const [saving, setSaving] = useState(false);

  // Families available for the chosen reparto. If the stored family isn't in
  // the list (an AI guess that drifted, or a since-renamed category) it is kept
  // as an extra option so confirming never silently changes the value.
  const famiglieDisponibili = useMemo(() => {
    const base = tassonomia?.famiglie?.[reparto] || [];
    return famiglia && !base.includes(famiglia) ? [famiglia, ...base] : base;
  }, [tassonomia, reparto, famiglia]);

  const cambiaReparto = (nuovo) => {
    setReparto(nuovo);
    // The old family almost certainly doesn't belong to the new reparto.
    const fams = tassonomia?.famiglie?.[nuovo] || [];
    if (!fams.includes(famiglia)) setFamiglia('');
  };

  const salva = async () => {
    setSaving(true);
    try {
      await onFix(art.id, { reparto, famiglia, confermato: true });
    } finally {
      setSaving(false);
    }
  };

  const confBadge = art.confidenza == null ? 'bg-gray-100 text-gray-500'
    : art.confidenza >= 80 ? 'bg-emerald-100 text-emerald-700'
    : art.confidenza >= 60 ? 'bg-amber-100 text-amber-700'
    : 'bg-red-100 text-red-700';

  return (
    <tr className="border-b border-gray-50 hover:bg-amber-50/30">
      <td className="px-3 py-2 text-[10px] text-gray-400 tabular-nums align-top">p.{art.pagina}</td>
      <td className="px-3 py-2 align-top">
        <div className="text-[11px] font-medium text-gray-800">{art.descrizione}</div>
        <div className="text-[10px] text-gray-400 flex items-center gap-1.5 mt-0.5">
          <span>{art.origine === 'ai' ? 'classificato da AI' : 'match catalogo'}</span>
          {art.confidenza != null && (
            <span className={`px-1.5 rounded-full font-bold ${confBadge}`}>{art.confidenza}%</span>
          )}
        </div>
      </td>
      <td className="px-2 py-2 align-top">
        <select
          value={reparto}
          onChange={(e) => cambiaReparto(e.target.value)}
          className="w-full text-[11px] border border-gray-200 rounded px-1.5 py-1 bg-white cursor-pointer"
        >
          <option value="">— seleziona —</option>
          {(tassonomia?.reparti || []).map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </td>
      <td className="px-2 py-2 align-top">
        <select
          value={famiglia}
          onChange={(e) => setFamiglia(e.target.value)}
          disabled={!reparto}
          className="w-full text-[11px] border border-gray-200 rounded px-1.5 py-1 bg-white cursor-pointer disabled:bg-gray-50 disabled:text-gray-400"
        >
          <option value="">{reparto ? '— seleziona —' : 'scegli prima il reparto'}</option>
          {famiglieDisponibili.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </td>
      <td className="px-3 py-2 whitespace-nowrap align-top">
        <button onClick={salva} disabled={saving || !reparto || !famiglia}
          className="px-2 py-1 text-[10px] font-bold rounded bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed">
          {saving ? '…' : 'Conferma'}
        </button>
      </td>
    </tr>
  );
}

// Bulk-approve everything at or above a confidence level.
function ApprovaMassivo({ articoli, onApprova }) {
  const [soglia, setSoglia] = useState(80);
  const [busy, setBusy] = useState(false);

  const quanti = useMemo(
    () => articoli.filter((a) => (a.confidenza ?? -1) >= soglia && a.famiglia).length,
    [articoli, soglia]
  );

  return (
    <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center gap-3 flex-wrap">
      <span className="text-[11px] font-semibold text-dimar-dark">Approvazione massiva</span>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-500">confidenza ≥</span>
        <input
          type="range" min={0} max={100} step={5}
          value={soglia} onChange={(e) => setSoglia(Number(e.target.value))}
          className="w-40 accent-emerald-600 cursor-pointer"
        />
        <span className="text-xs font-bold tabular-nums text-emerald-700 w-10">{soglia}%</span>
      </div>
      <span className="text-[11px] text-gray-500">
        {quanti === 0
          ? 'nessun articolo sopra questa soglia'
          : <>verranno approvati <strong className="text-dimar-dark">{quanti}</strong> articoli</>}
      </span>
      <button
        disabled={busy || quanti === 0}
        onClick={async () => { setBusy(true); try { await onApprova(soglia); } finally { setBusy(false); } }}
        className="ml-auto px-3 py-1.5 text-[11px] font-bold rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {busy ? 'Approvazione…' : `Approva ${quanti}`}
      </button>
    </div>
  );
}

function Dettaglio({ id, onBack }) {
  const [data, setData] = useState(null);
  const [daRivedere, setDaRivedere] = useState([]);
  const [errore, setErrore] = useState(null);
  const [tab, setTab] = useState('riepilogo');
  const [tassonomia, setTassonomia] = useState(null);

  // Reference data for the linked dropdowns: fetched once, never changes.
  useEffect(() => {
    let vivo = true;
    readJson0(api('/tassonomia'))
      .then((t) => { if (vivo) setTassonomia(t); })
      .catch(() => { /* i menù restano vuoti, la riga resta comunque leggibile */ });
    return () => { vivo = false; };
  }, []);

  const carica = useCallback(async () => {
    try {
      const d = await readJson(await fetch(api(`/${id}`)));
      setData(d);
      if (d.volantino.stato === 'completato') {
        const r = await readJson(await fetch(api(`/${id}/articoli?daRivedere=1`)));
        setDaRivedere(r.articoli);
      }
    } catch (err) { setErrore(err.message); }
  }, [id]);

  useEffect(() => { carica(); }, [carica]);

  // Poll while the analysis is still running.
  useEffect(() => {
    if (data?.volantino?.stato !== 'in_analisi') return;
    const t = setInterval(carica, 5000);
    return () => clearInterval(t);
  }, [data?.volantino?.stato, carica]);

  const approvaMassivo = async (minConfidenza) => {
    await readJson(await fetch(api(`/${id}/approva-massivo`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minConfidenza }),
    }));
    const r = await readJson(await fetch(api(`/${id}/articoli?daRivedere=1`)));
    setDaRivedere(r.articoli);
    carica();
  };

  const fixArticolo = async (articoloId, patch) => {
    await readJson(await fetch(api(`/${id}/articoli/${articoloId}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }));
    setDaRivedere((prev) => prev.filter((a) => a.id !== articoloId));
    carica();
  };

  const [repartoAttivo, setRepartoAttivo] = useState(null);

  const perReparto = useMemo(() => {
    if (!data) return [];
    const map = new Map();
    for (const r of data.perFamiglia) {
      const k = r.reparto || '—';
      const cur = map.get(k) || { reparto: k, articoli: 0, in_evidenza: 0, in_zona_fornitore: 0, famiglie: [] };
      cur.articoli += Number(r.articoli);
      cur.in_evidenza += Number(r.in_evidenza);
      cur.in_zona_fornitore += Number(r.in_zona_fornitore);
      cur.famiglie.push(r);
      map.set(k, cur);
    }
    return [...map.values()].sort((a, b) => b.articoli - a.articoli);
  }, [data]);

  // Selected reparto: defaults to the largest, and self-heals if the current
  // choice disappears (e.g. after a re-classification moves every article out).
  const repartoCorrente = useMemo(
    () => perReparto.find((r) => r.reparto === repartoAttivo) || perReparto[0] || null,
    [perReparto, repartoAttivo]
  );
  const maxArticoliReparto = perReparto[0]?.articoli || 0;

  if (errore) return (
    <div className="p-6">
      <button onClick={onBack} className="text-xs text-gray-500 hover:text-dimar-dark mb-4">← Torna all'elenco</button>
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">{errore}</div>
    </div>
  );
  if (!data) return <div className="p-10 text-center text-sm text-gray-400">Caricamento…</div>;

  const v = data.volantino;
  const t = data.totali;

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <button onClick={onBack} className="text-xs font-semibold text-gray-500 hover:text-dimar-dark mb-4 inline-flex items-center gap-1">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Torna all'elenco
      </button>

      {/* Header */}
      <div className="rounded-2xl overflow-hidden shadow-lg mb-6">
        <div className="bg-gradient-to-r from-dimar-red via-rose-500 to-pink-500 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-white/80 text-xs font-semibold uppercase tracking-widest mb-1">Catalogazione volantino</p>
              <h1 className="text-2xl font-extrabold">{v.nome}</h1>
              <p className="text-white/90 text-sm mt-1">
                {MESI[v.mese - 1]} {v.anno} · progressivo {v.progressivo}
              </p>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {(v.canali || []).map((c) => (
                  <span key={c} className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-semibold">{c}</span>
                ))}
              </div>
            </div>
            <StatoBadge stato={v.stato} />
          </div>
        </div>
        <div className="bg-white px-6 py-3 flex items-center gap-6 flex-wrap text-[11px]">
          <span><span className="text-gray-400">File:</span> <strong>{v.file_nome}</strong></span>
          <span><span className="text-gray-400">Modello:</span> <strong>{v.modello || '—'}</strong></span>
          {v.nota && <span className="text-gray-500 italic">"{v.nota}"</span>}
        </div>
      </div>

      {v.stato === 'in_analisi' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin shrink-0" />
          <div className="text-sm text-blue-900">
            Analisi in corso sulle <strong>{v.pagine}</strong> pagine del volantino. La pagina si aggiorna da sola.
          </div>
        </div>
      )}
      {v.stato === 'errore' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-800">
          <strong>Analisi fallita.</strong> {v.errore}
        </div>
      )}

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard label="Pagine" value={v.pagine} />
        <StatCard label="Articoli" value={t.articoli} tone="red" />
        <StatCard label="In evidenza" value={t.in_evidenza} tone="violet" />
        <StatCard label="Zone fornitore" value={data.zone.length} tone="emerald"
          sub={`${t.in_zona_fornitore} articoli dentro`} />
        <StatCard label="Da rivedere" value={t.da_rivedere} tone="amber" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {[
          ['riepilogo', 'Per reparto e famiglia'],
          ['zone', `Zone fornitore (${data.zone.length})`],
          ['rivedere', `Da rivedere (${daRivedere.length})`],
        ].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              tab === k ? 'border-dimar-red text-dimar-red' : 'border-transparent text-gray-500 hover:text-dimar-dark'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'riepilogo' && (
        perReparto.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">Nessun articolo catalogato.</p>
        ) : (
          <div className="space-y-4">
            {/* Master: one card per reparto. The bar under each is that reparto's
                share of the flyer, so the weight is readable at a glance. */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {perReparto.map((rep) => {
                const attivo = rep.reparto === repartoCorrente?.reparto;
                const quota = maxArticoliReparto > 0 ? (rep.articoli / maxArticoliReparto) * 100 : 0;
                return (
                  <button
                    key={rep.reparto}
                    onClick={() => setRepartoAttivo(rep.reparto)}
                    className={`text-left px-3 py-2.5 rounded-xl border transition-all ${
                      attivo
                        ? 'bg-white border-dimar-red shadow-sm ring-1 ring-dimar-red/20'
                        : 'bg-white/70 border-gray-200 hover:border-gray-300 hover:bg-white'
                    }`}
                  >
                    <div className={`text-[11px] font-bold leading-tight truncate ${attivo ? 'text-dimar-red' : 'text-dimar-dark'}`}
                      title={rep.reparto}>
                      {rep.reparto}
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-lg font-bold tabular-nums text-dimar-dark">{rep.articoli}</span>
                      <span className="text-[10px] text-gray-400">articoli</span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden mt-1.5">
                      <div className={`h-full rounded-full ${attivo ? 'bg-dimar-red' : 'bg-gray-300'}`}
                        style={{ width: `${quota}%` }} />
                    </div>
                    <div className="flex gap-2 mt-1.5 text-[10px]">
                      <span className="text-violet-600">{rep.in_evidenza} evid.</span>
                      <span className="text-emerald-600">{rep.in_zona_fornitore} zona</span>
                      {rep.famiglie.length > 0 && (
                        <span className="ml-auto text-gray-400">{rep.famiglie.length} fam.</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Detail: families of the selected reparto */}
            {repartoCorrente && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-3 flex-wrap">
                  <h4 className="text-sm font-bold text-dimar-dark">{repartoCorrente.reparto}</h4>
                  <span className="text-[11px] text-gray-400">
                    {repartoCorrente.famiglie.length} famiglie ECR
                  </span>
                  <span className="ml-auto text-[11px] text-gray-500">
                    <strong className="text-dimar-red">{repartoCorrente.articoli}</strong> articoli ·
                    <strong className="text-violet-600"> {repartoCorrente.in_evidenza}</strong> in evidenza ·
                    <strong className="text-emerald-600"> {repartoCorrente.in_zona_fornitore}</strong> in zone fornitore
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400">
                        <th className="text-left px-4 py-1.5 font-semibold">Famiglia ECR</th>
                        <th className="text-right px-3 py-1.5 font-semibold">Articoli</th>
                        <th className="text-right px-3 py-1.5 font-semibold">In evidenza</th>
                        <th className="text-right px-3 py-1.5 font-semibold">In zona forn.</th>
                        <th className="text-right px-4 py-1.5 font-semibold">Da rivedere</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repartoCorrente.famiglie.map((f, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-red-50/20">
                          <td className="px-4 py-1.5 text-gray-700">
                            {f.famiglia || <span className="text-gray-300">non classificato</span>}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono font-bold">{f.articoli}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-violet-600">{f.in_evidenza}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-emerald-600">{f.in_zona_fornitore}</td>
                          <td className="px-4 py-1.5 text-right font-mono text-amber-600">{f.da_rivedere}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )
      )}

      {tab === 'zone' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {data.zone.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">Nessuna zona fornitore rilevata.</p>
          ) : (
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500">
                  <th className="text-left px-4 py-2 font-bold">Pag.</th>
                  <th className="text-left px-3 py-2 font-bold">Fornitore</th>
                  <th className="text-left px-3 py-2 font-bold">Come si distingue</th>
                  <th className="text-right px-4 py-2 font-bold">Articoli</th>
                </tr>
              </thead>
              <tbody>
                {data.zone.map((z) => (
                  <tr key={z.id} className="border-b border-gray-50">
                    <td className="px-4 py-2 tabular-nums text-gray-400">{z.pagina}</td>
                    <td className="px-3 py-2 font-semibold text-dimar-dark">{z.fornitore || '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{z.descrizione}</td>
                    <td className="px-4 py-2 text-right font-mono font-bold">{z.articoli_collegati || z.n_articoli}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'rivedere' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100 text-[11px] text-amber-900">
            Questi articoli non hanno trovato una corrispondenza sicura nel catalogo: la classificazione
            è stata dedotta. Correggi dove serve e conferma.
          </div>
          {daRivedere.length > 0 && (
            <ApprovaMassivo articoli={daRivedere} onApprova={approvaMassivo} />
          )}
          {daRivedere.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">Nessun articolo da rivedere.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-[10px]">
                  <th className="text-left px-3 py-2 font-bold">Pag.</th>
                  <th className="text-left px-3 py-2 font-bold">Articolo</th>
                  <th className="text-left px-2 py-2 font-bold">Reparto</th>
                  <th className="text-left px-2 py-2 font-bold">Famiglia</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {daRivedere.map((a) => (
                  <ReviewRow key={a.id} art={a} onFix={fixArticolo} tassonomia={tassonomia} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function VolantiniPage({ onClose }) {
  const [lista, setLista] = useState(null);
  const [errore, setErrore] = useState(null);
  const [apertoId, setApertoId] = useState(null);

  const carica = useCallback(async () => {
    try {
      const d = await readJson(await fetch(api('/')));
      setLista(d.volantini);
      setErrore(null);
    } catch (err) {
      setErrore(err.message);
      setLista([]);
    }
  }, []);

  useEffect(() => { carica(); }, [carica]);

  // Refresh the list while any analysis is running.
  useEffect(() => {
    if (!lista?.some((v) => v.stato === 'in_analisi')) return;
    const t = setInterval(carica, 6000);
    return () => clearInterval(t);
  }, [lista, carica]);

  return (
    <div className="fixed inset-0 z-[55] bg-gray-50 overflow-y-auto">
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm px-6 py-3 flex items-center gap-3">
        <button onClick={onClose} className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-dimar-dark px-2 py-1.5 rounded-lg hover:bg-gray-100">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Torna alla griglia
        </button>
        <h2 className="text-sm font-bold text-dimar-dark">Volantini · catalogazione</h2>
      </div>

      {apertoId ? (
        <Dettaglio id={apertoId} onBack={() => { setApertoId(null); carica(); }} />
      ) : (
        <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          <div>
            <UploadForm
              onDone={(v) => { setApertoId(v.id); carica(); }}
              onError={setErrore}
            />
            {errore && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800">
                {errore}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold text-dimar-dark mb-3">Volantini caricati</h3>
            {lista === null && <p className="text-sm text-gray-400">Caricamento…</p>}
            {lista?.length === 0 && !errore && (
              <p className="text-sm text-gray-400 py-10 text-center border border-dashed border-gray-200 rounded-xl">
                Nessun volantino ancora caricato.
              </p>
            )}
            <div className="space-y-2">
              {lista?.map((v) => (
                <button key={v.id} onClick={() => setApertoId(v.id)}
                  className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-dimar-red/40 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-dimar-dark">{v.nome}</span>
                    <StatoBadge stato={v.stato} />
                    {Number(v.n_da_rivedere) > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                        {v.n_da_rivedere} da rivedere
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {MESI[v.mese - 1]} {v.anno} · progressivo {v.progressivo} · {v.pagine} pagine · {v.n_articoli} articoli
                  </div>
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {(v.canali || []).map((c) => (
                      <span key={c} className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[9px] font-semibold">{c}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
