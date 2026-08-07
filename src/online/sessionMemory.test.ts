import { afterEach, describe, expect, test } from "vitest";
import {
  clearRememberedActiveRoomId,
  clearRememberedPlayMode,
  getRememberedActiveRoomId,
  getRememberedPlayMode,
  rememberActiveRoomId,
  rememberOnlinePlayMode,
} from "./sessionMemory";

afterEach(() => {
  localStorage.clear();
});

describe("online session memory", () => {
  test("remembers online play mode by game", () => {
    expect(getRememberedPlayMode("space-board")).toBe("choose");

    rememberOnlinePlayMode("space-board");

    expect(getRememberedPlayMode("space-board")).toBe("online");
    expect(getRememberedPlayMode("other-game")).toBe("choose");

    clearRememberedPlayMode("space-board");

    expect(getRememberedPlayMode("space-board")).toBe("choose");
  });

  test("remembers the active room by game", () => {
    expect(getRememberedActiveRoomId("space-board")).toBeNull();

    rememberActiveRoomId("space-board", "room-1");

    expect(getRememberedActiveRoomId("space-board")).toBe("room-1");
    expect(getRememberedActiveRoomId("other-game")).toBeNull();

    clearRememberedActiveRoomId("space-board");

    expect(getRememberedActiveRoomId("space-board")).toBeNull();
  });
});
