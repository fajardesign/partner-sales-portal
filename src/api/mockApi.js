// Mock API Partner Dashboard — pengganti backend Partner Dashboard (PRD Scope 1 §1.6). Hanya data partner & toko milik sesi.
// Data di src/api/db.js (salinan seed admin-sales-portal, memori). Fungsi async dengan jeda kecil agar state loading terlihat.
import { getScenario } from '../dev/scenario.js';
import { normalizePhone } from '../lib/format.js';
import { ACTIVATION_TTL_MS, ROLES } from '../lib/constants.js';
import { placeholderFile } from '../lib/download.js';
import { CURRENT_MONTH, MONTHS, now, partners, superAdmins, users, wibDate } from './db.js';

const TEST = import.meta.env.MODE === 'test';
export const wait = (ms) => new Promise((r) => setTimeout(r, TEST ? 0 : ms));
/** Dipakai bersama src/api/scope3.js (salinan identik dari admin-sales-portal). */
export const userById = (id) => users.find((u) => u.id === id) ?? superAdmins.find((u) => u.id === id);
export const actorOf = (session) => `${session.name} (${ROLES[session.role]?.short ?? session.role})`;

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

/**
 * Sesi berakhir karena partner Inactive / akun PIC Disabled (PRD Scope 1 FR-PD-008). App mendaftarkan listener yang
 * menghapus sesi dan kembali ke login — setara interceptor 401 di klien produksi.
 */
const disabledListeners = new Set();
export function onAccountDisabled(fn) { disabledListeners.add(fn); return () => disabledListeners.delete(fn); }

/**
 * Partner milik sesi (PRD Scope 1 FR-PD-004, AC-PD-004):
 * partner tidak ada / bukan milik akun sesi → NOT_FOUND (API 404, bukan 403, agar keberadaan data lain tidak bocor);
 * partner Inactive atau akun PIC Disabled → ACCOUNT_DISABLED (sesi diakhiri).
 */
function own(session) {
  const p = findP(session?.partnerId);
  const u = users.find((x) => x.id === session?.userId && x.role === 'PARTNER');
  if (!p || (u && u.partnerId !== p.id)) throw new ApiError('NOT_FOUND');
  if (p.status === 'INACTIVE' || (u && accountStatus(u) === 'DISABLED')) {
    disabledListeners.forEach((f) => f());
    throw new ApiError('ACCOUNT_DISABLED');
  }
  return p;
}
/** Toko yang tampil di Partner Dashboard: tanpa toko Dibatalkan (PRD 1.1 AC-040 / AC-PD-005, keputusan 2026-10-20). */
const visibleStores = (p) => p.stores.filter((s) => s.status !== 'CANCELLED');

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

/** Samaran (sama dengan APL, PRD v3 §B2): ID "APP-••••1234", nama "Bu•• Sa•••••". */
export const maskId = (id) => `APP-••••${id.slice(-4)}`;
export const maskName = (n) => n.split(' ').map((w) => w.slice(0, 2) + '•'.repeat(Math.max(1, w.length - 2))).join(' ');
/** Nomor rekening tersamar: 4 digit terakhir. */
export const maskAccount = (n) => `${'•'.repeat(Math.max(0, n.length - 4))}${n.slice(-4)}`;

/** Agregat penjualan (berdasarkan tanggal pengajuan, sama dengan Kinerja Penjualan APL). */

// ------------------------------------------------------------------ PDB-05 Beranda Partner (PRD Scope 1 FR-PD-005)
/**
 * Ringkasan profil saja (OQ-PD-03): nama PIC, nama & status partner, jumlah toko.
 * Return { picName, partnerName, status, storeCount }.
 */
export async function partnerHome(session, { retry = false } = {}) {
  await listGate(retry);
  const p = own(session);
  return { picName: p.pic.name, partnerName: p.partnerName, status: p.status, storeCount: visibleStores(p).length };
}

// ------------------------------------------------------------------ Pilihan toko (Pinjaman, PRD Scope 3 FR-PI-007)
/** Pilihan toko untuk filter (semua toko partner). */
export const storeOptions = (session) => (findP(session?.partnerId) ? visibleStores(findP(session.partnerId)) : []).map((s) => ({ value: s.id, label: s.code ? `${s.name} (${s.code})` : s.name }));

// Insentif, Pinjaman, Rekening (PRD Scope 3): src/api/partnerScope3.js + src/api/scope3.js.

// ------------------------------------------------------------------ PDB-08 Profil (PRD v3 F5, lihat saja)
/** Data partner, PIC, rekening (tersamar), dan toko. Tanpa status verifikasi rekening (revisi stakeholder 2026-10-08). */
export async function partnerProfile(session, { retry = false } = {}) {
  await listGate(retry);
  const p = own(session);
  return {
    id: p.id, registrationNumber: p.registrationNumber, partnerName: p.partnerName, entity: p.businessEntityType, merchantCode: p.merchantCode,
    address: p.address, province: p.province, city: p.city, district: p.district, village: p.village, rt: p.rt, rw: p.rw,
    areaId: p.areaId, status: p.status, activatedAt: p.activatedAt, businessEmail: p.businessEmail, channel: p.channel, businessLocationCount: p.businessLocationCount,
    pic: clone(p.pic),
    bank: { code: p.bank.code, branch: p.bank.branch, accountNumber: maskAccount(p.bank.accountNumber), accountName: p.bank.accountName },
    stores: visibleStores(p).map((s) => ({
      id: s.id, code: s.code, referralCode: s.referralCode, name: s.name, primary: s.primary, address: s.address, status: s.status, storeType: s.storeType,
      channelOffline: s.channelOffline, scale: s.scale, productSold: s.productSold, location: s.location, productType: s.productType, lat: s.lat, lng: s.lng,
    })),
  };
}

// ------------------------------------------------------------------ PDB-09 Dokumen (PRD Scope 1 FR-PD-007)
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

/**
 * Isi file dokumen untuk Unduh. Prototipe membuat file placeholder di browser (src/lib/download.js).
 * Skenario DevToolbar download = fail → DOWNLOAD_FAILED. Dokumen harus milik partner sesi (selain itu NOT_FOUND).
 */
export async function partnerDocumentFile(session, key) {
  await wait(300);
  const p = own(session);
  if (getScenario().download === 'fail') throw new ApiError('DOWNLOAD_FAILED');
  const doc = key === 'PKS' ? p.pks.file && { name: p.pks.file.name } : p.documents.find((d) => d.key === key && d.level === 'PARTNER' && d.file && d.verification === 'VALID')?.file;
  if (!doc) throw new ApiError('NOT_FOUND');
  return placeholderFile(doc.name);
}
