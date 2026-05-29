import { Router, Request, Response } from 'express';
import { createHmac } from 'crypto';
import { WAAdapter } from './types.js';

export interface MetaCloudAdapterOptions {
  verifyToken: string;
  appSecret: string;
  botJid: string;
}

/**
 * Meta WhatsApp Cloud API adapter.
 *
 * Handles:
 * - GET webhook verification (hub.mode=subscribe&hub.verify_token=X&hub.challenge=Y)
 * - POST incoming messages with X-Hub-Signature-256 HMAC verification
 *
 * CRITICAL: Signature verification requires raw request body.
 * The router handles raw body parsing internally - do NOT use express.json() before mounting.
 */
export class MetaCloudAdapter implements WAAdapter {
  private handler: ((msg: { from: string; text: string }) => void) | null = null;
  private verifyToken: string;
  private appSecret: string;
  public botJid: string;

  constructor(opts: MetaCloudAdapterOptions) {
    this.verifyToken = opts.verifyToken;
    this.appSecret = opts.appSecret;
    this.botJid = opts.botJid;
  }

  /**
   * Returns an Express router that handles both GET (verification) and POST (messages).
   *
   * GET: Meta sends hub.mode=subscribe&hub.verify_token=XXX&hub.challenge=YYY
   *      Must echo back challenge if verify_token matches.
   *
   * POST: Meta sends webhook payload with X-Hub-Signature-256 header.
   *       Must verify HMAC signature before processing.
   */
  router(): Router {
    const router = Router();

    // GET: Webhook verification
    router.get('/', (req: Request, res: Response): void => {
      const mode = req.query['hub.mode'] as string | undefined;
      const token = req.query['hub.verify_token'] as string | undefined;
      const challenge = req.query['hub.challenge'] as string | undefined;

      if (mode === 'subscribe' && token === this.verifyToken && challenge) {
        // Verification success - echo back challenge
        res.status(200).send(challenge);
        return;
      }

      // Verification failed
      res.status(403).json({ error: 'Verification failed' });
    });

    // POST: Incoming messages - use raw middleware for signature verification
    router.post(
      '/',
      Router().use(
        // Parse raw body for signature verification, then convert to JSON
        (req: Request, res: Response, next) => {
          let data = '';
          req.setEncoding('utf8');
          req.on('data', (chunk) => {
            data += chunk;
          });
          req.on('end', () => {
            (req as any).rawBody = data;
            try {
              req.body = JSON.parse(data);
              next();
            } catch (err) {
              res.status(400).json({ error: 'Invalid JSON' });
            }
          });
        }
      ),
      (req: Request, res: Response): void => {
        // Verify X-Hub-Signature-256: sha256=<hex-hmac>
        const signature = req.headers['x-hub-signature-256'] as string | undefined;
        if (!signature || !signature.startsWith('sha256=')) {
          res.status(401).json({ error: 'Missing or invalid signature' });
          return;
        }

        const providedSig = signature.slice(7); // Remove "sha256=" prefix
        const rawBody = (req as any).rawBody as string;
        const computedSig = createHmac('sha256', this.appSecret)
          .update(rawBody)
          .digest('hex');

        if (providedSig !== computedSig) {
          res.status(401).json({ error: 'Signature mismatch' });
          return;
        }

        // Parse Meta webhook payload
        // Shape: { object: "whatsapp_business_account", entry: [{ changes: [{ value: { messages: [...] } }] }] }
        const payload = req.body;
        if (!payload?.entry?.length) {
          res.status(200).json({ ok: true });
          return;
        }

        for (const entry of payload.entry) {
          const changes = entry.changes || [];
          for (const change of changes) {
            if (change.field !== 'messages') continue;

            const value = change.value || {};
            const messages = value.messages || [];

            for (const msg of messages) {
              if (msg.type !== 'text') continue; // Ignore non-text messages

              const from = msg.from; // E.164 phone number (e.g., "27825651069")
              const text = msg.text?.body;

              if (from && text && this.handler) {
                // Normalize to E.164 with '+' prefix
                const normalizedFrom = from.startsWith('+') ? from : `+${from}`;
                this.handler({ from: normalizedFrom, text });
              }
            }
          }
        }

        res.status(200).json({ ok: true });
      }
    );

    return router;
  }

  onMessage(handler: (msg: { from: string; text: string }) => void): () => void {
    this.handler = handler;
    return () => {
      this.handler = null;
    };
  }
}
