import { useEffect, useState } from 'react';
import { navigate, useHashRoute } from './lib/router.js';
import { DEMO } from './lib/env.js';
import { featureForPath, homeFor } from './lib/nav.js';
import { ToasterProvider } from './components/Toaster.jsx';
import { ForbiddenPage } from './components/ForbiddenPage.jsx';
import { Login } from './pages/Login.jsx';
import { AccessDenied } from './pages/AccessDenied.jsx';
import { Beranda } from './pages/partner/Beranda.jsx';
import { Transaksi } from './pages/partner/Transaksi.jsx';
import { Komisi } from './pages/partner/Komisi.jsx';
import { Profil } from './pages/partner/Profil.jsx';
import { Dokumen } from './pages/partner/Dokumen.jsx';
import { DevToolbar } from './dev/DevToolbar.jsx';
import { demoSession } from './dev/session.js';
import { preset } from './dev/presets.js';

/**
 * Rute (hash) — akses mengikuti feature access roles Partner (src/lib/nav.js):
 *  /login, /denied (akun bukan Partner)
 *  /beranda, /transaksi, /komisi, /profil, /dokumen
 * Aktivasi & reset password akun PIC tetap di admin-sales-portal (#/activate).
 */
const PAGES = { '/beranda': Beranda, '/transaksi': Transaksi, '/komisi': Komisi, '/profil': Profil, '/dokumen': Dokumen };

const SESSION_KEY = 'partner-dashboard-session';
const RETURN_KEY = 'partner-dashboard-return';
const store = {
  get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch { /* storage tidak tersedia */ } },
};
function loadSession() {
  if (preset?.session) { const s = demoSession(preset.session); return preset.features ? { ...s, features: preset.features } : s; }
  try {
    const s = JSON.parse(store.get(SESSION_KEY));
    return s?.role === 'PARTNER' ? s : null;
  } catch { return null; }
}

export default function App() {
  const { path, query } = useHashRoute();
  const [session, setSessionState] = useState(loadSession);
  // Akun bukan Partner yang ditolak saat login (tanpa sesi): { loginId, role }.
  const [denied, setDenied] = useState(preset?.denied ?? null);
  const setSession = (s) => { setSessionState(s); store.set(SESSION_KEY, s ? JSON.stringify(s) : null); };

  const logout = () => { setSession(null); setDenied(null); navigate('/login'); };
  const feature = featureForPath(path);
  // Setelah login kembali ke halaman yang tadi dibuka (bila diizinkan).
  const onLoggedIn = (s) => {
    setSession(s);
    setDenied(null);
    const back = store.get(RETURN_KEY);
    store.set(RETURN_KEY, null);
    navigate(back && s.features.includes(featureForPath(back.split('?')[0])) ? back : homeFor(s));
  };
  const onDenied = (d) => { setDenied(d); navigate('/denied'); };

  const redirect = path === '/denied' ? (denied ? null : '/login')
    : !session ? (path !== '/login' ? '/login' : null)
      : path === '/login' || !feature ? homeFor(session) : null;
  useEffect(() => {
    if (!redirect) return;
    if (!session && feature) store.set(RETURN_KEY, `${path}${query.toString() ? `?${query}` : ''}`);
    navigate(redirect);
  }, [redirect, session, feature, path, query]);

  const props = { user: session, onLogout: logout, query, path };
  let screen;
  if (path === '/denied' && denied) screen = <AccessDenied denied={denied} onLogout={logout} />;
  else if (!session || redirect) screen = <Login onLoggedIn={onLoggedIn} onDenied={onDenied} />;
  else if (!session.features.includes(feature)) screen = <ForbiddenPage {...props} />;
  else { const Page = PAGES[path]; screen = <Page {...props} />; }

  return (
    <ToasterProvider initialToast={preset?.toast}>
      {screen}
      {DEMO && !preset && <DevToolbar session={session} setSession={setSession} />}
    </ToasterProvider>
  );
}
