import { useEffect, useState } from 'react';
import { Badge, StatusBadge } from '@ds/index.js';
import { PartnerShell } from '../../components/PartnerShell.jsx';
import { BarChart } from '../../components/BarChart.jsx';
import { DataTable } from '../../components/DataTable.jsx';
import { ListCard } from '../../components/ListCard.jsx';
import { SectionCard } from '../../components/KeyValueGrid.jsx';
import { StatCard, StatGrid } from '../../components/StatCard.jsx';
import { partnerDashboard } from '../../api/mockApi.js';
import { useScenario } from '../../dev/scenario.js';
import { bar, nowrap } from '../../lib/cells.jsx';
import { STORE_STATUS } from '../../lib/constants.js';
import { formatNumber, formatRp, monthLabel } from '../../lib/format.js';
import { navigate, withQuery } from '../../lib/router.js';
import { DeltaBadge, PeriodFilter, delta, periodQuery, usePeriod } from './common.jsx';

const SALES = [
  { key: 'submitted', label: 'Pinjaman diajukan', icon: 'FileList2Line', color: 'blue', fmt: formatNumber },
  { key: 'accepted', label: 'Pinjaman diterima', icon: 'CheckLine', color: 'teal', fmt: formatNumber, status: '' },
  { key: 'paidOut', label: 'Pinjaman cair', icon: 'Wallet3Line', color: 'purple', fmt: formatNumber, status: 'PAID_OUT' },
  { key: 'paidOutAmount', label: 'Nominal cair', icon: 'MoneyDollarCircleLine', color: 'green', fmt: formatRp, status: 'PAID_OUT' },
];
const STORE_BADGE = { ACTIVE: 'completed', PENDING: 'pending', INACTIVE: 'disabled' };

/** PDB-05 · Beranda Partner (PRD v3 F2): kartu penjualan vs periode sebelumnya, tren nominal cair per bulan, performa per toko. */
export function Beranda(props) {
  const { tableState } = useScenario();
  return <BerandaView key={tableState} {...props} />;
}

function BerandaView({ user, onLogout, query, path }) {
  const period = usePeriod(query);
  const [d, setD] = useState(null);
  const [view, setView] = useState('loading');
  const key = `${period.from}|${period.to}`;
  const load = (retry) => { setView('loading'); partnerDashboard(user, period, { retry }).then((r) => { setD(r); setView('data'); }, () => setView('error')); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(false); }, [key]);
  const toTx = (extra = {}) => navigate(withQuery('/transaksi', { ...periodQuery(query), ...extra }));
  const ld = view === 'loading';
  const multi = (d?.stores.length ?? 0) > 1;

  const columns = [
    ...(multi ? [{ key: 'rank', header: 'Peringkat', width: 96, render: (s) => ({ priority: 'leading', title: `#${s.rank}` }) }] : []),
    { key: 'name', header: 'Toko', render: (s) => ({ priority: 'leading', title: s.name, description: s.code ?? (s.primary ? 'Toko Utama' : 'Toko Tambahan') }) },
    { key: 'status', header: 'Status', render: (s) => ({ misc: true, children: <StatusBadge status={STORE_BADGE[s.status]}>{STORE_STATUS[s.status]}</StatusBadge> }) },
    { key: 'submitted', header: 'Pengajuan', align: 'right', render: (s) => ({ priority: 'regular', title: formatNumber(s.submitted) }) },
    { key: 'paidOut', header: 'Dicairkan', align: 'right', render: (s) => ({ priority: 'regular', title: formatNumber(s.paidOut) }) },
    { key: 'amount', header: 'Nominal Cair', align: 'right', render: (s) => ({ priority: 'leading', title: nowrap(formatRp(s.paidOutAmount)) }) },
  ];

  return (
    <PartnerShell active={path} icon="Dashboard3Line" title="Beranda" description={`Penjualan dari toko ${user.partnerName ?? 'Anda'}.`} user={user} onLogout={onLogout}>
      <PeriodFilter path={path} query={query} period={period} />
      {view === 'error' ? <ListCard view="error" onRetry={() => load(true)} /> : (
        <>
          <SectionCard title={`Penjualan · ${period.label}`}>
            <StatGrid min={230}>
              {SALES.map((m) => <StatCard key={m.key} icon={m.icon} color={m.color} label={m.label} value={ld ? '…' : m.fmt(d.cur[m.key])}
                hint={ld ? undefined : <DeltaBadge d={delta(d.cur[m.key], d.prev[m.key])} />} onClick={() => toTx(m.status ? { status: m.status } : {})} />)}
            </StatGrid>
          </SectionCard>
          <SectionCard title="Tren nominal cair per bulan">
            {ld ? bar('100%', 220, 'var(--rounded-12)') : d.months.every((x) => !x.amount) ? <span style={{ font: 'var(--paragraph-sm)', color: 'var(--text-sub-600)' }}>Belum ada pencairan pada periode ini.</span> : (
              <BarChart ariaLabel="Nominal cair per bulan" legend="Nominal cair (juta rupiah) per bulan berdasarkan tanggal pengajuan; batang gelap = bulan dalam periode"
                format={(v) => `${Math.round(v / 1e6).toLocaleString('id-ID')} jt`}
                data={d.months.map((x) => ({ label: monthLabel(x.month), value: x.amount, highlight: x.inPeriod }))} />
            )}
          </SectionCard>
          <SectionCard title={`Performa toko · ${period.label}`} badge={ld ? null : <Badge color="gray" size="md">{`${d.stores.length} toko`}</Badge>}
            actions={multi ? <span style={{ font: 'var(--paragraph-xs)', color: 'var(--text-sub-600)' }}>peringkat berdasarkan nominal cair</span> : null}>
            <div style={{ overflowX: 'auto' }}>
              <DataTable loading={ld} rows={d?.stores ?? []} columns={columns} minWidth={720} skeletonRows={3}
                onRowClick={(s) => toTx({ store: s.id })} />
            </div>
          </SectionCard>
        </>
      )}
    </PartnerShell>
  );
}
