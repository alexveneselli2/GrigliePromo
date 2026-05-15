import { useState, useCallback, useMemo } from 'react';
import PROMOZIONI from './data/promozioni';
import Header from './components/Header';
import V2View from './components/v2/V2View';
import AIPlanPanel from './components/ai/AIPlanPanel';
import V1View from './components/v1/V1View';
import useGridState from './hooks/useGridState';

export default function App() {
  const [selectedChannel, setSelectedChannel] = useState('Ipermercati');
  const [selectedPromoCode, setSelectedPromoCode] = useState(null);
  const [view, setView] = useState('v2');
  const [aiOpen, setAIOpen] = useState(false);

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

  const handleChannelChange = useCallback((c) => {
    setSelectedChannel(c);
    setSelectedPromoCode(null); // will fall back to first promo of new channel
  }, []);

  const handlePromoChange = useCallback((code) => {
    setSelectedPromoCode(code);
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
          gridState={gridState}
          onClose={() => setAIOpen(false)}
          onSelectPromo={handlePromoChange}
        />
      )}
    </div>
  );
}
