import { DEMO } from '../lib/env.js';
import { setScenario } from './scenario.js';

/**
 * Preset state layar untuk dokumentasi/capture (hanya mode demo).
 * Buka `/?preset=<nama>` — rute, sesi, skenario mock, dan state awal komponen langsung terisi; DevToolbar disembunyikan.
 * session = handle akun PIC (bagian email sebelum "@"); denied = akun bukan Partner yang ditolak.
 */
const PIC = 'rudi.jaya';
export const PRESETS = {
  'login': { name: 'PDB-01 | Login', route: '/login' },
  'login-error': { name: 'PDB-01 | Login | Error | Wrong Credential', route: '/login', login: { loginId: `${PIC}@gmail.com`, error: 'Email/nomor telepon atau password salah. Silakan coba lagi.' } },
  'login-locked': { name: 'PDB-01 | Login | Error | Locked', route: '/login', login: { loginId: `${PIC}@gmail.com`, error: 'Akun terkunci sementara. Coba lagi dalam 15 menit.' } },
  'denied': { name: 'PDB-02 | Access Denied', route: '/denied', denied: { loginId: 'rina.saraswati@amarbank.co.id', role: 'REVIEWER' } },
  'login-outage': { name: 'PDB-03 | Login | Outage', route: '/login', login: { outage: true } },
  'forbidden': { name: 'PDB-04 | Access Denied | Page', route: '/dokumen', session: PIC, features: ['PARTNER_SALES_DASHBOARD', 'TRANSACTION_INQUIRY', 'PARTNER_COMMISSION', 'PARTNER_PROFILE'] },
  'beranda': { name: 'PDB-05 | Partner Home', route: '/beranda', session: PIC },
  'beranda-single-store': { name: 'PDB-05 | Partner Home | Single Store', route: '/beranda', session: 'hendra.medan' },
  'beranda-loading': { name: 'PDB-05 | Partner Home | Loading', route: '/beranda', session: PIC, scenario: { tableState: 'loading' } },
  'beranda-error': { name: 'PDB-05 | Partner Home | Error', route: '/beranda', session: PIC, scenario: { tableState: 'error' } },
  'transaksi': { name: 'PDB-06 | Transactions', route: '/transaksi', session: PIC },
  'transaksi-filtered': { name: 'PDB-06 | Transactions | Filtered', route: '/transaksi?m=2026-09&status=PAID_OUT', session: PIC },
  'transaksi-loading': { name: 'PDB-06 | Transactions | Loading', route: '/transaksi', session: PIC, scenario: { tableState: 'loading' } },
  'transaksi-empty': { name: 'PDB-06 | Transactions | Empty', route: '/transaksi', session: PIC, scenario: { tableState: 'empty' } },
  'transaksi-error': { name: 'PDB-06 | Transactions | Error', route: '/transaksi', session: PIC, scenario: { tableState: 'error' } },
  'komisi': { name: 'PDB-07 | Commission', route: '/komisi', session: PIC },
  'komisi-empty': { name: 'PDB-07 | Commission | Empty', route: '/komisi', session: PIC, scenario: { tableState: 'empty' } },
  'profil': { name: 'PDB-08 | Profile', route: '/profil', session: PIC },
  'dokumen': { name: 'PDB-09 | Documents', route: '/dokumen', session: PIC },
  'dokumen-no-pks': { name: 'PDB-09 | Documents | No PKS', route: '/dokumen', session: 'lina.galaxy' },
  'dokumen-viewer': { name: 'PDB-09 | Documents | Viewer', route: '/dokumen', session: PIC, dokumen: { open: 'PKS' } },
};

const key = DEMO && typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('preset') : null;
/** Preset aktif (atau null). Dibaca sekali saat load. */
export const preset = (key && PRESETS[key]) || null;

if (preset?.scenario) setScenario(preset.scenario);
if (preset && typeof document !== 'undefined') document.title = preset.name;
