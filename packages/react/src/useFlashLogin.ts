import { useState, useEffect, useRef, useCallback } from 'react';
import type { UseFlashLoginOptions, UseFlashLoginReturn, FlashLoginStatus } from './types.js';

export function useFlashLogin(options: UseFlashLoginOptions): UseFlashLoginReturn {
  const { apiBase, phone, autoInit = false, pollFallbackMs } = options;

  const [status, setStatus] = useState<FlashLoginStatus>('idle');
  const [deeplink, setDeeplink] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(async (sid: string) => {
    if (pollIntervalRef.current) return;

    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${apiBase}/status/${sid}`);
        if (!response.ok) {
          throw new Error(`Status check failed: ${response.status}`);
        }

        const data = await response.json();

        if (data.status === 'verified') {
          setStatus('verified');
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        } else if (data.status === 'expired') {
          setStatus('expired');
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } catch (err) {
        console.error('Poll status error:', err);
      }
    }, pollFallbackMs || 2000);
  }, [apiBase, pollFallbackMs]);

  const connectSSE = useCallback((sid: string) => {
    try {
      const es = new EventSource(`${apiBase}/stream/${sid}`);

      es.addEventListener('pending', () => {
        setStatus('pending');
      });

      es.addEventListener('verified', () => {
        setStatus('verified');
        es.close();
      });

      es.addEventListener('expired', () => {
        setStatus('expired');
        es.close();
      });

      es.onerror = (err) => {
        console.error('SSE error:', err);
        es.close();
        if (pollFallbackMs !== undefined) {
          pollStatus(sid);
        }
      };

      eventSourceRef.current = es;
    } catch (err) {
      console.error('Failed to create EventSource:', err);
      if (pollFallbackMs !== undefined) {
        pollStatus(sid);
      }
    }
  }, [apiBase, pollFallbackMs, pollStatus]);

  const init = useCallback(async () => {
    cleanup();
    setStatus('initializing');
    setError(null);
    setDeeplink(null);
    setSessionId(null);
    setExpiresAt(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(`${apiBase}/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Init failed' }));
        throw new Error(errData.error || `Init failed: ${response.status}`);
      }

      const data = await response.json();

      setSessionId(data.sessionId);
      setDeeplink(data.deeplink);
      setExpiresAt(data.expiresAt);

      if (pollFallbackMs !== undefined) {
        pollStatus(data.sessionId);
      } else {
        connectSSE(data.sessionId);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const error = err instanceof Error ? err : new Error('Init failed');
      setError(error);
      setStatus('error');
    }
  }, [apiBase, phone, pollFallbackMs, cleanup, connectSSE, pollStatus]);

  useEffect(() => {
    if (autoInit) {
      init();
    }
  }, [autoInit]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    deeplink,
    status,
    error,
    sessionId,
    expiresAt,
    init,
  };
}
