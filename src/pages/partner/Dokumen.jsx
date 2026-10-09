import { useEffect, useState } from 'react';
import { Button, Icon, KeyIcon } from '@ds/index.js';
import { PartnerShell } from '../../components/PartnerShell.jsx';
import { DocumentViewer } from '../../components/DocumentViewer.jsx';
import { ListCard } from '../../components/ListCard.jsx';
import { SectionCard } from '../../components/KeyValueGrid.jsx';
import { useToast } from '../../components/Toaster.jsx';
import { partnerDocumentFile, partnerDocuments } from '../../api/mockApi.js';
import { saveBlob } from '../../lib/download.js';
import { errorView } from './common.jsx';
import { useScenario } from '../../dev/scenario.js';
import { bar } from '../../lib/cells.jsx';
import { formatDate } from '../../lib/format.js';
import { preset } from '../../dev/presets.js';

/**
 * PDB-09 · Dokumen (PRD Scope 1 FR-PD-007): PKS bertanda tangan (bila diunggah) dan dokumen kemitraan; Lihat dan Unduh saja.
 * Unduh menyimpan file (placeholder di prototipe) dengan nama file dokumen; gagal → toast "Gagal mengunduh dokumen. Coba lagi."
 */
export function Dokumen(props) {
  const { tableState } = useScenario();
  return <DokumenView key={tableState} {...props} />;
}

function DokumenView({ user, onLogout, path }) {
  const toast = useToast();
  const [d, setD] = useState(null);
  const [view, setView] = useState('loading');
  const [open, setOpen] = useState(null);
  const load = (retry) => {
    setView('loading');
    partnerDocuments(user, { retry }).then((r) => {
      setD(r);
      setView(r.pks || r.documents.length ? 'data' : 'empty');
      if (preset?.dokumen?.open === 'PKS' && r.pks) setOpen(r.pks);
    }, (e) => setView(errorView(e)));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(false); }, []);

  const download = (doc) => partnerDocumentFile(user, doc.key).then(
    (blob) => { saveBlob(blob, doc.file.name); toast('success', `${doc.file.name} diunduh.`); },
    (e) => { if (e?.code !== 'ACCOUNT_DISABLED') toast('error', 'Gagal mengunduh dokumen. Coba lagi.'); },
  );

  const row = (doc, i) => {
    const pdf = /\.pdf$/i.test(doc.file.name);
    return (
      <div key={doc.key} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-12)', paddingTop: i ? 'var(--space-12)' : 0, borderTop: i ? '1px solid var(--stroke-soft-200)' : 0 }}>
        <KeyIcon icon={pdf ? 'FileTextLine' : 'ImageLine'} color="gray" variant="lighter" size="md" />
        <span style={{ flex: '1 1 calc(var(--space-48) * 4)', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <span style={{ font: 'var(--label-sm)', color: 'var(--text-strong-950)' }}>{doc.label}</span>
          <span style={{ font: 'var(--paragraph-xs)', color: 'var(--text-sub-600)', overflowWrap: 'anywhere' }}>{doc.file.name} · Diunggah {formatDate(doc.file.uploadedAt)}</span>
        </span>
        <span style={{ display: 'flex', gap: 'var(--space-8)' }}>
          <Button variant="stroke" tone="neutral" size="sm" leftIcon={<Icon name="EyeLine" />} onClick={() => setOpen(doc)}>Lihat</Button>
          <Button variant="stroke" tone="neutral" size="sm" leftIcon={<Icon name="DownloadLine" />} onClick={() => download(doc)}>Unduh</Button>
        </span>
      </div>
    );
  };

  return (
    <PartnerShell active={path} icon="FolderLine" title="Dokumen" description="PKS dan dokumen kemitraan partner Anda. Dokumen hanya dapat dilihat dan diunduh." user={user} onLogout={onLogout}>
      {view === 'error' || view === 'empty' || view === 'notfound' ? <ListCard view={view} onRetry={() => load(true)} emptyMessage="Belum ada dokumen." /> : view === 'loading' ? (
        [0, 1].map((i) => <SectionCard key={i}>{bar('100%', 64, 'var(--rounded-12)')}</SectionCard>)
      ) : (
        <>
          <SectionCard title="Perjanjian Kerja Sama">
            {d.pks ? row(d.pks, 0) : <span style={{ font: 'var(--paragraph-sm)', color: 'var(--text-sub-600)' }}>Dokumen PKS belum tersedia. Hubungi Amar Bank bila memerlukan salinan PKS.</span>}
          </SectionCard>
          <SectionCard title="Dokumen Partner">
            {d.documents.length ? d.documents.map(row) : <span style={{ font: 'var(--paragraph-sm)', color: 'var(--text-sub-600)' }}>Belum ada dokumen partner.</span>}
          </SectionCard>
        </>
      )}
      <DocumentViewer doc={open} onClose={() => setOpen(null)} onDownload={() => download(open)} />
    </PartnerShell>
  );
}
