# wa-flashlogin-vanilla

Vanilla JavaScript SDK for WhatsApp-native passwordless authentication. Zero framework dependencies.

## Installation

```bash
pnpm add wa-flashlogin-vanilla
# or
npm install wa-flashlogin-vanilla
```

Or use from CDN:

```html
<script src="https://unpkg.com/wa-flashlogin-vanilla"></script>
<script>
  const flash = WAFlashLogin.createFlashLogin({
    apiBase: '/auth',
    phone: '+27825651069',
  });
</script>
```

## Quick Start

### Basic Usage

```js
import { createFlashLogin } from 'wa-flashlogin-vanilla';

const flash = createFlashLogin({
  apiBase: '/auth',
  phone: '+27825651069',
});

flash.on('status', (status) => {
  console.log('Status:', status);
});

flash.on('verified', ({ phone }) => {
  console.log('Verified:', phone);
  location.href = '/dashboard';
});

flash.on('error', (error) => {
  console.error('Error:', error);
});

const { deeplink, sessionId } = await flash.init();
console.log('Open WhatsApp:', deeplink);
```

### Mount Button to DOM

```js
const flash = createFlashLogin({
  apiBase: '/auth',
  phone: '+27825651069',
});

flash.mountButton(document.querySelector('#login-btn'), {
  label: 'Login with WhatsApp',
  qrFallback: true, // Show QR code on desktop
});

flash.on('verified', ({ phone }) => {
  location.href = '/dashboard';
});
```

### HTML Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>Login with WhatsApp</title>
</head>
<body>
  <div id="login-container"></div>

  <script type="module">
    import { createFlashLogin } from 'https://unpkg.com/wa-flashlogin-vanilla';

    const flash = createFlashLogin({
      apiBase: 'http://localhost:3050/auth',
      phone: '+27825651069',
    });

    flash.mountButton(document.querySelector('#login-container'), {
      label: 'Continue with WhatsApp',
      qrFallback: true,
    });

    flash.on('verified', ({ phone }) => {
      alert('Verified: ' + phone);
    });
  </script>
</body>
</html>
```

## API Reference

### `createFlashLogin(options)`

Create a new flash login instance.

Options:
- `apiBase` (string) - Base URL for the flash login API
- `phone` (string) - Phone number in E.164 format
- `pollFallbackMs` (number) - Polling interval if SSE is blocked (optional)

Returns an object with:
- `init()` - Initialize auth session (returns `{ sessionId, deeplink, expiresAt }`)
- `mountButton(element, options)` - Mount pre-built button to DOM element
- `on(event, handler)` - Subscribe to events (returns unsubscribe function)
- `off(event, handler)` - Unsubscribe from events
- `cleanup()` - Clean up resources (close SSE, stop polling)
- `getStatus()` - Get current status
- `getSessionId()` - Get session ID
- `getDeeplink()` - Get deeplink URL
- `getExpiresAt()` - Get expiry timestamp

### Events

- `status` - Status changed (`idle`, `initializing`, `pending`, `verified`, `expired`, `error`)
- `verified` - User verified (payload: `{ phone }`)
- `expired` - Session expired
- `error` - Error occurred (payload: `Error`)
- `deeplink` - Deeplink generated (payload: `{ deeplink }`)

### `mountButton(element, options)`

Mount a pre-built button with auto-init and state management.

Options:
- `label` (string) - Button text (default: "Continue with WhatsApp")
- `qrFallback` (boolean) - Show QR code on desktop (default: false)

## License

MIT - Copyright (c) 2026 Kobus Wentzel
