/**
 * Menu & rute Partner Dashboard per feature access role (PRD Scope 1 §1.6, platform partner-web-access).
 * Menu tampil bila sesi memiliki feature-nya; rute yang dibuka langsung tanpa feature → "Akses ditolak" di dalam shell.
 *
 * Scope 1 = Beranda Partner, Profil, Dokumen. Item bertanda `scope3` (Penjualan, Transaksi, Komisi) disembunyikan sampai
 * Scope 3: selama SCOPE3_MENUS = false rutenya dianggap tidak dikenal (diarahkan ke Beranda Partner). Halamannya tetap disimpan.
 */
export const SCOPE3_MENUS = false;

const NAV = [
  { title: 'Utama', items: [
    { label: 'Beranda Partner', value: '/beranda', icon: 'Dashboard3Line', feature: 'PARTNER_PROFILE' },
    { label: 'Penjualan', value: '/penjualan', icon: 'LineChartLine', feature: 'PARTNER_SALES_DASHBOARD', scope3: true },
    { label: 'Transaksi', value: '/transaksi', icon: 'FileList2Line', feature: 'TRANSACTION_INQUIRY', scope3: true },
    { label: 'Komisi', value: '/komisi', icon: 'HandCoinLine', feature: 'PARTNER_COMMISSION', scope3: true },
  ] },
  { title: 'Partner', items: [
    { label: 'Profil', value: '/profil', icon: 'Building2Line', feature: 'PARTNER_PROFILE' },
    { label: 'Dokumen', value: '/dokumen', icon: 'FolderLine', feature: 'DOCUMENT_REPOSITORY' },
  ] },
];

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
