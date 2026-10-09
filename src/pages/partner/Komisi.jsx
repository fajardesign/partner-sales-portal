import { useEffect, useState } from 'react';
import { Badge } from '@ds/index.js';
import { PartnerShell } from '../../components/PartnerShell.jsx';
import { DataTable } from '../../components/DataTable.jsx';
import { ListCard } from '../../components/ListCard.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import emptyUsers from '../../assets/empty-users.png';
import { KeyValueGrid, SectionCard } from '../../components/KeyValueGrid.jsx';
import { StatCard, StatGrid } from '../../components/StatCard.jsx';
import { TbdCallout } from '../../components/TbdCallout.jsx';
import { partnerCommission } from '../../api/mockApi.js';
import { useScenario } from '../../dev/scenario.js';
import { achievementCell } from '../../lib/achievement.jsx';
import { bar, nowrap } from '../../lib/cells.jsx';
import { formatDate, formatPct, formatRp, monthLabel } from '../../lib/format.js';

const StatusChip = ({ status }) => <Badge color={status === 'ESTIMATE' ? 'orange' : 'green'} size="md">{status === 'ESTIMATE' ? 'Estimasi' : 'Dibayar'}</Badge>;
const payDate = (ymd) => formatDate(new Date(`${ymd}T05:00:00Z`));

/** PDB-07 · Komisi (PRD v3 F4): estimasi bulan berjalan + riwayat per bulan; read-only. Skema dari Super Admin (INC). */
export function Komisi(props) {
  const { tableState } = useScenario();
  return <KomisiView key={tableState} {...props} />;
}

function KomisiView({ user, onLogout, path }) {
  const [d, setD] = useState(null);
  const [view, setView] = useState('loading');
  const load = (retry) => { setView('loading'); partnerCommission(user, { retry }).then((r) => { setD(r); setView(r.history.length ? 'data' : 'empty'); }, () => setView('error')); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(false); }, []);
  const ld = view === 'loading';
  const c = d?.current;

  const columns = [
    { key: 'month', header: 'Bulan', render: (r) => ({ priority: 'leading', title: nowrap(monthLabel(r.month, true)), description: `Versi skema ${r.version}` }) },
    { key: 'paid', header: 'Nominal Cair', align: 'right', render: (r) => ({ priority: 'regular', title: nowrap(formatRp(r.paidOutAmount)), description: r.target ? nowrap(`Target ${formatRp(r.target)}`) : 'Target -' }) },
    { key: 'ach', header: 'Pencapaian', render: (r) => achievementCell(r.paidOutAmount, r.target) },
    { key: 'tier', header: 'Tier', render: (r) => nowrap(r.tier) },
    { key: 'components', header: 'Komponen', render: (r) => ({ priority: 'passive', title: (
      <span style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {r.components.map((x) => <span key={x.label}><span style={{ color: 'var(--text-strong-950)' }}>{x.label}: {nowrap(formatRp(x.amount))}</span> · {x.detail}</span>)}
      </span>
    ) }) },
    { key: 'total', header: 'Komisi', align: 'right', render: (r) => ({ priority: 'leading', title: nowrap(formatRp(r.total)) }) },
    { key: 'status', header: 'Status', render: (r) => ({ misc: true, children: <StatusChip status={r.status} /> }) },
    { key: 'pay', header: 'Tanggal Bayar', render: (r) => nowrap(payDate(r.payDate)) },
  ];

  return (
    <PartnerShell active={path} icon="HandCoinLine" title="Komisi" description="Estimasi komisi bulan ini dan riwayat komisi per bulan. Pembayaran dilakukan di luar aplikasi ini." user={user} onLogout={onLogout}>
      <TbdCallout>Sumber target paid out dan collection yang dipakai untuk pencapaian dan tier. Prototipe memakai target contoh.</TbdCallout>
      {view === 'error' ? <ListCard view="error" onRetry={() => load(true)} /> : (
        <>
          <SectionCard title={`Estimasi bulan ini · ${monthLabel(d?.current?.month ?? '2026-10', true)}`} badge={c ? <StatusChip status={c.status} /> : null}>
            {ld ? bar('100%', 160, 'var(--rounded-12)') : !c ? <span style={{ font: 'var(--paragraph-sm)', color: 'var(--text-sub-600)' }}>Belum ada estimasi komisi bulan ini.</span> : (
              <>
                <StatGrid min={220}>
                  <StatCard icon="HandCoinLine" color="green" label="Estimasi komisi" value={formatRp(c.total)} hint={`Dibayar ${payDate(c.payDate)}`} />
                  <StatCard icon="MoneyDollarCircleLine" color="blue" label="Nominal cair" value={formatRp(c.paidOutAmount)} hint={c.target ? `Target ${formatRp(c.target)}` : 'Target -'} />
                  <StatCard icon="BarChartLine" color="purple" label="Pencapaian" value={c.target ? formatPct(c.achievement) : '-'} hint={c.tier === '-' ? undefined : `Tier ${c.tier}`} />
                </StatGrid>
                <KeyValueGrid items={[
                  { label: 'Skema', value: `Partner · ${c.scheme} · Versi ${c.version}` },
                  { label: 'Tanggal bayar', value: payDate(c.payDate) },
                  ...c.components.map((x) => ({ label: x.label, value: formatRp(x.amount), hint: x.detail })),
                ]} />
              </>
            )}
          </SectionCard>
          <SectionCard title="Riwayat komisi">
            {view === 'empty' ? <EmptyState image={emptyUsers} message="Belum ada riwayat komisi." /> : (
              <div style={{ overflowX: 'auto' }}>
                <DataTable loading={ld} rows={d?.history ?? []} rowKey={(r) => r.month} columns={columns} minWidth={1200} skeletonRows={4} />
              </div>
            )}
          </SectionCard>
        </>
      )}
    </PartnerShell>
  );
}
