#!/bin/sh
set -e

# Environment variables with defaults
PORT="${PORT:-3060}"
FLASHLOGIN_SECRET="${FLASHLOGIN_SECRET:?FLASHLOGIN_SECRET is required}"
FLASHLOGIN_ADAPTER="${FLASHLOGIN_ADAPTER:-webhook}"
FLASHLOGIN_BOT_JID="${FLASHLOGIN_BOT_JID:?FLASHLOGIN_BOT_JID is required}"
FLASHLOGIN_TTL_MS="${FLASHLOGIN_TTL_MS:-300000}"
FLASHLOGIN_TOKEN_LENGTH="${FLASHLOGIN_TOKEN_LENGTH:-8}"
FLASHLOGIN_MESSAGE_TEMPLATE="${FLASHLOGIN_MESSAGE_TEMPLATE:-Login {token}}"

# Create server script
cat > /app/server.mjs << 'EOF'
import express from 'express';
import { createFlashLogin, HttpWebhookAdapter, MetaCloudAdapter } from './dist/index.js';

const PORT = parseInt(process.env.PORT || '3060', 10);
const adapter = process.env.FLASHLOGIN_ADAPTER || 'webhook';

let waAdapter;

if (adapter === 'webhook') {
  const secret = process.env.FLASHLOGIN_WEBHOOK_SECRET;
  if (!secret) {
    console.error('FLASHLOGIN_WEBHOOK_SECRET is required when adapter=webhook');
    process.exit(1);
  }
  waAdapter = new HttpWebhookAdapter({
    secret,
    botJid: process.env.FLASHLOGIN_BOT_JID,
  });
  console.log('[docker-entrypoint] Using HttpWebhookAdapter');
} else if (adapter === 'meta-cloud') {
  const verifyToken = process.env.FLASHLOGIN_META_VERIFY_TOKEN;
  const appSecret = process.env.FLASHLOGIN_META_APP_SECRET;
  if (!verifyToken || !appSecret) {
    console.error('FLASHLOGIN_META_VERIFY_TOKEN and FLASHLOGIN_META_APP_SECRET required when adapter=meta-cloud');
    process.exit(1);
  }
  waAdapter = new MetaCloudAdapter({
    verifyToken,
    appSecret,
    botJid: process.env.FLASHLOGIN_BOT_JID,
  });
  console.log('[docker-entrypoint] Using MetaCloudAdapter');
} else if (adapter === 'mock') {
  // Mock adapter for testing - not shipped in dist, so we'll create a minimal one
  waAdapter = {
    onMessage: () => () => {},
    botJid: process.env.FLASHLOGIN_BOT_JID,
  };
  console.log('[docker-entrypoint] Using MockAdapter (no real messages)');
} else {
  console.error(`Unknown adapter: ${adapter}. Supported: webhook, meta-cloud, mock`);
  process.exit(1);
}

const flash = createFlashLogin({
  adapter: waAdapter,
  secret: process.env.FLASHLOGIN_SECRET,
  sessionTtlMs: parseInt(process.env.FLASHLOGIN_TTL_MS || '300000', 10),
  tokenLength: parseInt(process.env.FLASHLOGIN_TOKEN_LENGTH || '8', 10),
  messageTemplate: process.env.FLASHLOGIN_MESSAGE_TEMPLATE || 'Login {token}',
});

flash.on('verified', ({ sessionId, phone }) => {
  console.log(`[flash] Verified: session=${sessionId} phone=${phone}`);
});

flash.on('expired', ({ sessionId, phone }) => {
  console.log(`[flash] Expired: session=${sessionId} phone=${phone}`);
});

const app = express();

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Mount flash endpoints
app.use('/auth', flash.router());

// Mount webhook receiver if using HttpWebhookAdapter or MetaCloudAdapter
if (adapter === 'webhook') {
  app.use('/webhook', waAdapter.router());
  console.log('[docker-entrypoint] Webhook receiver mounted at /webhook');
} else if (adapter === 'meta-cloud') {
  app.use('/meta-webhook', waAdapter.router());
  console.log('[docker-entrypoint] Meta webhook receiver mounted at /meta-webhook');
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[docker-entrypoint] wa-flashlogin-server listening on http://0.0.0.0:${PORT}`);
  console.log(`[docker-entrypoint] Adapter: ${adapter}`);
  console.log(`[docker-entrypoint] Health: GET /health`);
  console.log(`[docker-entrypoint] Auth:   POST /auth/init, GET /auth/stream/:id, GET /auth/status/:id`);
});
EOF

# Run the server
exec node /app/server.mjs
