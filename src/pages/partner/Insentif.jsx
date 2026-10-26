import { useEffect, useState } from 'react';
import { Alert } from '@ds/index.js';
import { PartnerShell } from '../../components/PartnerShell.jsx';
import { DataTable } from '../../components/DataTable.jsx';
import { KeyValueGrid, SectionCard } from '../../components/KeyValueGrid.jsx';
import { ListCard } from '../../components/ListCard.jsx';
import { AsOf, IncentiveBlock, MonthSelect, MonthStatusBadge, PaymentBadge, PaymentLine } from '../../components/scope3/S3Common.jsx';
import { partnerIncentive, partnerIncentiveHistory } from '../../api/partnerScope3.js';
import { rateLabel } from '../../api/scope3.js';
import { useScenario } from '../../dev/scenario.js';
import { nowrap } from '../../lib/cells.jsx';
import { PARTNER_CONTACT } from '../../lib/constants.js';
import { formatPct, formatRp, monthLabel } from '../../lib/format.js';
import { navigate, withQuery } from '../../lib/router.js';
import { defaultMonth, monthNote } from '../../lib/s3.js';
import { errorView } from './common.jsx';

const muted = { font: 'var(--paragraph-sm)', color: 'var(--text-sub-600)' };

/**
 * SCR-3-12 · Insentif partner (PRD Scope 3 FR-PI-002/004/006): per bulan target partner, Cair dihitung, capaian, tier dan
 * koefisien, insentif partner, status bulan dan pembayaran (dengan koreksi), rincian Cair dihitung per toko (tanpa insentif per
 * toko), tabel tier, dan riwayat 12 bulan. Hanya volume; tanpa collection (MFP), affiliate, atau CRP.
 */
export function Insentif(props) {
  const { tableState, s3Today } = useScenario();
  return <InsentifView key={`${tableState}|${s3Today}`} {...props} />;
}

function InsentifView({ user, onLogout, path, query }) {
  const q = Object.fromEntries(query.entries());
  const ym = defaultMonth(q.m);
  const [d, setD] = useState(null);
  const [history, setHistory] = useState(null);
  const [view, setView] = useState('loading');
  const load = (retry) => {
    setView('loading');
    Promise.all([partnerIncentive(user, ym, { retry }), partnerIncentiveHistory(user, { retry })])
      .then(([cur, h]) => { setD(cur); setHistory(h); setView(cur.row ? 'data' : 'empty'); }, (e) => setView(errorView(e)));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(false); }, [ym]);
  const r = d?.row ? { ...d.row } : null;

  return (
    <PartnerShell active={path} icon="HandCoinLine" title="Insentif" description="Insentif bulanan partner dari pinjaman toko Anda." user={user} onLogout={onLogout}>
      <MonthSelect value={ym} onChange={(v) => navigate(withQuery('/insentif', { m: v }))} kind="PARTNER" />
      <span style={muted}>Insentif dihitung dari pinjaman yang diajukan dan cair di bulan yang sama.</span>
      {view !== 'data' ? (
        <ListCard view={view} onRetry={() => load(true)} emptyMessage={`Belum ada data insentif untuk ${monthLabel(ym, true)}.`} />
      ) : (
        <>
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', flexWrap: 'wrap' }}>
            <MonthStatusBadge status={r.monthStatus} /><span style={muted}>{monthNote(ym, 'PARTNER')}</span><AsOf asOf={d.asOf} ym={ym} kind="PARTNER" onRefresh={() => load(true)} />
          </span>
          <SectionCard title={`Insentif partner ${formatRp(r.incentive)}`} badge={<PaymentBadge payment={r.payment} />}>
            <IncentiveBlock r={r} tiers={d.tiers} />
            <PaymentLine payment={r.payment} />
          </SectionCard>
          <SectionCard title="Cair dihitung per toko">
            <KeyValueGrid columns={1} items={d.stores.map((s) => ({ label: s.name, value: formatRp(s.amount) }))} />
          </SectionCard>
        </>
      )}
      <SectionCard title="Riwayat insentif">
        {history == null ? <span role="status" style={muted}>Memuat riwayat...</span> : history.length === 0 ? <span style={muted}>Belum ada riwayat insentif.</span> : (
          <div style={{ overflowX: 'auto' }}>
            <DataTable rows={history} rowKey={(h) => h.ym} minWidth={720} onRowClick={(h) => navigate(withQuery('/insentif', { m: h.ym }))} columns={[
              { key: 'm', header: 'Bulan', render: (h) => ({ misc: true, children: <span style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', alignItems: 'flex-start' }}>{nowrap(monthLabel(h.ym, true))}<MonthStatusBadge status={h.monthStatus} /></span> }) },
              { key: 't', header: 'Cair dihitung', align: 'right', render: (h) => ({ priority: 'regular', title: nowrap(formatRp(h.actual)), description: `Target ${formatRp(h.target)}` }) },
              { key: 'a', header: 'Capaian', align: 'right', render: (h) => ({ priority: 'regular', title: formatPct(h.achievement, 1), description: `Koefisien ${rateLabel(h.coefficient)}` }) },
              { key: 'i', header: 'Insentif', render: (h) => ({ misc: true, children: <span style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}><span style={{ font: 'var(--label-sm)', color: 'var(--text-strong-950)', whiteSpace: 'nowrap' }}>{formatRp(h.incentive)}</span><PaymentLine payment={h.payment} /></span> }) },
            ]} />
          </div>
        )}
      </SectionCard>
      <Alert status="information" size="sm" title={`Ada pertanyaan? Hubungi Amar Bank melalui ${PARTNER_CONTACT.channel} ${PARTNER_CONTACT.number}.`} />
    </PartnerShell>
  );
}
