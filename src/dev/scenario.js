import { useSyncExternalStore } from 'react';

/**
 * Skenario mock (hanya untuk development) — dipakai mock API untuk mensimulasikan state tabel, gangguan layanan login,
 * dan gagal unduh dokumen.
 */
export const SCENARIO_OPTIONS = {
  tableState: ['data', 'loading', 'empty', 'error'],
  service: ['ok', 'outage'],
  download: ['ok', 'fail'],
};
export const SCENARIO_LABELS = { tableState: 'Tabel', service: 'Layanan login', download: 'Unduh dokumen' };
export const DEFAULT_SCENARIO = { tableState: 'data', service: 'ok', download: 'ok' };

let state = { ...DEFAULT_SCENARIO };
const subs = new Set();

export const getScenario = () => state;
export function setScenario(patch) {
  state = { ...state, ...patch };
  subs.forEach((f) => f());
}
export const useScenario = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, getScenario);
