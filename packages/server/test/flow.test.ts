import { describe, it, expect, beforeEach } from 'vitest';
import { createFlashLogin } from '../src/createFlashLogin.js';
import type { WAAdapter } from '../src/types.js';

class MockAdapter implements WAAdapter {
  private handler: ((msg: { from: string; text: string }) => void) | null = null;

  onMessage(handler: (msg: { from: string; text: string }) => void): () => void {
    this.handler = handler;
    return () => {
      this.handler = null;
    };
  }

  simulateMessage(from: string, text: string): void {
    if (this.handler) {
      this.handler({ from, text });
    }
  }
}

describe('FlashLogin flow', () => {
  let adapter: MockAdapter;
  let flash: ReturnType<typeof createFlashLogin>;

  beforeEach(() => {
    adapter = new MockAdapter();
    flash = createFlashLogin({
      adapter,
      secret: 'test-secret',
      sessionTtlMs: 60000,
      tokenLength: 8,
    });
  });

  it('should create session with init', async () => {
    const result = await flash.init('+27825651069');

    expect(result.sessionId).toBeDefined();
    expect(result.deeplink).toContain('wa.me');
    expect(result.deeplink).toContain('Login');
    expect(result.expiresAt).toBeGreaterThan(Date.now());

    const session = await flash.getSession(result.sessionId);
    expect(session).toBeDefined();
    expect(session?.status).toBe('pending');
    expect(session?.phone).toBe('+27825651069');
  });

  it('should verify session when correct message received', async () => {
    const result = await flash.init('+27825651069');
    const session = await flash.getSession(result.sessionId);
    expect(session).toBeDefined();

    const verifiedPromise = new Promise((resolve) => {
      flash.on('verified', resolve);
    });

    adapter.simulateMessage('27825651069', `Login ${session!.token}`);

    const verifiedEvent = await verifiedPromise;
    expect(verifiedEvent).toEqual({
      sessionId: result.sessionId,
      phone: '+27825651069',
    });

    const updatedSession = await flash.getSession(result.sessionId);
    expect(updatedSession?.status).toBe('verified');
  });

  it('should ignore message from wrong phone number', async () => {
    const result = await flash.init('+27825651069');
    const session = await flash.getSession(result.sessionId);

    let verified = false;
    flash.on('verified', () => {
      verified = true;
    });

    adapter.simulateMessage('27111111111', `Login ${session!.token}`);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(verified).toBe(false);

    const updatedSession = await flash.getSession(result.sessionId);
    expect(updatedSession?.status).toBe('pending');
  });

  it('should ignore message with wrong token', async () => {
    await flash.init('+27825651069');

    let verified = false;
    flash.on('verified', () => {
      verified = true;
    });

    adapter.simulateMessage('27825651069', 'Login WRONGTOK');

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(verified).toBe(false);
  });

  it('should ignore message with wrong format', async () => {
    const result = await flash.init('+27825651069');
    const session = await flash.getSession(result.sessionId);

    let verified = false;
    flash.on('verified', () => {
      verified = true;
    });

    adapter.simulateMessage('27825651069', `Hello ${session!.token}`);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(verified).toBe(false);
  });

  it('should handle case-insensitive login prefix', async () => {
    const result = await flash.init('+27825651069');
    const session = await flash.getSession(result.sessionId);

    const verifiedPromise = new Promise((resolve) => {
      flash.on('verified', resolve);
    });

    adapter.simulateMessage('27825651069', `login ${session!.token}`);

    await verifiedPromise;

    const updatedSession = await flash.getSession(result.sessionId);
    expect(updatedSession?.status).toBe('verified');
  });

  it('should allow unsubscribe from events', async () => {
    let callCount = 0;
    const unsubscribe = flash.on('verified', () => {
      callCount++;
    });

    const result = await flash.init('+27825651069');
    const session = await flash.getSession(result.sessionId);

    adapter.simulateMessage('27825651069', `Login ${session!.token}`);
    await new Promise((resolve) => setTimeout(resolve, 50));

    unsubscribe();

    const result2 = await flash.init('+27111111111');
    const session2 = await flash.getSession(result2.sessionId);
    adapter.simulateMessage('27111111111', `Login ${session2!.token}`);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(callCount).toBe(1);
  });

  it('should normalize phone numbers correctly', async () => {
    const result = await flash.init('+27825651069');
    const session = await flash.getSession(result.sessionId);

    const verifiedPromise = new Promise((resolve) => {
      flash.on('verified', resolve);
    });

    adapter.simulateMessage('27825651069', `Login ${session!.token}`);

    await verifiedPromise;

    const updatedSession = await flash.getSession(result.sessionId);
    expect(updatedSession?.status).toBe('verified');
  });
});
