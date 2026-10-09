# Partner Dashboard — Amar Bank

Prototipe Partner Dashboard (web) untuk Partner (PIC), PRD v3 §F. React 19 + Vite, Amar Bank Internal Web DS (`design-system/`).

```bash
npm install
npm run dev      # mode demo: DevToolbar + akun contoh
npm test         # vitest
npm run lint     # oxlint
npm run build
```

- Login asli lewat Supabase `sp-mobile-login` (platform `partner-web-access`); `VITE_LOGIN_MODE=mock` untuk akun contoh tanpa jaringan. Lihat `.env.example`.
- Akun contoh (password `Demo1234`): `rudi.jaya@gmail.com` (Jaya Abadi Cellular), `lina.galaxy@gmail.com`, `hendra.medan@gmail.com`, `sri.bintang@gmail.com`.
- Preset layar: `/?preset=<nama>` (lihat `src/dev/presets.js`).
- Aturan kerja repo: `CLAUDE.md`. Dokumentasi alur: OKF `products/sales_dashboard/flows_web/partner_dashboard.md`.
