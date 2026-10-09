// Login Partner Dashboard: email atau nomor telepon + password (revisi stakeholder 2026-10-08; username tidak dipakai).
// Mode supabase: POST sp-mobile-login dengan platform partner-web-access (cek realm role → platform → feature di server).
// Mode mock: akun contoh dari src/api/db.js (seed sama dengan admin-sales-portal).
import { LOGIN_MODE, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../lib/env.js';
import { getScenario } from '../dev/scenario.js';
import { ROLES } from '../lib/constants.js';
import { ApiError, mockLogin, partnerSummary } from './mockApi.js';

const PLATFORM = 'partner-web-access';
const KNOWN = ['INVALID', 'LOCKED', 'DISABLED', 'NOT_ACTIVATED', 'FORBIDDEN_PLATFORM'];

/** Sesi Partner Dashboard (disimpan di sessionStorage). Token Supabase tidak disimpan: data prototipe masih mock. */
export function partnerSession({ userId, loginId, name, partnerId, features }) {
  return {
    userId, loginId, role: 'PARTNER', name, roleLabel: ROLES.PARTNER.label, partnerId,
    partnerName: partnerSummary(partnerId)?.partnerName ?? null, platform: PLATFORM, features,
  };
}

export async function supabaseLogin(identifier, password) {
  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/sp-mobile-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify({ identifier, password, platform: PLATFORM }),
    });
  } catch {
    throw new ApiError('OUTAGE');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status >= 500) throw new ApiError('OUTAGE');
    const code = KNOWN.includes(body.error) ? body.error : 'INVALID';
    throw new ApiError(code, code === 'FORBIDDEN_PLATFORM' ? body.role : undefined);
  }
  const { user, access } = body;
  // Pertahanan kedua: hanya realm PARTNER dengan platform partner-web-access yang diterima.
  if (user?.role !== 'PARTNER' || access?.realmRole !== 'PARTNER' || access?.platform !== PLATFORM) {
    throw new ApiError('FORBIDDEN_PLATFORM', user?.role);
  }
  return partnerSession({ userId: user.id, loginId: identifier, name: user.full_name, partnerId: user.partner_id, features: access.features });
}

/**
 * Login → sesi Partner. Error (ApiError.code): OUTAGE | INVALID | LOCKED | DISABLED | NOT_ACTIVATED | FORBIDDEN_PLATFORM
 * (`field` = role akun yang ditolak, bila diketahui).
 */
export async function login(identifier, password) {
  const id = identifier.trim();
  if (getScenario().service === 'outage') throw new ApiError('OUTAGE');
  if (LOGIN_MODE === 'mock') {
    const u = await mockLogin(id, password);
    return partnerSession({ userId: u.id, loginId: id, name: u.fullName, partnerId: u.partnerId, features: ROLES.PARTNER.features });
  }
  return supabaseLogin(id, password);
}
