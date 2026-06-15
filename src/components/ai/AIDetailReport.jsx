import { useState, useMemo } from 'react';
import { fmtEuro, fmtPct } from '../../utils';

const WEIGHT_LABELS = {
  sales: 'Vendite', margin: 'Margine', scontrini: 'Scontrini',
  seasonality: 'Stagionalità', themeAffinity: 'Affinità tema',
  roleBoost: 'Ruolo', recencyPenalty: 'Recency penalty', saturationPenalty: 'Saturaz. penalty',
};

const SYSTEM_PROMPT_TEXT = `Sei un category manager esperto della GDO italiana (catena Dimar). Devi decidere quali famiglie merceologiche inserire in ogni sezione di un volantino promozionale e con quanti spazi (PROD = spazi a volantino, CARD = spazi con carta fedeltà).

Regole ferree:
- DEVI USARE TUTTI GLI SPAZI DISPONIBILI: prodCount = budgetProd, cardCount = budgetCard. Nessuno slot vuoto.
- Se presenti "locked" (selezioni manuali), sono IMMODIFICABILI. Riportale esattamente e assegna il residuo.
- Concentra più spazi sulle famiglie più forti; assegna 1 alle marginali; NON lasciare fuori famiglie se ci sono spazi da riempire.

Criteri di valutazione (in ordine di priorità secondo i pesi utente):
- VENDITE, MARGINE, SCONTRINI, STAGIONALITÀ (M1-M4), AFFINITÀ TEMATICA (semantica, non solo keyword), ELASTICITÀ PROMO, ROTAZIONE, PROFILO CLIENTE (targetDemo), TREND MARGINE.

Contesto aggiuntivo: storico anno precedente, concorrenza, contesto stagionale, benchmark reparto.

Per ogni scelta: 1-3 motivazioni concrete + stima impatto (ricavo €k, prob. card, engagement).`;

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="mb-6 print:mb-4 break-inside-avoid-page">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 text-left mb-3 group print:pointer-events-none">
        <h2 className="text-sm font-bold text-dimar-dark tracking-wide uppercase flex-1">{title}</h2>
        <span className="text-gray-300 group-hover:text-gray-500 print:hidden text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && children}
    </section>
  );
}

function CodeBlock({ children }) {
  return (
    <pre className="bg-gray-900 text-gray-100 text-[10px] leading-relaxed rounded-lg p-4 overflow-x-auto whitespace-pre-wrap font-mono print:bg-gray-100 print:text-gray-800 print:border print:border-gray-300">{children}</pre>
  );
}

export default function AIDetailReport({ promoCode, plan, payload, weights, aiResult, onClose }) {
  const ts = new Date().toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const promoPayload = payload?.promos?.[0];
  const sections = promoPayload?.sections ?? [];
  const model = aiResult?.model ?? 'claude-opus-4-8';
  const aiPromo = aiResult?.promos?.[0];
  const picks = aiPromo?.picks ?? [];
  const insight = aiPromo?.insight;
  const suggestions = plan?.richByPromo?.[promoCode] ?? [];

  const totalCandidates = useMemo(() =>
    sections.reduce((s, sec) => s + sec.reparti.reduce((t, r) => t + (r.candidates?.length || 0), 0), 0),
    [sections]
  );

  const totalBudgetProd = useMemo(() =>
    sections.reduce((s, sec) => s + sec.reparti.reduce((t, r) => t + (r.budgetProd || 0), 0), 0),
    [sections]
  );
  const totalBudgetCard = useMemo(() =>
    sections.reduce((s, sec) => s + sec.reparti.reduce((t, r) => t + (r.budgetCard || 0), 0), 0),
    [sections]
  );

  const usedProd = picks.reduce((s, p) => s + (p.prodCount || 0), 0);
  const usedCard = picks.reduce((s, p) => s + (p.cardCount || 0), 0);

  const sortedWeights = useMemo(() =>
    Object.entries(weights || {}).sort(([, a], [, b]) => b - a),
    [weights]
  );

  // Build the user prompt text (same logic as server) for display
  const userPromptPreview = useMemo(() => {
    if (!promoPayload) return '';
    const lines = [
      `CANALE: ${promoPayload.canale ?? ''}`,
      `PROMO ${promoPayload.promoCode} — Q${promoPayload.quadrimestre ?? '?'} — ${promoPayload.dataInizio ?? ''} → ${promoPayload.dataFine ?? ''}`,
      `Tema: ${promoPayload.tema ?? ''} | Ruolo: ${promoPayload.ruolo ?? ''}`,
    ];
    if (weights) {
      lines.push('', 'PRIORITÀ KPI (pesi dall\'utente):');
      for (const [k, v] of sortedWeights) {
        lines.push(`  ${WEIGHT_LABELS[k] || k}: ${v.toFixed(2)}`);
      }
    }
    if (promoPayload.context) {
      lines.push('', 'CONTESTO PROMO:');
      if (promoPayload.context.prevYear) lines.push(`  Anno precedente: ricavi ${promoPayload.context.prevYear.totalRevenue}k, lift ${promoPayload.context.prevYear.avgLift}`);
      if (promoPayload.context.competition) lines.push(`  Concorrenza: ${promoPayload.context.competition}`);
      if (promoPayload.context.seasonal) lines.push(`  Stagione: ${promoPayload.context.seasonal}`);
    }
    lines.push('', `SEZIONI E CANDIDATI: ${sections.length} sezioni, ${totalCandidates} candidati totali`);
    lines.push('', '[payload JSON dei candidati con KPI — vedi sezione "Dati di input"]');
    return lines.join('\n');
  }, [promoPayload, weights, sortedWeights, sections, totalCandidates]);

  function handleExportPDF() {
    window.print();
  }

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <style>{`
        @media print {
          @page { margin: 16mm 12mm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm px-4 py-3 flex items-center gap-3 no-print">
        <button onClick={onClose} className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-dimar-dark px-2 py-1.5 rounded-lg hover:bg-gray-100">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Torna ai suggerimenti
        </button>
        <div className="flex-1" />
        <button onClick={handleExportPDF} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50">
          Esporta PDF
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">

        {/* Header */}
        <header className="rounded-2xl overflow-hidden mb-6 shadow-lg print:shadow-none print:border print:border-gray-200">
          <div className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 px-6 py-5">
            <p className="text-violet-200 text-xs font-semibold uppercase tracking-widest mb-1">Report Analisi AI</p>
            <h1 className="text-white text-2xl font-extrabold">{promoCode}</h1>
            <p className="text-violet-100 text-sm mt-1">{promoPayload?.tema}</p>
            <p className="text-violet-200 text-xs mt-1">{promoPayload?.dataInizio} → {promoPayload?.dataFine}</p>
          </div>
          <div className="bg-white px-6 py-3 flex items-center gap-6 flex-wrap text-[11px]">
            <span><span className="text-gray-400">Modello:</span> <strong className="text-dimar-dark">{model}</strong></span>
            <span><span className="text-gray-400">Generato:</span> <strong className="text-dimar-dark">{ts}</strong></span>
            <span><span className="text-gray-400">Canale:</span> <strong className="text-dimar-dark">{promoPayload?.canale}</strong></span>
            <span className="ml-auto px-2 py-0.5 rounded text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200">thinking: adaptive · streaming · top-10 candidati</span>
          </div>
        </header>

        {/* 1. Parametri API */}
        <Section title="1. Parametri chiamata API">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
              {[
                ['Modello', model],
                ['max_tokens', '32.000'],
                ['Thinking', 'adaptive'],
                ['Output', 'structured (Zod schema)'],
                ['Streaming', 'sì + heartbeat 15s'],
                ['Prompt caching', 'sì (system prompt)'],
                ['Candidati/reparto', '10'],
                ['Campi arricchiti', '4 (elasticità, target, prezzo, trend)'],
              ].map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-lg p-2">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider">{k}</div>
                  <div className="font-semibold text-dimar-dark mt-0.5">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* 2. System Prompt */}
        <Section title="2. System prompt (inviato a Claude)" defaultOpen={false}>
          <CodeBlock>{SYSTEM_PROMPT_TEXT}</CodeBlock>
        </Section>

        {/* 3. User Prompt */}
        <Section title="3. User prompt (dati della promo)" defaultOpen={false}>
          <CodeBlock>{userPromptPreview}</CodeBlock>
        </Section>

        {/* 4. Pesi KPI */}
        <Section title="4. Pesi KPI configurati dall'utente">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="space-y-2">
              {sortedWeights.map(([key, val]) => (
                <div key={key} className="flex items-center gap-3 text-[11px]">
                  <span className="w-32 text-gray-600 font-medium">{WEIGHT_LABELS[key] || key}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.min(100, val * 200)}%` }} />
                  </div>
                  <span className="w-10 text-right font-mono tabular-nums text-gray-700 font-bold">{val.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* 5. Dati di input */}
        <Section title="5. Dati di input inviati a Claude">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="bg-violet-50 rounded-lg p-3"><div className="text-xl font-bold text-violet-700">{sections.length}</div><div className="text-[10px] text-gray-500 uppercase">Sezioni</div></div>
              <div className="bg-violet-50 rounded-lg p-3"><div className="text-xl font-bold text-violet-700">{totalCandidates}</div><div className="text-[10px] text-gray-500 uppercase">Candidati</div></div>
              <div className="bg-violet-50 rounded-lg p-3"><div className="text-xl font-bold text-violet-700">{totalBudgetProd}</div><div className="text-[10px] text-gray-500 uppercase">Budget PROD</div></div>
              <div className="bg-violet-50 rounded-lg p-3"><div className="text-xl font-bold text-violet-700">{totalBudgetCard}</div><div className="text-[10px] text-gray-500 uppercase">Budget CARD</div></div>
            </div>

            {/* Budget per section */}
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-3 py-2 font-bold text-gray-500">Sezione</th>
                    <th className="text-left px-3 py-2 font-bold text-gray-500">Reparto</th>
                    <th className="text-right px-3 py-2 font-bold text-gray-500">PROD</th>
                    <th className="text-right px-3 py-2 font-bold text-gray-500">CARD</th>
                    <th className="text-right px-3 py-2 font-bold text-gray-500">Candidati</th>
                    <th className="text-right px-3 py-2 font-bold text-gray-500">Locked</th>
                  </tr>
                </thead>
                <tbody>
                  {sections.flatMap(sec => sec.reparti.map(r => (
                    <tr key={`${sec.key}-${r.repartoCode}`} className="border-b border-gray-50">
                      <td className="px-3 py-1.5">{sec.short || sec.key}</td>
                      <td className="px-3 py-1.5 text-gray-600">{r.repartoName}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{r.budgetProd}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{r.budgetCard}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{r.candidates?.length || 0}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{r.locked?.length || 0}</td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>

            {/* Context */}
            {promoPayload?.context && (
              <div className="space-y-1 text-[11px]">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Contesto inviato</div>
                {promoPayload.context.seasonal && <p><span className="text-gray-400">Stagione:</span> {promoPayload.context.seasonal}</p>}
                {promoPayload.context.competition && <p><span className="text-gray-400">Concorrenza:</span> {promoPayload.context.competition}</p>}
                {promoPayload.context.prevYear && <p><span className="text-gray-400">Anno precedente:</span> ricavi {promoPayload.context.prevYear.totalRevenue}k, lift {promoPayload.context.prevYear.avgLift}, card {promoPayload.context.prevYear.cardActivations}, reach {promoPayload.context.prevYear.customerReach}</p>}
              </div>
            )}
          </div>
        </Section>

        {/* 6. Ragionamento AI */}
        <Section title="6. Ragionamento e output di Claude">
          <div className="space-y-4">
            {/* Insight */}
            {insight && (
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                <div className="text-[10px] font-bold text-violet-600 uppercase tracking-wider mb-1">Insight strategico di Claude</div>
                <p className="text-sm text-gray-800 italic">"{insight}"</p>
              </div>
            )}

            {/* Copertura budget */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Copertura budget</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-gray-600">PROD</span>
                    <span className="font-bold tabular-nums">{usedProd} / {totalBudgetProd} <span className={usedProd >= totalBudgetProd ? 'text-emerald-600' : 'text-red-600'}>({totalBudgetProd > 0 ? Math.round(usedProd / totalBudgetProd * 100) : 0}%)</span></span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${usedProd >= totalBudgetProd ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${totalBudgetProd > 0 ? Math.min(100, usedProd / totalBudgetProd * 100) : 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-gray-600">CARD</span>
                    <span className="font-bold tabular-nums">{usedCard} / {totalBudgetCard} <span className={usedCard >= totalBudgetCard ? 'text-emerald-600' : 'text-red-600'}>({totalBudgetCard > 0 ? Math.round(usedCard / totalBudgetCard * 100) : 0}%)</span></span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${usedCard >= totalBudgetCard ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${totalBudgetCard > 0 ? Math.min(100, usedCard / totalBudgetCard * 100) : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Picks table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{picks.length} famiglie selezionate da Claude</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-3 py-2 font-bold text-gray-400">FC</th>
                      <th className="text-left px-3 py-2 font-bold text-gray-400">Sezione</th>
                      <th className="text-right px-3 py-2 font-bold text-gray-400">PROD</th>
                      <th className="text-right px-3 py-2 font-bold text-gray-400">CARD</th>
                      <th className="text-right px-3 py-2 font-bold text-gray-400">Score</th>
                      <th className="text-right px-3 py-2 font-bold text-gray-400">Conf.</th>
                      <th className="text-left px-3 py-2 font-bold text-gray-400">Motivazione principale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {picks.map((p, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-violet-50/30">
                        <td className="px-3 py-1.5 font-mono text-[10px]">{p.fc}</td>
                        <td className="px-3 py-1.5">{p.sectionKey}</td>
                        <td className="px-3 py-1.5 text-right font-mono font-bold">{p.prodCount}</td>
                        <td className="px-3 py-1.5 text-right font-mono">{p.cardCount}</td>
                        <td className="px-3 py-1.5 text-right font-mono">{p.score}</td>
                        <td className="px-3 py-1.5 text-right font-mono">{p.confidence}%</td>
                        <td className="px-3 py-1.5 text-gray-600 truncate max-w-[300px]">{(p.reasons || [])[0] || p.reason || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detailed reasons */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Motivazioni dettagliate per pick</div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {picks.map((p, i) => (
                  <div key={i} className="border-b border-gray-50 pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] font-bold text-violet-600">{p.fc}</span>
                      <span className="text-[10px] text-gray-400">{p.sectionKey}</span>
                      <span className="text-[10px] text-gray-400">· {p.prodCount}P {p.cardCount}C</span>
                    </div>
                    {(p.reasons || []).map((r, j) => (
                      <p key={j} className="text-[11px] text-gray-700 pl-3 before:content-['→'] before:mr-1.5 before:text-emerald-500">{r}</p>
                    ))}
                    {p.warning && <p className="text-[11px] text-amber-600 pl-3 before:content-['⚠'] before:mr-1.5">{p.warning}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* 7. Sintesi */}
        <Section title="7. Sintesi risultati">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="bg-emerald-50 rounded-lg p-3"><div className="text-xl font-bold text-emerald-700">{picks.length}</div><div className="text-[10px] text-gray-500 uppercase">Famiglie scelte</div></div>
              <div className="bg-violet-50 rounded-lg p-3"><div className="text-xl font-bold text-violet-700">{usedProd}</div><div className="text-[10px] text-gray-500 uppercase">Slot PROD</div></div>
              <div className="bg-rose-50 rounded-lg p-3"><div className="text-xl font-bold text-rose-700">{usedCard}</div><div className="text-[10px] text-gray-500 uppercase">Slot CARD</div></div>
              <div className="bg-blue-50 rounded-lg p-3"><div className="text-xl font-bold text-blue-700">{totalBudgetProd > 0 ? Math.round(usedProd / totalBudgetProd * 100) : 0}%</div><div className="text-[10px] text-gray-500 uppercase">Copertura</div></div>
            </div>

            {/* Impact */}
            {suggestions.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Impatto aggregato (stime Claude)</div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-lg font-bold text-violet-700">€ {Math.round(suggestions.reduce((s, x) => s + (x.impact?.expectedRevenue || 0), 0) / 1000)}k</div>
                    <div className="text-[10px] text-gray-500">Ricavo atteso</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-lg font-bold text-rose-600">{Math.round(suggestions.reduce((s, x) => s + (x.impact?.cardProb || 0), 0) / suggestions.length * 100)}%</div>
                    <div className="text-[10px] text-gray-500">Prob. card media</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-lg font-bold text-indigo-600">{Math.round(suggestions.reduce((s, x) => s + (x.impact?.engagement || 0), 0) / suggestions.length * 100)}%</div>
                    <div className="text-[10px] text-gray-500">Engagement medio</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Footer */}
        <div className="text-center text-[10px] text-gray-400 mt-8 pb-6 print:mt-4">
          Generato da Claude ({model}) · {ts}
        </div>
      </div>
    </div>
  );
}
