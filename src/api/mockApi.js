// Mock API Partner Dashboard — pengganti backend Partner Dashboard (PRD v3 §F). Hanya data partner & toko milik sesi.
// Data di src/api/db.js (salinan seed admin-sales-portal, memori). Fungsi async dengan jeda kecil agar state loading terlihat.
import { getScenario } from '../dev/scenario.js';
import { normalizePhone } from '../lib/format.js';
import { ACTIVATION_TTL_MS, PAGE_SIZE } from '../lib/constants.js';
import { CURRENT_MONTH, loans, mfp, MONTHS, now, partners, schemes, superAdmins, targets, users, wibDate } from './db.js';

const TEST = import.meta.env.MODE === 'test';
const wait = (ms) => new Promise((r) => setTimeout(r, TEST ? 0 : ms));

export class ApiError extends Error {
  constructor(code, field) { super(code); this.code = code; this.field = field; }
}

/** Skenario tabel dari DevToolbar (loading/empty/error) — diabaikan saat "Coba lagi". */
export async function listGate(retry) {
  const { tableState } = getScenario();
  if (!retry && tableState === 'loading') return new Promise(() => {});
  await wait(450);
  if (!retry && tableState === 'error') throw new ApiError('LOAD_FAILED');
  return !retry && tableState === 'empty';
}

// ------------------------------------------------------------------ auth (mode mock)
const allAccounts = () => [...users, ...superAdmins];
/** Cari akun dari identitas login: berisi "@" = email; selain itu nomor telepon (08…, 62…, +62…, 8… dianggap sama). */
export function findByIdentifier(identifier) {
  const id = (identifier || '').trim().toLowerCase();
  if (!id) return undefined;
  if (id.includes('@')) return allAccounts().find((x) => x.email === id);
  const phone = normalizePhone(id);
  return phone ? allAccounts().find((x) => x.phone && x.phone === phone) : undefined;
}
/** Status akun dengan Expired terhitung (Pending + tautan aktivasi 3x24 jam lewat). */
export function accountStatus(u) {
  if (u.status === 'PENDING' && now() - u.inviteSentAt > ACTIVATION_TTL_MS) return 'EXPIRED';
  return u.status;
}

const MAX_FAILS = 5;
const LOCK_MS = 15 * 60000;
/**
 * Login mock dengan urutan cek sama seperti sp-mobile-login: kunci → status akun → password → platform.
 * Mengembalikan akun PARTNER; role lain → FORBIDDEN_PLATFORM (field = role).
 */
export async function mockLogin(identifier, password) {
  await wait(600);
  const u = findByIdentifier(identifier);
  if (!u) throw new ApiError('INVALID');
  if (u.lockUntil && now() < u.lockUntil) throw new ApiError('LOCKED');
  const st = u.role === 'SUPER_ADMIN' ? 'ACTIVE' : accountStatus(u);
  if (st === 'DISABLED') throw new ApiError('DISABLED');
  if (st === 'PENDING' || st === 'EXPIRED') throw new ApiError('NOT_ACTIVATED');
  if (u.password !== password) {
    u.fails += 1;
    if (u.fails >= MAX_FAILS) { u.fails = 0; u.lockUntil = new Date(now().getTime() + LOCK_MS); throw new ApiError('LOCKED'); }
    throw new ApiError('INVALID');
  }
  u.fails = 0;
  if (u.role !== 'PARTNER') throw new ApiError('FORBIDDEN_PLATFORM', u.role);
  return u;
}

/** Akun PIC contoh untuk panel demo & DevToolbar: [email, keterangan]. */
export function demoPicAccounts() {
  return users.filter((u) => u.role === 'PARTNER').map((u) => {
    const p = partners.find((x) => x.id === u.partnerId);
    const st = accountStatus(u);
    const note = st === 'ACTIVE' ? p?.partnerName : st === 'DISABLED' ? 'Disabled → akun tidak aktif' : 'Pending → belum diaktivasi';
    return { email: u.email, status: st, note, user: u };
  });
}

// ------------------------------------------------------------------ partner (isolasi: setiap fungsi hanya membaca partnerId sesi)
const clone = (o) => structuredClone(o);
const findP = (partnerId) => partners.find((x) => x.id === partnerId) ?? null;
/** Partner milik sesi; tidak ditemukan → LOAD_FAILED (API 403/404 di produksi). */
function own(session) {
  const p = findP(session?.partnerId);
  if (!p) throw new ApiError('LOAD_FAILED');
  return p;
}
const storeName = (p, storeId) => p.stores.find((s) => s.id === storeId)?.name ?? '-';

/** Ringkasan partner untuk shell (nama partner di chip pengguna). */
export function partnerSummary(partnerId) {
  const p = findP(partnerId);
  return p ? { id: p.id, partnerName: p.partnerName, status: p.status } : null;
}

// ------------------------------------------------------------------ periode (sama dengan Dashboard APL admin-sales-portal)
export const perfMonths = () => MONTHS;
export const currentMonth = () => CURRENT_MONTH;
export const todayDate = () => wibDate(now());
const DAY = 864e5;
const addDays = (ymd, n) => new Date(Date.parse(`${ymd}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / DAY) + 1;
/** Rentang tanggal bulan ym, dipotong sampai hari ini untuk bulan berjalan. */
export const monthRange = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const to = `${ym}-${String(last).padStart(2, '0')}`;
  return { from: `${ym}-01`, to: to > todayDate() ? todayDate() : to };
};
/** Periode sebelumnya: bulan sebelumnya (jumlah hari sama bila bulan berjalan) atau rentang sama panjang tepat sebelumnya. */
export function previousPeriod(period) {
  const len = daysBetween(period.from, period.to);
  if (period.month) {
    const [y, m] = period.month.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 2, 1));
    const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const r = monthRange(ym);
    return { month: ym, from: r.from, to: addDays(r.from, Math.min(len, daysBetween(r.from, r.to)) - 1) };
  }
  return { from: addDays(period.from, -len), to: addDays(period.from, -1) };
}
const inP = (ymd, p) => ymd >= p.from && ymd <= p.to;
const pct = (a, b) => (b ? (a / b) * 100 : 0);
const nextMonth = (ym) => { const [y, m] = ym.split('-').map(Number); const d = new Date(Date.UTC(y, m, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };

/** Samaran (sama dengan APL, PRD v3 §B2): ID "APP-••••1234", nama "Bu•• Sa•••••". */
export const maskId = (id) => `APP-••••${id.slice(-4)}`;
export const maskName = (n) => n.split(' ').map((w) => w.slice(0, 2) + '•'.repeat(Math.max(1, w.length - 2))).join(' ');
/** Nomor rekening tersamar: 4 digit terakhir. */
export const maskAccount = (n) => `${'•'.repeat(Math.max(0, n.length - 4))}${n.slice(-4)}`;
export const CRM_STATUS = { SUBMITTED: 'Pengajuan', IN_PROCESS: 'Diproses', APPROVED: 'Disetujui', REJECTED: 'Ditolak', PAID_OUT: 'Dicairkan' };

/** Agregat penjualan (berdasarkan tanggal pengajuan, sama dengan Kinerja Penjualan APL). */
function salesStats(rows) {
  const paid = rows.filter((l) => l.status === 'PAID_OUT');
  return {
    submitted: rows.length,
    accepted: rows.filter((l) => l.status === 'APPROVED' || l.status === 'PAID_OUT').length,
    paidOut: paid.length,
    paidOutAmount: paid.reduce((a, l) => a + l.amount, 0),
  };
}
const partnerLoans = (p) => loans.filter((l) => l.partnerId === p.id);

// ------------------------------------------------------------------ PDB-05 Beranda Partner (PRD v3 F2)
/**
 * Ringkasan penjualan partner pada periode + periode sebelumnya, tren nominal cair per bulan (6 bulan), dan performa per toko.
 * Return { cur, prev, months:[{ month, amount, inPeriod }], stores:[{ id, code, name, status, submitted, paidOut, paidOutAmount, rank }] }.
 */
export async function partnerDashboard(session, period, { retry = false } = {}) {
  const empty = await listGate(retry);
  const p = own(session);
  const all = empty ? [] : partnerLoans(p);
  const within = (per) => all.filter((l) => inP(wibDate(l.submittedAt), per));
  const cur = within(period);
  const months = MONTHS.map((m) => {
    const r = monthRange(m);
    return { month: m, amount: salesStats(within(r)).paidOutAmount, inPeriod: r.from <= period.to && r.to >= period.from };
  });
  const stores = p.stores.map((s) => ({ id: s.id, code: s.code, name: s.name, status: s.status, primary: s.primary, ...salesStats(cur.filter((l) => l.storeId === s.id)) }))
    .sort((a, b) => b.paidOutAmount - a.paidOutAmount || b.submitted - a.submitted)
    .map((s, i) => ({ ...s, rank: i + 1 }));
  return { cur: salesStats(cur), prev: salesStats(within(previousPeriod(period))), months, stores };
}

// ------------------------------------------------------------------ PDB-06 Transaksi (PRD v3 F3)
/** Pilihan toko untuk filter (semua toko partner). */
export const storeOptions = (session) => (findP(session?.partnerId)?.stores ?? []).map((s) => ({ value: s.id, label: s.code ? `${s.name} (${s.code})` : s.name }));

const TX_SORT = { submitted: (l) => l.submittedAt.getTime(), amount: (l) => l.amount, updated: (l) => l.updatedAt.getTime() };
/**
 * Pengajuan pinjaman dari toko partner (read-only, data CRM). f: { q (4 digit terakhir ID), store, status, sort "key:dir" }, page.
 * Return { total, page, rows:[{ id, maskedId, customer, store, amount, status, submittedAt, updatedAt }] }.
 */
export async function partnerTransactions(session, period, f = {}, page = 1, { retry = false } = {}) {
  const empty = await listGate(retry);
  const p = own(session);
  const q = (f.q ?? '').replace(/\D/g, '');
  const [sk, sd] = (f.sort || 'submitted:desc').split(':');
  const key = TX_SORT[sk] ?? TX_SORT.submitted;
  const rows = (empty ? [] : partnerLoans(p))
    .filter((l) => inP(wibDate(l.submittedAt), period) && (!f.store || l.storeId === f.store) && (!f.status || l.status === f.status) && (!q || l.id.slice(-4).includes(q)))
    .sort((a, b) => (sd === 'asc' ? key(a) - key(b) : key(b) - key(a)));
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pg = Math.min(Math.max(1, page), pages);
  return {
    total: rows.length, page: pg,
    rows: rows.slice((pg - 1) * PAGE_SIZE, pg * PAGE_SIZE).map((l) => ({
      id: l.id, maskedId: maskId(l.id), customer: maskName(l.customer), store: storeName(p, l.storeId),
      amount: l.amount, status: l.status, submittedAt: l.submittedAt, updatedAt: l.updatedAt,
    })),
  };
}

// ------------------------------------------------------------------ PDB-07 Komisi (PRD v3 F4, skema Super Admin INC)
export function versionFor(recipient, ym) {
  const s = schemes.find((x) => x.recipient === recipient);
  return [...s.versions].sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1)).find((v) => v.effectiveFrom <= ym) ?? s.versions[0];
}
/** Tier yang cocok: nilai > from (tier pertama ≥ 0) dan ≤ to (to null = tak terbatas). */
export function tierFor(component, value) {
  const tiers = [...component.tiers].sort((a, b) => a.from - b.from);
  return tiers.find((t, i) => (i === 0 ? value >= t.from : value > t.from) && (t.to == null || value <= t.to)) ?? tiers[tiers.length - 1];
}
export const tierLabel = (t) => (t.to == null ? `> ${t.from}%` : t.from === 0 ? `0% s/d ${t.to}%` : `> ${t.from}% s/d ${t.to}%`);
const rate = (r) => `${String(r).replace('.', ',')}%`;

/**
 * Komisi partner bulan ym — rumus sama dengan computeIncentives admin-sales-portal (baris partner):
 * Store = Offline Retailer (Volume Incentive dari pencapaian target paid out + Collection Incentive dari rasio MFP);
 * Non-Store = Affiliate (Commission 5% dari disbursement). Dasar: pinjaman dicairkan pada bulan ym (tanggal cair).
 */
function commissionFor(p, ym) {
  const range = monthRange(ym);
  const paidIn = partnerLoans(p).filter((l) => l.status === 'PAID_OUT' && inP(wibDate(l.paidOutAt), range));
  const paid = paidIn.reduce((a, l) => a + l.amount, 0);
  const storeIds = [...new Set(paidIn.map((l) => l.storeId))];
  const target = storeIds.reduce((a, id) => a + (targets[`${id}:${ym}`] ?? 0), 0);
  const achievement = pct(paid, target);
  const status = ym === CURRENT_MONTH ? 'ESTIMATE' : 'PAID';
  const base = { month: ym, paidOutAmount: paid, target, achievement, status };
  if (p.channel === 'NON_STORE') {
    const v = versionFor('PARTNER_AFFILIATE', ym); const c = v.components[0];
    const components = [{ label: c.label, amount: (paid * c.rate) / 100, detail: `${rate(c.rate)} dari disbursement` }];
    return { ...base, scheme: 'Affiliate / Sales Agency', tier: '-', components, total: components[0].amount, version: v.version, payDate: `${nextMonth(ym)}-${String(v.payday).padStart(2, '0')}` };
  }
  const v = versionFor('PARTNER_RETAIL', ym);
  const vol = v.components.find((c) => c.key === 'volume'); const col = v.components.find((c) => c.key === 'collection');
  const m = storeIds.length ? storeIds.reduce((a, sid) => a + (mfp[`${sid}:${ym}`] ?? 0), 0) / storeIds.length : 0;
  const tv = tierFor(vol, achievement); const tc = tierFor(col, m);
  const components = [
    { label: 'Volume Incentive', amount: (paid * tv.rate) / 100, detail: `Pencapaian ${achievement.toFixed(0)}% · tier ${tierLabel(tv)} · tarif ${rate(tv.rate)}` },
    { label: 'Collection Incentive (MFP)', amount: (paid * tc.rate) / 100, detail: `MFP ${m.toFixed(1).replace('.', ',')}% · tier ${tierLabel(tc)} · tarif ${rate(tc.rate)}` },
  ];
  return { ...base, scheme: 'Offline Retailer', tier: tierLabel(tv), mfp: paidIn.length ? m : null, components, total: components.reduce((a, c) => a + c.amount, 0), version: v.version, payDate: `${nextMonth(ym)}-${String(v.payday).padStart(2, '0')}` };
}

/** Estimasi bulan berjalan + riwayat per bulan sejak partner aktif (terbaru di atas). Return { current, history }. */
export async function partnerCommission(session, { retry = false } = {}) {
  const empty = await listGate(retry);
  const p = own(session);
  const start = p.activatedAt ? wibDate(p.activatedAt).slice(0, 7) : CURRENT_MONTH;
  const months = empty ? [] : MONTHS.filter((m) => m >= start).reverse();
  const history = months.map((m) => commissionFor(p, m));
  return { current: history.find((h) => h.month === CURRENT_MONTH) ?? null, history };
}

// ------------------------------------------------------------------ PDB-08 Profil (PRD v3 F5, lihat saja)
/** Data partner, PIC, rekening (tersamar), dan toko. Tanpa status verifikasi rekening (revisi stakeholder 2026-10-08). */
export async function partnerProfile(session, { retry = false } = {}) {
  await listGate(retry);
  const p = own(session);
  return {
    id: p.id, registrationNumber: p.registrationNumber, partnerName: p.partnerName, entity: p.businessEntityType, merchantCode: p.merchantCode,
    referralCode: p.referralCode, address: p.address, province: p.province, city: p.city, district: p.district, village: p.village, rt: p.rt, rw: p.rw,
    areaId: p.areaId, status: p.status, activatedAt: p.activatedAt, businessEmail: p.businessEmail, channel: p.channel, businessLocationCount: p.businessLocationCount,
    pic: clone(p.pic),
    bank: { code: p.bank.code, branch: p.bank.branch, accountNumber: maskAccount(p.bank.accountNumber), accountName: p.bank.accountName },
    stores: p.stores.map((s) => ({
      id: s.id, code: s.code, name: s.name, primary: s.primary, address: s.address, status: s.status, storeType: s.storeType,
      channelOffline: s.channelOffline, scale: s.scale, productSold: s.productSold, location: s.location, productType: s.productType, lat: s.lat, lng: s.lng,
    })),
  };
}

// ------------------------------------------------------------------ PDB-09 Dokumen (PRD v3 F6)
/**
 * PKS bertanda tangan (bila diunggah Admin) + Dokumen Partner versi terbaru berstatus Valid; Foto Toko tidak ditampilkan.
 * Return { pks: { label, file } | null, documents:[{ key, label, file }] }.
 */
export async function partnerDocuments(session, { retry = false } = {}) {
  const empty = await listGate(retry);
  const p = own(session);
  if (empty) return { pks: null, documents: [] };
  const pks = p.pks.file ? { key: 'PKS', label: 'PKS (Perjanjian Kerja Sama) bertanda tangan', file: { name: p.pks.file.name, uploadedAt: p.pks.file.at, version: 1, pages: 8 } } : null;
  const documents = p.documents.filter((d) => d.level === 'PARTNER' && d.file && d.verification === 'VALID')
    .map((d) => ({ key: d.key, label: d.label, file: clone(d.file) }));
  return { pks, documents };
}
