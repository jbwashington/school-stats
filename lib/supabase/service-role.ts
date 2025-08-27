import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

let supabaseServiceRoleClient: ReturnType<typeof createClient<Database>> | null = null;

export function createServiceRoleClient() {
  if (!supabaseServiceRoleClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
    }

    if (!supabaseServiceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
    }

    supabaseServiceRoleClient = createClient<Database>(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  return supabaseServiceRoleClient;
}