import { describe, expect, test, vi } from "vitest";
import {
  observeRoomPresence,
  subscribeRoomPresence,
  type PresenceMember,
} from "./presence";

const ROOM_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const DEVICE = "11111111-2222-4333-8444-555555555555";

describe("subscribeRoomPresence", () => {
  test("subscribes to channel room:{id} and tracks local presence", async () => {
    const track = vi.fn().mockResolvedValue("ok");
    const presenceState = vi.fn().mockReturnValue({
      [DEVICE]: [
        {
          device_id: DEVICE,
          display_name: "Alex",
          role: "host",
        },
      ],
    });
    const channel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      track,
      presenceState,
    };
    channel.subscribe.mockImplementation(
      (cb: (status: string) => void | Promise<void>) => {
        void cb("SUBSCRIBED");
        return channel;
      },
    );

    const removeChannel = vi.fn().mockResolvedValue("ok");
    const client = {
      channel: vi.fn().mockReturnValue(channel),
      removeChannel,
      getChannels: vi.fn().mockReturnValue([]),
    };

    const self: PresenceMember = {
      deviceId: DEVICE,
      displayName: "Alex",
      role: "host",
    };
    const onSync = vi.fn();

    const handle = await subscribeRoomPresence(client as never, {
      roomId: ROOM_ID,
      self,
      onSync,
    });

    expect(client.getChannels).toHaveBeenCalled();
    expect(client.channel).toHaveBeenCalledWith(`room:${ROOM_ID}`, {
      config: { presence: { key: DEVICE } },
    });
    expect(channel.on).toHaveBeenCalledWith(
      "presence",
      { event: "sync" },
      expect.any(Function),
    );
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({
        device_id: DEVICE,
        display_name: "Alex",
        role: "host",
      }),
    );

    const syncHandler = channel.on.mock.calls.find(
      (call) => call[0] === "presence" && call[1]?.event === "sync",
    )?.[2] as (() => void) | undefined;
    syncHandler?.();
    expect(onSync).toHaveBeenCalledWith([
      expect.objectContaining({
        deviceId: DEVICE,
        displayName: "Alex",
        role: "host",
      }),
    ]);

    await handle.unsubscribe();
    expect(removeChannel).toHaveBeenCalledWith(channel);
  });
});

describe("observeRoomPresence", () => {
  test("subscribes to room:{id} without tracking self", async () => {
    const track = vi.fn().mockResolvedValue("ok");
    const presenceState = vi.fn().mockReturnValue({
      [DEVICE]: [
        {
          device_id: DEVICE,
          display_name: "Alex",
          role: "host",
        },
      ],
    });
    const channel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      track,
      presenceState,
    };
    channel.subscribe.mockImplementation(
      (cb: (status: string) => void | Promise<void>) => {
        void cb("SUBSCRIBED");
        return channel;
      },
    );

    const removeChannel = vi.fn().mockResolvedValue("ok");
    const client = {
      channel: vi.fn().mockReturnValue(channel),
      removeChannel,
      getChannels: vi.fn().mockReturnValue([]),
    };

    const onSync = vi.fn();
    const handle = await observeRoomPresence(client as never, {
      roomId: ROOM_ID,
      onSync,
    });

    expect(client.channel).toHaveBeenCalledWith(`room:${ROOM_ID}`);
    expect(track).not.toHaveBeenCalled();
    expect(onSync).toHaveBeenCalledWith([
      expect.objectContaining({
        deviceId: DEVICE,
        displayName: "Alex",
        role: "host",
      }),
    ]);

    await handle.unsubscribe();
    expect(removeChannel).toHaveBeenCalledWith(channel);
  });
});
