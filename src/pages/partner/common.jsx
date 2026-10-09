import { Badge, SegmentedControl, Select, TextInput } from '@ds/index.js';
import { currentMonth, monthRange, perfMonths, todayDate } from '../../api/mockApi.js';
import { formatDate, monthLabel } from '../../lib/format.js';
import { navigate, withQuery } from '../../lib/router.js';

/**
 * Periode dari URL (sama dengan Dashboard APL): default bulan ini; mode "bulan" (?m=YYYY-MM) atau "rentang" (?mode=rentang&from=&to=).
 * Return { mode, month?, from, to, label }.
 */
// eslint-disable-next-line react/only-export-components
export function usePeriod(query) {
  const months = perfMonths();
  if (query.get('mode') === 'rentang') {
    const min = `${months[0]}-01`;
    const today = todayDate();
    const clamp = (d, def) => (/^\d{4}-\d{2}-\d{2}$/.test(d ?? '') ? (d < min ? min : d > today ? today : d) : def);
    const from = clamp(query.get('from'), monthRange(currentMonth()).from);
    const toRaw = clamp(query.get('to'), today);
    const to = toRaw < from ? from : toRaw;
    return { mode: 'rentang', from, to, label: `${formatDate(new Date(`${from}T05:00:00Z`))} – ${formatDate(new Date(`${to}T05:00:00Z`))}` };
  }
  const m = months.includes(query.get('m')) ? query.get('m') : currentMonth();
  return { mode: 'bulan', month: m, ...monthRange(m), label: monthLabel(m, true) };
}

/** Perubahan vs periode sebelumnya: { text: "+5%", color } atau null. */
// eslint-disable-next-line react/only-export-components
export function delta(cur, prev) {
  if (!prev) return null;
  const d = Math.round(((cur - prev) / prev) * 100);
  return { text: `${d > 0 ? '+' : ''}${d}%`, color: d > 0 ? 'green' : d < 0 ? 'red' : 'gray' };
}

/** Badge perubahan vs periode sebelumnya ("+5%", "-3%"). */
export const DeltaBadge = ({ d }) => (d ? <Badge color={d.color} size="md">{`${d.text} vs periode sebelumnya`}</Badge> : <span style={{ font: 'var(--paragraph-xs)', color: 'var(--text-soft-400)' }}>Belum ada data periode sebelumnya</span>);

/** Filter periode (Bulan / Rentang). Nilai disimpan di URL; perubahan periode kembali ke halaman 1. children = filter tambahan. */
export function PeriodFilter({ path, query, period, children }) {
  const q = Object.fromEntries(query.entries());
  const set = (patch) => navigate(withQuery(path, { ...q, page: '', ...patch }));
  const months = perfMonths();
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-12)', flexWrap: 'wrap' }}>
      <SegmentedControl value={period.mode} onChange={(v) => set({ mode: v === 'bulan' ? '' : v })} items={[{ value: 'bulan', label: 'Bulan' }, { value: 'rentang', label: 'Rentang' }]} />
      {period.mode === 'bulan' ? (
        <div style={{ width: 200 }}><Select size="sm" value={period.month} placeholder="Pilih bulan" onChange={(v) => set({ m: v })} options={months.map((m) => ({ value: m, label: monthLabel(m, true) }))} /></div>
      ) : (
        <>
          <div style={{ width: 180 }}><TextInput size="sm" type="date" aria-label="Dari tanggal" value={period.from} min={`${months[0]}-01`} max={todayDate()} onChange={(e) => set({ from: e.target.value })} /></div>
          <span style={{ font: 'var(--paragraph-sm)', color: 'var(--text-sub-600)', paddingBottom: 'var(--space-8)' }}>s/d</span>
          <div style={{ width: 180 }}><TextInput size="sm" type="date" aria-label="Sampai tanggal" value={period.to} min={period.from} max={todayDate()} onChange={(e) => set({ to: e.target.value })} /></div>
        </>
      )}
      {children}
    </div>
  );
}

/** Query periode untuk tautan antar halaman (Beranda → Transaksi). */
// eslint-disable-next-line react/only-export-components
export const periodQuery = (query) => Object.fromEntries([...query.entries()].filter(([k]) => ['mode', 'm', 'from', 'to'].includes(k)));
