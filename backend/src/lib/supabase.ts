import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}. Add it to backend/.env (see .env.example).`);
  }
  return value;
}

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = requireEnv('SUPABASE_URL');
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
      process.env.SUPABASE_KEY?.trim();
    if (!supabaseKey) {
      throw new Error(
        'Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY in backend/.env'
      );
    }
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseClient;
}
