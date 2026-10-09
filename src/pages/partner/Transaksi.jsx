import { useEffect, useState } from 'react';
import { Select, StatusBadge } from '@ds/index.js';
import { PartnerShell } from '../../components/PartnerShell.jsx';
import { DataTable } from '../../components/DataTable.jsx';
import { ListCard, ListPager } from '../../components/ListCard.jsx';
import { SearchField } from '../../components/FilterBar.jsx';
import { TbdCallout } from '../../components/TbdCallout.jsx';
import { CRM_STATUS, partnerTransactions, storeOptions } from '../../api/mockApi.js';
import { useScenario } from '../../dev/scenario.js';
import { nowrap } from '../../lib/cells.jsx';
import { formatDateWIB, formatRp } from '../../lib/format.js';
import { navigate, withQuery } from '../../lib/router.js';
import { PeriodFilter, errorView, usePeriod } from './common.jsx';

const BADGE = { SUBMITTED: 'information', IN_PROCESS: 'pending', APPROVED: 'information', REJECTED: 'failed', PAID_OUT: 'completed' };
const dateCell = (d) => { const f = formatDateWIB(d); return { priority: 'regular', title: nowrap(f.date), description: f.time }; };

/** PDB-06 · Transaksi (PRD v3 F3): pengajuan pinjaman dari toko partner, read-only; ID & nama nasabah disamarkan. */
export function Transaksi(props) {
  const { tableState } = useScenario();
  return <TransaksiView key={tableState} {...props} />;
}

function TransaksiView({ user, onLogout, query, path }) {
  const period = usePeriod(query);
  const f = { q: query.get('q') ?? '', store: query.get('store') ?? '', status: query.get('status') ?? '', sort: query.get('sort') ?? 'submitted:desc' };
  const page = Number(query.get('page')) || 1;
  const [data, setData] = useState(null);
  const [view, setView] = useState('loading');
  const [q, setQ] = useState(f.q);
  const set = (patch) => navigate(withQuery(path, { ...Object.fromEntries(query.entries()), page: '', ...patch }));
  const key = JSON.stringify([period.from, period.to, f, page]);
  const load = (retry) => {
    setView('loading');
    partnerTransactions(user, period, f, page, { retry }).then((r) => { setData(r); setView(r.total ? 'data' : 'empty'); }, (e) => setView(errorView(e)));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(false); }, [key]);
  // Cari diterapkan setelah berhenti mengetik.
  useEffect(() => {
    if (q === f.q) return undefined;
    const t = setTimeout(() => set({ q }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const [sk, sd] = f.sort.split(':');
  const onSort = (k) => set({ sort: `${k}:${sk === k && sd === 'desc' ? 'asc' : 'desc'}` });
  const filtered = Boolean(f.q || f.store || f.status);
  const columns = [
    { key: 'submitted', header: 'Tanggal Pengajuan', sortKey: 'submitted', render: (l) => dateCell(l.submittedAt) },
    { key: 'id', header: 'ID Aplikasi', render: (l) => ({ priority: 'leading', title: nowrap(l.maskedId) }) },
    { key: 'customer', header: 'Nasabah', render: (l) => nowrap(l.customer) },
    { key: 'store', header: 'Toko', render: (l) => ({ priority: 'regular', title: l.store }) },
    { key: 'amount', header: 'Nominal', sortKey: 'amount', align: 'right', render: (l) => ({ priority: 'regular', title: nowrap(formatRp(l.amount)) }) },
    { key: 'status', header: 'Status', render: (l) => ({ misc: true, children: <StatusBadge status={BADGE[l.status]}>{CRM_STATUS[l.status]}</StatusBadge> }) },
    { key: 'updated', header: 'Terakhir Diperbarui', sortKey: 'updated', render: (l) => dateCell(l.updatedAt) },
  ];

  return (
    <PartnerShell active={path} icon="FileList2Line" title="Transaksi" description="Pengajuan pinjaman dari toko Anda. Data dari CRM, hanya dapat dilihat." user={user} onLogout={onLogout}>
      <PeriodFilter path={path} query={query} period={period}>
        <div style={{ width: 240 }}>
          <Select size="sm" value={f.store} placeholder="Semua toko" onChange={(v) => set({ store: v })}
            options={[{ value: '', label: 'Semua toko' }, ...storeOptions(user)]} />
        </div>
        <div style={{ width: 180 }}>
          <Select size="sm" value={f.status} placeholder="Semua status" onChange={(v) => set({ status: v })}
            options={[{ value: '', label: 'Semua status' }, ...Object.entries(CRM_STATUS).map(([value, label]) => ({ value, label }))]} />
        </div>
      </PeriodFilter>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-12)', flexWrap: 'wrap' }}>
        <SearchField value={q} onChange={setQ} placeholder="Cari 4 digit terakhir ID aplikasi" />
        <span style={{ font: 'var(--paragraph-sm)', color: 'var(--text-sub-600)' }}>{period.label}</span>
      </div>
      <TbdCallout>Format penyamaran ID aplikasi dan nama nasabah perlu dikonfirmasi.</TbdCallout>
      <ListCard view={['empty', 'error', 'notfound'].includes(view) ? view : null} onRetry={() => load(true)}
        emptyMessage={filtered ? 'Tidak ada transaksi yang sesuai dengan pencarian atau filter.' : 'Belum ada transaksi pada periode ini.'}
        footer={view === 'data' && <ListPager page={data.page} total={data.total} noun="transaksi" onChange={(p) => set({ page: String(p) })} />}>
        {(view === 'loading' || view === 'data') && (
          <DataTable loading={view === 'loading'} rows={data?.rows ?? []} columns={columns} sort={f.sort} onSort={onSort} minWidth={1040} />
        )}
      </ListCard>
    </PartnerShell>
  );
}
