# wa-flashlogin Examples

This directory contains example applications demonstrating how to use wa-flashlogin in various environments.

## Examples

### 1. basic-express

Basic Express.js server with mock adapter. Demonstrates server-side integration.

```bash
cd examples/basic-express
pnpm install
pnpm start
```

Server runs on `http://localhost:3050`

Endpoints:
- `POST /auth/init` - Initialize auth session
- `GET /auth/stream/:sessionId` - SSE stream
- `GET /auth/status/:sessionId` - Polling fallback
- `POST /simulate` - Simulate verification (dev only)

### 2. react-vite

React 18 + Vite example using `wa-flashlogin-react`.

```bash
cd examples/react-vite
pnpm install
pnpm dev
```

App runs on `http://localhost:5173`

Features:
- Phone input with validation
- `FlashLoginButton` component
- QR code fallback for desktop
- Verified state handling

### 3. vanilla-html

Plain HTML + vanilla JavaScript example using `wa-flashlogin-vanilla`.

```bash
cd examples/vanilla-html
pnpm install
pnpm dev
```

App runs on `http://localhost:5174`

Features:
- Zero framework dependencies
- `mountButton` API usage
- Event-based state management
- QR code fallback for desktop

## Running All Examples

1. Start the server (from repo root):
```bash
cd examples/basic-express
pnpm install
pnpm start
```

2. In a new terminal, start the React example:
```bash
cd examples/react-vite
pnpm install
pnpm dev
```

3. In another terminal, start the vanilla example:
```bash
cd examples/vanilla-html
pnpm install
pnpm dev
```

Now you can test both frontends against the same mock server.

## Testing with Mock Adapter

The basic-express server uses a `MockAdapter` for testing. To simulate a successful verification:

```bash
curl -X POST http://localhost:3050/simulate \
  -H 'Content-Type: application/json' \
  -d '{"sessionId": "your-session-id", "phone": "+27825651069"}'
```

Replace `your-session-id` with the session ID returned from `/auth/init`.

## Production Setup

For production, replace the `MockAdapter` with `BaileysAdapter`:

```typescript
import { BaileysAdapter } from 'wa-flashlogin-server';

const adapter = new BaileysAdapter({
  sock: yourBaileysSock,
  botJid: '27825651069@s.whatsapp.net'
});

const flash = createFlashLogin({
  adapter,
  secret: process.env.FLASHLOGIN_SECRET,
  // ...
});
```

See the main README for full setup instructions.
