import { EventEmitter } from './eventEmitter.js';
import type {
  FlashLoginOptions,
  FlashLoginStatus,
  InitResponse,
  MountButtonOptions,
} from './types.js';

export function createFlashLogin(options: FlashLoginOptions) {
  const { apiBase, phone, pollFallbackMs } = options;

  const emitter = new EventEmitter();
  let status: FlashLoginStatus = 'idle';
  let sessionId: string | null = null;
  let deeplink: string | null = null;
  let expiresAt: number | null = null;
  let eventSource: EventSource | null = null;
  let pollInterval: NodeJS.Timeout | null = null;
  let abortController: AbortController | null = null;

  const setStatus = (newStatus: FlashLoginStatus) => {
    status = newStatus;
    emitter.emit('status', status);
  };

  const cleanup = () => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  };

  const pollStatus = async (sid: string) => {
    if (pollInterval) return;

    pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${apiBase}/status/${sid}`);
        if (!response.ok) {
          throw new Error(`Status check failed: ${response.status}`);
        }

        const data = await response.json();

        if (data.status === 'verified') {
          setStatus('verified');
          emitter.emit('verified', { phone: data.phone });
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
        } else if (data.status === 'expired') {
          setStatus('expired');
          emitter.emit('expired');
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
        }
      } catch (err) {
        console.error('Poll status error:', err);
      }
    }, pollFallbackMs || 2000);
  };

  const connectSSE = (sid: string) => {
    try {
      const es = new EventSource(`${apiBase}/stream/${sid}`);

      es.addEventListener('pending', () => {
        setStatus('pending');
      });

      es.addEventListener('verified', (event) => {
        const data = JSON.parse((event as MessageEvent).data);
        setStatus('verified');
        emitter.emit('verified', { phone: data.phone });
        es.close();
      });

      es.addEventListener('expired', () => {
        setStatus('expired');
        emitter.emit('expired');
        es.close();
      });

      es.onerror = (err) => {
        console.error('SSE error:', err);
        es.close();
        if (pollFallbackMs !== undefined) {
          pollStatus(sid);
        }
      };

      eventSource = es;
    } catch (err) {
      console.error('Failed to create EventSource:', err);
      if (pollFallbackMs !== undefined) {
        pollStatus(sid);
      }
    }
  };

  const init = async (): Promise<InitResponse> => {
    cleanup();
    setStatus('initializing');

    const controller = new AbortController();
    abortController = controller;

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

      sessionId = data.sessionId;
      deeplink = data.deeplink;
      expiresAt = data.expiresAt;

      emitter.emit('deeplink', { deeplink: data.deeplink });

      if (pollFallbackMs !== undefined) {
        pollStatus(data.sessionId);
      } else {
        connectSSE(data.sessionId);
      }

      return data;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw err;
      }
      const error = err instanceof Error ? err : new Error('Init failed');
      setStatus('error');
      emitter.emit('error', error);
      throw error;
    }
  };

  const mountButton = async (
    element: HTMLElement,
    opts: MountButtonOptions = {}
  ): Promise<void> => {
    const { label = 'Continue with WhatsApp', qrFallback = false } = opts;

    const button = document.createElement('button');
    button.textContent = label;
    button.type = 'button';

    const errorDiv = document.createElement('div');
    errorDiv.style.color = 'red';
    errorDiv.style.marginTop = '0.5rem';
    errorDiv.style.display = 'none';

    const linkContainer = document.createElement('div');
    linkContainer.style.marginTop = '1rem';
    linkContainer.style.display = 'none';

    element.innerHTML = '';
    element.appendChild(button);
    element.appendChild(errorDiv);
    element.appendChild(linkContainer);

    button.addEventListener('click', async () => {
      try {
        const result = await init();

        if (isMobile()) {
          window.location.href = result.deeplink;
        } else {
          linkContainer.innerHTML = '';
          const link = document.createElement('a');
          link.href = result.deeplink;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = 'Open WhatsApp';
          link.style.display = 'block';
          link.style.marginBottom = '1rem';
          linkContainer.appendChild(link);
          linkContainer.style.display = 'block';

          if (qrFallback) {
            try {
              const QRCodeLib = await import('qrcode');
              const canvas = document.createElement('canvas');
              await QRCodeLib.toCanvas(canvas, result.deeplink, {
                width: 256,
                margin: 2,
              });
              linkContainer.appendChild(canvas);
            } catch (err) {
              console.error('QR generation failed:', err);
            }
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
      }
    });

    emitter.on('status', (newStatus: FlashLoginStatus) => {
      switch (newStatus) {
        case 'idle':
          button.textContent = label;
          button.disabled = false;
          break;
        case 'initializing':
          button.textContent = 'Initializing...';
          button.disabled = true;
          break;
        case 'pending':
          button.textContent = 'Waiting for verification...';
          button.disabled = true;
          break;
        case 'verified':
          button.textContent = 'Verified!';
          button.disabled = true;
          break;
        case 'expired':
          button.textContent = 'Expired - Retry';
          button.disabled = false;
          break;
        case 'error':
          button.textContent = 'Error - Retry';
          button.disabled = false;
          break;
      }
    });

    emitter.on('error', (error: Error) => {
      errorDiv.textContent = error.message;
      errorDiv.style.display = 'block';
    });

    emitter.on('verified', () => {
      errorDiv.style.display = 'none';
    });
  };

  const isMobile = (): boolean => {
    if (typeof navigator === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  return {
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
    init,
    mountButton,
    cleanup,
    getStatus: () => status,
    getSessionId: () => sessionId,
    getDeeplink: () => deeplink,
    getExpiresAt: () => expiresAt,
  };
}
