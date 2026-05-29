# wa-flashlogin-react

React SDK for WhatsApp-native passwordless authentication.

## Installation

```bash
pnpm add wa-flashlogin-react
# or
npm install wa-flashlogin-react
```

## Quick Start

### Using the Hook

```tsx
import { useFlashLogin } from 'wa-flashlogin-react';

function LoginPage() {
  const { init, status, deeplink, error } = useFlashLogin({
    apiBase: '/auth',
    phone: '+27825651069',
  });

  return (
    <div>
      <button onClick={init} disabled={status === 'initializing'}>
        {status === 'idle' && 'Login with WhatsApp'}
        {status === 'initializing' && 'Initializing...'}
        {status === 'pending' && 'Check WhatsApp'}
        {status === 'verified' && 'Verified!'}
      </button>
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}
```

### Using the Button Component

```tsx
import { FlashLoginButton } from 'wa-flashlogin-react';

function LoginPage() {
  return (
    <FlashLoginButton
      apiBase="/auth"
      phone="+27825651069"
      onVerified={(payload) => {
        console.log('Verified:', payload.phone);
        router.push('/dashboard');
      }}
      onError={(err) => console.error(err)}
      label="Continue with WhatsApp"
      qrFallback
    />
  );
}
```

## API Reference

### `useFlashLogin(options)`

Hook for managing flash login state.

Options:
- `apiBase` (string) - Base URL for the flash login API
- `phone` (string) - Phone number in E.164 format
- `autoInit` (boolean) - Auto-initialize on mount (default: false)
- `pollFallbackMs` (number) - Polling interval if SSE is blocked (optional)

Returns:
- `status` - Current status (`idle`, `initializing`, `pending`, `verified`, `expired`, `error`)
- `deeplink` - WhatsApp deeplink URL
- `sessionId` - Session ID
- `expiresAt` - Expiry timestamp
- `error` - Error object if any
- `init()` - Function to initialize auth

### `FlashLoginButton`

Pre-built button component with auto-init.

Props:
- `apiBase` (string) - Base URL for the flash login API
- `phone` (string) - Phone number in E.164 format
- `onVerified` (function) - Callback on successful verification
- `onError` (function) - Callback on error
- `label` (string) - Button text (default: "Continue with WhatsApp")
- `className` (string) - Custom CSS class
- `qrFallback` (boolean) - Show QR code on desktop (default: false)

### `QRCode`

Lazy-loaded QR code component (requires `qrcode` optional dependency).

Props:
- `value` (string) - URL to encode
- `size` (number) - Size in pixels (default: 256)

## License

MIT - Copyright (c) 2026 Kobus Wentzel
