import { useState, useCallback, useMemo } from 'react';
import PROMOZIONI from './data/promozioni';
import Header from './components/Header';
import V2View from './components/v2/V2View';
import AIPlanPanel from './components/ai/AIPlanPanel';
import V1View from './components/v1/V1View';
import useGridState from './hooks/useGridState';
import useAIState from './hooks/useAIState';

// Initial last-sent timestamp: a few hours ago for realism
const INITIAL_LAST_SENT = (() => {
  const d = new Date();
  d.setHours(d.getHours() - 5, 23, 0, 0);
  d.setDate(d.getDate() - 1);
  return d.toISOString();
})();

export default function App() {
  const [selectedChannel, setSelectedChannel] = useState('Ipermercati');
  const [selectedPromoCode, setSelectedPromoCode] = useState(null);
  const [view, setView] = useState('v2');
  const [aiOpen, setAIOpen] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [lastSentAt, setLastSentAt] = useState(INITIAL_LAST_SENT);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const channelPromos = useMemo(
    () => PROMOZIONI.filter(p => p.canale === selectedChannel),
    [selectedChannel]
  );

  const effectivePromoCode = useMemo(() => {
    if (selectedPromoCode && channelPromos.some(p => p.codice === selectedPromoCode)) {
      return selectedPromoCode;
    }
    return channelPromos[0]?.codice;
  }, [selectedPromoCode, channelPromos]);

  const selectedPromo = useMemo(
    () => channelPromos.find(p => p.codice === effectivePromoCode),
    [channelPromos, effectivePromoCode]
  );

  const gridState = useGridState(selectedPromo);
  const aiState = useAIState();

  const handleChannelChange = useCallback((c) => {
    setSelectedChannel(c);
    setSelectedPromoCode(null); // will fall back to first promo of new channel
  }, []);

  const handlePromoChange = useCallback((code) => {
    setSelectedPromoCode(code);
  }, []);

  const handleSave = useCallback(() => {
    setSaving(true);
    setLastSavedAt(new Date().toISOString());
    setTimeout(() => setSaving(false), 1500);
  }, []);

  const handleSendData = useCallback(() => {
    setSending(true);
    setTimeout(() => {
      setLastSentAt(new Date().toISOString());
      setSending(false);
    }, 1800);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-dimar-gray">
      <Header
        selectedChannel={selectedChannel}
        onChannelChange={handleChannelChange}
        selectedPromoCode={effectivePromoCode}
        onPromoChange={handlePromoChange}
        view={view}
        onViewChange={setView}
        onOpenAI={() => setAIOpen(true)}
        onSave={handleSave}
        onSendData={handleSendData}
        lastSavedAt={lastSavedAt}
        lastSentAt={lastSentAt}
        saving={saving}
        sending={sending}
      />

      {selectedPromo && (
        view === 'v1' ? (
          <V1View gridState={gridState} selectedPromo={selectedPromo} />
        ) : (
          <V2View gridState={gridState} selectedPromo={selectedPromo} />
        )
      )}

      {aiOpen && (
        <AIPlanPanel
          channel={selectedChannel}
          selectedPromoCode={effectivePromoCode}
          gridState={gridState}
          aiState={aiState}
          onClose={() => setAIOpen(false)}
          onSelectPromo={handlePromoChange}
        />
      )}
    </div>
  );
}
