# Day 2 Plan - Client SDKs

## React SDK (`packages/react`)

### Public API
```tsx
import { FlashLoginProvider, useFlashLogin } from 'wa-flashlogin-react';

// Provider
<FlashLoginProvider apiUrl="http://localhost:3050/auth">
  <App />
</FlashLoginProvider>

// Hook
const { init, status, deeplink, error, reset } = useFlashLogin();

// Usage
const handleLogin = async () => {
  const result = await init('+27825651069');
  // Opens deeplink in new tab
  // SSE stream auto-connects
  // status updates: 'idle' → 'pending' → 'verified'
};
```

### Components
- `FlashLoginButton` - One-click init + deeplink
- `FlashLoginModal` - Full UI with QR code + deeplink
- `PhoneInput` - Validated phone number input

### Files
```
packages/react/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── FlashLoginProvider.tsx
│   ├── useFlashLogin.ts
│   ├── FlashLoginButton.tsx
│   ├── FlashLoginModal.tsx
│   ├── PhoneInput.tsx
│   └── utils/sse.ts
└── test/
    └── useFlashLogin.test.tsx
```

## Vanilla JS SDK (`packages/js`)

### Public API
```js
import { FlashLogin } from 'wa-flashlogin';

const flash = new FlashLogin({
  apiUrl: 'http://localhost:3050/auth',
  onVerified: (phone) => console.log('Verified:', phone),
  onExpired: () => console.log('Expired'),
});

const { sessionId, deeplink } = await flash.init('+27825651069');
// Auto-opens deeplink
// Auto-connects SSE
```

### Browser-native
- No React/Vue/etc. dependency
- Works with vanilla HTML/JS
- UMD bundle for `<script>` tag
- ESM for modern bundlers

### Files
```
packages/js/
├── package.json
├── tsconfig.json
├── rollup.config.js (UMD + ESM)
├── src/
│   ├── index.ts
│   ├── FlashLogin.ts
│   └── sse.ts
└── test/
    └── FlashLogin.test.ts
```

## QR Code Fallback

For desktop users (WA Desktop doesn't support wa.me links well):

```tsx
import { QRCodeCanvas } from 'qrcode.react';

<QRCodeCanvas value={deeplink} />
```

Show QR code alongside deeplink button:
- Mobile: Click deeplink → opens WhatsApp
- Desktop: Scan QR with phone → opens WhatsApp

## Example Apps

### React Example
```
examples/react-app/
├── package.json
├── vite.config.ts
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx
    └── LoginPage.tsx
```

### Vanilla Example
```
examples/vanilla-app/
├── index.html
├── style.css
└── app.js
```

## Testing Strategy

### React Tests (vitest + @testing-library/react)
- Hook state transitions
- SSE connection lifecycle
- Error handling
- Provider context

### JS Tests (vitest)
- Class instantiation
- Event emitters
- SSE reconnection
- Timeout handling

## Build Pipeline

### React
```json
{
  "build": "tsc && vite build",
  "dev": "vite build --watch"
}
```

### Vanilla JS
```json
{
  "build": "rollup -c",
  "dev": "rollup -c --watch"
}
```

## Documentation Additions

### README updates
- Add React quickstart
- Add vanilla JS quickstart
- Add framework comparison table
- Add QR code section

### New docs
- `docs/react-api.md` - Full React API reference
- `docs/vanilla-api.md` - Full vanilla JS API reference
- `docs/styling.md` - CSS customization guide
- `docs/examples.md` - Code snippets

## NPM Packages (when ready)

1. `wa-flashlogin-server` - Server SDK
2. `wa-flashlogin-react` - React SDK
3. `wa-flashlogin` - Vanilla JS SDK (main package)

## Estimated Effort

- React SDK: 3-4 hours (provider, hook, components, tests)
- Vanilla JS SDK: 2-3 hours (class, SSE, UMD build, tests)
- Examples: 1-2 hours (React app, vanilla app)
- Documentation: 1 hour (API docs, guides)
- Testing: 1 hour (integration tests, manual QA)

Total: ~8-11 hours

## Dependencies

### React package
```json
{
  "peerDependencies": {
    "react": "^18.0.0"
  },
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@types/react": "^18.0.0",
    "vite": "^5.0.0"
  }
}
```

### Vanilla package
```json
{
  "devDependencies": {
    "rollup": "^4.0.0",
    "@rollup/plugin-typescript": "^11.0.0",
    "@rollup/plugin-node-resolve": "^15.0.0"
  }
}
```

## Open Questions

1. **Auto-open deeplink?** Default to window.open() or require user click?
2. **QR code library?** Bundle or peer dependency?
3. **CSS framework?** Headless (bring your own styles) or include default theme?
4. **Retry logic?** Auto-retry on SSE disconnect or manual only?
5. **Analytics?** Built-in event tracking or leave to user?

## Success Criteria

- [ ] React SDK works in Next.js, Vite, CRA
- [ ] Vanilla SDK works in CodePen, JSFiddle
- [ ] QR code displays correctly on desktop
- [ ] SSE reconnects on network loss
- [ ] Full TypeScript types exported
- [ ] Examples run with `pnpm install && pnpm dev`
- [ ] README updated with client quickstarts
- [ ] All tests pass
