// PRD 1.1 AC-040 / AC-PD-005 (keputusan 2026-10-20): toko Dibatalkan tidak tampil di Partner Dashboard.
import { expect, it } from 'vitest';
import { partners } from '../api/db.js';
import { partnerProfile, storeOptions } from '../api/mockApi.js';

it('toko Dibatalkan tidak tampil di profil dan pilihan toko', async () => {
  const p = partners.find((x) => x.status === 'ACTIVE' && x.stores.length > 1);
  const session = { partnerId: p.id, role: 'PARTNER' };
  const s = p.stores.at(-1);
  s.status = 'CANCELLED';
  const prof = await partnerProfile(session, { retry: true });
  expect(JSON.stringify(prof)).toContain(p.stores[0].id);
  expect(JSON.stringify(prof)).not.toContain(s.id);
  expect(storeOptions(session).some((o) => o.value === s.id)).toBe(false);
});
