import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFlashLogin } from '../src/useFlashLogin.js';

describe('useFlashLogin', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    global.EventSource = vi.fn() as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with idle status', () => {
    const { result } = renderHook(() =>
      useFlashLogin({
        apiBase: '/auth',
        phone: '+27825651069',
      })
    );

    expect(result.current.status).toBe('idle');
    expect(result.current.deeplink).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.sessionId).toBeNull();
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

    const { result } = renderHook(() =>
      useFlashLogin({
        apiBase: '/auth',
        phone: '+27825651069',
      })
    );

    await result.current.init();

    await waitFor(() => {
      expect(result.current.sessionId).toBe('test-session-id');
      expect(result.current.deeplink).toBe(mockResponse.deeplink);
    });

    expect(mockEventSource.addEventListener).toHaveBeenCalledWith(
      'pending',
      expect.any(Function)
    );
  });

  it('should handle init errors', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Invalid phone number' }),
    });

    const { result } = renderHook(() =>
      useFlashLogin({
        apiBase: '/auth',
        phone: 'invalid',
      })
    );

    await result.current.init();

    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(result.current.error?.message).toContain('Invalid phone number');
    });
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

    const { result } = renderHook(() =>
      useFlashLogin({
        apiBase: '/auth',
        phone: '+27825651069',
        pollFallbackMs: 1000,
      })
    );

    await result.current.init();

    await waitFor(() => {
      expect(result.current.sessionId).toBe('test-session-id');
    });

    expect(global.EventSource).not.toHaveBeenCalled();
  });

  it('should cleanup on unmount', async () => {
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

    const { result, unmount } = renderHook(() =>
      useFlashLogin({
        apiBase: '/auth',
        phone: '+27825651069',
      })
    );

    await result.current.init();

    unmount();

    expect(mockEventSource.close).toHaveBeenCalled();
  });

  it('should auto-init when autoInit is true', async () => {
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

    const { result } = renderHook(() =>
      useFlashLogin({
        apiBase: '/auth',
        phone: '+27825651069',
        autoInit: true,
      })
    );

    await waitFor(() => {
      expect(result.current.sessionId).toBe('test-session-id');
    });
  });
});
