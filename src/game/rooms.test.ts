import { describe, expect, test } from "vitest";
import {
  finishRoomId,
  getRoomById,
  gameplayRooms,
  maxInventory,
  trapEscapeCoinCost,
} from "./rooms";

describe("space board rooms", () => {
  test("loads gameplay rooms and board config from content", () => {
    expect(gameplayRooms.length).toBeGreaterThan(0);
    expect(getRoomById(1)).toMatchObject({
      id: 1,
      action: "coins",
      coinsOnEnter: 0,
    });
    expect(getRoomById(finishRoomId)).toMatchObject({
      id: finishRoomId,
      action: "finish",
      coinsOnEnter: 0,
    });
    expect(maxInventory).toBeGreaterThan(0);
    expect(trapEscapeCoinCost).toBeGreaterThan(0);
  });

  test("does not grant coins on trivia room entry", () => {
    const triviaRooms = gameplayRooms.filter((room) => room.action === "trivia");

    expect(triviaRooms.length).toBeGreaterThan(0);
    expect(triviaRooms.every((room) => room.coinsOnEnter === 0)).toBe(true);
  });
});
