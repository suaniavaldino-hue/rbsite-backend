import { createClient } from "@supabase/supabase-js";

import { env, isSupabaseConfigured } from "../config/env.js";

let cachedClient = null;

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = createClient(
      env.supabaseUrl,
      env.supabaseServerKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  return cachedClient;
}
