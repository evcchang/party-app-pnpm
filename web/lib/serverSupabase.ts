import { createClient } from '@supabase/supabase-js';

export function createServerSupabase() {
  // server-only service role
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
