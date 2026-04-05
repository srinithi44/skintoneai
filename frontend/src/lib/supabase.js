import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ── Validation and Logging ───────────────────────────────────────────────────
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
  console.error(
    '🚫 Supabase Error: Environment variables are missing or are using placeholders.\n' +
    'Please check your makeup-ai/frontend/.env file and ensure:\n' +
    '1. VITE_SUPABASE_URL is set to your project URL\n' +
    '2. VITE_SUPABASE_ANON_KEY is set to your anon key'
  );
} else {
  console.log('✅ Supabase initialized successfully:', { 
    url: supabaseUrl.substring(0, 15) + '...',
    hasKey: !!supabaseAnonKey 
  });
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
