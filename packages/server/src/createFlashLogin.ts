import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type {
  FlashLoginOptions,
  Session,
  InitResponse,
  FlashLoginEvents,
  SessionStore,
} from './types.js';
import { generateToken } from './token.js';
import { MemorySessionStore } from './session-store.js';
import { createRouter } from './router.js';

type EventHandler<T> = (data: T) => void;

export interface FlashLogin {
  init(phone: string): Promise<InitResponse>;
  getSession(sessionId: string): Promise<Session | null>;
  on<K extends keyof FlashLoginEvents>(
    event: K,
    handler: EventHandler<FlashLoginEvents[K]>
  ): () => void;
  router(): Router;
  options: FlashLoginOptions;
}

export function createFlashLogin(options: FlashLoginOptions): FlashLogin {
  const {
    adapter,
    secret,
    sessionTtlMs = 5 * 60 * 1000,
    tokenLength = 8,
    messageTemplate = 'Login {token}',
  } = options;

  if (!secret) {
    throw new Error('secret is required');
  }

  const store: SessionStore = new MemorySessionStore();
  const eventHandlers: {
    verified: Set<EventHandler<FlashLoginEvents['verified']>>;
    expired: Set<EventHandler<FlashLoginEvents['expired']>>;
  } = {
    verified: new Set(),
    expired: new Set(),
  };

  const emit = <K extends keyof FlashLoginEvents>(event: K, data: FlashLoginEvents[K]) => {
    const handlers = eventHandlers[event];
    for (const handler of handlers) {
      handler(data);
    }
  };

  const stripBotJidSuffix = (jid: string): string => {
    return jid.replace(/@s\.whatsapp\.net$/, '');
  };

  const botPhone = (() => {
    if ('botJid' in adapter) {
      return stripBotJidSuffix((adapter as { botJid: string }).botJid);
    }
    return '1234567890';
  })();

  adapter.onMessage(async ({ from, text }) => {
    const normalizedFrom = from.replace(/^(\+)/, '');

    const match = text.match(/login\s+([A-Z2-7]+)/i);
    if (!match) return;

    const token = match[1].toUpperCase();
    const session = await store.getByToken(token);

    if (!session) return;

    const sessionPhone = session.phone.replace(/^\+/, '');
    if (sessionPhone !== normalizedFrom) {
      return;
    }

    if (session.status !== 'pending') return;

    if (Date.now() > session.expiresAt) {
      await store.update(session.sessionId, { status: 'expired' });
      emit('expired', { sessionId: session.sessionId, phone: session.phone });
      return;
    }

    await store.update(session.sessionId, { status: 'verified' });
    emit('verified', { sessionId: session.sessionId, phone: session.phone });
  });

  setInterval(async () => {
    await store.cleanup();
  }, 60000);

  const flashLogin: FlashLogin = {
    async init(phone: string): Promise<InitResponse> {
      const sessionId = uuidv4();
      const token = generateToken(tokenLength);
      const now = Date.now();
      const expiresAt = now + sessionTtlMs;

      const session: Session = {
        sessionId,
        phone,
        token,
        status: 'pending',
        createdAt: now,
        expiresAt,
      };

      await store.create(session);

      const message = messageTemplate.replace('{token}', token);
      const deeplink = `https://wa.me/${botPhone}?text=${encodeURIComponent(message)}`;

      return {
        sessionId,
        deeplink,
        expiresAt,
      };
    },

    async getSession(sessionId: string): Promise<Session | null> {
      return store.get(sessionId);
    },

    on<K extends keyof FlashLoginEvents>(
      event: K,
      handler: EventHandler<FlashLoginEvents[K]>
    ): () => void {
      eventHandlers[event].add(handler as EventHandler<FlashLoginEvents[typeof event]>);
      return () => {
        eventHandlers[event].delete(handler as EventHandler<FlashLoginEvents[typeof event]>);
      };
    },

    router(): Router {
      return createRouter(flashLogin);
    },

    options,
  };

  return flashLogin;
}
