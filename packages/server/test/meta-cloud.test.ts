import { describe, it, expect, vi } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import { createHmac } from 'crypto';
import { MetaCloudAdapter } from '../src/adapters/meta-cloud.js';

describe('MetaCloudAdapter', () => {
  const verifyToken = 'test-verify-token';
  const appSecret = 'test-app-secret';
  const botJid = '27825651069';

  const createApp = (): Express => {
    const adapter = new MetaCloudAdapter({
      verifyToken,
      appSecret,
      botJid,
    });
    const app = express();
    app.use('/webhook', adapter.router());
    return app;
  };

  const createSignedPayload = (payload: any): { body: string; signature: string } => {
    const body = JSON.stringify(payload);
    const signature = 'sha256=' + createHmac('sha256', appSecret).update(body).digest('hex');
    return { body, signature };
  };

  it('should verify GET webhook with correct token', async () => {
    const app = createApp();
    const response = await request(app)
      .get('/webhook')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': verifyToken,
        'hub.challenge': 'test-challenge-123',
      });

    expect(response.status).toBe(200);
    expect(response.text).toBe('test-challenge-123');
  });

  it('should reject GET verification with wrong token', async () => {
    const app = createApp();
    const response = await request(app)
      .get('/webhook')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong-token',
        'hub.challenge': 'test-challenge-123',
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Verification failed');
  });

  it('should reject GET verification with missing challenge', async () => {
    const app = createApp();
    const response = await request(app)
      .get('/webhook')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': verifyToken,
      });

    expect(response.status).toBe(403);
  });

  it('should accept POST message with valid signature', async () => {
    const adapter = new MetaCloudAdapter({ verifyToken, appSecret, botJid });
    const handler = vi.fn();
    adapter.onMessage(handler);

    const app = express();
    app.use('/webhook', adapter.router());

    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WABA_ID',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '27825651069', phone_number_id: 'PHONE_ID' },
                contacts: [{ profile: { name: 'Parent' }, wa_id: '27821234567' }],
                messages: [
                  {
                    from: '27821234567',
                    id: 'wamid.XYZ',
                    timestamp: '1234567890',
                    text: { body: 'Login ABC123' },
                    type: 'text',
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const { body, signature } = createSignedPayload(payload);

    const response = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', signature)
      .send(body);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledWith({
      from: '+27821234567',
      text: 'Login ABC123',
    });
  });

  it('should reject POST with invalid signature', async () => {
    const app = createApp();
    const payload = {
      object: 'whatsapp_business_account',
      entry: [],
    };

    const response = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', 'sha256=invalid-signature')
      .send(JSON.stringify(payload));

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Signature mismatch');
  });

  it('should reject POST with missing signature', async () => {
    const app = createApp();
    const payload = { object: 'whatsapp_business_account', entry: [] };

    const response = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(payload));

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Missing or invalid signature');
  });

  it('should handle multiple messages in one webhook', async () => {
    const adapter = new MetaCloudAdapter({ verifyToken, appSecret, botJid });
    const handler = vi.fn();
    adapter.onMessage(handler);

    const app = express();
    app.use('/webhook', adapter.router());

    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                messages: [
                  {
                    from: '27821111111',
                    text: { body: 'Login AAA111' },
                    type: 'text',
                  },
                  {
                    from: '27822222222',
                    text: { body: 'Login BBB222' },
                    type: 'text',
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const { body, signature } = createSignedPayload(payload);

    const response = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', signature)
      .send(body);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenNthCalledWith(1, {
      from: '+27821111111',
      text: 'Login AAA111',
    });
    expect(handler).toHaveBeenNthCalledWith(2, {
      from: '+27822222222',
      text: 'Login BBB222',
    });
  });

  it('should ignore non-text messages', async () => {
    const adapter = new MetaCloudAdapter({ verifyToken, appSecret, botJid });
    const handler = vi.fn();
    adapter.onMessage(handler);

    const app = express();
    app.use('/webhook', adapter.router());

    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                messages: [
                  {
                    from: '27821234567',
                    type: 'image',
                    image: { id: 'IMG123' },
                  },
                  {
                    from: '27821234567',
                    text: { body: 'Login XYZ789' },
                    type: 'text',
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const { body, signature } = createSignedPayload(payload);

    const response = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', signature)
      .send(body);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      from: '+27821234567',
      text: 'Login XYZ789',
    });
  });

  it('should handle empty entry gracefully', async () => {
    const adapter = new MetaCloudAdapter({ verifyToken, appSecret, botJid });
    const handler = vi.fn();
    adapter.onMessage(handler);

    const app = express();
    app.use('/webhook', adapter.router());

    const payload = {
      object: 'whatsapp_business_account',
      entry: [],
    };

    const { body, signature } = createSignedPayload(payload);

    const response = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', signature)
      .send(body);

    expect(response.status).toBe(200);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should normalize phone numbers with + prefix', async () => {
    const adapter = new MetaCloudAdapter({ verifyToken, appSecret, botJid });
    const handler = vi.fn();
    adapter.onMessage(handler);

    const app = express();
    app.use('/webhook', adapter.router());

    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                messages: [
                  {
                    from: '+27821234567', // Already has +
                    text: { body: 'Test 1' },
                    type: 'text',
                  },
                  {
                    from: '27829876543', // No +
                    text: { body: 'Test 2' },
                    type: 'text',
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const { body, signature } = createSignedPayload(payload);

    await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', signature)
      .send(body);

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenNthCalledWith(1, {
      from: '+27821234567',
      text: 'Test 1',
    });
    expect(handler).toHaveBeenNthCalledWith(2, {
      from: '+27829876543',
      text: 'Test 2',
    });
  });
});
