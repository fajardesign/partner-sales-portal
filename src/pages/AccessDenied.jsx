import { Button, Icon } from '@ds/index.js';
import { AuthCard, AuthLayout, StatusMessage } from '../components/AuthLayout.jsx';
import { ROLES } from '../lib/constants.js';

/** Petunjuk aplikasi yang benar per platform access role (PRD v3 cek #6; copy petunjuk menunggu konfirmasi PO). */
const HINT = {
  'web-access': 'Admin, APL, dan Super Admin masuk melalui S&P Portal.',
  'sales-app-access': 'TL, SR, dan SA masuk melalui aplikasi Android Sales Portal.',
};

/** PDB-02 · Akses ditolak — akun tanpa platform partner-web-access. Tidak ada sesi yang dibuat. */
export function AccessDenied({ denied, onLogout }) {
  const hint = HINT[ROLES[denied.role]?.platform];
  return (
    <AuthLayout footer={null}>
      <AuthCard center gap="var(--space-16)">
        <StatusMessage status="error" icon="ShieldUserLine" title="Akses ditolak">
          Akses ditolak. Akun ini tidak memiliki akses ke aplikasi ini.
        </StatusMessage>
        {hint && <span style={{ font: 'var(--paragraph-sm)', color: 'var(--text-sub-600)' }}>{hint}</span>}
        <div style={{ font: 'var(--paragraph-xs)', color: 'var(--text-soft-400)' }}>Masuk sebagai {denied.loginId}</div>
        <Button variant="stroke" tone="neutral" fullWidth leftIcon={<Icon name="LogoutBoxRLine" />} onClick={onLogout}>Keluar</Button>
      </AuthCard>
    </AuthLayout>
  );
}
