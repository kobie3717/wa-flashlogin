import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemorySessionStore } from '../src/session-store.js';
import type { Session } from '../src/types.js';

describe('MemorySessionStore', () => {
  let store: MemorySessionStore;

  beforeEach(() => {
    store = new MemorySessionStore();
  });

  afterEach(() => {
    store.stop();
  });

  const createTestSession = (overrides: Partial<Session> = {}): Session => ({
    sessionId: 'session-123',
    phone: '+27825651069',
    token: 'ABCD1234',
    status: 'pending',
    createdAt: Date.now(),
    expiresAt: Date.now() + 60000,
    ...overrides,
  });

  describe('create and get', () => {
    it('should store and retrieve session', async () => {
      const session = createTestSession();
      await store.create(session);

      const retrieved = await store.get(session.sessionId);
      expect(retrieved).toEqual(session);
    });

    it('should return null for non-existent session', async () => {
      const retrieved = await store.get('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('getByToken', () => {
    it('should retrieve session by token', async () => {
      const session = createTestSession();
      await store.create(session);

      const retrieved = await store.getByToken(session.token);
      expect(retrieved).toEqual(session);
    });

    it('should return null for non-existent token', async () => {
      const retrieved = await store.getByToken('INVALID');
      expect(retrieved).toBeNull();
    });
  });

  describe('update', () => {
    it('should update session status', async () => {
      const session = createTestSession();
      await store.create(session);

      await store.update(session.sessionId, { status: 'verified' });

      const retrieved = await store.get(session.sessionId);
      expect(retrieved?.status).toBe('verified');
    });

    it('should handle updates to non-existent session', async () => {
      await expect(
        store.update('non-existent', { status: 'verified' })
      ).resolves.toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should delete session', async () => {
      const session = createTestSession();
      await store.create(session);

      await store.delete(session.sessionId);

      const retrieved = await store.get(session.sessionId);
      expect(retrieved).toBeNull();
    });

    it('should remove token index', async () => {
      const session = createTestSession();
      await store.create(session);

      await store.delete(session.sessionId);

      const retrieved = await store.getByToken(session.token);
      expect(retrieved).toBeNull();
    });
  });

  describe('TTL and cleanup', () => {
    it('should return null for expired session', async () => {
      const session = createTestSession({
        expiresAt: Date.now() - 1000,
      });
      await store.create(session);

      const retrieved = await store.get(session.sessionId);
      expect(retrieved).toBeNull();
    });

    it('should cleanup expired sessions', async () => {
      const expiredSession = createTestSession({
        sessionId: 'expired',
        expiresAt: Date.now() - 1000,
      });
      const validSession = createTestSession({
        sessionId: 'valid',
        expiresAt: Date.now() + 60000,
      });

      await store.create(expiredSession);
      await store.create(validSession);

      await store.cleanup();

      const expired = await store.get(expiredSession.sessionId);
      const valid = await store.get(validSession.sessionId);

      expect(expired).toBeNull();
      expect(valid).toEqual(validSession);
    });
  });
});
