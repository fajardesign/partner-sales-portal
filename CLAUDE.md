# Partner Sales Portal (Partner Dashboard)

Partner Dashboard web untuk **Partner (PIC)** Amar Bank — realm role `PARTNER`, platform `partner-web-access`,
feature PARTNER_SALES_DASHBOARD, PARTNER_COMMISSION, PARTNER_PROFILE (lihat saja), TRANSACTION_INQUIRY, DOCUMENT_REPOSITORY.
Cakupan data: partner & toko milik sesi saja. Sumber: PRD v3 §F + revisi stakeholder di knowledge bundle.

## Design system (wajib)
Semua UI di repo ini **harus** memakai Amar Bank Internal Web DS di `design-system/`
(salinan dari `admin-sales-portal/design-system/`, asal claude.ai/design project `806d634a-7101-4e84-b95e-12a21aee38bd`).

- Baca knowledge bundle `/Users/amarbank/Documents/okf_repository_design/products/sales_dashboard/design_system/` (overview, foundations, components, layout_patterns, content_guidelines) sebelum membuat/mengubah halaman; props ada di `design-system/COMPONENTS.md`.
- Import komponen dari `design-system/index.js` (alias `@ds`), dan `design-system/styles.core.css` sekali di entry app (`styles.css` hanya bila memakai set Figma-generated).
- Jangan membuat ulang komponen yang sudah ada (Button, TextInput, Select, Table, Modal, Drawer, Sidebar, PageHeader, …).
- Tanpa hardcode hex/px/font — pakai token `var(--…)`. Copy UI dalam Bahasa Indonesia, tanpa emoji.
- Layout acuan: `design-system/ui_kits/bisnis-web/` (Sidebar 272px + PageHeader + konten pad 32).
- Jangan edit isi `design-system/` untuk kebutuhan satu halaman; itu salinan library. Perubahan DS dilakukan di sumbernya
  lalu disalin ulang apa adanya. `COMPONENTS.md` dan `index.js` di-generate dari `.d.ts` — regenerate bila komponen berubah.
- Skill `/amar-bank-design` memuat panduan yang sama.

## Data & autentikasi
- Login: email atau nomor telepon + password lewat Supabase Edge Function `sp-mobile-login` dengan `platform: "partner-web-access"`
  (`src/api/auth.js`). Role selain PARTNER ditolak (Akses ditolak). Tidak ada pendaftaran; lupa password = "Hubungi Admin".
- Aktivasi & reset password akun PIC tetap di `admin-sales-portal` (`#/activate`); akun PIC dibuat otomatis saat partner Active.
- **Hanya kunci publik (publishable key) yang boleh ada di kode.** Jangan pernah menaruh service role key atau
  `VITE_SP_SYNC_KEY` di repo ini (termasuk `.env*`, tes, dan workflow).
- Data partner (penjualan, transaksi/pinjaman, komisi, dokumen, toko) memakai mock API in-memory: `src/api/db.js` adalah
  **salinan persis** `admin-sales-portal/src/api/db.js` (+ `src/lib/constants.js`) agar seed PRNG dan `partner_id`
  (`REG2026-0xxx`) sama dengan Admin portal dan tabel `app_user` Supabase. Jangan mengubah urutan/isi seed di sini;
  bila seed admin berubah, salin ulang. Akses data hanya lewat `src/api/mockApi.js`, selalu difilter `partnerId` sesi.
- `VITE_LOGIN_MODE=mock` = login ke akun contoh di memori (tes selalu mock).

## Knowledge bundle (wajib dirawat)
Base knowledge proyek ada di `/Users/amarbank/Documents/okf_repository_design` (repo OKF).
Produk untuk repo ini: **`sales_dashboard`** → `/Users/amarbank/Documents/okf_repository_design/products/sales_dashboard/`.
Ikuti aturan di `/Users/amarbank/Documents/okf_repository_design/CLAUDE.md`. Setiap kali mengimpor desain, membangun/mengubah halaman, atau memutuskan aturan bisnis:
- Alur layar Partner Dashboard → `flows_web/partner_dashboard.md` (UX Flow, epic `PDB`); role & permission → `roles_matrix.md`;
  overview & navigasi → `index.md` / `flows_web/index.md`; design system → `design_system/`.
- Pakai frontmatter dan konvensi isi sesuai `/Users/amarbank/Documents/okf_repository_design/CLAUDE.md` (UX Flow: `type`, `title`, `platform`, `Role`, `epic_code`, plus `screen_id`/`code`/`updated` bila ada); copy UI ditulis persis.
- Daftarkan file flow baru di `index.md` folder-nya, dan catat setiap perubahan di `products/sales_dashboard/log.md`.
- Path kode dari repo ini ditulis dengan prefix `partner-sales-portal/` (contoh `partner-sales-portal/src/pages/Login.jsx`).
- Hal yang belum ditetapkan PRD tampil sebagai callout kuning "[TBD: …]" (`TbdCallout`) dan dicatat di Pertanyaan Terbuka.

## Verifikasi
Setelah setiap tahap: `npm run lint`, `npm test`, `npm run build`.

## Sinkronisasi ke Figma (wajib approval)
Setiap perubahan atau penambahan (kode, desain, layar, komponen) **tidak boleh langsung di-generate atau ditulis ke Figma**.
- Selesaikan dan verifikasi perubahan di repo dulu, lalu **tanya dan tunggu approval eksplisit dari user** sebelum menulis ke Figma
  (capture `generate_figma_design`, `use_figma` yang mengubah canvas, membuat frame/section/komponen/variable).
- Approval berlaku untuk satu permintaan itu saja; perubahan berikutnya perlu approval baru.
- Membaca Figma (metadata, screenshot, variable, design context) untuk audit atau referensi boleh tanpa approval.

## Git & merge
- Selama task belum selesai, kerjakan di branch fitur dan **jangan langsung push/buat PR/merge ke GitHub**.
- Push, buka PR, atau merge ke `main` hanya bila user memintanya secara eksplisit.
- Repo GitHub: `fajardesign/partner-sales-portal`; deploy GitHub Pages (`.github/workflows/deploy-pages.yml`, base `/partner-sales-portal/`, `VITE_DEMO=true`) berjalan saat push ke `main`.
