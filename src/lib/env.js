/** Mode demo: dev server, atau build demo (GitHub Pages, VITE_DEMO=true). Menampilkan DevToolbar & akun contoh. */
export const DEMO = import.meta.env.DEV || import.meta.env.VITE_DEMO === 'true';

// Login Partner Dashboard lewat Supabase Edge Function sp-mobile-login. Hanya kunci publik (publishable key) yang boleh ada di kode.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://rhjanqgbvmetrjbfrzwh.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_fEu0t5csdVWAehYw6guuHA_bETX3BeD';
/** "mock" = akun contoh di memori (tes selalu mock); selain itu login asli ke Supabase. */
export const LOGIN_MODE = import.meta.env.MODE === 'test' || import.meta.env.VITE_LOGIN_MODE === 'mock' ? 'mock' : 'supabase';
