import express from 'express';
import { createFlashLogin } from 'wa-flashlogin-server';

class MockAdapter {
  constructor() {
    this.handler = null;
    this.botJid = '1234567890@s.whatsapp.net';
  }

  onMessage(handler) {
    this.handler = handler;
    console.log('[MockAdapter] Message handler registered');
    return () => {
      this.handler = null;
    };
  }

  simulateMessage(from, text) {
    console.log(`[MockAdapter] Simulating message from ${from}: ${text}`);
    if (this.handler) {
      this.handler({ from, text });
    }
  }
}

const adapter = new MockAdapter();

const flash = createFlashLogin({
  adapter,
  secret: process.env.FLASHLOGIN_SECRET || 'demo-secret-change-in-production',
  sessionTtlMs: 5 * 60 * 1000,
  tokenLength: 8,
  messageTemplate: 'Login {token}',
});

flash.on('verified', ({ sessionId, phone }) => {
  console.log(`[Event] Session ${sessionId} verified for phone ${phone}`);
});

flash.on('expired', ({ sessionId, phone }) => {
  console.log(`[Event] Session ${sessionId} expired for phone ${phone}`);
});

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    name: 'wa-flashlogin demo server',
    endpoints: {
      init: 'POST /auth/init',
      stream: 'GET /auth/stream/:sessionId',
      status: 'GET /auth/status/:sessionId',
      simulate: 'POST /simulate (dev only)',
    },
  });
});

app.use('/auth', flash.router());

app.post('/simulate', async (req, res) => {
  const { sessionId, phone } = req.body;

  if (!sessionId || !phone) {
    res.status(400).json({ error: 'sessionId and phone required' });
    return;
  }

  const session = await flash.getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const normalizedPhone = phone.replace(/^\+/, '');
  adapter.simulateMessage(normalizedPhone, `Login ${session.token}`);

  res.json({ ok: true, message: 'Message simulated' });
});

const PORT = process.env.PORT || 3050;

app.listen(PORT, () => {
  console.log(`\nwa-flashlogin demo server running on http://localhost:${PORT}\n`);
  console.log('Try it out:');
  console.log(`  curl -X POST http://localhost:${PORT}/auth/init -H 'Content-Type: application/json' -d '{"phone":"+27825651069"}'\n`);
  console.log('This is a MOCK adapter. To use with real WhatsApp:');
  console.log('  1. Replace MockAdapter with BaileysAdapter');
  console.log('  2. Provide a connected Baileys socket');
  console.log('  3. Set FLASHLOGIN_SECRET environment variable\n');
});
