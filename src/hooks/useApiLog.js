import { useState, useCallback } from 'react';

/**
 * Manages a sequential log of API calls for display in ApiCallLog.
 * Each call entry: { id, method, endpoint, docUrl, requestBody, status, responseData, errorMsg }
 */
export function useApiLog() {
  const [calls, setCalls] = useState([]);

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

  const clearLog = useCallback(() => setCalls([]), []);

  return { calls, logCall, resolveCall, failCall, clearLog };
}
