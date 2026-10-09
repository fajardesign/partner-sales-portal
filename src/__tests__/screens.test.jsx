import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App.jsx';
import { DEFAULT_SCENARIO, setScenario } from '../dev/scenario.js';
import { demoSession } from '../dev/session.js';
import { loans, partners } from '../api/db.js';
import { partnerCommission, partnerDocuments, partnerHome, partnerProfile, partnerTransactions, monthRange } from '../api/mockApi.js';
import { ToasterProvider } from '../components/Toaster.jsx';
import { Penjualan } from '../pages/partner/Penjualan.jsx';
import { Transaksi } from '../pages/partner/Transaksi.jsx';
import { Komisi } from '../pages/partner/Komisi.jsx';

const T = { timeout: 4000 };
const go = (path) => { window.location.hash = path; };
/** Buka rute dengan sesi PIC contoh (handle = email sebelum "@"). */
function open(path, handle = 'rudi.jaya') {
  sessionStorage.setItem('partner-dashboard-session', JSON.stringify(demoSession(handle)));
  go(path);
  const user = userEvent.setup();
  render(<App />);
  return user;
}
/** Render langsung halaman Scope 3 (rutenya disembunyikan selama SCOPE3_MENUS = false). */
function page(Page, path, qs = '', handle = 'rudi.jaya') {
  const user = userEvent.setup();
  render(<ToasterProvider><Page user={demoSession(handle)} onLogout={() => {}} path={path} query={new URLSearchParams(qs)} /></ToasterProvider>);
  return user;
}

beforeEach(() => { setScenario(DEFAULT_SCENARIO); sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('Isolasi data partner', () => {
  it('setiap fungsi hanya mengembalikan data partner sesi', async () => {
    const s = demoSession('rudi.jaya');
    const own = partners.find((p) => p.id === s.partnerId);
    const names = own.stores.map((x) => x.name);
    const tx = await partnerTransactions(s, monthRange('2026-09'), {}, 1);
    expect(tx.total).toBe(loans.filter((l) => l.partnerId === own.id && l.submittedAt.toISOString() >= '2026-08-31T17:00' && l.submittedAt.toISOString() < '2026-09-30T17:00').length);
    tx.rows.forEach((r) => expect(names).toContain(r.store));
    expect((await partnerProfile(s)).id).toBe(own.id);
    await expect(partnerProfile({ ...s, partnerId: 'REG2026-9999' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    // partnerId milik partner lain (bukan milik akun sesi) → 404, bukan data partner lain.
    await expect(partnerHome({ ...s, partnerId: 'REG2026-0137' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(partnerDocuments({ ...s, partnerId: 'REG2026-0137' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('partner Inactive / akun PIC Disabled → ACCOUNT_DISABLED', async () => {
    await expect(partnerHome(demoSession('yusuf.global'))).rejects.toMatchObject({ code: 'ACCOUNT_DISABLED' });
  });

  it('Profil menyamarkan rekening; Dokumen tanpa Foto Toko', async () => {
    const s = demoSession('rudi.jaya');
    expect((await partnerProfile(s)).bank.accountNumber).toMatch(/^•+\d{4}$/);
    const docs = await partnerDocuments(s);
    expect(docs.pks.file.name).toBe('pks_jaya_abadi_signed.pdf');
    expect(docs.documents.some((d) => d.key.startsWith('FOTO'))).toBe(false);
  });

  it('Komisi: bulan berjalan Estimasi, bulan lalu Dibayar tgl 15 bulan berikutnya', async () => {
    const { current, history } = await partnerCommission(demoSession('rudi.jaya'));
    expect(current).toMatchObject({ month: '2026-10', status: 'ESTIMATE', payDate: '2026-11-15', scheme: 'Offline Retailer' });
    expect(history.find((h) => h.month === '2026-09')).toMatchObject({ status: 'PAID', payDate: '2026-10-15' });
    expect(current.components.map((c) => c.label)).toEqual(['Volume Incentive', 'Collection Incentive (MFP)']);
  });
});

describe('PDB-05 Beranda Partner (FR-PD-005)', () => {
  it('sapaan PIC, nama & status partner, jumlah toko, tautan Profil dan Dokumen', async () => {
    const user = open('/beranda');
    expect(await screen.findByText('Halo, Rudi', {}, T)).toBeTruthy();
    expect(screen.getAllByText('Jaya Abadi Cellular').length).toBeGreaterThan(0);
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('3 toko')).toBeTruthy();
    expect(screen.queryByText('Pinjaman diajukan')).toBeNull();
    await user.click(screen.getByText('Lihat data partner, PIC, rekening, dan toko.').closest('button'));
    expect(window.location.hash).toBe('#/profil');
    cleanup();
    const u2 = open('/beranda');
    await u2.click((await screen.findByText('Lihat dan unduh PKS serta dokumen kemitraan.', {}, T)).closest('button'));
    expect(window.location.hash).toBe('#/dokumen');
  });

  it('loading lalu error → Coba lagi', async () => {
    setScenario({ tableState: 'loading' });
    open('/beranda');
    expect(screen.getByText('Ringkasan partner Anda.')).toBeTruthy();
    expect(screen.queryByText(/^Halo,/)).toBeNull();
    cleanup();
    setScenario({ tableState: 'error' });
    const user = open('/beranda');
    expect(await screen.findByText('Gagal memuat data. Coba lagi.', {}, T)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(await screen.findByText('Halo, Rudi', {}, T)).toBeTruthy();
  });

  it('partner bukan milik sesi → Halaman tidak ditemukan (404), bukan Gagal memuat data', async () => {
    const s = demoSession('rudi.jaya');
    for (const r of ['/beranda', '/profil', '/dokumen']) {
      sessionStorage.setItem('partner-dashboard-session', JSON.stringify({ ...s, partnerId: 'REG2026-9999' }));
      go(r);
      const user = userEvent.setup();
      render(<App />);
      expect(await screen.findByText('Halaman tidak ditemukan', {}, T)).toBeTruthy();
      expect(screen.queryByText('Gagal memuat data. Coba lagi.')).toBeNull();
      if (r === '/profil') {
        await user.click(screen.getByRole('button', { name: 'Ke Beranda Partner' }));
        expect(window.location.hash).toBe('#/beranda');
      }
      cleanup();
    }
  });
});

describe('Penjualan (disembunyikan sampai Scope 3)', () => {
  it('kartu penjualan, tren, dan peringkat toko (partner > 1 toko)', async () => {
    page(Penjualan, '/penjualan');
    expect(await screen.findByText('Penjualan · Oktober 2026', {}, T)).toBeTruthy();
    expect(screen.getByText('Pinjaman diajukan')).toBeTruthy();
    expect(screen.getByText('Nominal cair')).toBeTruthy();
    expect(await screen.findByText('Peringkat', {}, T)).toBeTruthy();
    expect(screen.getByText('#1')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Nominal cair per bulan' })).toBeTruthy();
  });

  it('partner satu toko tanpa kolom Peringkat; kartu membuka Transaksi terfilter', async () => {
    const user = page(Penjualan, '/penjualan', 'm=2026-09', 'hendra.medan');
    expect(await screen.findByText('Performa toko · September 2026', {}, T)).toBeTruthy();
    await screen.findByText('Medan Selular', {}, T);
    expect(screen.queryByText('Peringkat')).toBeNull();
    await user.click(screen.getByText('Pinjaman cair').closest('button'));
    expect(window.location.hash).toBe('#/transaksi?m=2026-09&status=PAID_OUT');
  });

  it('error memuat → Coba lagi', async () => {
    setScenario({ tableState: 'error' });
    const user = page(Penjualan, '/penjualan');
    await user.click(await screen.findByRole('button', { name: 'Coba lagi' }, T));
    expect(await screen.findByText('Penjualan · Oktober 2026', {}, T)).toBeTruthy();
  });
});

describe('PDB-06 Transaksi (disembunyikan sampai Scope 3)', () => {
  it('daftar tersamar dengan pager 20 baris', async () => {
    page(Transaksi, '/transaksi', 'm=2026-09');
    expect((await screen.findAllByText(/^APP-••••\d{4}$/, {}, T)).length).toBe(20);
    expect(screen.getByText(/^1–20 dari \d+ transaksi$/)).toBeTruthy();
    expect(screen.getByText('[TBD: Format penyamaran ID aplikasi dan nama nasabah perlu dikonfirmasi.]')).toBeTruthy();
  });

  it('filter status dari URL hanya menampilkan status tsb', async () => {
    page(Transaksi, '/transaksi', 'm=2026-09&status=REJECTED');
    await screen.findAllByText(/^APP-••••/, {}, T);
    const table = screen.getByRole('table');
    expect(within(table).getAllByText('Ditolak').length).toBeGreaterThan(0);
    expect(within(table).queryByText('Dicairkan')).toBeNull();
  });

  it('pencarian tanpa hasil → pesan filter; data kosong → pesan periode', async () => {
    page(Transaksi, '/transaksi', 'q=00000');
    expect(await screen.findByText('Tidak ada transaksi yang sesuai dengan pencarian atau filter.', {}, T)).toBeTruthy();
    cleanup();
    setScenario({ tableState: 'empty' });
    page(Transaksi, '/transaksi');
    expect(await screen.findByText('Belum ada transaksi pada periode ini.', {}, T)).toBeTruthy();
  });
});

describe('PDB-07 Komisi (disembunyikan sampai Scope 3)', () => {
  it('estimasi bulan ini + riwayat Estimasi/Dibayar', async () => {
    page(Komisi, '/komisi');
    expect(await screen.findByText('Estimasi komisi', {}, T)).toBeTruthy();
    expect(screen.getAllByText('15 Nov 2026').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Dibayar').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Estimasi').length).toBeGreaterThan(0);
    expect(screen.getByText(/^\[TBD: Sumber target paid out/)).toBeTruthy();
  });
});

describe('PDB-08 Profil', () => {
  it('lihat saja: catatan hubungi Amar Bank, Kode Referral, rekening tersamar, toko', async () => {
    open('/profil');
    expect(screen.getByText('Untuk perubahan data, hubungi Amar Bank.')).toBeTruthy();
    expect(await screen.findByText('Kode Referral', {}, T)).toBeTruthy();
    expect(screen.getByText(/^•+\d{4}$/)).toBeTruthy();
    expect(screen.getByText('Toko Utama')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Ubah/ })).toBeNull();
  });

  it('Kode Referral kosong → "Tidak diisi"', async () => {
    const p = partners.find((x) => x.id === 'REG2026-0139');
    const prev = p.referralCode;
    p.referralCode = null;
    try {
      open('/profil');
      await screen.findByText('Kode Referral', {}, T);
      expect(screen.getByText('Tidak diisi')).toBeTruthy();
    } finally {
      p.referralCode = prev;
    }
  });
});

describe('PDB-09 Dokumen', () => {
  it('PKS + dokumen partner; Unduh menyimpan file bernama sama, Lihat membuka pratinjau', async () => {
    const createObjectURL = vi.fn(() => 'blob:dok');
    vi.stubGlobal('URL', Object.assign(Object.create(URL), { createObjectURL, revokeObjectURL: vi.fn() }));
    const names = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() { names.push(this.download); });
    const user = open('/dokumen');
    expect(await screen.findByText('PKS (Perjanjian Kerja Sama) bertanda tangan', {}, T)).toBeTruthy();
    expect(screen.queryByText(/Foto Toko/)).toBeNull();
    await user.click(screen.getAllByRole('button', { name: 'Unduh' })[0]);
    expect(await screen.findByText('pks_jaya_abadi_signed.pdf diunduh.', {}, T)).toBeTruthy();
    expect(names).toEqual(['pks_jaya_abadi_signed.pdf']);
    const blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe('application/pdf');
    expect(await blob.text()).toMatch(/^%PDF-1\.4[\s\S]*%%EOF\n$/);
    await user.click(screen.getAllByRole('button', { name: 'Lihat' })[0]);
    expect(await screen.findByText('Hal. 1 / 8', {}, T)).toBeTruthy();
  });

  it('Unduh gagal → toast "Gagal mengunduh dokumen. Coba lagi."', async () => {
    setScenario({ download: 'fail' });
    const user = open('/dokumen');
    await user.click((await screen.findAllByRole('button', { name: 'Unduh' }, T))[0]);
    expect(await screen.findByText('Gagal mengunduh dokumen. Coba lagi.', {}, T)).toBeTruthy();
  });

  it('tanpa dokumen → "Belum ada dokumen."', async () => {
    setScenario({ tableState: 'empty' });
    open('/dokumen');
    expect(await screen.findByText('Belum ada dokumen.', {}, T)).toBeTruthy();
  });

  it('partner tanpa PKS terunggah menampilkan catatan', async () => {
    open('/dokumen', 'lina.galaxy');
    expect(await screen.findByText('Dokumen PKS belum tersedia. Hubungi Amar Bank bila memerlukan salinan PKS.', {}, T)).toBeTruthy();
  });
});
