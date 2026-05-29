# wa-flashlogin

WhatsApp-native passwordless authentication. Zero PIN typing.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://flashlogin.whatshubb.co.za)

## Try it Live

**[https://flashlogin.whatshubb.co.za](https://flashlogin.whatshubb.co.za)**

Interactive demo showing the full UX flow. Uses a mock WhatsApp adapter (no real messages sent) — click the orange "Simulate Verified" button to see what happens when a user taps Send in WhatsApp.

For production deployment, replace `MockAdapter` with `BaileysAdapter` to send real WhatsApp messages.

## Why

Traditional OTP flows force users to:
1. Receive a code via SMS/email
2. Memorize or copy 6 digits
3. Switch apps
4. Type the code

**wa-flashlogin** reverses this. Users tap "Send" on a prefilled WhatsApp message. No typing. No app switching. No memorization.

Similar to [Stytch's WhatsApp OTP](https://stytch.com/products/whatsapp) or [OTPless](https://otpless.com/), but open-source and self-hosted.

## Quickstart

```bash
pnpm add wa-flashlogin-server express
```

```typescript
import express from 'express';
import { createFlashLogin, BaileysAdapter } from 'wa-flashlogin-server';

const flash = createFlashLogin({
  adapter: new BaileysAdapter({
    sock: yourBaileysSock,
    botJid: '27825651069@s.whatsapp.net'
  }),
  secret: process.env.FLASHLOGIN_SECRET,
  sessionTtlMs: 5 * 60 * 1000,
  tokenLength: 8,
  messageTemplate: 'Login {token}',
});

const app = express();
app.use('/auth', flash.router());

flash.on('verified', ({ sessionId, phone }) => {
  // User verified - create JWT, set session, etc.
});

app.listen(3000);
```

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │         │  Your Server │         │  WhatsApp   │
└──────┬──────┘         └──────┬───────┘         └──────┬──────┘
       │                       │                        │
       │  POST /auth/init      │                        │
       │  {phone: "+27..."}    │                        │
       ├──────────────────────>│                        │
       │                       │                        │
       │  {sessionId, deeplink}│                        │
       │<──────────────────────┤                        │
       │                       │                        │
       │  GET /auth/stream/id  │                        │
       │  (SSE connection)     │                        │
       ├──────────────────────>│                        │
       │  event: pending       │                        │
       │<──────────────────────┤                        │
       │                       │                        │
       │  [User taps deeplink] │                        │
       │──────────────────────────────────────────────> │
       │                       │                        │
       │                       │  "Login ABCD1234"      │
       │                       │<───────────────────────┤
       │                       │                        │
       │  event: verified      │                        │
       │  {phone: "+27..."}    │                        │
       │<──────────────────────┤                        │
       │  [connection closed]  │                        │
       │                       │                        │
```

## API Reference

### Server SDK

#### `createFlashLogin(options)`

```typescript
interface FlashLoginOptions {
  adapter: WAAdapter;              // Baileys adapter or custom
  secret: string;                  // HMAC signing key
  sessionTtlMs?: number;           // Session expiry (default: 5min)
  tokenLength?: number;            // Token chars (default: 8)
  messageTemplate?: string;        // Message text (default: "Login {token}")
  rateLimit?: {
    windowMs?: number;             // Rate limit window (default: 30s)
    maxRequests?: number;          // Max requests per window (default: 1)
  };
}
```

#### Events

```typescript
flash.on('verified', ({ sessionId, phone }) => void);
flash.on('expired', ({ sessionId, phone }) => void);
```

### REST Endpoints

Mount `flash.router()` on Express:

```typescript
app.use('/auth', flash.router());
```

#### `POST /auth/init`

Initialize auth session.

Request:
```json
{
  "phone": "+27825651069"
}
```

Response:
```json
{
  "sessionId": "uuid",
  "deeplink": "https://wa.me/1234567890?text=Login%20ABCD1234",
  "expiresAt": 1672531200000
}
```

#### `GET /auth/stream/:sessionId`

SSE stream for real-time status updates.

Events:
- `pending` - Session waiting for verification
- `verified` - User sent message, phone verified
- `expired` - Session expired

#### `GET /auth/status/:sessionId`

Polling fallback.

Response:
```json
{
  "status": "verified",
  "phone": "+27825651069"
}
```

## Adapters

### BaileysAdapter

```typescript
import { BaileysAdapter } from 'wa-flashlogin-server';

const adapter = new BaileysAdapter({
  sock: baileysSock,           // Existing Baileys socket
  botJid: '27825651069@s.whatsapp.net'
});
```

### Custom Adapter

Implement `WAAdapter` interface:

```typescript
interface WAAdapter {
  onMessage(handler: (msg: { from: string; text: string }) => void): () => void;
}
```

## Security

- Tokens are cryptographically random (40+ bits entropy)
- Phone number verification prevents token hijacking
- Rate limiting prevents brute force (1 init per phone per 30s)
- Sessions auto-expire (default 5min)
- HMAC token signing (if needed for extended flows)

## Built on

- [Baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API
- [baileys-antiban](https://github.com/kobie3717/baileys-antiban) - Anti-ban middleware (optional)
- [wasp-protocol](https://github.com/kobie3717/wasp-protocol) - WA session management (optional)

## Frontend SDKs

### React

```bash
pnpm add wa-flashlogin-react
```

```tsx
import { FlashLoginButton } from 'wa-flashlogin-react';

function LoginPage() {
  return (
    <FlashLoginButton
      apiBase="/auth"
      phone="+27825651069"
      onVerified={(payload) => router.push('/dashboard')}
      onError={(err) => toast.error(err.message)}
      label="Login with WhatsApp"
      qrFallback
    />
  );
}
```

Or use the hook:

```tsx
import { useFlashLogin } from 'wa-flashlogin-react';

const { init, status, deeplink, error } = useFlashLogin({
  apiBase: '/auth',
  phone: '+27825651069',
});
```

See [packages/react/README.md](./packages/react/README.md) for full API reference.

### Vanilla JavaScript

```bash
pnpm add wa-flashlogin-vanilla
```

```js
import { createFlashLogin } from 'wa-flashlogin-vanilla';

const flash = createFlashLogin({
  apiBase: '/auth',
  phone: '+27825651069',
});

flash.on('verified', ({ phone }) => {
  location.href = '/dashboard';
});

flash.mountButton(document.querySelector('#login-btn'), {
  label: 'Login with WhatsApp',
  qrFallback: true,
});
```

Or use from CDN:

```html
<script src="https://unpkg.com/wa-flashlogin-vanilla"></script>
<script>
  const flash = WAFlashLogin.createFlashLogin({ ... });
</script>
```

See [packages/vanilla/README.md](./packages/vanilla/README.md) for full API reference.

## Examples

- [basic-express](./examples/basic-express) - Server with mock adapter
- [react-vite](./examples/react-vite) - React 18 + Vite app
- [vanilla-html](./examples/vanilla-html) - Plain HTML + JavaScript

See [examples/README.md](./examples/README.md) for setup instructions.

## Full Flow Example

Server (Express):

```typescript
import express from 'express';
import { createFlashLogin, BaileysAdapter } from 'wa-flashlogin-server';

const flash = createFlashLogin({
  adapter: new BaileysAdapter({ sock, botJid }),
  secret: process.env.FLASHLOGIN_SECRET,
});

const app = express();
app.use('/auth', flash.router());

flash.on('verified', ({ sessionId, phone }) => {
  // Create JWT, set session, etc.
});

app.listen(3000);
```

Client (React):

```tsx
import { FlashLoginButton } from 'wa-flashlogin-react';

function LoginPage() {
  const handleVerified = async (payload: { phone: string }) => {
    const response = await fetch('/api/session', { method: 'POST' });
    const { token } = await response.json();
    localStorage.setItem('token', token);
    router.push('/dashboard');
  };

  return (
    <FlashLoginButton
      apiBase="/auth"
      phone={phoneInput}
      onVerified={handleVerified}
      qrFallback
    />
  );
}
```

## License

MIT - Copyright (c) 2026 Kobus Wentzel
