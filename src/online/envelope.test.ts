import { describe, expect, test } from "vitest";
import {
  createRoomEnvelope,
  isRoomEnvelope,
  parseRoomEnvelope,
  type RoomEnvelope,
} from "./envelope";

describe("RoomEnvelope", () => {
  test("createRoomEnvelope builds versioned platform envelope with opaque payload", () => {
    const envelope = createRoomEnvelope({
      gameSlug: "future-game",
      kind: "action",
      roomId: "room-1",
      sentAt: "2026-08-06T12:00:00.000Z",
      senderDeviceId: "device-a",
      payload: { anything: true, nested: { x: 1 } },
    });

    expect(envelope).toEqual({
      v: 1,
      game_slug: "future-game",
      kind: "action",
      room_id: "room-1",
      sent_at: "2026-08-06T12:00:00.000Z",
      sender_device_id: "device-a",
      payload: { anything: true, nested: { x: 1 } },
    } satisfies RoomEnvelope);
  });

  test("parseRoomEnvelope accepts valid envelopes and rejects malformed", () => {
    const valid = createRoomEnvelope({
      gameSlug: "space-board",
      kind: "state",
      roomId: "room-2",
      payload: { snapshot: 1 },
    });

    expect(parseRoomEnvelope(valid)).toEqual(valid);
    expect(isRoomEnvelope(valid)).toBe(true);

    expect(parseRoomEnvelope(null)).toBeNull();
    expect(parseRoomEnvelope({ v: 2, kind: "action" })).toBeNull();
    expect(isRoomEnvelope({ v: 1, kind: "nope" })).toBe(false);
  });
});
