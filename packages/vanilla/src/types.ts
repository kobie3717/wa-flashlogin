export type FlashLoginStatus =
  | 'idle'
  | 'initializing'
  | 'pending'
  | 'verified'
  | 'expired'
  | 'error';

export type FlashLoginEvent =
  | 'status'
  | 'verified'
  | 'expired'
  | 'error'
  | 'deeplink';

export interface FlashLoginOptions {
  apiBase: string;
  phone: string;
  pollFallbackMs?: number;
}

export interface InitResponse {
  sessionId: string;
  deeplink: string;
  expiresAt: number;
}

export interface MountButtonOptions {
  label?: string;
  qrFallback?: boolean;
}
