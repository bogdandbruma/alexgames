import { describe, expect, test, vi } from "vitest";
import {
  createFreshChannel,
  openFreshChannel,
  removeChannelsByName,
  roomMessagesChannelName,
  roomPresenceChannelName,
  roomSyncChannelName,
} from "./channelNames";

describe("channelNames", () => {
  test("presence, sync, and chat topics differ for the same room", () => {
    const roomId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    expect(roomPresenceChannelName(roomId)).toBe(`room:${roomId}`);
    expect(roomSyncChannelName(roomId)).toBe(`room-sync:${roomId}`);
    expect(roomMessagesChannelName(roomId)).toBe(`room-messages:${roomId}`);
    expect(roomPresenceChannelName(roomId)).not.toBe(roomSyncChannelName(roomId));
  });

  test("removeChannelsByName drops matching topics before recreate", async () => {
    const stale = { topic: "realtime:room:abc" };
    const removeChannel = vi.fn().mockResolvedValue("ok");
    const client = {
      getChannels: vi.fn().mockReturnValue([stale]),
      removeChannel,
      channel: vi.fn().mockReturnValue({ topic: "room:abc" }),
    };

    await removeChannelsByName(client as never, "room:abc");
    expect(removeChannel).toHaveBeenCalledWith(stale);

    await createFreshChannel(client as never, "room:abc");
    expect(client.channel).toHaveBeenCalledWith("room:abc");
  });

  test("openFreshChannel serializes concurrent setups on the same topic", async () => {
    const order: string[] = [];
    let active: { topic: string; subscribed: boolean } | null = null;

    const client = {
      getChannels: vi.fn(() => (active ? [active] : [])),
      removeChannel: vi.fn(async (ch: { topic: string }) => {
        if (active === ch) active = null;
      }),
      channel: vi.fn((name: string) => {
        if (active) {
          return active;
        }
        active = { topic: `realtime:${name}`, subscribed: false };
        return active;
      }),
    };

    const join = async (label: string) =>
      openFreshChannel(client as never, "room-messages:r1", undefined, async (ch) => {
        order.push(`${label}:on`);
        if ((ch as unknown as { subscribed: boolean }).subscribed) {
          throw new Error(`cannot add postgres_changes after subscribe (${label})`);
        }
        await new Promise((r) => setTimeout(r, 20));
        (ch as unknown as { subscribed: boolean }).subscribed = true;
        order.push(`${label}:subscribed`);
      });

    await Promise.all([join("a"), join("b")]);
    expect(order).toEqual([
      "a:on",
      "a:subscribed",
      "b:on",
      "b:subscribed",
    ]);
  });
});
