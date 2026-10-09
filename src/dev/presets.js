import { DEMO } from '../lib/env.js';
import { setScenario } from './scenario.js';
import { SCOPE3_MENUS } from '../lib/nav.js';

/**
 * Preset state layar untuk dokumentasi/capture (hanya mode demo).
 * Buka `/?preset=<nama>` — rute, sesi, skenario mock, dan state awal komponen langsung terisi; DevToolbar disembunyikan.
 * session = handle akun PIC (bagian email sebelum "@"); denied = akun bukan Partner yang ditolak.
 * scope3 = layar yang disembunyikan sampai Scope 3 (hanya aktif bila SCOPE3_MENUS = true).
 */
const PIC = 'rudi.jaya';
export const PRESETS = {
  'login': { name: 'PDB-01 | Login', route: '/login' },
  'login-error': { name: 'PDB-01 | Login | Error | Wrong Credential', route: '/login', login: { loginId: `${PIC}@gmail.com`, error: 'Email/nomor telepon atau password salah. Silakan coba lagi.' } },
  'login-locked': { name: 'PDB-01 | Login | Error | Locked', route: '/login', login: { loginId: `${PIC}@gmail.com`, error: 'Akun terkunci sementara. Coba lagi dalam 15 menit.' } },
  'denied': { name: 'PDB-02 | Access Denied', route: '/denied', denied: { loginId: 'rina.saraswati@amarbank.co.id', role: 'REVIEWER' } },
  'login-outage': { name: 'PDB-03 | Login | Outage', route: '/login', login: { outage: true } },
  'login-session-expired': { name: 'PDB-01 | Login | Session Expired', route: '/login', login: { notice: { status: 'information', title: 'Sesi Anda berakhir karena tidak ada aktivitas. Silakan masuk lagi.' } } },
  'login-partner-inactive': { name: 'PDB-01 | Login | Partner Inactive', route: '/login', login: { notice: { status: 'error', title: 'Akun Anda tidak aktif. Hubungi Admin.' } } },
  'forbidden': { name: 'PDB-04 | Access Denied | Page', route: '/dokumen', session: PIC, features: ['PARTNER_SALES_DASHBOARD', 'TRANSACTION_INQUIRY', 'PARTNER_COMMISSION', 'PARTNER_PROFILE'] },
  'beranda': { name: 'PDB-05 | Partner Home', route: '/beranda', session: PIC },
  'beranda-loading': { name: 'PDB-05 | Partner Home | Loading', route: '/beranda', session: PIC, scenario: { tableState: 'loading' } },
  'beranda-error': { name: 'PDB-05 | Partner Home | Error', route: '/beranda', session: PIC, scenario: { tableState: 'error' } },
  'penjualan': { name: 'Scope 3 | Sales', route: '/penjualan', session: PIC, scope3: true },
  'penjualan-single-store': { name: 'Scope 3 | Sales | Single Store', route: '/penjualan', session: 'hendra.medan', scope3: true },
  'transaksi': { name: 'PDB-06 | Transactions', route: '/transaksi', session: PIC, scope3: true },
  'transaksi-filtered': { name: 'PDB-06 | Transactions | Filtered', route: '/transaksi?m=2026-09&status=PAID_OUT', session: PIC, scope3: true },
  'transaksi-loading': { name: 'PDB-06 | Transactions | Loading', route: '/transaksi', session: PIC, scenario: { tableState: 'loading' }, scope3: true },
  'transaksi-empty': { name: 'PDB-06 | Transactions | Empty', route: '/transaksi', session: PIC, scenario: { tableState: 'empty' }, scope3: true },
  'transaksi-error': { name: 'PDB-06 | Transactions | Error', route: '/transaksi', session: PIC, scenario: { tableState: 'error' }, scope3: true },
  'komisi': { name: 'PDB-07 | Commission', route: '/komisi', session: PIC, scope3: true },
  'komisi-empty': { name: 'PDB-07 | Commission | Empty', route: '/komisi', session: PIC, scenario: { tableState: 'empty' }, scope3: true },
  'profil': { name: 'PDB-08 | Profile', route: '/profil', session: PIC },
  'dokumen': { name: 'PDB-09 | Documents', route: '/dokumen', session: PIC },
  'dokumen-no-pks': { name: 'PDB-09 | Documents | No PKS', route: '/dokumen', session: 'lina.galaxy' },
  'dokumen-viewer': { name: 'PDB-09 | Documents | Viewer', route: '/dokumen', session: PIC, dokumen: { open: 'PKS' } },
};

const key = DEMO && typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('preset') : null;
/** Preset aktif (atau null). Dibaca sekali saat load. */
export const preset = (key && PRESETS[key] && (SCOPE3_MENUS || !PRESETS[key].scope3) && PRESETS[key]) || null;

if (preset?.scenario) setScenario(preset.scenario);
if (preset && typeof document !== 'undefined') document.title = preset.name;
