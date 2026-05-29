import { Router } from 'express';
import { createHmac } from 'crypto';
import { WAAdapter } from './types.js';

export interface HttpWebhookAdapterOptions {
  secret: string;
  botJid?: string;
}

export class HttpWebhookAdapter implements WAAdapter {
  private handler: ((msg: { from: string; text: string }) => void) | null = null;
  private secret: string;
  public botJid: string;

  constructor(opts: HttpWebhookAdapterOptions) {
    this.secret = opts.secret;
    this.botJid = opts.botJid || '1234567890@s.whatsapp.net';
  }

  /**
   * Returns an Express router that handles POST / webhook callbacks.
   * Supports both Bearer token OR HMAC signature verification (X-WhatsHub-Signature).
   * Normalizes whatshub webhook payload to { from, text }.
   */
  router(): Router {
    const router = Router();

    router.post('/', (req, res): void => {
      // Verify authentication: Bearer token OR HMAC signature
      const auth = req.headers.authorization;
      const signature = req.headers['x-whatshub-signature'] as string | undefined;

      let authenticated = false;

      // Method 1: Bearer token
      if (auth === `Bearer ${this.secret}`) {
        authenticated = true;
      }

      // Method 2: HMAC signature (whatshub style: X-WhatsHub-Signature: sha256=<hex>)
      if (!authenticated && signature && signature.startsWith('sha256=')) {
        const providedSig = signature.slice(7); // Remove "sha256=" prefix
        const payloadString = JSON.stringify(req.body);
        const computedSig = createHmac('sha256', this.secret)
          .update(payloadString)
          .digest('hex');
        if (providedSig === computedSig) {
          authenticated = true;
        }
      }

      if (!authenticated) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Whatshub webhook payload shape (event: 'message.text'):
      // { event, sessionUserId, from, fromJid, text, body, type, timestamp }
      // Normalize: from = sender phone (strip @s.whatsapp.net suffix if present)
      const rawFrom = (req.body.from || req.body.fromJid || '').toString();
      const from = rawFrom.replace(/@.*$/, ''); // Strip @s.whatsapp.net
      const text = (req.body.text || req.body.body || '').toString();

      if (from && text && this.handler) {
        this.handler({ from, text });
      }

      res.status(200).json({ ok: true });
    });

    return router;
  }

  onMessage(handler: (msg: { from: string; text: string }) => void): () => void {
    this.handler = handler;
    return () => {
      this.handler = null;
    };
  }
}
