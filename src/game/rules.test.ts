import { describe, expect, test } from "vitest";
import type { GameplayRoom } from "./rooms";
import { finishRoomId, getRoomById } from "./rooms";
import {
  applyCoinsOnEnter,
  resolveDiceMove,
  resolvePositionChange,
  resolveDiceTurn,
  resolveTriviaAnswer,
} from "./rules";

describe("space board movement", () => {
  test("moves along the main path", () => {
    expect(resolveDiceMove({ positionId: 1, dice: 5 })).toEqual({
      positionId: 6,
      outcome: "moved",
    });
  });

  test("continues to room 23 when the dice overshoots room 22", () => {
    expect(resolveDiceMove({ positionId: 21, dice: 2 })).toEqual({
      positionId: 23,
      outcome: "moved",
    });
  });

  test("keeps an exact landing on room 22 in this slice", () => {
    expect(resolveDiceMove({ positionId: 21, dice: 1 })).toEqual({
      positionId: 22,
      outcome: "moved",
    });
  });

  test("rejoins the main path from room 27 to 28", () => {
    expect(resolveDiceMove({ positionId: 27, dice: 1 })).toEqual({
      positionId: 28,
      outcome: "moved",
    });
  });

  test("does not move when the dice would overshoot the finish room", () => {
    expect(
      resolveDiceMove({ positionId: finishRoomId - 2, dice: 3 }),
    ).toEqual({
      positionId: finishRoomId - 2,
      outcome: "overshot",
    });
  });

  test("finishes the game when landing exactly on the finish room", () => {
    expect(
      resolveDiceMove({ positionId: finishRoomId - 2, dice: 2 }),
    ).toEqual({
      positionId: finishRoomId,
      outcome: "finished",
    });
  });

  test("clamps backward position changes at room 1", () => {
    expect(resolvePositionChange({ positionId: 2, steps: -6, coins: 3 })).toEqual({
      positionId: 1,
      outcome: "moved",
      coins: 3,
      action: "coins",
    });
  });
});

describe("space board portals", () => {
  test("teleports an exact landing on room 22 and resolves the destination action", () => {
    expect(resolveDiceTurn({ positionId: 21, dice: 1, coins: 7 })).toEqual({
      positionId: 28,
      outcome: "moved",
      coins: 7,
      action: "shop",
      portal: {
        from: 22,
        to: 28,
      },
    });
  });

  test("applies every configured portal on exact landing", () => {
    expect([
      resolveDiceTurn({ positionId: 34, dice: 1, coins: 2 }),
      resolveDiceTurn({ positionId: 44, dice: 1, coins: 2 }),
      resolveDiceTurn({ positionId: 59, dice: 1, coins: 2 }),
    ]).toEqual([
      {
        positionId: 42,
        outcome: "moved",
        coins: 2,
        action: "trivia",
        portal: {
          from: 35,
          to: 42,
        },
      },
      {
        positionId: 38,
        outcome: "moved",
        coins: 2,
        action: "trivia",
        portal: {
          from: 45,
          to: 38,
        },
      },
      {
        positionId: 50,
        outcome: "moved",
        coins: 2,
        action: "trivia",
        portal: {
          from: 60,
          to: 50,
        },
      },
    ]);
  });

  test("does not activate the 22 portal when movement passes it without stopping", () => {
    expect(resolveDiceTurn({ positionId: 21, dice: 2, coins: 4 })).toEqual({
      positionId: 23,
      outcome: "moved",
      coins: 7,
      action: "coins",
    });
  });

  test("resolves portal destinations instead of the portal source room action", () => {
    const results = [
      resolveDiceTurn({ positionId: 21, dice: 1, coins: 5 }),
      resolveDiceTurn({ positionId: 34, dice: 1, coins: 5 }),
      resolveDiceTurn({ positionId: 44, dice: 1, coins: 5 }),
      resolveDiceTurn({ positionId: 59, dice: 1, coins: 5 }),
    ];

    expect(results.map(({ action, coins }) => ({ action, coins }))).toEqual([
      { action: "shop", coins: 5 },
      { action: "trivia", coins: 5 },
      { action: "trivia", coins: 5 },
      { action: "trivia", coins: 5 },
    ]);
  });
});

describe("space board coins", () => {
  test("adds coins when entering a coins room", () => {
    expect(applyCoinsOnEnter({ coins: 4, room: getRoomById(30) })).toBe(10);
  });

  test("keeps the coin balance at zero or above", () => {
    const penaltyRoom: GameplayRoom = {
      id: 999,
      zone: "moon",
      action: "coins",
      coinsOnEnter: -4,
    };

    expect(applyCoinsOnEnter({ coins: 2, room: penaltyRoom })).toBe(0);
  });
});

describe("space board traps", () => {
  test("marks a player trapped for the following turn when entering a trap room", () => {
    expect(resolveDiceTurn({ positionId: 51, dice: 1, coins: 4 })).toEqual({
      positionId: 52,
      outcome: "moved",
      coins: 4,
      action: "trap",
      trap: {
        roomId: 52,
      },
    });
  });

  test("can trap again after the player has left and re-enters a trap room", () => {
    expect(resolveDiceTurn({ positionId: 54, dice: 1, coins: 2 })).toEqual({
      positionId: 55,
      outcome: "moved",
      coins: 2,
      action: "trap",
      trap: {
        roomId: 55,
      },
    });
  });
});

describe("space board trivia", () => {
  test("adds one coin for a correct answer", () => {
    expect(resolveTriviaAnswer({ coins: 4, answer: "correct" })).toBe(5);
  });

  test("removes one coin for a wrong answer without going below zero", () => {
    expect([
      resolveTriviaAnswer({ coins: 4, answer: "wrong" }),
      resolveTriviaAnswer({ coins: 0, answer: "wrong" }),
    ]).toEqual([3, 0]);
  });
});
