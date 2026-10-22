import { useEffect, useState } from 'react';
import { Alert } from '@ds/index.js';
import { PartnerShell } from '../../components/PartnerShell.jsx';
import { KeyValueGrid, SectionCard } from '../../components/KeyValueGrid.jsx';
import { ListCard } from '../../components/ListCard.jsx';
import { maskAccount } from '../../api/mockApi.js';
import { partnerBank } from '../../api/partnerScope3.js';
import { useScenario } from '../../dev/scenario.js';
import { BANKS, PARTNER_CONTACT } from '../../lib/constants.js';
import { errorView } from './common.jsx';

/**
 * SCR-3-14 · Rekening partner (PRD Scope 3 FR-PI-008): rekening dari onboarding (Scope 1.4), hanya baca; nomor rekening disamarkan
 * 4 digit terakhir. Banner tujuan pembayaran insentif dan kontak Amar Bank untuk perubahan.
 */
export function Rekening(props) {
  const { tableState } = useScenario();
  return <RekeningView key={tableState} {...props} />;
}

function RekeningView({ user, onLogout, path }) {
  const [d, setD] = useState(null);
  const [view, setView] = useState('loading');
  const load = (retry) => { setView('loading'); partnerBank(user, { retry }).then((r) => { setD(r); setView('data'); }, (e) => setView(errorView(e))); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(false); }, []);
  const contact = `${PARTNER_CONTACT.channel} ${PARTNER_CONTACT.number}`;
  return (
    <PartnerShell active={path} icon="BankLine" title="Rekening" description="Rekening tujuan pembayaran insentif partner." user={user} onLogout={onLogout}>
      {view !== 'data' ? <ListCard view={view} onRetry={() => load(true)} /> : !d.bank ? (
        <Alert status="warning" size="sm" title={`Data rekening belum tersedia. Hubungi Amar Bank melalui ${contact}.`} />
      ) : (
        <>
          <Alert status="information" size="sm" title={`Insentif dibayarkan ke rekening ini. Untuk perubahan, hubungi Amar Bank melalui ${contact}.`} />
          <SectionCard title="Data rekening">
            <KeyValueGrid items={[
              { label: 'Bank', value: BANKS[d.bank.code] ?? d.bank.code }, { label: 'Cabang', value: d.bank.branch },
              { label: 'Nama Rekening', value: d.bank.accountName }, { label: 'No. Rekening', value: maskAccount(d.bank.accountNumber) },
            ]} />
          </SectionCard>
        </>
      )}
    </PartnerShell>
  );
}
