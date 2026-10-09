/**
 * Menu & rute Partner Dashboard per feature access role (PRD v3 §F, platform partner-web-access).
 * Menu tampil bila sesi memiliki feature-nya; rute yang dibuka langsung tanpa feature → "Akses ditolak" di dalam shell.
 */
const NAV = [
  { title: 'Utama', items: [
    { label: 'Beranda', value: '/beranda', icon: 'Dashboard3Line', feature: 'PARTNER_SALES_DASHBOARD' },
    { label: 'Transaksi', value: '/transaksi', icon: 'FileList2Line', feature: 'TRANSACTION_INQUIRY' },
    { label: 'Komisi', value: '/komisi', icon: 'HandCoinLine', feature: 'PARTNER_COMMISSION' },
  ] },
  { title: 'Partner', items: [
    { label: 'Profil', value: '/profil', icon: 'Building2Line', feature: 'PARTNER_PROFILE' },
    { label: 'Dokumen', value: '/dokumen', icon: 'FolderLine', feature: 'DOCUMENT_REPOSITORY' },
  ] },
];

/** Section sidebar yang terlihat untuk sesi. */
export function navFor(session) {
  const f = session?.features ?? [];
  return NAV.map((s) => ({ ...s, items: s.items.filter((i) => f.includes(i.feature)) })).filter((s) => s.items.length);
}

/** Item menu untuk rute (null = rute tidak dikenal). */
export const navItem = (path) => NAV.flatMap((s) => s.items).find((i) => i.value === path) ?? null;
/** Feature yang dibutuhkan rute (null = rute tidak dikenal). */
export const featureForPath = (path) => navItem(path)?.feature ?? null;

/** Halaman pertama = menu pertama yang terlihat (Beranda Partner). */
export const homeFor = (session) => navFor(session)[0]?.items[0]?.value ?? '/login';
