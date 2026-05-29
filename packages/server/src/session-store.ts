import { Session, SessionStore } from './types.js';

export class MemorySessionStore implements SessionStore {
  private sessions = new Map<string, Session>();
  private tokenIndex = new Map<string, string>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanup();
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      void this.cleanup();
    }, 60000);

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  async create(session: Session): Promise<void> {
    this.sessions.set(session.sessionId, session);
    this.tokenIndex.set(session.token, session.sessionId);
  }

  async get(sessionId: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      await this.delete(sessionId);
      return null;
    }

    return session;
  }

  async getByToken(token: string): Promise<Session | null> {
    const sessionId = this.tokenIndex.get(token);
    if (!sessionId) return null;
    return this.get(sessionId);
  }

  async update(sessionId: string, updates: Partial<Session>): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    Object.assign(session, updates);
    this.sessions.set(sessionId, session);
  }

  async delete(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.tokenIndex.delete(session.token);
    }
    this.sessions.delete(sessionId);
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    const expiredIds: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        expiredIds.push(sessionId);
      }
    }

    for (const sessionId of expiredIds) {
      await this.delete(sessionId);
    }
  }

  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
