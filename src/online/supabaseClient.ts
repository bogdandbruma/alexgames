import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getOnlineConfig, type OnlineConfig } from "./config";

export function createSupabaseClient(
  config?: OnlineConfig,
): SupabaseClient {
  const { url, anonKey } = config ?? getOnlineConfig();
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
