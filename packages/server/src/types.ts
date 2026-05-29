export type SessionStatus = 'pending' | 'verified' | 'expired';

export interface Session {
  sessionId: string;
  phone: string;
  token: string;
  status: SessionStatus;
  createdAt: number;
  expiresAt: number;
}

export interface FlashLoginOptions {
  adapter: WAAdapter;
  secret: string;
  sessionTtlMs?: number;
  tokenLength?: number;
  messageTemplate?: string;
  rateLimit?: {
    windowMs?: number;
    maxRequests?: number;
  };
}

export interface WAAdapter {
  onMessage(handler: (msg: { from: string; text: string }) => void): () => void;
}

export interface InitResponse {
  sessionId: string;
  deeplink: string;
  expiresAt: number;
}

export interface StatusResponse {
  status: SessionStatus;
  phone?: string;
}

export type FlashLoginEvents = {
  verified: { sessionId: string; phone: string };
  expired: { sessionId: string; phone: string };
};

export interface SessionStore {
  create(session: Session): Promise<void>;
  get(sessionId: string): Promise<Session | null>;
  getByToken(token: string): Promise<Session | null>;
  update(sessionId: string, updates: Partial<Session>): Promise<void>;
  delete(sessionId: string): Promise<void>;
  cleanup(): Promise<void>;
}
