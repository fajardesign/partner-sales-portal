import { useSyncExternalStore } from 'react';

/**
 * Skenario mock (hanya untuk development) — dipakai mock API untuk mensimulasikan state tabel, gangguan layanan login,
 * dan gagal unduh dokumen.
 */
export const SCENARIO_OPTIONS = {
  tableState: ['data', 'loading', 'empty', 'error'],
  service: ['ok', 'outage'],
  download: ['ok', 'fail'],
  // PRD Scope 3: tanggal hari ini untuk status bulan. Cut-off September: sales 5 Okt, partner 10 Okt; bayar sales 10, partner 15.
  // 2026-10-03 = keduanya rekonsiliasi; 2026-10-07 = sales Final, partner rekonsiliasi; 2026-10-12 = sales pencatatan, partner Final.
  s3Today: ['2026-10-07', '2026-10-03', '2026-10-12'],
};
export const SCENARIO_LABELS = { tableState: 'Tabel', service: 'Layanan login', download: 'Unduh dokumen', s3Today: 'Tanggal Scope 3' };
export const DEFAULT_SCENARIO = { tableState: 'data', service: 'ok', download: 'ok', s3Today: '2026-10-07' };

let state = { ...DEFAULT_SCENARIO };
const subs = new Set();

export const getScenario = () => state;
export function setScenario(patch) {
  state = { ...state, ...patch };
  subs.forEach((f) => f());
}
export const useScenario = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, getScenario);
