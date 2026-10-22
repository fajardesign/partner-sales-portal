import { useEffect, useState } from 'react';
import { Badge, Icon, KeyIcon } from '@ds/index.js';
import { PartnerShell } from '../../components/PartnerShell.jsx';
import { ListCard } from '../../components/ListCard.jsx';
import { SectionCard } from '../../components/KeyValueGrid.jsx';
import { partnerHome } from '../../api/mockApi.js';
import { partnerIncentiveHome } from '../../api/partnerScope3.js';
import { rateLabel } from '../../api/scope3.js';
import { AsOf, BandBadge, PaymentBadge, PaymentLine } from '../../components/scope3/S3Common.jsx';
import { formatPct, formatRp, monthLabel } from '../../lib/format.js';
import { useScenario } from '../../dev/scenario.js';
import { bar } from '../../lib/cells.jsx';
import { PARTNER_STATUS } from '../../lib/constants.js';
import { navigate } from '../../lib/router.js';
import { errorView } from './common.jsx';

/** Tautan ke halaman Scope 1 (tampil bila sesi memiliki feature-nya). */
const LINKS = [
  { path: '/insentif', feature: 'PARTNER_COMMISSION', icon: 'HandCoinLine', title: 'Insentif', description: 'Lihat insentif bulanan, capaian target, dan status pembayaran.' },
  { path: '/pinjaman', feature: 'TRANSACTION_INQUIRY', icon: 'FileList2Line', title: 'Pinjaman', description: 'Pantau pinjaman yang diajukan melalui toko Anda.' },
  { path: '/rekening', feature: 'PARTNER_PROFILE', icon: 'BankLine', title: 'Rekening', description: 'Lihat rekening tujuan pembayaran insentif.' },
  { path: '/profil', feature: 'PARTNER_PROFILE', icon: 'Building2Line', title: 'Profil', description: 'Lihat data partner, PIC, rekening, dan toko.' },
  { path: '/dokumen', feature: 'DOCUMENT_REPOSITORY', icon: 'FolderLine', title: 'Dokumen', description: 'Lihat dan unduh PKS serta dokumen kemitraan.' },
];

/**
 * PDB-05 · Beranda Partner (PRD Scope 1 FR-PD-005; PRD Scope 3 FR-PI-006, SCR-3-11): sapaan PIC, nama & status partner, jumlah
 * toko; kartu "Insentif bulan ini" (estimasi, capaian terhadap target, kekurangan untuk tier berikutnya, Data per) dan bulan Final
 * terakhir dengan status pembayaran; tautan ke Insentif, Pinjaman, Rekening, Profil, Dokumen. State: loading, data, error, notfound.
 */
export function Beranda(props) {
  const { tableState } = useScenario();
  return <BerandaView key={tableState} {...props} />;
}

function BerandaView({ user, onLogout, path }) {
  const [d, setD] = useState(null);
  const [view, setView] = useState('loading');
  const [inc, setInc] = useState(null);
  const load = (retry) => {
    setView('loading');
    Promise.all([partnerHome(user, { retry }), partnerIncentiveHome(user, { retry: true })])
      .then(([r, i]) => { setD(r); setInc(i); setView('data'); }, (e) => setView(errorView(e)));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(false); }, []);
  const ld = view === 'loading';
  const st = d && (PARTNER_STATUS[d.status] ?? { label: d.status, color: 'gray' });
  const links = LINKS.filter((l) => user.features.includes(l.feature));

  return (
    <PartnerShell active={path} icon="Dashboard3Line" title="Beranda Partner" description="Ringkasan partner Anda." user={user} onLogout={onLogout}>
      {view === 'error' || view === 'notfound' ? <ListCard view={view} onRetry={() => load(true)} /> : (
        <>
          <SectionCard>
            {ld ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
                {bar('40%', 28, 'var(--rounded-8)')}
                {bar('60%', 20, 'var(--rounded-8)')}
                {bar('30%', 20, 'var(--rounded-8)')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
                <h2 style={{ margin: 0, font: 'var(--title-h5)', color: 'var(--text-strong-950)', overflowWrap: 'anywhere' }}>{`Halo, ${d.picName.split(' ')[0]}`}</h2>
                <dl style={{ margin: 0, display: 'flex', flexWrap: 'wrap', gap: 'var(--space-16) var(--space-32)' }}>
                  <Fact label="Partner"><span style={{ overflowWrap: 'anywhere' }}>{d.partnerName}</span></Fact>
                  <Fact label="Status partner"><Badge color={st.color} size="md">{st.label}</Badge></Fact>
                  <Fact label="Jumlah toko">{`${d.storeCount} toko`}</Fact>
                </dl>
              </div>
            )}
          </SectionCard>
          {inc && <IncentiveCards inc={inc} onRefresh={() => load(true)} />}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, calc(var(--space-48) * 6)), 1fr))', gap: 'var(--space-12)' }}>
            {links.map((l) => <LinkCard key={l.path} {...l} />)}
          </div>
        </>
      )}
    </PartnerShell>
  );
}

const Fact = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', minWidth: 0 }}>
    <dt style={{ font: 'var(--paragraph-xs)', color: 'var(--text-sub-600)' }}>{label}</dt>
    <dd style={{ margin: 0, font: 'var(--label-md)', color: 'var(--text-strong-950)' }}>{children}</dd>
  </div>
);

/** Kartu tautan (komposisi KeyIcon + token, pola sama dengan StatCard). Tinggi ≥ 44px untuk sentuhan. */
function LinkCard({ path, icon, title, description }) {
  const [hover, setHover] = useState(false);
  return (
    <button type="button" onClick={() => navigate(path)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-12)', padding: 'var(--space-16)', borderRadius: 'var(--rounded-16)', border: 0, textAlign: 'left', cursor: 'pointer', minWidth: 0,
        background: hover ? 'var(--bg-weak-50)' : 'var(--bg-white-0)', boxShadow: hover ? 'none' : 'var(--shadow-stroke)', transition: 'background var(--duration-fast) var(--ease-standard)',
      }}>
      <KeyIcon icon={icon} color="blue" variant="lighter" size="md" />
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', minWidth: 0 }}>
        <span style={{ font: 'var(--label-md)', color: 'var(--text-strong-950)' }}>{title}</span>
        <span style={{ font: 'var(--paragraph-sm)', color: 'var(--text-sub-600)' }}>{description}</span>
      </span>
      <span style={{ color: 'var(--icon-soft-400)', display: 'flex' }}><Icon name="ArrowRightSLine" /></span>
    </button>
  );
}

/** Kartu insentif bulan berjalan dan bulan Final terakhir (FR-PI-006). */
function IncentiveCards({ inc, onRefresh }) {
  const c = inc.current;
  const f = inc.lastFinal;
  const muted = { font: 'var(--paragraph-sm)', color: 'var(--text-sub-600)' };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, calc(var(--space-48) * 7)), 1fr))', gap: 'var(--space-12)' }}>
      <SectionCard title="Insentif bulan ini" badge={c && <BandBadge band={c.band} />}>
        {!c || c.actual === 0 ? <span style={muted}>Belum ada pinjaman cair bulan ini.</span> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
            <span style={{ font: 'var(--title-h5)', color: 'var(--text-strong-950)' }}>{formatRp(c.incentive)}</span>
            <span style={muted}>Estimasi dari {formatRp(c.actual)} cair dihitung · target {formatRp(c.target)} ({formatPct(c.achievement, 1)})</span>
            <div role="progressbar" aria-valuenow={Math.round(c.achievement)} aria-valuemin={0} aria-valuemax={100} aria-label="Capaian target"
              style={{ height: 'var(--space-8)', borderRadius: 'var(--rounded-full)', background: 'var(--bg-soft-200)', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, c.achievement)}%`, height: '100%', background: 'var(--primary-base)' }} />
            </div>
            {c.next && <span style={muted}>Butuh {formatRp(c.next.needed)} lagi untuk tier {rateLabel(c.next.tier.rate)}</span>}
          </div>
        )}
        <AsOf asOf={inc.asOf} ym={c?.ym} onRefresh={onRefresh} />
      </SectionCard>
      <SectionCard title={f ? `Insentif ${monthLabel(f.ym, true)}` : 'Bulan final terakhir'} badge={f && <PaymentBadge payment={f.payment} />}>
        {!f ? <span style={muted}>Belum ada bulan yang final.</span> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
            <span style={{ font: 'var(--title-h5)', color: 'var(--text-strong-950)' }}>{formatRp(f.incentive)}</span>
            <PaymentLine payment={f.payment} />
          </div>
        )}
      </SectionCard>
    </div>
  );
}
