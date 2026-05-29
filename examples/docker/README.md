# Docker Examples

Run wa-flashlogin-server as a Docker container.

## Quickstart

### Build the image

```bash
cd ../../packages/server
docker build -t wa-flashlogin/server:0.1.0 .
```

### Run with webhook adapter

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

### Run with Meta Cloud API adapter

```bash
docker run -d \
  --name wa-flashlogin-meta \
  -p 3060:3060 \
  -e FLASHLOGIN_SECRET=your-secret-key \
  -e FLASHLOGIN_ADAPTER=meta-cloud \
  -e FLASHLOGIN_META_VERIFY_TOKEN=your-verify-token \
  -e FLASHLOGIN_META_APP_SECRET=your-app-secret \
  -e FLASHLOGIN_BOT_JID=27825651069 \
  wa-flashlogin/server:0.1.0
```

## Docker Compose

Create a `.env` file:

```env
FLASHLOGIN_SECRET=your-secret-key
WEBHOOK_SECRET=your-webhook-secret
BOT_JID=27825651069@s.whatsapp.net

# For Meta Cloud API
META_VERIFY_TOKEN=your-verify-token
META_APP_SECRET=your-app-secret
BOT_PHONE_NUMBER=27825651069
```

Run:

```bash
docker-compose up -d flashlogin-webhook
# or
docker-compose up -d flashlogin-meta
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3060` | HTTP server port |
| `FLASHLOGIN_SECRET` | Yes | - | HMAC signing key |
| `FLASHLOGIN_ADAPTER` | No | `webhook` | Adapter type: `webhook`, `meta-cloud`, `mock` |
| `FLASHLOGIN_BOT_JID` | Yes | - | Bot WhatsApp JID |
| `FLASHLOGIN_TTL_MS` | No | `300000` | Session TTL (5min) |
| `FLASHLOGIN_TOKEN_LENGTH` | No | `8` | Token length |
| `FLASHLOGIN_MESSAGE_TEMPLATE` | No | `Login {token}` | Message template |
| `FLASHLOGIN_WEBHOOK_SECRET` | Required when `adapter=webhook` | - | Webhook HMAC secret |
| `FLASHLOGIN_META_VERIFY_TOKEN` | Required when `adapter=meta-cloud` | - | Meta verify token |
| `FLASHLOGIN_META_APP_SECRET` | Required when `adapter=meta-cloud` | - | Meta app secret |

## Endpoints

- `GET /health` - Health check
- `POST /auth/init` - Initialize auth session
- `GET /auth/stream/:id` - SSE stream for status
- `GET /auth/status/:id` - Polling fallback
- `POST /webhook` - Webhook receiver (when adapter=webhook)
- `GET|POST /meta-webhook` - Meta webhook receiver (when adapter=meta-cloud)

## Health Check

```bash
curl http://localhost:3060/health
# {"status":"ok"}
```
