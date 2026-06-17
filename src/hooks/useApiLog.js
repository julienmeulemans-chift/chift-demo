import { useState, useCallback, useEffect } from 'react';

/**
 * Manages a sequential log of API calls for display in ApiCallLog.
 * Each call entry: { id, method, endpoint, docUrl, requestBody, status, responseData, errorMsg }
 *
 * @param {string} [storageKey] - If provided, the log is persisted to sessionStorage under this
 *   key so it survives page redirects (e.g. OAuth / Chift sync redirects) and is restored on
 *   remount. Cleared only when clearLog() is called explicitly.
 */
export function useApiLog(storageKey) {
  const [calls, setCalls] = useState(() => {
    if (!storageKey) return [];
    try {
      const stored = sessionStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Keep sessionStorage in sync whenever calls change
  useEffect(() => {
    if (!storageKey) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(calls));
    } catch { /* quota exceeded or private browsing — silently ignore */ }
  }, [calls, storageKey]);

  const logCall = useCallback(({ id, method, endpoint, docUrl, requestBody = null }) => {
    setCalls(prev => [
      ...prev,
      { id, method, endpoint, docUrl, requestBody, status: 'pending', responseData: null, errorMsg: null },
    ]);
  }, []);

  const resolveCall = useCallback((id, responseData) => {
    setCalls(prev => prev.map(c => c.id === id ? { ...c, status: 'success', responseData } : c));
  }, []);

  const failCall = useCallback((id, errorMsg) => {
    setCalls(prev => prev.map(c => c.id === id ? { ...c, status: 'error', errorMsg } : c));
  }, []);

  const clearLog = useCallback(() => {
    setCalls([]);
    if (storageKey) {
      try { sessionStorage.removeItem(storageKey); } catch { /* ignore */ }
    }
  }, [storageKey]);

  return { calls, logCall, resolveCall, failCall, clearLog };
}
