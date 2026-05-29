import { useState, useEffect } from 'react';
import { useFlashLogin } from 'wa-flashlogin-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/auth';

function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

export function App() {
  const [phone, setPhone] = useState('+27825651069');
  const [simulateLoading, setSimulateLoading] = useState(false);
  const [simulateError, setSimulateError] = useState('');

  const { deeplink, status, error, sessionId, init } = useFlashLogin({
    apiBase: API_BASE,
    phone,
    autoInit: false,
  });

  const handleReset = () => {
    setSimulateError('');
    window.location.reload();
  };

  const handleSimulate = async () => {
    if (!sessionId || !phone) {
      setSimulateError('Please initiate login first by clicking "Login with WhatsApp"');
      return;
    }

    setSimulateLoading(true);
    setSimulateError('');

    try {
      const response = await fetch('/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, phone }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Simulation failed');
      }

      // Success - the SSE stream will update the UI
    } catch (err: any) {
      setSimulateError(err.message);
    } finally {
      setSimulateLoading(false);
    }
  };

  const handleClick = () => {
    if (status === 'idle' || status === 'error') {
      init();
    } else if (deeplink && isMobile()) {
      window.location.href = deeplink;
    }
  };

  if (status === 'verified') {
    return (
      <div className="container">
        <h1>✅ Verified!</h1>
        <p className="success">You are logged in as: {phone}</p>
        <button onClick={handleReset}>Logout</button>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="demo-banner">
        <strong>Demo Mode</strong> — This demo uses a mock WhatsApp adapter. No real message is sent.
        Click the orange <strong>"Simulate Verified"</strong> button below to see what happens when a user taps
        Send in WhatsApp. Real deployment uses Baileys → real WhatsApp.
      </div>

      <h1>wa-flashlogin</h1>
      <p className="subtitle">
        WhatsApp-native passwordless authentication. Zero PIN typing. Open-source alternative to Stytch WhatsApp OTP.
      </p>

      <div className="info-box">
        <h3>How it works:</h3>
        <ol>
          <li>Enter your phone number</li>
          <li>Click "Login with WhatsApp" (opens WhatsApp with prefilled message)</li>
          <li>Send the message (or click "Simulate Verified" in this demo)</li>
          <li>Get verified instantly — no code typing required</li>
        </ol>
      </div>

      <div className="form-group">
        <label htmlFor="phone">Phone Number (E.164 format)</label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+27825651069"
        />
      </div>

      <button
        onClick={handleClick}
        disabled={status === 'initializing' || status === 'verified'}
        className="login-button"
        type="button"
      >
        {status === 'initializing' && 'Initializing...'}
        {status === 'pending' && 'Waiting for verification...'}
        {status === 'expired' && 'Expired - Retry'}
        {status === 'error' && 'Error - Retry'}
        {status === 'idle' && 'Login with WhatsApp'}
      </button>

      {deeplink && !isMobile() && (
        <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
          <a
            href={deeplink}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'block', marginBottom: '0.5rem' }}
          >
            Open WhatsApp on Phone
          </a>
        </div>
      )}

      {error && (
        <div className="error">
          {error.message}
        </div>
      )}

      <div className="simulate-section">
        <button
          onClick={handleSimulate}
          disabled={!sessionId || simulateLoading}
          className="simulate-button"
        >
          {simulateLoading ? 'Simulating...' : '🧪 Simulate Verified (Demo Only)'}
        </button>
        {simulateError && <p className="error">{simulateError}</p>}
      </div>

      <div className="footer">
        <p>
          <a href="https://github.com/kobie3717/wa-flashlogin" target="_blank" rel="noopener noreferrer">
            View on GitHub
          </a>
          {' | '}
          Built with <a href="https://github.com/WhiskeySockets/Baileys" target="_blank" rel="noopener noreferrer">Baileys</a>
        </p>
      </div>
    </div>
  );
}
