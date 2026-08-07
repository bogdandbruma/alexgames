import { describe, expect, test, vi } from "vitest";
import { createRoomEnvelope } from "./envelope";
import {
  broadcastRoomEnvelope,
  subscribeRoomEnvelopes,
} from "./roomChannel";

const ROOM_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

describe("roomChannel envelopes", () => {
  test("subscribes to room:{id} broadcast and delivers parsed envelopes", async () => {
    const channel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      send: vi.fn().mockResolvedValue("ok"),
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

    const onEnvelope = vi.fn();
    const handle = await subscribeRoomEnvelopes(client as never, {
      roomId: ROOM_ID,
      onEnvelope,
    });

    expect(client.channel).toHaveBeenCalledWith(`room-sync:${ROOM_ID}`);
    expect(channel.on).toHaveBeenCalledWith(
      "broadcast",
      { event: "envelope" },
      expect.any(Function),
    );

    const envelope = createRoomEnvelope({
      gameSlug: "demo-game",
      kind: "ui_event",
      roomId: ROOM_ID,
      payload: { cue: "spark" },
    });

    const broadcastHandler = channel.on.mock.calls.find(
      (call) => call[0] === "broadcast" && call[1]?.event === "envelope",
    )?.[2] as ((msg: { payload: unknown }) => void) | undefined;

    broadcastHandler?.({ payload: envelope });
    expect(onEnvelope).toHaveBeenCalledWith(envelope);

    broadcastHandler?.({ payload: { not: "an envelope" } });
    expect(onEnvelope).toHaveBeenCalledTimes(1);

    await handle.unsubscribe();
    expect(removeChannel).toHaveBeenCalledWith(channel);
  });

  test("broadcastRoomEnvelope sends envelope on broadcast event", async () => {
    const send = vi.fn().mockResolvedValue("ok");
    const channel = { send };

    const envelope = createRoomEnvelope({
      gameSlug: "demo-game",
      kind: "action",
      roomId: ROOM_ID,
      payload: { action: "ping" },
      senderDeviceId: "device-1",
    });

    await broadcastRoomEnvelope(channel as never, envelope);

    expect(send).toHaveBeenCalledWith({
      type: "broadcast",
      event: "envelope",
      payload: envelope,
    });
  });
});
