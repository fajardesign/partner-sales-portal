import { useSyncExternalStore } from 'react';

/**
 * Skenario mock (hanya untuk development) — dipakai mock API untuk mensimulasikan state tabel dan gangguan layanan login.
 */
export const SCENARIO_OPTIONS = {
  tableState: ['data', 'loading', 'empty', 'error'],
  service: ['ok', 'outage'],
};
export const SCENARIO_LABELS = { tableState: 'Tabel', service: 'Layanan login' };
export const DEFAULT_SCENARIO = { tableState: 'data', service: 'ok' };

let state = { ...DEFAULT_SCENARIO };
const subs = new Set();

export const getScenario = () => state;
export function setScenario(patch) {
  state = { ...state, ...patch };
  subs.forEach((f) => f());
}
export const useScenario = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, getScenario);
