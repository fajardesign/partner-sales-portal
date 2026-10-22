/**
 * Menu & rute Partner Dashboard per feature access role (PRD Scope 1 §1.6, platform partner-web-access; PRD Scope 3 §3.4).
 * Menu tampil bila sesi memiliki feature-nya; rute yang dibuka langsung tanpa feature → "Akses ditolak" di dalam shell.
 *
 * Scope 1 = Beranda Partner, Profil, Dokumen. Scope 3 (PRD 3.0) = Insentif (volume), Pinjaman, Rekening; Penjualan dilebur
 * ke Beranda dan Pinjaman. Rute lama /komisi, /transaksi, /penjualan dialihkan (ALIASES).
 */
export const SCOPE3_MENUS = true;

const NAV = [
  { title: 'Utama', items: [
    { label: 'Beranda Partner', value: '/beranda', icon: 'Dashboard3Line', feature: 'PARTNER_PROFILE' },
    { label: 'Insentif', value: '/insentif', icon: 'HandCoinLine', feature: 'PARTNER_COMMISSION', scope3: true },
    { label: 'Pinjaman', value: '/pinjaman', icon: 'FileList2Line', feature: 'TRANSACTION_INQUIRY', scope3: true },
  ] },
  { title: 'Partner', items: [
    { label: 'Rekening', value: '/rekening', icon: 'BankLine', feature: 'PARTNER_PROFILE', scope3: true },
    { label: 'Profil', value: '/profil', icon: 'Building2Line', feature: 'PARTNER_PROFILE' },
    { label: 'Dokumen', value: '/dokumen', icon: 'FolderLine', feature: 'DOCUMENT_REPOSITORY' },
  ] },
];
/** Rute lama Scope 3 sebelum PRD 3.0 → rute baru. */
export const ALIASES = { '/komisi': '/insentif', '/transaksi': '/pinjaman', '/penjualan': '/beranda' };

const enabled = (i) => SCOPE3_MENUS || !i.scope3;

/** Section sidebar yang terlihat untuk sesi. */
export function navFor(session) {
  const f = session?.features ?? [];
  return NAV.map((s) => ({ ...s, items: s.items.filter((i) => enabled(i) && f.includes(i.feature)) })).filter((s) => s.items.length);
}

/** Item menu untuk rute (null = rute tidak dikenal atau disembunyikan sampai Scope 3). */
export const navItem = (path) => NAV.flatMap((s) => s.items).find((i) => i.value === path && enabled(i)) ?? null;
/** Feature yang dibutuhkan rute (null = rute tidak dikenal). */
export const featureForPath = (path) => navItem(path)?.feature ?? null;

/** Halaman pertama = menu pertama yang terlihat (Beranda Partner). */
export const homeFor = (session) => navFor(session)[0]?.items[0]?.value ?? '/login';
