export type FlashLoginStatus =
  | 'idle'
  | 'initializing'
  | 'pending'
  | 'verified'
  | 'expired'
  | 'error';

export interface UseFlashLoginOptions {
  apiBase: string;
  phone: string;
  autoInit?: boolean;
  pollFallbackMs?: number;
}

export interface UseFlashLoginReturn {
  deeplink: string | null;
  status: FlashLoginStatus;
  error: Error | null;
  sessionId: string | null;
  expiresAt: number | null;
  init: () => Promise<void>;
}

export interface FlashLoginButtonProps {
  apiBase: string;
  phone: string;
  onVerified?: (payload: { phone: string }) => void;
  onError?: (error: Error) => void;
  label?: string;
  className?: string;
  qrFallback?: boolean;
}
