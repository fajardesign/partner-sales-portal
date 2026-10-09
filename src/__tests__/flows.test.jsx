import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App.jsx';
import { DEFAULT_SCENARIO, setScenario } from '../dev/scenario.js';
import { demoSession } from '../dev/session.js';
import { DEMO_PASSWORD } from '../api/db.js';
import { supabaseLogin } from '../api/auth.js';
import { ROLES } from '../lib/constants.js';

const T = { timeout: 4000 };
const go = (path) => { window.location.hash = path; };
const PIC = 'rudi.jaya@gmail.com'; // PIC Jaya Abadi Cellular (REG2026-0139), Active

beforeEach(() => {
  setScenario(DEFAULT_SCENARIO);
  sessionStorage.clear();
  go('/login');
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function login(user, id, pw = DEMO_PASSWORD) {
  await user.type(screen.getByPlaceholderText('nama@email.com atau 08123456789'), id);
  await user.type(screen.getByPlaceholderText('••••••••'), pw);
  await user.click(screen.getByRole('button', { name: 'Masuk' }));
}
async function start(id, pw) {
  const user = userEvent.setup();
  render(<App />);
  await login(user, id, pw);
  return user;
}

describe('PDB-01 Login', () => {
  it('Masuk nonaktif sampai kedua field terisi', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Masuk' }).disabled).toBe(true);
  });

  it('PIC Active masuk ke Beranda dengan menu sesuai feature', async () => {
    await start(PIC);
    expect(await screen.findByText('Partner (PIC) · Jaya Abadi Cellular', {}, T)).toBeTruthy();
    expect(window.location.hash).toBe('#/beranda');
    ['Beranda', 'Transaksi', 'Komisi', 'Profil', 'Dokumen'].forEach((m) => expect(screen.getAllByText(m).length).toBeGreaterThan(0));
  });

  it('login dengan nomor telepon (awalan 0) diterima', async () => {
    await start('085314557331');
    expect(await screen.findByText('Partner (PIC) · Jaya Abadi Cellular', {}, T)).toBeTruthy();
  });

  it('password salah menampilkan pesan, 5 kali salah mengunci akun', async () => {
    const user = await start('lina.galaxy@gmail.com', 'salah');
    expect(await screen.findByText('Email/nomor telepon atau password salah. Silakan coba lagi.', {}, T)).toBeTruthy();
    for (let i = 0; i < 4; i += 1) {
      await user.clear(screen.getByPlaceholderText('nama@email.com atau 08123456789'));
      await login(user, 'lina.galaxy@gmail.com', 'salah');
    }
    expect(await screen.findByText('Akun terkunci sementara. Coba lagi dalam 15 menit.', {}, T)).toBeTruthy();
  });

  it('akun PIC Pending dan Disabled ditolak dengan pesan masing-masing', async () => {
    const user = await start('ahmad.sumber@gmail.com');
    expect(await screen.findByText('Akun belum diaktivasi. Cek email undangan Anda.', {}, T)).toBeTruthy();
    await user.clear(screen.getByPlaceholderText('nama@email.com atau 08123456789'));
    await login(user, 'yusuf.global@gmail.com');
    expect(await screen.findByText('Akun Anda tidak aktif. Hubungi Admin.', {}, T)).toBeTruthy();
  });

  it('Lupa password? menampilkan petunjuk Hubungi Admin', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText('Lupa password?'));
    expect(screen.getByText('Hubungi Admin untuk mengatur ulang password Anda.')).toBeTruthy();
  });
});

describe('PDB-02 Akses ditolak & PDB-03 gangguan', () => {
  it('akun internal (Admin) ditolak tanpa sesi, Keluar kembali ke login', async () => {
    const user = await start('rina.saraswati@amarbank.co.id');
    expect(await screen.findByText('Akses ditolak. Akun ini tidak memiliki akses ke aplikasi ini.', {}, T)).toBeTruthy();
    expect(screen.getByText('Admin, APL, dan Super Admin masuk melalui S&P Portal.')).toBeTruthy();
    expect(sessionStorage.getItem('partner-dashboard-session')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Keluar' }));
    expect(await screen.findByRole('button', { name: 'Masuk' }, T)).toBeTruthy();
  });

  it('akun TL ditolak dengan petunjuk aplikasi Android', async () => {
    await start('andi.pratama@amarbank.co.id');
    expect(await screen.findByText('TL, SR, dan SA masuk melalui aplikasi Android Sales Portal.', {}, T)).toBeTruthy();
  });

  it('layanan login tidak tersedia → halaman gangguan dengan Coba lagi', async () => {
    setScenario({ service: 'outage' });
    const user = await start(PIC);
    expect(await screen.findByText('Layanan tidak tersedia', {}, T)).toBeTruthy();
    setScenario({ service: 'ok' });
    await user.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(screen.getByRole('button', { name: 'Masuk' })).toBeTruthy();
  });
});

describe('PDB-04 Shell & penjagaan rute', () => {
  it('rute terproteksi tanpa sesi → login, lalu kembali ke rute tersebut', async () => {
    go('/komisi');
    await start(PIC);
    expect(await screen.findByText('Partner (PIC) · Jaya Abadi Cellular', {}, T)).toBeTruthy();
    expect(window.location.hash).toBe('#/komisi');
  });

  it('rute tanpa feature → Akses ditolak di dalam shell, menu disembunyikan', async () => {
    const s = demoSession('rudi.jaya');
    sessionStorage.setItem('partner-dashboard-session', JSON.stringify({ ...s, features: s.features.filter((f) => f !== 'DOCUMENT_REPOSITORY') }));
    go('/dokumen');
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByText('Akun Anda tidak memiliki akses ke halaman ini.', {}, T)).toBeTruthy();
    expect(screen.queryByText('Dokumen')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Ke halaman utama' }));
    expect(window.location.hash).toBe('#/beranda');
  });

  it('Keluar menghapus sesi', async () => {
    const user = await start(PIC);
    await screen.findByText('Partner (PIC) · Jaya Abadi Cellular', {}, T);
    await user.click(within(document.querySelector('main')).getByRole('button', { name: 'Keluar' }));
    expect(await screen.findByRole('button', { name: 'Masuk' }, T)).toBeTruthy();
    expect(sessionStorage.getItem('partner-dashboard-session')).toBeNull();
  });
});

describe('Login Supabase (sp-mobile-login, partner-web-access)', () => {
  const respond = (status, body) => vi.stubGlobal('fetch', vi.fn(async () => ({ ok: status < 300, status, json: async () => body })));

  it('mengirim platform partner-web-access + apikey dan membentuk sesi dari respons', async () => {
    respond(200, { session: {}, user: { id: 100, role: 'PARTNER', full_name: 'Rudi Hartono', partner_id: 'REG2026-0139' }, access: { realmRole: 'PARTNER', platform: 'partner-web-access', features: ROLES.PARTNER.features } });
    const s = await supabaseLogin(PIC, DEMO_PASSWORD);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toMatch(/\/functions\/v1\/sp-mobile-login$/);
    expect(init.headers.apikey).toMatch(/^sb_publishable_/);
    expect(JSON.parse(init.body)).toEqual({ identifier: PIC, password: DEMO_PASSWORD, platform: 'partner-web-access' });
    expect(s).toMatchObject({ role: 'PARTNER', partnerId: 'REG2026-0139', partnerName: 'Jaya Abadi Cellular', features: ROLES.PARTNER.features });
  });

  it('kode error diteruskan; FORBIDDEN_PLATFORM membawa role', async () => {
    for (const code of ['INVALID', 'LOCKED', 'DISABLED', 'NOT_ACTIVATED']) {
      respond(code === 'INVALID' ? 401 : 403, { error: code });
      await expect(supabaseLogin(PIC, 'x')).rejects.toMatchObject({ code });
    }
    respond(403, { error: 'FORBIDDEN_PLATFORM', role: 'APL' });
    await expect(supabaseLogin('hasan.basri@amarbank.co.id', 'x')).rejects.toMatchObject({ code: 'FORBIDDEN_PLATFORM', field: 'APL' });
    respond(400, { error: 'BAD_REQUEST' });
    await expect(supabaseLogin(PIC, 'x')).rejects.toMatchObject({ code: 'INVALID' });
  });

  it('respons 200 dengan role selain PARTNER tetap ditolak', async () => {
    respond(200, { user: { id: 1, role: 'REVIEWER' }, access: { realmRole: 'ADMIN', platform: 'web-access', features: [] } });
    await expect(supabaseLogin('rina.saraswati@amarbank.co.id', 'x')).rejects.toMatchObject({ code: 'FORBIDDEN_PLATFORM', field: 'REVIEWER' });
  });

  it('jaringan gagal atau 5xx → OUTAGE', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(supabaseLogin(PIC, 'x')).rejects.toMatchObject({ code: 'OUTAGE' });
    respond(503, {});
    await expect(supabaseLogin(PIC, 'x')).rejects.toMatchObject({ code: 'OUTAGE' });
  });
});
