import { useEffect, useState } from 'react';
import { Alert, Badge, StatusBadge } from '@ds/index.js';
import { PartnerShell } from '../../components/PartnerShell.jsx';
import { ListCard } from '../../components/ListCard.jsx';
import { KeyValueGrid, SectionCard } from '../../components/KeyValueGrid.jsx';
import { partnerProfile } from '../../api/mockApi.js';
import { useScenario } from '../../dev/scenario.js';
import { bar } from '../../lib/cells.jsx';
import {
  BANKS, CHANNEL, CHANNEL_OFFLINE, ENTITY, PIC_STATUS, PRODUCT_SOLD, PRODUCT_TYPE, SCALE, STORE_LOCATION, STORE_STATUS, STORE_TYPE, areaName,
} from '../../lib/constants.js';
import { formatDate, formatPhone } from '../../lib/format.js';
import { errorView } from './common.jsx';

const STORE_BADGE = { ACTIVE: 'completed', PENDING: 'pending', INACTIVE: 'disabled' };

/** PDB-08 · Profil (PRD v3 F5, PARTNER_PROFILE lihat saja): data partner, PIC, rekening tersamar, toko. Tanpa tombol ubah. */
export function Profil(props) {
  const { tableState } = useScenario();
  return <ProfilView key={tableState} {...props} />;
}

function ProfilView({ user, onLogout, path }) {
  const [p, setP] = useState(null);
  const [view, setView] = useState('loading');
  const load = (retry) => { setView('loading'); partnerProfile(user, { retry }).then((r) => { setP(r); setView('data'); }, (e) => setView(errorView(e))); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(false); }, []);

  return (
    <PartnerShell active={path} icon="Building2Line" title="Profil" description="Data partner, PIC, rekening, dan toko Anda." user={user} onLogout={onLogout}>
      <Alert status="information" size="sm" title="Untuk perubahan data, hubungi Amar Bank." />
      {view === 'error' || view === 'notfound' ? <ListCard view={view} onRetry={() => load(true)} /> : view === 'loading' ? (
        [0, 1, 2].map((i) => <SectionCard key={i}>{bar('100%', 96, 'var(--rounded-12)')}</SectionCard>)
      ) : (
        <>
          <SectionCard title="Informasi Partner">
            <KeyValueGrid items={[
              { label: 'Nama Partner', value: p.partnerName },
              { label: 'No. Registrasi', value: p.registrationNumber },
              { label: 'Kode Merchant', value: p.merchantCode },
              { label: 'Kode Referral', value: p.referralCode || 'Tidak diisi' },
              { label: 'Jenis Badan Usaha', value: ENTITY[p.entity] },
              { label: 'Area', value: areaName(p.areaId) },
              { label: 'Alamat Partner (sesuai legalitas)', value: p.address, full: true },
              { label: 'Provinsi', value: p.province },
              { label: 'Kabupaten/Kota', value: p.city },
              { label: 'Kecamatan', value: p.district },
              { label: 'Kelurahan', value: p.village },
              { label: 'RT / RW', value: `${p.rt} / ${p.rw}` },
              { label: 'Partner aktif sejak', value: formatDate(p.activatedAt) },
            ]} />
          </SectionCard>
          <SectionCard title="Data Bisnis">
            <KeyValueGrid items={[
              { label: 'Email Bisnis', value: p.businessEmail },
              { label: 'Channel', value: CHANNEL[p.channel] },
              { label: 'Jumlah Tempat Usaha', value: String(p.businessLocationCount) },
              { label: 'Jumlah Toko Terdaftar', value: `${p.stores.length} toko` },
            ]} />
          </SectionCard>
          <SectionCard title="Informasi PIC">
            <KeyValueGrid items={[
              { label: 'Nama PIC', value: p.pic.name },
              { label: 'Status PIC', value: PIC_STATUS[p.pic.status] },
              { label: 'Email PIC', value: p.pic.email },
              { label: 'No. Handphone', value: formatPhone(p.pic.phone) },
            ]} />
          </SectionCard>
          <SectionCard title="Data Rekening">
            <KeyValueGrid items={[
              { label: 'Bank', value: BANKS[p.bank.code] },
              { label: 'Cabang', value: p.bank.branch },
              { label: 'No. Rekening', value: p.bank.accountNumber },
              { label: 'Nama Rekening', value: p.bank.accountName },
            ]} />
          </SectionCard>
          <SectionCard title="Toko" badge={<Badge color="gray" size="md">{`${p.stores.length} toko`}</Badge>}>
            {p.stores.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)', paddingTop: i ? 'var(--space-16)' : 0, borderTop: i ? '1px solid var(--stroke-soft-200)' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', flexWrap: 'wrap' }}>
                  <span style={{ font: 'var(--label-md)', color: 'var(--text-strong-950)' }}>{s.name}</span>
                  <Badge color="gray" size="md">{s.primary ? 'Toko Utama' : 'Toko Tambahan'}</Badge>
                  <StatusBadge status={STORE_BADGE[s.status]}>{STORE_STATUS[s.status]}</StatusBadge>
                </div>
                <KeyValueGrid columns={3} items={[
                  { label: 'Kode Toko', value: s.code },
                  { label: 'Tipe Toko', value: STORE_TYPE[s.storeType] },
                  ...(s.storeType === 'OFFLINE' ? [{ label: 'Channel Offline', value: CHANNEL_OFFLINE[s.channelOffline] }] : []),
                  { label: 'Alamat Toko', value: s.address, full: true },
                  { label: 'Skala Toko', value: SCALE[s.scale] },
                  { label: 'Produk Dijual', value: PRODUCT_SOLD[s.productSold] },
                  { label: 'Lokasi Toko', value: STORE_LOCATION[s.location] },
                  { label: 'Jenis Produk', value: PRODUCT_TYPE[s.productType] },
                ]} />
              </div>
            ))}
          </SectionCard>
        </>
      )}
    </PartnerShell>
  );
}
