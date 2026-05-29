# Basic Express Example

Minimal working example of wa-flashlogin with Express.

## Usage

```bash
pnpm install
pnpm run dev
```

Server starts on http://localhost:3050

## Test flow

1. Initialize session:
```bash
curl -X POST http://localhost:3050/auth/init \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+27825651069"}'
```

2. Open SSE stream (in another terminal):
```bash
curl -N http://localhost:3050/auth/stream/SESSION_ID
```

3. Simulate incoming WhatsApp message (dev only):
```bash
curl -X POST http://localhost:3050/simulate \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"SESSION_ID","phone":"+27825651069"}'
```

4. Watch the SSE stream receive verified event.

## Production usage

Replace MockAdapter with BaileysAdapter:

```js
import { createFlashLogin, BaileysAdapter } from 'wa-flashlogin-server';

const flash = createFlashLogin({
  adapter: new BaileysAdapter({
    sock: yourBaileysSock,
    botJid: '27825651069@s.whatsapp.net'
  }),
  secret: process.env.FLASHLOGIN_SECRET,
});
```
