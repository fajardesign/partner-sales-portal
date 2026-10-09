import { useState } from 'react';
import { Alert, Button, ContentDivider, Icon, LinkButton, TextInput } from '@ds/index.js';
import { AuthCard, AuthHero, AuthLayout, StatusMessage } from '../components/AuthLayout.jsx';
import { login } from '../api/auth.js';
import { ApiError, demoPicAccounts } from '../api/mockApi.js';
import { DEMO_PASSWORD } from '../api/db.js';
import { DEMO, LOGIN_MODE } from '../lib/env.js';
import { preset } from '../dev/presets.js';

/** Pesan error login (PRD v3 tabel cek; identitas = email atau nomor telepon, revisi stakeholder 2026-10-08). */
const LOGIN_ERRORS = {
  INVALID: 'Email/nomor telepon atau password salah. Silakan coba lagi.',
  DISABLED: 'Akun Anda tidak aktif. Hubungi Admin.',
  NOT_ACTIVATED: 'Akun belum diaktivasi. Cek email undangan Anda.',
  LOCKED: 'Akun terkunci sementara. Coba lagi dalam 15 menit.',
};
/** Akun internal contoh yang ditolak di Partner Dashboard. */
const DEMO_DENIED = [['rina.saraswati@amarbank.co.id', 'Admin → Akses ditolak'], ['andi.pratama@amarbank.co.id', 'TL → Akses ditolak']];

/**
 * PDB-01 · Login Partner Dashboard. onLoggedIn(session); onDenied({ loginId, role }) untuk akun bukan Partner.
 * notice = { status, title } setelah sesi diakhiri sistem (idle/maks. 12 jam, atau partner Inactive).
 */
export function Login({ onLoggedIn, onDenied, notice }) {
  const init = preset?.login ?? {};
  const [loginId, setLoginId] = useState(init.loginId ?? '');
  const [password, setPassword] = useState(init.password ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(init.error ?? null);
  const [forgot, setForgot] = useState(false);
  const [outage, setOutage] = useState(init.outage ?? false);
  const valid = loginId.trim().length > 0 && password.length > 0;

  async function submit(e) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const session = await login(loginId, password);
      setBusy(false);
      onLoggedIn(session);
    } catch (err) {
      setBusy(false);
      const code = err instanceof ApiError ? err.code : 'INVALID';
      if (code === 'OUTAGE') { setOutage(true); return; }
      setPassword('');
      if (code === 'FORBIDDEN_PLATFORM') { onDenied({ loginId: loginId.trim(), role: err.field ?? null }); return; }
      setError(LOGIN_ERRORS[code] ?? LOGIN_ERRORS.INVALID);
    }
  }
  const fill = (id) => { setLoginId(id); setPassword(DEMO_PASSWORD); setError(null); };

  // PDB-03 · Halaman gangguan layanan (PRD v3: full-page error dengan "Coba lagi").
  if (outage) {
    return (
      <AuthLayout label="Partner Dashboard">
        <AuthCard center gap="var(--space-16)">
          <StatusMessage status="error" icon="ErrorWarningFill" title="Layanan tidak tersedia">Gagal memuat data. Coba lagi.</StatusMessage>
          <Button fullWidth leftIcon={<Icon name="RefreshLine" />} onClick={() => setOutage(false)}>Coba lagi</Button>
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout label="Partner Dashboard">
      <form onSubmit={submit} style={{ display: 'contents' }}>
        <AuthCard>
          <AuthHero icon="User6Line" title="Masuk ke Partner Dashboard" description="Masukkan email atau nomor telepon dan password Anda." />
          <ContentDivider />
          {error && <Alert status="error" size="sm" title={error} />}
          {!error && (notice ?? init.notice) && <Alert status={(notice ?? init.notice).status} size="sm" title={(notice ?? init.notice).title} />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
            <TextInput label="Email atau Nomor Telepon" required leftIcon="User6Line" placeholder="nama@email.com atau 08123456789"
              value={loginId} onChange={(e) => setLoginId(e.target.value)} autoComplete="username" />
            <TextInput label="Password" required type="password" leftIcon="Lock2Line" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <Button type="submit" fullWidth disabled={!valid || busy}>{busy ? 'Memproses...' : 'Masuk'}</Button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-8)' }}>
            <LinkButton onClick={() => setForgot((f) => !f)}>Lupa password?</LinkButton>
            {forgot && <Alert status="information" size="sm" title="Hubungi Admin untuk mengatur ulang password Anda." />}
          </div>
          {DEMO && !preset && <DemoPanel onPick={fill} />}
        </AuthCard>
      </form>
    </AuthLayout>
  );
}

const demoRow = { display: 'flex', justifyContent: 'space-between', gap: 'var(--space-8)', border: 0, background: 'none', padding: 'var(--space-2) 0', cursor: 'pointer', font: 'var(--paragraph-xs)', color: 'var(--text-strong-950)', textAlign: 'left' };

/** Panel akun contoh (mode demo). Mode supabase: akun hanya ada bila sinkronisasi Admin portal sudah mengisi Supabase. */
function DemoPanel({ onPick }) {
  const pics = demoPicAccounts();
  const active = pics.find((a) => a.status === 'ACTIVE');
  const rows = [...pics.map((a) => [a.email, a.note]), ...DEMO_DENIED];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', padding: 'var(--space-12)', borderRadius: 'var(--rounded-10)', background: 'var(--bg-weak-50)' }}>
      <span style={{ font: 'var(--label-xs)', color: 'var(--text-sub-600)' }}>
        Mode demo ({LOGIN_MODE === 'mock' ? 'data contoh' : 'Supabase'}) · password akun aktif: {DEMO_PASSWORD}
      </span>
      {rows.map(([u, label]) => (
        <button key={u} type="button" onClick={() => onPick(u)} style={demoRow}>
          <span>{u}</span><span style={{ color: 'var(--text-sub-600)' }}>{label}</span>
        </button>
      ))}
      {active && (
        <button type="button" onClick={() => onPick(`0${active.user.phone}`)} style={demoRow}>
          <span>0{active.user.phone}</span><span style={{ color: 'var(--text-sub-600)' }}>{active.note} lewat nomor telepon</span>
        </button>
      )}
      <span style={{ font: 'var(--paragraph-xs)', color: 'var(--text-soft-400)' }}>Salah password 5 kali berturut-turut untuk melihat pesan akun terkunci.</span>
    </div>
  );
}
