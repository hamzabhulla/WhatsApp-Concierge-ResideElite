import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — dashboard will not connect.'
  );
}

export const isSupabaseConfigured = Boolean(url && anonKey);

// createClient('') throws at import time and leaves a blank white page. Use placeholders so the
// app can start and show a readable configuration message instead (see App.jsx).
export const supabase = createClient(
  url || 'http://localhost:54321',
  anonKey || 'missing-anon-key'
);
