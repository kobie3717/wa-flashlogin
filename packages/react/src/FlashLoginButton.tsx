import { useEffect } from 'react';
import { useFlashLogin } from './useFlashLogin.js';
import { QRCode } from './QRCode.js';
import type { FlashLoginButtonProps } from './types.js';

function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

export function FlashLoginButton({
  apiBase,
  phone,
  onVerified,
  onError,
  label = 'Continue with WhatsApp',
  className = '',
  qrFallback = false,
}: FlashLoginButtonProps) {
  const { deeplink, status, error, init } = useFlashLogin({
    apiBase,
    phone,
    autoInit: false,
  });

  useEffect(() => {
    if (status === 'verified' && onVerified) {
      onVerified({ phone });
    }
  }, [status, phone, onVerified]);

  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  const handleClick = () => {
    if (status === 'idle' || status === 'error') {
      init();
    } else if (deeplink && isMobile()) {
      window.location.href = deeplink;
    }
  };

  const showQR = qrFallback && deeplink && !isMobile();

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={status === 'initializing' || status === 'verified'}
        className={className}
        type="button"
      >
        {status === 'initializing' && 'Initializing...'}
        {status === 'pending' && 'Waiting for verification...'}
        {status === 'verified' && 'Verified!'}
        {status === 'expired' && 'Expired - Retry'}
        {status === 'error' && 'Error - Retry'}
        {status === 'idle' && label}
      </button>

      {deeplink && !isMobile() && (
        <div style={{ marginTop: '1rem' }}>
          <a
            href={deeplink}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'block', marginBottom: '1rem' }}
          >
            Open WhatsApp
          </a>
          {showQR && <QRCode value={deeplink} size={256} />}
        </div>
      )}

      {error && (
        <div style={{ color: 'red', marginTop: '0.5rem' }}>
          {error.message}
        </div>
      )}
    </div>
  );
}
