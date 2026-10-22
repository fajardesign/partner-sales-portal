/** State halaman dari error API: NOT_FOUND (data bukan milik sesi / tidak ada, API 404) → "notfound"; selain itu "error". */
export const errorView = (e) => (e?.code === 'NOT_FOUND' ? 'notfound' : 'error');
