import { Router, Request, Response } from 'express';
import type { FlashLogin } from './createFlashLogin.js';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function createRouter(flashLogin: FlashLogin): Router {
  const router = Router();
  const rateLimitMap = new Map<string, RateLimitEntry>();

  router.use((_req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  const checkRateLimit = (key: string): boolean => {
    const now = Date.now();
    const entry = rateLimitMap.get(key);

    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(key, {
        count: 1,
        resetAt: now + (flashLogin.options.rateLimit?.windowMs || 30000),
      });
      return true;
    }

    if (entry.count >= (flashLogin.options.rateLimit?.maxRequests || 1)) {
      return false;
    }

    entry.count++;
    return true;
  };

  router.post('/init', async (req: Request, res: Response) => {
    try {
      const { phone } = req.body;

      if (!phone || typeof phone !== 'string') {
        res.status(400).json({ error: 'Phone number is required' });
        return;
      }

      const normalizedPhone = normalizePhone(phone);
      if (!isValidPhone(normalizedPhone)) {
        res.status(400).json({ error: 'Invalid phone number format' });
        return;
      }

      const rateLimitKey = `${req.ip}:${normalizedPhone}`;
      if (!checkRateLimit(rateLimitKey)) {
        res.status(429).json({ error: 'Rate limit exceeded' });
        return;
      }

      const result = await flashLogin.init(normalizedPhone);
      res.json(result);
    } catch (error) {
      console.error('Init error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/stream/:sessionId', async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    const session = await flashLogin.getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    if (session.status !== 'pending') {
      sendEvent(session.status, { phone: session.phone });
      res.end();
      return;
    }

    sendEvent('pending', {});

    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 25000);

    const unsubscribeVerified = flashLogin.on('verified', (event) => {
      if (event.sessionId === sessionId) {
        sendEvent('verified', { phone: event.phone });
        cleanup();
      }
    });

    const unsubscribeExpired = flashLogin.on('expired', (event) => {
      if (event.sessionId === sessionId) {
        sendEvent('expired', {});
        cleanup();
      }
    });

    const cleanup = () => {
      clearInterval(heartbeat);
      unsubscribeVerified();
      unsubscribeExpired();
      res.end();
    };

    req.on('close', cleanup);

    const checkExpiry = setInterval(async () => {
      const currentSession = await flashLogin.getSession(sessionId);
      if (!currentSession || currentSession.status !== 'pending') {
        cleanup();
        clearInterval(checkExpiry);
      }
    }, 5000);

    req.on('close', () => clearInterval(checkExpiry));
  });

  router.get('/status/:sessionId', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      const session = await flashLogin.getSession(sessionId);
      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      res.json({
        status: session.status,
        phone: session.status === 'verified' ? session.phone : undefined,
      });
    } catch (error) {
      console.error('Status error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

function normalizePhone(phone: string): string {
  let normalized = phone.trim().replace(/\s+/g, '');
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }
  return normalized;
}

function isValidPhone(phone: string): boolean {
  return /^\+\d{8,15}$/.test(phone);
}
