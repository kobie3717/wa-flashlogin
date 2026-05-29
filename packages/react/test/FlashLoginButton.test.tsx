import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FlashLoginButton } from '../src/FlashLoginButton.js';

describe('FlashLoginButton', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    global.EventSource = vi.fn() as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render with default label', () => {
    render(<FlashLoginButton apiBase="/auth" phone="+27825651069" />);

    expect(screen.getByText('Continue with WhatsApp')).toBeDefined();
  });

  it('should render with custom label', () => {
    render(
      <FlashLoginButton
        apiBase="/auth"
        phone="+27825651069"
        label="Login with WhatsApp"
      />
    );

    expect(screen.getByText('Login with WhatsApp')).toBeDefined();
  });

  it('should initialize on click', async () => {
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

    render(<FlashLoginButton apiBase="/auth" phone="+27825651069" />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/auth/init',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ phone: '+27825651069' }),
        })
      );
    });
  });

  it('should call onVerified when status becomes verified', async () => {
    const onVerified = vi.fn();

    const mockResponse = {
      sessionId: 'test-session-id',
      deeplink: 'https://wa.me/1234567890?text=Login%20ABCD1234',
      expiresAt: Date.now() + 300000,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    let verifiedCallback: (() => void) | null = null;

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

    render(
      <FlashLoginButton
        apiBase="/auth"
        phone="+27825651069"
        onVerified={onVerified}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(verifiedCallback).not.toBeNull();
    });

    if (verifiedCallback) {
      verifiedCallback();
    }

    await waitFor(() => {
      expect(onVerified).toHaveBeenCalledWith({ phone: '+27825651069' });
    });
  });

  it('should call onError when error occurs', async () => {
    const onError = vi.fn();

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Invalid phone number' }),
    });

    render(
      <FlashLoginButton
        apiBase="/auth"
        phone="invalid"
        onError={onError}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid phone number'),
        })
      );
    });
  });

  it('should apply custom className', () => {
    render(
      <FlashLoginButton
        apiBase="/auth"
        phone="+27825651069"
        className="custom-class"
      />
    );

    const button = screen.getByRole('button');
    expect(button.className).toBe('custom-class');
  });
});
