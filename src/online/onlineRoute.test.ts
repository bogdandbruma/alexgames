import { afterEach, describe, expect, test } from "vitest";
import {
  parseAppRouteFromHash,
  setGameHash,
  setOnlineRoomHash,
} from "./onlineRoute";

afterEach(() => {
  window.location.hash = "";
});

describe("online hash routing", () => {
  test("parses dashboard, game, and online room routes", () => {
    expect(parseAppRouteFromHash("")).toEqual({
      gameId: null,
      onlineRoomId: null,
    });
    expect(parseAppRouteFromHash("#space-board")).toEqual({
      gameId: "space-board",
      onlineRoomId: null,
    });
    expect(parseAppRouteFromHash("#/space-board/online/rooms/room-1")).toEqual({
      gameId: "space-board",
      onlineRoomId: "room-1",
    });
  });

  test("updates the current hash", () => {
    setGameHash("space-board");
    expect(window.location.hash).toBe("#space-board");

    setOnlineRoomHash("space-board", "room-1");
    expect(window.location.hash).toBe("#space-board/online/rooms/room-1");
  });
});
