import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App.jsx';
import { DEFAULT_SCENARIO, setScenario } from '../dev/scenario.js';
import { demoSession } from '../dev/session.js';
import { loans, partners } from '../api/db.js';
import { partnerDocuments, partnerHome, partnerProfile } from '../api/mockApi.js';
import { partnerBank, partnerIncentive, partnerLoan, partnerLoans } from '../api/partnerScope3.js';

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
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('Isolasi data partner', () => {
  it('setiap fungsi hanya mengembalikan data partner sesi', async () => {
    const s = demoSession('rudi.jaya');
    const own = partners.find((p) => p.id === s.partnerId);
    const names = own.stores.map((x) => x.name);
    const tx = await partnerLoans(s, '2026-09', {}, 1);
    expect(tx.total).toBe(loans.filter((l) => l.partnerId === own.id && l.submittedAt.toISOString() >= '2026-08-31T17:00' && l.submittedAt.toISOString() < '2026-09-30T17:00').length);
    tx.rows.forEach((r) => expect(names).toContain(r.store));
    tx.rows.forEach((r) => expect(r).not.toHaveProperty('sales'));
    await expect(partnerLoan(s, loans.find((l) => l.partnerId !== own.id).id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
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

  it('Insentif partner (PRD Scope 3): volume saja; September Final menunggu pembayaran tgl 15; rekening disamarkan', async () => {
    const s = demoSession('rudi.jaya');
    const cur = await partnerIncentive(s, '2026-10');
    expect(cur.row).toMatchObject({ ym: '2026-10', monthStatus: 'BERJALAN', payment: null });
    expect(cur.row.incentive).toBe(Math.floor((cur.row.actual * cur.row.coefficient) / 100));
    const sep = await partnerIncentive(s, '2026-09');
    expect(sep.row).toMatchObject({ monthStatus: 'FINAL', payment: { status: expect.stringMatching(/MENUNGGU|TIDAK_ADA/), scheduledAt: '2026-10-15' } });
    expect(sep.stores.reduce((a, x) => a + x.amount, 0)).toBe(sep.row.actual);
    expect((await partnerBank(s)).bank.accountNumber).toMatch(/\d{4}$/);
  });
});

describe('PDB-05 Beranda Partner (FR-PD-005)', () => {
  it('sapaan PIC, nama & status partner, jumlah toko, tautan Profil dan Dokumen', async () => {
    const user = open('/beranda');
    expect(await screen.findByText('Halo, Rudi', {}, T)).toBeTruthy();
    expect(screen.getAllByText('Jaya Abadi Cellular').length).toBeGreaterThan(0);
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('4 toko')).toBeTruthy(); // termasuk toko baru yang menunggu kode referral
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

describe('PRD Scope 3 · Partner Dashboard', () => {
  it('menu Insentif, Pinjaman, Rekening; Beranda menampilkan kartu insentif bulan ini dan bulan final terakhir', async () => {
    open('/beranda');
    expect(await screen.findByText('Insentif bulan ini', {}, T)).toBeTruthy();
    expect(screen.getByText('Insentif September 2026')).toBeTruthy();
    ['Insentif', 'Pinjaman', 'Rekening'].forEach((m) => expect(screen.getAllByText(m).length).toBeGreaterThan(0));
  });
  it('Insentif: status bulan, rincian per toko, riwayat, kontak', async () => {
    open('/insentif?m=2026-09');
    expect(await screen.findByText('Cair dihitung per toko', {}, T)).toBeTruthy();
    expect(screen.getByText('Riwayat insentif')).toBeTruthy();
    expect(screen.getByText('Insentif dihitung dari pinjaman yang diajukan dan cair di bulan yang sama.')).toBeTruthy();
    expect(screen.getByText(/Ada pertanyaan\? Hubungi Amar Bank/)).toBeTruthy();
  });
  it('Pinjaman: funnel 4 status, cari nomor referensi, detail; pinjaman partner lain tidak ditemukan', async () => {
    const own = partners.find((p) => p.id === demoSession('rudi.jaya').partnerId);
    const l = loans.filter((x) => x.partnerId === own.id && x.submittedAt.toISOString() >= '2026-08-31T17:00' && x.submittedAt.toISOString() < '2026-09-30T17:00')[0];
    const user = open('/pinjaman?m=2026-09');
    expect(await screen.findByText('Dihitung untuk insentif', {}, T)).toBeTruthy();
    await user.type(screen.getByPlaceholderText('Cari nomor referensi'), l.id);
    await user.click(await screen.findByText(l.id, {}, T));
    expect(await screen.findByText('Terakhir diperbarui', {}, T)).toBeTruthy();
    cleanup();
    const other = loans.find((x) => x.partnerId !== own.id);
    open(`/pinjaman?m=2026-09&id=${other.id}`);
    expect(await screen.findByText('Halaman tidak ditemukan', {}, T)).toBeTruthy();
  });
  it('Rekening: nomor rekening disamarkan dan banner tujuan pembayaran', async () => {
    open('/rekening');
    expect(await screen.findByText(/Insentif dibayarkan ke rekening ini/, {}, T)).toBeTruthy();
    expect(screen.getByText(/^•+\d{4}$/)).toBeTruthy();
  });
});

describe('PDB-08 Profil', () => {
  it('lihat saja: catatan hubungi Amar Bank, Kode Referral, rekening tersamar, toko', async () => {
    open('/profil');
    expect(screen.getByText('Untuk perubahan data, hubungi Amar Bank.')).toBeTruthy();
    expect((await screen.findAllByText('Kode Referral', {}, T)).length).toBe(4); // per toko (PRD Scope 1 v2)
    expect(screen.getByText(/^•+\d{4}$/)).toBeTruthy();
    expect(screen.getByText('Toko Utama')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Ubah/ })).toBeNull();
  });

  it('AC-PD-005: Kode Referral per toko; toko tanpa kode → "Tidak diisi"', async () => {
    open('/profil');
    expect(await screen.findByText('OFMKS1391', {}, T)).toBeTruthy();
    expect(screen.getByText('Tidak diisi')).toBeTruthy(); // toko baru menunggu kode referral
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
