// Session-persistent AI state. Lives in App so it survives the AI panel
// being closed and re-opened.

import { useState } from 'react';
import { DEFAULT_WEIGHTS } from '../ai/engine';
import { isAIConfigured } from '../ai/anthropicClient';

export default function useAIState() {
  const aiAvailable = isAIConfigured();
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [engine, setEngine] = useState(aiAvailable ? 'ai' : 'heuristic');
  const [plan, setPlan] = useState(null);
  const [accepted, setAccepted] = useState({});
  const [activePromo, setActivePromo] = useState(null);
  const [lastPayload, setLastPayload] = useState(null);
  const [lastAiResult, setLastAiResult] = useState(null);
  const [aiError, setAiError] = useState(null);

  return {
    aiAvailable,
    weights, setWeights,
    engine, setEngine,
    plan, setPlan,
    accepted, setAccepted,
    activePromo, setActivePromo,
    lastPayload, setLastPayload,
    lastAiResult, setLastAiResult,
    aiError, setAiError,
  };
}
