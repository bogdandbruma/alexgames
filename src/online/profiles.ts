import type { SupabaseClient } from "@supabase/supabase-js";

export type ProfileUpsert = {
  deviceId: string;
  username: string;
};

export async function upsertProfile(
  client: SupabaseClient,
  { deviceId, username }: ProfileUpsert,
): Promise<void> {
  const { error } = await client.from("profiles").upsert(
    {
      device_id: deviceId,
      username,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "device_id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

/** Lightweight connectivity check against the profiles table. */
export async function verifyOnlineConnection(
  client: SupabaseClient,
): Promise<void> {
  const { error } = await client.from("profiles").select("device_id").limit(1);

  if (error) {
    throw new Error(error.message);
  }
}
