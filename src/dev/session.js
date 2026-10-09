import { ROLES } from '../lib/constants.js';
import { partnerSession } from '../api/auth.js';
import { demoPicAccounts } from '../api/mockApi.js';

/** Sesi PIC contoh untuk DevToolbar / preset / tes. handle = email atau bagian sebelum "@". */
export function demoSession(handle) {
  const a = demoPicAccounts().find((x) => x.email === handle || x.email.startsWith(`${handle}@`));
  if (!a) return null;
  return partnerSession({ userId: a.user.id, loginId: a.email, name: a.user.fullName, partnerId: a.user.partnerId, features: ROLES.PARTNER.features });
}
