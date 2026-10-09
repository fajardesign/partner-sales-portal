import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App.jsx';
import { DEFAULT_SCENARIO, setScenario } from '../dev/scenario.js';
import { demoSession } from '../dev/session.js';
import { loans, partners } from '../api/db.js';
import { partnerCommission, partnerDocuments, partnerProfile, partnerTransactions, monthRange } from '../api/mockApi.js';

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

beforeEach(() => { setScenario(DEFAULT_SCENARIO); sessionStorage.clear(); });
afterEach(cleanup);

describe('Isolasi data partner', () => {
  it('setiap fungsi hanya mengembalikan data partner sesi', async () => {
    const s = demoSession('rudi.jaya');
    const own = partners.find((p) => p.id === s.partnerId);
    const names = own.stores.map((x) => x.name);
    const tx = await partnerTransactions(s, monthRange('2026-09'), {}, 1);
    expect(tx.total).toBe(loans.filter((l) => l.partnerId === own.id && l.submittedAt.toISOString() >= '2026-08-31T17:00' && l.submittedAt.toISOString() < '2026-09-30T17:00').length);
    tx.rows.forEach((r) => expect(names).toContain(r.store));
    expect((await partnerProfile(s)).id).toBe(own.id);
    await expect(partnerProfile({ ...s, partnerId: 'REG2026-9999' })).rejects.toMatchObject({ code: 'LOAD_FAILED' });
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

describe('PDB-05 Beranda', () => {
  it('kartu penjualan, tren, dan peringkat toko (partner > 1 toko)', async () => {
    open('/beranda');
    expect(await screen.findByText('Penjualan · Oktober 2026', {}, T)).toBeTruthy();
    expect(screen.getByText('Pinjaman diajukan')).toBeTruthy();
    expect(screen.getByText('Nominal cair')).toBeTruthy();
    expect(await screen.findByText('Peringkat', {}, T)).toBeTruthy();
    expect(screen.getByText('#1')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Nominal cair per bulan' })).toBeTruthy();
  });

  it('partner satu toko tanpa kolom Peringkat; kartu membuka Transaksi terfilter', async () => {
    const user = open('/beranda?m=2026-09', 'hendra.medan');
    expect(await screen.findByText('Performa toko · September 2026', {}, T)).toBeTruthy();
    await screen.findByText('Medan Selular', {}, T);
    expect(screen.queryByText('Peringkat')).toBeNull();
    await user.click(screen.getByText('Pinjaman cair').closest('button'));
    expect(window.location.hash).toBe('#/transaksi?m=2026-09&status=PAID_OUT');
  });

  it('error memuat → Coba lagi', async () => {
    setScenario({ tableState: 'error' });
    const user = open('/beranda');
    await user.click(await screen.findByRole('button', { name: 'Coba lagi' }, T));
    expect(await screen.findByText('Penjualan · Oktober 2026', {}, T)).toBeTruthy();
  });
});

describe('PDB-06 Transaksi', () => {
  it('daftar tersamar dengan pager 20 baris', async () => {
    open('/transaksi?m=2026-09');
    expect((await screen.findAllByText(/^APP-••••\d{4}$/, {}, T)).length).toBe(20);
    expect(screen.getByText(/^1–20 dari \d+ transaksi$/)).toBeTruthy();
    expect(screen.getByText('[TBD: Format penyamaran ID aplikasi dan nama nasabah perlu dikonfirmasi.]')).toBeTruthy();
  });

  it('filter status dari URL hanya menampilkan status tsb', async () => {
    open('/transaksi?m=2026-09&status=REJECTED');
    await screen.findAllByText(/^APP-••••/, {}, T);
    const table = screen.getByRole('table');
    expect(within(table).getAllByText('Ditolak').length).toBeGreaterThan(0);
    expect(within(table).queryByText('Dicairkan')).toBeNull();
  });

  it('pencarian tanpa hasil → pesan filter; data kosong → pesan periode', async () => {
    open('/transaksi?q=00000');
    expect(await screen.findByText('Tidak ada transaksi yang sesuai dengan pencarian atau filter.', {}, T)).toBeTruthy();
    cleanup();
    setScenario({ tableState: 'empty' });
    open('/transaksi');
    expect(await screen.findByText('Belum ada transaksi pada periode ini.', {}, T)).toBeTruthy();
  });
});

describe('PDB-07 Komisi', () => {
  it('estimasi bulan ini + riwayat Estimasi/Dibayar', async () => {
    open('/komisi');
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
});

describe('PDB-09 Dokumen', () => {
  it('PKS + dokumen partner; Lihat membuka pratinjau, Unduh menampilkan toast', async () => {
    const user = open('/dokumen');
    expect(await screen.findByText('PKS (Perjanjian Kerja Sama) bertanda tangan', {}, T)).toBeTruthy();
    expect(screen.queryByText(/Foto Toko/)).toBeNull();
    await user.click(screen.getAllByRole('button', { name: 'Unduh' })[0]);
    expect(await screen.findByText('pks_jaya_abadi_signed.pdf diunduh.', {}, T)).toBeTruthy();
    await user.click(screen.getAllByRole('button', { name: 'Lihat' })[0]);
    expect(await screen.findByText('Hal. 1 / 8', {}, T)).toBeTruthy();
  });

  it('partner tanpa PKS terunggah menampilkan catatan', async () => {
    open('/dokumen', 'lina.galaxy');
    expect(await screen.findByText('Dokumen PKS belum tersedia. Hubungi Amar Bank bila memerlukan salinan PKS.', {}, T)).toBeTruthy();
  });
});
