# Changelog

## 0.1.0 — 2026-05-29

### Added
- Initial public release of `wa-flashlogin-server`, `wa-flashlogin-react`, `wa-flashlogin-vanilla`
- Baileys adapter, MockAdapter, HttpWebhookAdapter, MetaCloudAdapter
- React hook (`useFlashLogin`) and components (`FlashLoginButton`, `QRCode`)
- Vanilla JS factory (`createFlashLogin`, `mountButton`)
- REST/SSE endpoints: `/init`, `/stream/:id`, `/status/:id`
- Live demo: https://flashlogin.whatshubb.co.za

### Tested in production
- rugby-portal parent login (since 2026-05-29)
