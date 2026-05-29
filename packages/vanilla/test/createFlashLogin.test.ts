import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFlashLogin } from '../src/createFlashLogin.js';

describe('createFlashLogin', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    global.EventSource = vi.fn() as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with idle status', () => {
    const flash = createFlashLogin({
      apiBase: '/auth',
      phone: '+27825651069',
    });

    expect(flash.getStatus()).toBe('idle');
    expect(flash.getDeeplink()).toBeNull();
    expect(flash.getSessionId()).toBeNull();
  });

  it('should transition to pending on successful init', async () => {
    const mockResponse = {
      sessionId: 'test-session-id',
      deeplink: 'https://wa.me/1234567890?text=Login%20ABCD1234',
      expiresAt: Date.now() + 300000,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const mockEventSource = {
      addEventListener: vi.fn(),
      close: vi.fn(),
      onerror: null,
    };

    (global.EventSource as any).mockImplementation(() => mockEventSource);

    const flash = createFlashLogin({
      apiBase: '/auth',
      phone: '+27825651069',
    });

    const result = await flash.init();

    expect(result.sessionId).toBe('test-session-id');
    expect(result.deeplink).toBe(mockResponse.deeplink);
    expect(flash.getSessionId()).toBe('test-session-id');
    expect(flash.getDeeplink()).toBe(mockResponse.deeplink);
  });

  it('should emit status events', async () => {
    const mockResponse = {
      sessionId: 'test-session-id',
      deeplink: 'https://wa.me/1234567890?text=Login%20ABCD1234',
      expiresAt: Date.now() + 300000,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const mockEventSource = {
      addEventListener: vi.fn(),
      close: vi.fn(),
      onerror: null,
    };

    (global.EventSource as any).mockImplementation(() => mockEventSource);

    const flash = createFlashLogin({
      apiBase: '/auth',
      phone: '+27825651069',
    });

    const statusCallback = vi.fn();
    flash.on('status', statusCallback);

    await flash.init();

    expect(statusCallback).toHaveBeenCalledWith('initializing');
  });

  it('should emit verified event', async () => {
    const mockResponse = {
      sessionId: 'test-session-id',
      deeplink: 'https://wa.me/1234567890?text=Login%20ABCD1234',
      expiresAt: Date.now() + 300000,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    let verifiedCallback: ((event: any) => void) | null = null;

    const mockEventSource = {
      addEventListener: vi.fn((event, callback) => {
        if (event === 'verified') {
          verifiedCallback = callback;
        }
      }),
      close: vi.fn(),
      onerror: null,
    };

    (global.EventSource as any).mockImplementation(() => mockEventSource);

    const flash = createFlashLogin({
      apiBase: '/auth',
      phone: '+27825651069',
    });

    const verifiedHandler = vi.fn();
    flash.on('verified', verifiedHandler);

    await flash.init();

    expect(verifiedCallback).not.toBeNull();

    if (verifiedCallback) {
      verifiedCallback({
        data: JSON.stringify({ phone: '+27825651069' }),
      } as any);
    }

    expect(verifiedHandler).toHaveBeenCalledWith({
      phone: '+27825651069',
    });
  });

  it('should handle init errors', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Invalid phone number' }),
    });

    const flash = createFlashLogin({
      apiBase: '/auth',
      phone: 'invalid',
    });

    const errorHandler = vi.fn();
    flash.on('error', errorHandler);

    await expect(flash.init()).rejects.toThrow('Invalid phone number');
    expect(flash.getStatus()).toBe('error');
    expect(errorHandler).toHaveBeenCalled();
  });

  it('should use polling when pollFallbackMs is set', async () => {
    const mockResponse = {
      sessionId: 'test-session-id',
      deeplink: 'https://wa.me/1234567890?text=Login%20ABCD1234',
      expiresAt: Date.now() + 300000,
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'pending' }),
      });

    const flash = createFlashLogin({
      apiBase: '/auth',
      phone: '+27825651069',
      pollFallbackMs: 1000,
    });

    await flash.init();

    expect(global.EventSource).not.toHaveBeenCalled();
  });

  it('should cleanup resources', async () => {
    const mockResponse = {
      sessionId: 'test-session-id',
      deeplink: 'https://wa.me/1234567890?text=Login%20ABCD1234',
      expiresAt: Date.now() + 300000,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const mockEventSource = {
      addEventListener: vi.fn(),
      close: vi.fn(),
      onerror: null,
    };

    (global.EventSource as any).mockImplementation(() => mockEventSource);

    const flash = createFlashLogin({
      apiBase: '/auth',
      phone: '+27825651069',
    });

    await flash.init();
    flash.cleanup();

    expect(mockEventSource.close).toHaveBeenCalled();
  });

  it('should allow unsubscribing from events', () => {
    const flash = createFlashLogin({
      apiBase: '/auth',
      phone: '+27825651069',
    });

    const handler = vi.fn();
    const unsubscribe = flash.on('status', handler);

    unsubscribe();

    flash.init().catch(() => {});

    expect(handler).not.toHaveBeenCalled();
  });
});
