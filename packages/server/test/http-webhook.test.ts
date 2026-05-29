import { describe, it, expect, vi } from 'vitest';
import { createHmac } from 'crypto';
import express, { Request, Response } from 'express';
import { HttpWebhookAdapter } from '../src/adapters/http-webhook.js';

describe('HttpWebhookAdapter', () => {
  it('should reject requests without authorization header', async () => {
    const adapter = new HttpWebhookAdapter({ secret: 'test-secret' });
    const router = adapter.router();

    const req = {
      method: 'POST',
      path: '/',
      headers: {},
      body: { from: '+27825651069', text: 'Login ABCD1234' },
    } as Partial<Request>;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as Partial<Response>;
    const next = vi.fn();

    // Execute the POST handler directly
    const postHandler = (router.stack || []).find((layer: any) => layer.route?.methods.post);
    if (postHandler) {
      await postHandler.route.stack[0].handle(req as Request, res as Response, next);
    }

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('should reject requests with invalid bearer token', async () => {
    const adapter = new HttpWebhookAdapter({ secret: 'test-secret' });
    const router = adapter.router();

    const req = {
      method: 'POST',
      path: '/',
      headers: { authorization: 'Bearer wrong-secret' },
      body: { from: '+27825651069', text: 'Login ABCD1234' },
    } as Partial<Request>;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as Partial<Response>;
    const next = vi.fn();

    const postHandler = (router.stack || []).find((layer: any) => layer.route?.methods.post);
    if (postHandler) {
      await postHandler.route.stack[0].handle(req as Request, res as Response, next);
    }

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should normalize from field by stripping @s.whatsapp.net suffix', async () => {
    const adapter = new HttpWebhookAdapter({ secret: 'test-secret' });
    const handler = vi.fn();
    adapter.onMessage(handler);

    const router = adapter.router();
    const req = {
      method: 'POST',
      path: '/',
      headers: { authorization: 'Bearer test-secret' },
      body: { from: '27825651069@s.whatsapp.net', text: 'Login ABCD1234' },
    } as Partial<Request>;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as Partial<Response>;
    const next = vi.fn();

    const postHandler = (router.stack || []).find((layer: any) => layer.route?.methods.post);
    if (postHandler) {
      await postHandler.route.stack[0].handle(req as Request, res as Response, next);
    }

    expect(handler).toHaveBeenCalledWith({
      from: '+27825651069',
      text: 'Login ABCD1234',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('should handle fromJid field as fallback', async () => {
    const adapter = new HttpWebhookAdapter({ secret: 'test-secret' });
    const handler = vi.fn();
    adapter.onMessage(handler);

    const router = adapter.router();
    const req = {
      method: 'POST',
      path: '/',
      headers: { authorization: 'Bearer test-secret' },
      body: { fromJid: '+27825651069@s.whatsapp.net', body: 'Login ABCD1234' },
    } as Partial<Request>;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as Partial<Response>;
    const next = vi.fn();

    const postHandler = (router.stack || []).find((layer: any) => layer.route?.methods.post);
    if (postHandler) {
      await postHandler.route.stack[0].handle(req as Request, res as Response, next);
    }

    expect(handler).toHaveBeenCalledWith({
      from: '+27825651069',
      text: 'Login ABCD1234',
    });
  });

  it('should handle body field as fallback for text', async () => {
    const adapter = new HttpWebhookAdapter({ secret: 'test-secret' });
    const handler = vi.fn();
    adapter.onMessage(handler);

    const router = adapter.router();
    const req = {
      method: 'POST',
      path: '/',
      headers: { authorization: 'Bearer test-secret' },
      body: { from: '27825651069', body: 'Login ABCD1234' },
    } as Partial<Request>;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as Partial<Response>;
    const next = vi.fn();

    const postHandler = (router.stack || []).find((layer: any) => layer.route?.methods.post);
    if (postHandler) {
      await postHandler.route.stack[0].handle(req as Request, res as Response, next);
    }

    expect(handler).toHaveBeenCalledWith({
      from: '+27825651069',
      text: 'Login ABCD1234',
    });
  });

  it('should not call handler if no from or text is present', async () => {
    const adapter = new HttpWebhookAdapter({ secret: 'test-secret' });
    const handler = vi.fn();
    adapter.onMessage(handler);

    const router = adapter.router();
    const req = {
      method: 'POST',
      path: '/',
      headers: { authorization: 'Bearer test-secret' },
      body: {},
    } as Partial<Request>;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as Partial<Response>;
    const next = vi.fn();

    const postHandler = (router.stack || []).find((layer: any) => layer.route?.methods.post);
    if (postHandler) {
      await postHandler.route.stack[0].handle(req as Request, res as Response, next);
    }

    expect(handler).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200); // Still returns 200
  });

  it('should allow unsubscribing from message handler', async () => {
    const adapter = new HttpWebhookAdapter({ secret: 'test-secret' });
    const handler = vi.fn();
    const unsubscribe = adapter.onMessage(handler);

    unsubscribe();

    const router = adapter.router();
    const req = {
      method: 'POST',
      path: '/',
      headers: { authorization: 'Bearer test-secret' },
      body: { from: '27825651069', text: 'Login ABCD1234' },
    } as Partial<Request>;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as Partial<Response>;
    const next = vi.fn();

    const postHandler = (router.stack || []).find((layer: any) => layer.route?.methods.post);
    if (postHandler) {
      await postHandler.route.stack[0].handle(req as Request, res as Response, next);
    }

    expect(handler).not.toHaveBeenCalled();
  });

  it('should accept HMAC signature via X-WhatsHub-Signature header', async () => {
    const adapter = new HttpWebhookAdapter({ secret: 'test-secret' });
    const handler = vi.fn();
    adapter.onMessage(handler);

    const router = adapter.router();
    const body = { from: '27825651069@s.whatsapp.net', text: 'Login ABCD1234' };
    const signature = createHmac('sha256', 'test-secret')
      .update(JSON.stringify(body))
      .digest('hex');

    const req = {
      method: 'POST',
      path: '/',
      headers: { 'x-whatshub-signature': `sha256=${signature}` },
      body,
    } as Partial<Request>;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as Partial<Response>;
    const next = vi.fn();

    const postHandler = (router.stack || []).find((layer: any) => layer.route?.methods.post);
    if (postHandler) {
      await postHandler.route.stack[0].handle(req as Request, res as Response, next);
    }

    expect(handler).toHaveBeenCalledWith({
      from: '+27825651069',
      text: 'Login ABCD1234',
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should reject invalid HMAC signature', async () => {
    const adapter = new HttpWebhookAdapter({ secret: 'test-secret' });
    const handler = vi.fn();
    adapter.onMessage(handler);

    const router = adapter.router();
    const req = {
      method: 'POST',
      path: '/',
      headers: { 'x-whatshub-signature': 'sha256=invalid' },
      body: { from: '27825651069', text: 'Login ABCD1234' },
    } as Partial<Request>;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as Partial<Response>;
    const next = vi.fn();

    const postHandler = (router.stack || []).find((layer: any) => layer.route?.methods.post);
    if (postHandler) {
      await postHandler.route.stack[0].handle(req as Request, res as Response, next);
    }

    expect(handler).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
