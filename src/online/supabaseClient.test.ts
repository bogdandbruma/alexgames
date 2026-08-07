import { describe, expect, test, vi } from "vitest";
import { createSupabaseClient } from "./supabaseClient";

describe("createSupabaseClient", () => {
  test("fails clearly when env is missing", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");

    expect(() => createSupabaseClient()).toThrow(
      /VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY|missing/i,
    );
  });

  test("creates a client from provided config without reading env", () => {
    const client = createSupabaseClient({
      url: "https://example.supabase.co",
      anonKey: "anon-test-key",
    });
    expect(client).toBeTruthy();
    expect(typeof client.from).toBe("function");
  });
});
