import { useState } from 'react';
import { Sidebar, PageHeader, Avatar, Button, Drawer, Icon, AmarBankLogo } from '@ds/index.js';
import { navigate } from '../lib/router.js';
import { navFor } from '../lib/nav.js';

/**
 * Shell Partner Dashboard: Sidebar gelap 272px + PageHeader (ikon, judul, deskripsi, chip pengguna, Keluar) + konten pad 24/32.
 * Lebar ponsel (PRD Scope 1 §14 / AS-PD-01, aturan di src/app.css): sidebar disembunyikan, diganti bar atas ringkas dengan
 * tombol "Menu" yang membuka Drawer berisi Sidebar + chip pengguna + Keluar. Target sentuh ≥ 44px, tanpa scroll horizontal.
 */
export function PartnerShell({ active, icon, title, description, user, onLogout, headerExtra, children }) {
  const [menu, setMenu] = useState(false);
  const sections = navFor(user);
  const go = (v) => { setMenu(false); navigate(v); };
  return (
    <div className="ps-shell">
      <div className="ps-sidebar">
        <Sidebar theme="dark" company="" logo={<AmarBankLogo lockup="horizontal" color="white" height={26} />}
          sections={sections} value={active} onChange={go} />
      </div>
      <main className="ps-main">
        <div className="ps-topbar">
          <AmarBankLogo lockup="horizontal" color="color" height={24} />
          <Button variant="stroke" tone="neutral" leftIcon={<Icon name="MenuLine" />} aria-label="Buka menu" onClick={() => setMenu(true)}>Menu</Button>
        </div>
        <div className="ps-page-header">
          <PageHeader
            media={(
              <div className="ps-header-media" style={{ width: 48, height: 48, flex: 'none', borderRadius: 'var(--rounded-full)', boxShadow: 'var(--shadow-stroke)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--icon-sub-600)' }}>
                <Icon name={icon} size={24} />
              </div>
            )}
            title={title}
            description={description}
            actions={(
              <div className="ps-header-actions">
                <UserChip user={user} />
                <Button variant="stroke" tone="neutral" leftIcon={<Icon name="LogoutBoxRLine" />} onClick={onLogout}>Keluar</Button>
              </div>
            )}
          />
        </div>
        {headerExtra}
        <div className="ps-content">
          {children}
        </div>
      </main>
      <Drawer open={menu} onClose={() => setMenu(false)} width={320} style={{ background: 'var(--bg-surface-800)' }}>
        <nav className="ps-drawer-nav" aria-label="Menu">
          <Sidebar theme="dark" company="" logo={<AmarBankLogo lockup="horizontal" color="white" height={26} />}
            sections={sections} value={active} onChange={go} style={{ width: '100%' }}
            footer={(
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
                <UserChip user={user} dark />
                <Button variant="stroke" tone="neutral" leftIcon={<Icon name="LogoutBoxRLine" />} onClick={onLogout}>Keluar</Button>
              </div>
            )} />
        </nav>
      </Drawer>
    </div>
  );
}

/** Chip pengguna: nama PIC + "Partner (PIC) · {nama partner}". dark = di atas Sidebar gelap (Drawer menu ponsel). */
function UserChip({ user, dark = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-10)', paddingRight: 'var(--space-4)', minWidth: 0 }}>
      <Avatar size={40} color={2} name={user.name} />
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{ font: 'var(--label-sm)', color: dark ? 'var(--text-white-0)' : 'var(--text-strong-950)' }}>{user.name}</span>
        <span style={{ font: 'var(--paragraph-xs)', color: dark ? 'var(--text-soft-400)' : 'var(--text-sub-600)' }}>{user.partnerName ? `${user.roleLabel} · ${user.partnerName}` : user.roleLabel}</span>
      </div>
    </div>
  );
}
