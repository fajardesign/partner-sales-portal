import { useEffect, useState } from 'react';
import { Drawer, DrawerHeader, Select, StatusBadge } from '@ds/index.js';
import { PartnerShell } from '../../components/PartnerShell.jsx';
import { DataTable } from '../../components/DataTable.jsx';
import { KeyValueGrid } from '../../components/KeyValueGrid.jsx';
import { ListCard, ListPager } from '../../components/ListCard.jsx';
import { SearchField } from '../../components/FilterBar.jsx';
import { StatCard, StatGrid } from '../../components/StatCard.jsx';
import { AsOf, MonthSelect } from '../../components/scope3/S3Common.jsx';
import { storeOptions } from '../../api/mockApi.js';
import { PORTAL_STATUS, partnerLoan, partnerLoans } from '../../api/partnerScope3.js';
import { useScenario } from '../../dev/scenario.js';
import { nowrap } from '../../lib/cells.jsx';
import { formatDateWIB, formatDateTime, formatNumber, formatRp, monthLabel } from '../../lib/format.js';
import { navigate, withQuery } from '../../lib/router.js';
import { defaultMonth } from '../../lib/s3.js';
import { errorView } from './common.jsx';

const BADGE = { DIAJUKAN: 'information', DISETUJUI: 'pending', DITOLAK: 'failed', CAIR: 'completed' };
const STATUS_OPTS = [{ value: '', label: 'Semua status' }, ...Object.entries(PORTAL_STATUS).map(([value, label]) => ({ value, label }))];
const dateCell = (d) => { if (!d) return '-'; const f = formatDateWIB(d); return { priority: 'regular', title: nowrap(f.date), description: f.time }; };

/**
 * SCR-3-13 · Pinjaman partner (PRD Scope 3 FR-PI-007): pinjaman toko milik partner per bulan pengajuan, funnel Diajukan /
 * Disetujui / Ditolak / Cair dan "Dihitung untuk insentif", filter toko dan status, cari nomor referensi, daftar terbaru dulu.
 * Detail lewat ?id=; pinjaman partner lain → halaman tidak ditemukan. Tanpa NIK, telepon, alamat, nama SA/SR, atau TL.
 */
export function Pinjaman(props) {
  const { tableState, s3Today } = useScenario();
  return <PinjamanView key={`${tableState}|${s3Today}`} {...props} />;
}

function PinjamanView({ user, onLogout, path, query }) {
  const q = Object.fromEntries(query.entries());
  const ym = defaultMonth(q.m);
  const page = Number(q.page) || 1;
  const [d, setD] = useState(null);
  const [view, setView] = useState('loading');
  const set = (patch) => navigate(withQuery('/pinjaman', { ...q, page: '', ...patch }));
  const load = (retry) => {
    setView('loading');
    partnerLoans(user, ym, { status: q.status, storeId: q.toko, q: q.q }, page, { retry })
      .then((r) => { setD(r); setView(r.total ? 'data' : 'empty'); }, (e) => setView(errorView(e)));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(false); }, [ym, q.status, q.toko, q.q, page]);
  const filtered = q.status || q.toko || q.q;

  const columns = [
    { key: 'id', header: 'No. Ref', render: (l) => ({ priority: 'leading', title: nowrap(l.id), description: l.customer }) },
    { key: 'store', header: 'Toko', render: (l) => l.store },
    { key: 'amount', header: 'Nominal', align: 'right', render: (l) => ({ priority: 'regular', title: nowrap(formatRp(l.amount)) }) },
    { key: 'status', header: 'Status', render: (l) => ({ misc: true, children: (
      <span style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
        <StatusBadge status={BADGE[l.portalStatus]}>{PORTAL_STATUS[l.portalStatus]}</StatusBadge>
        {l.paidLater && <span style={{ font: 'var(--paragraph-xs)', color: 'var(--text-sub-600)' }}>Cair bulan berikutnya, tidak dihitung</span>}
      </span>
    ) }) },
    { key: 'created', header: 'Diajukan', render: (l) => dateCell(l.submittedAt) },
    { key: 'paid', header: 'Cair', render: (l) => dateCell(l.paidOutAt) },
  ];

  return (
    <PartnerShell active={path} icon="FileList2Line" title="Pinjaman" description="Pinjaman yang diajukan melalui toko Anda." user={user} onLogout={onLogout}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-12)', flexWrap: 'wrap' }}>
        <MonthSelect value={ym} onChange={(v) => set({ m: v })} kind="PARTNER" />
        <div style={{ width: 240 }}><Select size="sm" value={q.toko ?? ''} placeholder="Semua toko" onChange={(v) => set({ toko: v })} options={[{ value: '', label: 'Semua toko' }, ...storeOptions(user)]} /></div>
        <div style={{ width: 180 }}><Select size="sm" value={q.status ?? ''} placeholder="Semua status" onChange={(v) => set({ status: v })} options={STATUS_OPTS} /></div>
        <SearchField placeholder="Cari nomor referensi" value={q.q ?? ''} onChange={(v) => set({ q: v })} />
      </div>
      <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-12)', flexWrap: 'wrap', font: 'var(--paragraph-sm)', color: 'var(--text-sub-600)' }}>
        Pengajuan dibuat di {monthLabel(ym, true)}{d && <AsOf asOf={d.asOf} ym={ym} kind="PARTNER" onRefresh={() => load(true)} />}
      </span>
      {d && view === 'data' && (
        <StatGrid min={170}>
          <StatCard icon="FileList2Line" color="blue" label="Diajukan" value={formatNumber(d.total)} hint="Semua pengajuan bulan ini" />
          <StatCard icon="CheckLine" color="teal" label="Disetujui" value={formatNumber(d.funnel.DISETUJUI.count)} hint="Belum cair" />
          <StatCard icon="CloseLine" color="red" label="Ditolak" value={formatNumber(d.funnel.DITOLAK.count)} />
          <StatCard icon="Wallet3Line" color="green" label="Cair" value={formatNumber(d.funnel.CAIR.count)} hint={`Total cair ${formatRp(d.funnel.CAIR.amount)}`} />
          <StatCard icon="HandCoinLine" color="purple" label="Dihitung untuk insentif" value={formatRp(d.countedAmount)} hint={`${formatNumber(d.countedCount)} pinjaman cair di bulan yang sama`} />
        </StatGrid>
      )}
      <ListCard view={view} onRetry={() => load(true)} emptyMessage={`Belum ada pengajuan di ${monthLabel(ym, true)}.`}
        footer={view === 'data' && d.filtered > 0 && <ListPager page={page} total={d.filtered} noun="pinjaman" onChange={(p) => set({ page: String(p) })} />}>
        {view === 'data' && d.filtered === 0 && <span style={{ display: 'block', padding: 'var(--space-16)', font: 'var(--paragraph-sm)', color: 'var(--text-sub-600)' }}>{filtered ? 'Tidak ada pinjaman yang sesuai dengan pencarian atau filter.' : `Belum ada pengajuan di ${monthLabel(ym, true)}.`}</span>}
        {(view === 'loading' || (view === 'data' && d.filtered > 0)) && <DataTable loading={view === 'loading'} rows={d?.rows ?? []} columns={columns} minWidth={860} onRowClick={(l) => set({ id: l.id, page: q.page ?? '' })} />}
      </ListCard>
      {q.id && <LoanDrawer id={q.id} user={user} onClose={() => set({ id: '', page: q.page ?? '' })} />}
    </PartnerShell>
  );
}

/** Detail pinjaman (read-only). Pinjaman partner lain → "Halaman tidak ditemukan". */
function LoanDrawer({ id, user, onClose }) {
  const [l, setL] = useState(null);
  const [view, setView] = useState('loading');
  useEffect(() => { partnerLoan(user, id).then((x) => { setL(x); setView('data'); }, (e) => setView(errorView(e))); }, [id, user]);
  return (
    <Drawer open width={520} onClose={onClose} header={<DrawerHeader size="lg" title={l ? l.id : 'Detail pinjaman'} description={l ? l.store : undefined} icon="FileList2Line" onClose={onClose} />}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)', padding: 'var(--space-16) var(--space-24) var(--space-24)' }}>
        {view !== 'data' ? <ListCard view={view} onRetry={() => onClose()} /> : (
          <>
            <StatusBadge status={BADGE[l.portalStatus]}>{PORTAL_STATUS[l.portalStatus]}</StatusBadge>
            {l.paidLater && <span style={{ font: 'var(--paragraph-sm)', color: 'var(--text-sub-600)' }}>Cair di bulan berikutnya, tidak dihitung untuk insentif {monthLabel(l.ym, true)}.</span>}
            <KeyValueGrid items={[
              { label: 'Nasabah', value: l.customer }, { label: 'Nominal', value: formatRp(l.amount) },
              { label: 'Toko', value: l.store, full: true },
              { label: 'Diajukan', value: formatDateTime(l.submittedAt) },
              { label: 'Cair', value: formatDateTime(l.paidOutAt) },
              { label: 'Terakhir diperbarui', value: formatDateTime(l.updatedAt) },
            ]} />
          </>
        )}
      </div>
    </Drawer>
  );
}
