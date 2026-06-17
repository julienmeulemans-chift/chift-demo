import { createContext, useContext, useState, useCallback } from 'react';

const STORAGE_KEY = 'chift_demo_config';

const DEFAULT_CONFIG = {
  demoMode: 'unified-api-generic',
  appName:  'AcmeCorp',
  // ── Chift API credentials (all modes) ──
  accountId:    '',
  clientId:     '',
  clientSecret: '',
  baseUrl:      'https://api.chift.eu',
  // ── Unified API ──
  consumerName: 'Demo Consumer',
  consumerId:   '',
  // ── Sync — Marketplace ──
  marketplaceSlug: '',
  // ── Sync — API-driven ──
  syncId: '',
  // ── Sync — Embedded (uses accountId above + syncId + envId) ──
  envId: '',
};

const ChiftConfigContext = createContext(null);

export function ChiftConfigProvider({ children }) {
  const [config, setConfigState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const setConfig = useCallback((updates) => {
    setConfigState((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <ChiftConfigContext.Provider value={{ config, setConfig }}>
      {children}
    </ChiftConfigContext.Provider>
  );
}

export function useChiftConfig() {
  return useContext(ChiftConfigContext);
}
