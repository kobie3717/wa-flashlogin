# wa-flashlogin-server

Server SDK for WhatsApp passwordless authentication.

## Install

```bash
npm install wa-flashlogin-server
# or
pnpm add wa-flashlogin-server
```

## Usage

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

## Adapters

### BaileysAdapter

For direct Baileys integration (self-hosted WhatsApp session):

```typescript
import { BaileysAdapter } from 'wa-flashlogin-server';

const adapter = new BaileysAdapter({
  sock: baileysSock,
  botJid: '27825651069@s.whatsapp.net'
});
```

### HttpWebhookAdapter

For webhook-based message routing (e.g., from WhatsHub, Twilio, MessageBird):

```typescript
import { HttpWebhookAdapter } from 'wa-flashlogin-server';

const adapter = new HttpWebhookAdapter({
  secret: process.env.FLASH_WEBHOOK_SECRET,
  botJid: '27825651069@s.whatsapp.net'
});

// Mount webhook receiver
app.use('/flash/webhook', adapter.router());

// Configure your webhook provider to POST to /flash/webhook:
// - Authorization: Bearer <secret> OR
// - X-WhatsHub-Signature: sha256=<hmac>
// - Body: { from: "27825651069@s.whatsapp.net", text: "Login ABCD1234" }
```

### MetaCloudAdapter

For Meta's official WhatsApp Business Cloud API (no Baileys, lower ban risk):

```typescript
import { MetaCloudAdapter } from 'wa-flashlogin-server';

const adapter = new MetaCloudAdapter({
  verifyToken: process.env.META_VERIFY_TOKEN,    // for hub.verify_token check
  appSecret: process.env.META_APP_SECRET,        // for X-Hub-Signature-256 HMAC
  botJid: '27825651069',                         // phone-number-id or display number
});

// Mount webhook receiver (handles both GET verification and POST messages)
app.use('/meta-webhook', adapter.router());
```

**CRITICAL:** Meta Cloud API requires raw request body for signature verification. Use `express.raw()` middleware BEFORE mounting the adapter:

```typescript
// WRONG - signature verification will fail:
app.use(express.json());
app.use('/meta-webhook', adapter.router());

// CORRECT - adapter handles raw body + JSON parsing internally:
app.use('/meta-webhook', adapter.router());
```

### Custom Adapter

Implement `WAAdapter` interface:

```typescript
interface WAAdapter {
  onMessage(handler: (msg: { from: string; text: string }) => void): () => void;
}
```

## Run via Docker

Pre-built Docker image for drop-in microservice deployment (no Node.js install required):

```bash
docker run -d \
  --name wa-flashlogin \
  -p 3060:3060 \
  -e FLASHLOGIN_SECRET=your-secret-key \
  -e FLASHLOGIN_ADAPTER=webhook \
  -e FLASHLOGIN_WEBHOOK_SECRET=your-webhook-secret \
  -e FLASHLOGIN_BOT_JID=27825651069@s.whatsapp.net \
  wa-flashlogin/server:0.1.0
```

### Build locally

```bash
cd packages/server
docker build -t wa-flashlogin/server:0.1.0 .
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3060` | HTTP server port |
| `FLASHLOGIN_SECRET` | Yes | - | HMAC signing key |
| `FLASHLOGIN_ADAPTER` | No | `webhook` | Adapter type: `baileys`, `webhook`, `meta-cloud`, `mock` |
| `FLASHLOGIN_BOT_JID` | Yes | - | Bot WhatsApp JID (e.g., `27825651069@s.whatsapp.net`) |
| `FLASHLOGIN_TTL_MS` | No | `300000` | Session TTL (5min) |
| `FLASHLOGIN_TOKEN_LENGTH` | No | `8` | Token character length |
| `FLASHLOGIN_MESSAGE_TEMPLATE` | No | `Login {token}` | Message template |
| `FLASHLOGIN_WEBHOOK_SECRET` | Required when `adapter=webhook` | - | Webhook HMAC secret |
| `FLASHLOGIN_META_VERIFY_TOKEN` | Required when `adapter=meta-cloud` | - | Meta verify token |
| `FLASHLOGIN_META_APP_SECRET` | Required when `adapter=meta-cloud` | - | Meta app secret |

### Docker Compose Example

```yaml
version: '3.8'

services:
  flashlogin:
    image: wa-flashlogin/server:0.1.0
    ports:
      - "3060:3060"
    environment:
      FLASHLOGIN_SECRET: ${FLASHLOGIN_SECRET}
      FLASHLOGIN_ADAPTER: webhook
      FLASHLOGIN_WEBHOOK_SECRET: ${WEBHOOK_SECRET}
      FLASHLOGIN_BOT_JID: ${BOT_JID}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3060/health"]
      interval: 30s
      timeout: 5s
      retries: 3
```

See [examples/docker/](../../examples/docker) for more examples.

## API Reference

Full documentation: https://github.com/kobie3717/wa-flashlogin#readme

## License

MIT - Copyright (c) 2026 Kobus Wentzel
