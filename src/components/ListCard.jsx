import { Button, Icon, Pagination } from '@ds/index.js';
import { EmptyState } from './EmptyState.jsx';
import emptyUsers from '../assets/empty-users.png';
import emptyError from '../assets/empty-error.png';
import { navigate } from '../lib/router.js';

/**
 * Kartu daftar (radius 16 + shadow-stroke) dengan state empty/error/notfound dan pager di bawah.
 * notfound = data di luar cakupan sesi atau tidak ada (API 404, PRD Scope 1 FR-PD-004).
 */
export function ListCard({ view, emptyMessage, emptyAction, onRetry, footer, children }) {
  return (
    <div style={{ borderRadius: 'var(--rounded-16)', boxShadow: 'var(--shadow-stroke)', padding: 'var(--space-12) var(--space-16) var(--space-8)', background: 'var(--bg-white-0)', overflowX: 'auto' }}>
      {children}
      {view === 'empty' && <EmptyState image={emptyUsers} message={emptyMessage} action={emptyAction} />}
      {view === 'error' && (
        <EmptyState image={emptyError} message="Gagal memuat data. Coba lagi."
          action={<Button variant="stroke" tone="neutral" leftIcon={<Icon name="RefreshLine" />} onClick={onRetry}>Coba lagi</Button>} />
      )}
      {view === 'notfound' && (
        <EmptyState image={emptyError} message={<NotFoundMessage />}
          action={<Button variant="stroke" tone="neutral" leftIcon={<Icon name="ArrowLeftLine" />} onClick={() => navigate('/beranda')}>Ke Beranda Partner</Button>} />
      )}
      {footer}
    </div>
  );
}

const NotFoundMessage = () => (
  <span style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
    <span style={{ font: 'var(--label-md)', color: 'var(--text-strong-950)' }}>Halaman tidak ditemukan</span>
    <span>Data yang Anda cari tidak tersedia untuk akun Anda.</span>
  </span>
);

/** "1–20 dari 45 partner" + Pagination DS (ringkasan bawaan DS berbahasa Inggris, jadi diganti). */
export function ListPager({ page, total, pageSize = 20, noun, onChange }) {
  if (!total) return null;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const a = (page - 1) * pageSize + 1;
  const b = Math.min(total, page * pageSize);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-16)', padding: 'var(--space-12) var(--space-4) var(--space-4)' }}>
      <span style={{ font: 'var(--paragraph-sm)', color: 'var(--text-sub-600)', whiteSpace: 'nowrap' }}>{a}–{b} dari {total} {noun}</span>
      {pages > 1 && <Pagination page={page} total={pages} onChange={onChange} showSummary={false} />}
    </div>
  );
}
