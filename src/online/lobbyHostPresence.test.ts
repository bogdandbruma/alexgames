import { describe, expect, test } from "vitest";
import {
  filterRoomsWithLiveHost,
  type RoomHostPresence,
} from "./lobbyHostPresence";

const ROOM_A = {
  id: "a",
  hostDeviceId: "host-a",
  status: "waiting" as const,
  name: "A",
};
const ROOM_B = {
  id: "b",
  hostDeviceId: "host-b",
  status: "playing" as const,
  name: "B",
};
const ROOM_C = {
  id: "c",
  hostDeviceId: "host-c",
  status: "waiting" as const,
  name: "C",
};

describe("filterRoomsWithLiveHost", () => {
  test("hides rooms until host presence is known true", () => {
    const presence: RoomHostPresence = {
      a: true,
      b: false,
      // c unknown
    };
    expect(
      filterRoomsWithLiveHost([ROOM_A, ROOM_B, ROOM_C], presence).map(
        (r) => r.id,
      ),
    ).toEqual(["a"]);
  });

  test("empty when no hosts are present", () => {
    expect(
      filterRoomsWithLiveHost([ROOM_A, ROOM_B], { a: false, b: false }),
    ).toEqual([]);
  });

  test("keeps member rooms even when host is absent (reclaim)", () => {
    expect(
      filterRoomsWithLiveHost([ROOM_A, ROOM_B], { a: false, b: false }, {
        alwaysIncludeIds: new Set(["b"]),
      }).map((r) => r.id),
    ).toEqual(["b"]);
  });
});
