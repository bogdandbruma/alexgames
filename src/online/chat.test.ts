import { describe, expect, test, vi } from "vitest";
import {
  CHAT_BODY_MAX_LENGTH,
  CHAT_EMOJI,
  sendRoomMessage,
  subscribeRoomMessages,
} from "./chat";

const ROOM_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const DEVICE = "11111111-2222-4333-8444-555555555555";

describe("CHAT_EMOJI", () => {
  test("exposes a fixed non-empty emoji set", () => {
    expect(CHAT_EMOJI.length).toBeGreaterThan(0);
    expect(CHAT_EMOJI.every((e) => typeof e === "string" && e.length > 0)).toBe(
      true,
    );
  });
});

describe("sendRoomMessage", () => {
  test("inserts into room_messages scoped to room_id", async () => {
    const inserted = {
      id: "msg-1",
      room_id: ROOM_ID,
      device_id: DEVICE,
      username: "Alex",
      body: "hello",
      created_at: "2026-08-06T12:00:00.000Z",
    };
    const single = vi.fn().mockResolvedValue({ data: inserted, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const client = { from: vi.fn().mockReturnValue({ insert }) };

    const message = await sendRoomMessage(client as never, {
      roomId: ROOM_ID,
      deviceId: DEVICE,
      username: "Alex",
      body: "hello",
    });

    expect(client.from).toHaveBeenCalledWith("room_messages");
    expect(insert).toHaveBeenCalledWith({
      room_id: ROOM_ID,
      device_id: DEVICE,
      username: "Alex",
      body: "hello",
    });
    expect(message).toEqual({
      id: "msg-1",
      roomId: ROOM_ID,
      deviceId: DEVICE,
      username: "Alex",
      body: "hello",
      createdAt: "2026-08-06T12:00:00.000Z",
    });
  });

  test("trims body and caps length", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "msg-2",
        room_id: ROOM_ID,
        device_id: DEVICE,
        username: "Alex",
        body: "x".repeat(CHAT_BODY_MAX_LENGTH),
        created_at: "2026-08-06T12:00:00.000Z",
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const client = { from: vi.fn().mockReturnValue({ insert }) };

    await sendRoomMessage(client as never, {
      roomId: ROOM_ID,
      deviceId: DEVICE,
      username: "Alex",
      body: `  ${"x".repeat(CHAT_BODY_MAX_LENGTH + 50)}  `,
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        body: "x".repeat(CHAT_BODY_MAX_LENGTH),
      }),
    );
  });

  test("rejects empty body after trim", async () => {
    const client = { from: vi.fn() };

    await expect(
      sendRoomMessage(client as never, {
        roomId: ROOM_ID,
        deviceId: DEVICE,
        username: "Alex",
        body: "   ",
      }),
    ).rejects.toThrow(/empty/i);
    expect(client.from).not.toHaveBeenCalled();
  });
});

describe("subscribeRoomMessages", () => {
  test("subscribes to INSERT only for the room and never loads history", async () => {
    const channel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    };
    channel.subscribe.mockImplementation((cb: (status: string) => void) => {
      cb("SUBSCRIBED");
      return channel;
    });

    const removeChannel = vi.fn().mockResolvedValue("ok");
    const from = vi.fn();
    const client = {
      channel: vi.fn().mockReturnValue(channel),
      removeChannel,
      getChannels: vi.fn().mockReturnValue([]),
      from,
    };

    const onMessage = vi.fn();
    const handle = await subscribeRoomMessages(client as never, {
      roomId: ROOM_ID,
      onMessage,
    });

    expect(from).not.toHaveBeenCalled();
    expect(client.channel).toHaveBeenCalledWith(`room-messages:${ROOM_ID}`);
    expect(channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "room_messages",
        filter: `room_id=eq.${ROOM_ID}`,
      },
      expect.any(Function),
    );

    const insertHandler = channel.on.mock.calls[0]?.[2] as
      | ((payload: { new: Record<string, unknown> }) => void)
      | undefined;
    insertHandler?.({
      new: {
        id: "live-1",
        room_id: ROOM_ID,
        device_id: DEVICE,
        username: "Guest",
        body: "yo",
        created_at: "2026-08-06T12:01:00.000Z",
      },
    });

    expect(onMessage).toHaveBeenCalledWith({
      id: "live-1",
      roomId: ROOM_ID,
      deviceId: DEVICE,
      username: "Guest",
      body: "yo",
      createdAt: "2026-08-06T12:01:00.000Z",
    });
    expect(from).not.toHaveBeenCalled();

    await handle.unsubscribe();
    expect(removeChannel).toHaveBeenCalledWith(channel);
  });
});
