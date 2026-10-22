/**
 * API PRD Scope 3 untuk Partner Dashboard (FR-PI-004/006/007/008): hanya data partner milik sesi. Perhitungan memakai
 * src/api/scope3.js (salinan identik dari admin-sales-portal). Partner tidak pernah melihat angka sales, nama SA/SR, atau TL.
 */
import { ApiError, listGate, maskName, wait } from './mockApi.js';
import { loans, partners } from './db.js';
import { CURRENT_MONTH, MONTHS } from './db.js';
import { PORTAL_STATUS, configFor, countsFor, dataAsOf, monthStatus, partnerRows, pipeline, portalStatus } from './scope3.js';
import { PAGE_SIZE } from '../lib/constants.js';

const mine = (session) => partners.find((p) => p.id === session?.partnerId);
const storeNameOf = (p, id) => p.stores.find((s) => s.id === id)?.name ?? '-';
export { PORTAL_STATUS };
/** Bulan yang dipilih (12 terakhir, terbaru dulu). */
export const partnerMonths = () => [...MONTHS].reverse().slice(0, 12);

/** Satu bulan insentif partner: target, Cair dihitung, capaian, tier, insentif, status bulan dan pembayaran, rincian per toko. */
export async function partnerIncentive(session, ym, { retry = false } = {}) {
  const empty = await listGate(retry);
  const p = mine(session);
  if (!p) throw new ApiError('NOT_FOUND');
  const { rows, asOf } = await partnerRows(ym, { partnerId: p.id }, { retry: true });
  const r = empty ? null : rows[0] ?? null;
  const perStore = new Map();
  loans.filter((l) => l.partnerId === p.id && countsFor(l, ym)).forEach((l) => perStore.set(l.storeId, (perStore.get(l.storeId) ?? 0) + l.amount));
  const stores = p.stores.filter((s) => s.status !== 'CANCELLED').map((s) => ({ id: s.id, name: s.name, amount: perStore.get(s.id) ?? 0 }));
  return { row: r, stores, tiers: configFor('partner', ym).tiers, monthStatus: monthStatus(ym), asOf };
}
/** Riwayat 12 bulan (terbaru dulu): status, target, Cair dihitung, capaian, koefisien, insentif, status pembayaran. */
export async function partnerIncentiveHistory(session, { retry = false } = {}) {
  const empty = await listGate(retry);
  const p = mine(session);
  if (!p) throw new ApiError('NOT_FOUND');
  if (empty) return [];
  const out = [];
  for (const ym of partnerMonths()) {
    const { rows } = await partnerRows(ym, { partnerId: p.id }, { retry: true });
    if (rows[0]) out.push(rows[0]);
  }
  return out;
}
/** Beranda: insentif bulan berjalan + bulan Final terakhir. */
export async function partnerIncentiveHome(session, { retry = false } = {}) {
  await wait(200);
  const cur = await partnerIncentive(session, CURRENT_MONTH, { retry });
  const lastFinal = partnerMonths().find((m) => monthStatus(m) === 'FINAL');
  const fin = lastFinal ? (await partnerRows(lastFinal, { partnerId: session.partnerId }, { retry: true })).rows[0] ?? null : null;
  return { current: cur.row, asOf: cur.asOf, lastFinal: fin };
}

/**
 * Pinjaman bulan ym toko milik partner (FR-PI-007): funnel, daftar terbaru dulu dengan halaman, filter toko dan status, cari
 * nomor referensi. Tanpa NIK, telepon, alamat, nama SA/SR, atau TL; nama nasabah disamarkan.
 */
export async function partnerLoans(session, ym, f = {}, page = 1, { retry = false } = {}) {
  const p = mine(session);
  if (!p) throw new ApiError('NOT_FOUND');
  const d = await pipeline(ym, { partnerId: p.id }, { status: f.status, storeId: f.storeId, q: f.q }, { retry });
  const toRow = (l) => ({
    id: l.id, customer: maskName(l.customer), store: storeNameOf(p, l.storeId), amount: l.amount, portalStatus: l.portalStatus,
    submittedAt: l.submittedAt, paidOutAt: l.paidOutAt, counted: l.counted, paidLater: l.paidLater,
  });
  return {
    funnel: d.funnel, total: d.total, countedAmount: d.countedAmount, countedCount: d.countedCount, asOf: d.asOf,
    filtered: d.rows.length, rows: d.rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(toRow),
  };
}
/** Detail satu pinjaman; pinjaman partner lain atau tidak ada → NOT_FOUND (halaman tidak ditemukan). */
export async function partnerLoan(session, id) {
  await wait(200);
  const p = mine(session);
  const l = loans.find((x) => x.id === id);
  if (!p || !l || l.partnerId !== p.id) throw new ApiError('NOT_FOUND');
  const ym = new Date(new Date(l.submittedAt).getTime() + 7 * 3600e3).toISOString().slice(0, 7);
  return {
    id: l.id, customer: maskName(l.customer), store: storeNameOf(p, l.storeId), amount: l.amount, portalStatus: portalStatus(l),
    submittedAt: l.submittedAt, updatedAt: l.updatedAt, paidOutAt: l.paidOutAt, counted: countsFor(l, ym), paidLater: portalStatus(l) === 'CAIR' && !countsFor(l, ym), ym,
    rejectionReason: l.rejectionReason ?? null,
  };
}
/** Rekening partner (FR-PI-008), hanya baca; nomor rekening disamarkan 4 digit terakhir. null bila belum ada. */
export async function partnerBank(session, { retry = false } = {}) {
  await listGate(retry);
  const p = mine(session);
  if (!p) throw new ApiError('NOT_FOUND');
  return { bank: p.bank?.accountNumber ? p.bank : null, asOf: dataAsOf() };
}
