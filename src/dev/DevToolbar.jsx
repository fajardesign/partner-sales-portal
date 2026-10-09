import { navigate } from '../lib/router.js';
import { homeFor } from '../lib/nav.js';
import { demoPicAccounts } from '../api/mockApi.js';
import { demoSession } from './session.js';
import { SCENARIO_LABELS, SCENARIO_OPTIONS, setScenario, useScenario } from './scenario.js';
import { useState } from 'react';

const pill = (active) => ({
  border: 0, cursor: 'pointer', padding: 'var(--space-6) var(--space-12)', borderRadius: 'var(--rounded-8)', font: 'var(--label-xs)',
  background: active ? 'var(--bg-white-0)' : 'transparent', color: active ? 'var(--text-strong-950)' : 'var(--text-soft-400)',
});
const select = { font: 'var(--label-xs)', borderRadius: 'var(--rounded-6)', border: 0, padding: 'var(--space-4)', background: 'var(--bg-surface-800)', color: 'var(--text-white-0)' };

/** Toolbar prototipe (hanya mode demo): ganti sesi PIC (data contoh), atur skenario mock. */
export function DevToolbar({ session, setSession }) {
  const sc = useScenario();
  const [open, setOpen] = useState(true);
  const pics = demoPicAccounts().filter((a) => a.status === 'ACTIVE');

  function switchSession(email) {
    if (!email) { setSession(null); navigate('/login'); return; }
    const s = demoSession(email);
    setSession(s);
    navigate(homeFor(s));
  }

  return (
    <div style={{ position: 'fixed', left: '50%', bottom: 'var(--space-16)', transform: 'translateX(-50%)', zIndex: 90, display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4)', borderRadius: 'var(--rounded-12)', background: 'var(--bg-strong-950)', boxShadow: 'var(--shadow-modal)', maxWidth: 'calc(100vw - var(--space-32))', flexWrap: 'wrap' }}>
      <button type="button" style={pill(open)} onClick={() => setOpen((o) => !o)} aria-expanded={open}>Demo</button>
      {open && (
        <>
          <select title="Sesi" aria-label="Masuk sebagai" value={pics.find((a) => a.user.id === session?.userId)?.email ?? ''} style={select} onChange={(e) => switchSession(e.target.value)}>
            <option value="">Sesi: Keluar</option>
            {pics.map((a) => <option key={a.email} value={a.email}>Sesi: {a.note}</option>)}
          </select>
          {Object.entries(SCENARIO_OPTIONS).map(([k, opts]) => (
            <select key={k} title={SCENARIO_LABELS[k]} aria-label={SCENARIO_LABELS[k]} value={sc[k]} style={select} onChange={(e) => setScenario({ [k]: e.target.value })}>
              {opts.map((o) => <option key={o} value={o}>{SCENARIO_LABELS[k]}: {o}</option>)}
            </select>
          ))}
        </>
      )}
    </div>
  );
}
