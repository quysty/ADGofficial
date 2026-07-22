import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.8/+esm";
import { SUPABASE_CONFIG, getSupabaseConfigStatus } from "./supabase-config.js";

let supabaseClient = null;

export function getSupabaseClient() {
  const configStatus = getSupabaseConfigStatus();
  if (!configStatus.ready) {
    throw new Error("Supabase is not configured. Add the Project URL and publishable key first.");
  }

  if (!supabaseClient) {
    supabaseClient = createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.publishableKey,
      {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true
        }
      }
    );
  }

  return supabaseClient;
}

export { getSupabaseConfigStatus };
