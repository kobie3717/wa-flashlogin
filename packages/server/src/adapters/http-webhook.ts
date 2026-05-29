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

      // Whatshub webhook payload shape:
      //   { event, timestamp, data: { from, phone, fromName, chatJid, text, ... } }
      // Or simpler test payload: { from, text }
      // Prefer `data.phone` (E.164 digits, no '+'), fall back to JID stripping.
      const data = (req.body && req.body.data) ? req.body.data : req.body;
      const phone = (data?.phone || '').toString();
      const rawFrom = (data?.from || data?.fromJid || '').toString();

      let normalizedFrom = '';
      if (phone) {
        // whatshub's phone is digits-only (e.g. "27825651069"); add E.164 '+'
        normalizedFrom = phone.startsWith('+') ? phone : `+${phone}`;
      } else if (rawFrom.endsWith('@s.whatsapp.net')) {
        // Phone JID: strip suffix → digits → prefix '+'
        const digits = rawFrom.replace('@s.whatsapp.net', '');
        normalizedFrom = digits.startsWith('+') ? digits : `+${digits}`;
      } else if (rawFrom.endsWith('@lid')) {
        // LID with no resolved phone — pass through raw so caller can decide;
        // session.phone matching will likely fail until LID→phone map is wired.
        normalizedFrom = rawFrom;
      } else {
        // Plain phone string or unknown JID — strip any JID suffix,
        // prepend '+' if it looks like a phone (digits-only).
        const stripped = rawFrom.replace(/@.*$/, '');
        if (/^\d+$/.test(stripped)) {
          normalizedFrom = `+${stripped}`;
        } else {
          normalizedFrom = stripped;
        }
      }

      const text = (data?.text || data?.body || '').toString();

      if (normalizedFrom && text && this.handler) {
        this.handler({ from: normalizedFrom, text });
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
