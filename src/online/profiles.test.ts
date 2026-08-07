import { describe, expect, test, vi } from "vitest";
import { upsertProfile, verifyOnlineConnection } from "./profiles";

function mockClient(result: { error: { message: string } | null }) {
  const limit = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ limit });
  const upsert = vi.fn().mockResolvedValue(result);
  return {
    from: vi.fn().mockReturnValue({ select, upsert }),
    _upsert: upsert,
    _select: select,
    _limit: limit,
  };
}

describe("upsertProfile", () => {
  test("upserts device_id and username onto profiles", async () => {
    const client = mockClient({ error: null });
    await upsertProfile(client as never, {
      deviceId: "11111111-2222-4333-8444-555555555555",
      username: "Alex",
    });
    expect(client.from).toHaveBeenCalledWith("profiles");
    expect(client._upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        device_id: "11111111-2222-4333-8444-555555555555",
        username: "Alex",
      }),
      { onConflict: "device_id" },
    );
  });

  test("throws when upsert fails", async () => {
    const client = mockClient({ error: { message: "network down" } });
    await expect(
      upsertProfile(client as never, {
        deviceId: "11111111-2222-4333-8444-555555555555",
        username: "Alex",
      }),
    ).rejects.toThrow(/network down/);
  });
});

describe("verifyOnlineConnection", () => {
  test("succeeds when profiles query works", async () => {
    const client = mockClient({ error: null });
    await expect(
      verifyOnlineConnection(client as never),
    ).resolves.toBeUndefined();
    expect(client.from).toHaveBeenCalledWith("profiles");
  });

  test("throws when supabase is unreachable", async () => {
    const client = mockClient({ error: { message: "Failed to fetch" } });
    await expect(verifyOnlineConnection(client as never)).rejects.toThrow(
      /Failed to fetch/,
    );
  });
});
