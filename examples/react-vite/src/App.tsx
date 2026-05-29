import { useState } from 'react';
import { FlashLoginButton } from 'wa-flashlogin-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3050/auth';

export function App() {
  const [phone, setPhone] = useState('+27825651069');
  const [verified, setVerified] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState('');

  const handleVerified = (payload: { phone: string }) => {
    setVerified(true);
    setVerifiedPhone(payload.phone);
  };

  const handleError = (error: Error) => {
    alert(`Login failed: ${error.message}`);
  };

  const handleReset = () => {
    setVerified(false);
    setVerifiedPhone('');
  };

  if (verified) {
    return (
      <div className="container">
        <h1>Verified!</h1>
        <p className="success">You are logged in as: {verifiedPhone}</p>
        <button onClick={handleReset}>Logout</button>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>wa-flashlogin React Example</h1>
      <p>Enter your phone number and click the button to authenticate via WhatsApp.</p>

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

      <FlashLoginButton
        apiBase={API_BASE}
        phone={phone}
        onVerified={handleVerified}
        onError={handleError}
        label="Login with WhatsApp"
        qrFallback
        className="login-button"
      />

      <div className="info">
        <h3>How it works:</h3>
        <ol>
          <li>Click the button above</li>
          <li>Open WhatsApp (or scan QR on desktop)</li>
          <li>Send the pre-filled message</li>
          <li>Get verified instantly</li>
        </ol>

        <h3>Testing with Mock Adapter:</h3>
        <p>
          The demo server at <code>localhost:3050</code> uses a mock adapter.
          To simulate verification, send a POST to:
        </p>
        <pre>
POST http://localhost:3050/simulate
{JSON.stringify({ sessionId: 'your-session-id', phone: phone }, null, 2)}
        </pre>
      </div>
    </div>
  );
}
