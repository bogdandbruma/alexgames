export type OnlineConfig = {
  url: string;
  anonKey: string;
};

type EnvLike = {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
};

export function getOnlineConfig(env?: EnvLike): OnlineConfig {
  const source = env ?? (import.meta.env as EnvLike);
  const url = source.VITE_SUPABASE_URL?.trim() ?? "";
  const anonKey = source.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

  if (!url || !anonKey) {
    throw new Error(
      "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add them to .env.local to use Online mode.",
    );
  }

  return { url, anonKey };
}
