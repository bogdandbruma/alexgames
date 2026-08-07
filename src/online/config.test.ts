import { afterEach, describe, expect, test, vi } from "vitest";
import { getOnlineConfig } from "./config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getOnlineConfig", () => {
  test("returns url and anon key from env", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-test-key");

    expect(getOnlineConfig()).toEqual({
      url: "https://example.supabase.co",
      anonKey: "anon-test-key",
    });
  });

  test("fails clearly when env is missing", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");

    expect(() => getOnlineConfig()).toThrow(
      /VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY|missing/i,
    );
  });
});
