import { describe, expect, test } from "vitest";
import {
  applyMysteryEffect,
  createMysteryOffer,
  mysteryCards,
} from "./mystery";

describe("space board mystery deck", () => {
  test("loads bundled mystery content and offers three to five shuffled cards", () => {
    const offer = createMysteryOffer({
      random: () => 0,
    });

    expect(mysteryCards.map(({ id }) => id)).toEqual([
      "car",
      "phone",
      "card",
      "rocket",
      "wand",
      "magnet",
    ]);
    expect(offer.cards).toHaveLength(3);
    expect(offer.cards.map(({ id }) => id)).toEqual(["magnet", "wand", "rocket"]);
  });

  test("applies the car, phone, and card effects", () => {
    const players = [
      { id: "active", positionId: 40, coins: 1 },
      { id: "other", positionId: 50, coins: 8 },
    ];

    expect(
      applyMysteryEffect({ cardId: "car", activePlayerId: "active", players }),
    ).toMatchObject({
      players: [
        { id: "active", positionId: 42, coins: 1 },
        { id: "other", positionId: 50, coins: 8 },
      ],
      changedPositionPlayerIds: ["active"],
    });
    expect(
      applyMysteryEffect({ cardId: "phone", activePlayerId: "active", players }),
    ).toMatchObject({
      players: [
        { id: "active", positionId: 40, coins: 0 },
        { id: "other", positionId: 50, coins: 8 },
      ],
      changedPositionPlayerIds: [],
    });
    expect(
      applyMysteryEffect({ cardId: "card", activePlayerId: "active", players }),
    ).toMatchObject({
      players: [
        { id: "active", positionId: 40, coins: 6 },
        { id: "other", positionId: 50, coins: 8 },
      ],
      changedPositionPlayerIds: [],
    });
  });

  test("moves to nearest players ahead or behind for rocket and magnet", () => {
    const players = [
      { id: "active", positionId: 30, coins: 3 },
      { id: "ahead-far", positionId: 44, coins: 0 },
      { id: "ahead-near", positionId: 38, coins: 0 },
      { id: "behind", positionId: 12, coins: 0 },
    ];

    expect(
      applyMysteryEffect({ cardId: "rocket", activePlayerId: "active", players }),
    ).toMatchObject({
      players: [
        { id: "active", positionId: 38, coins: 3 },
        { id: "ahead-far", positionId: 44, coins: 0 },
        { id: "ahead-near", positionId: 38, coins: 0 },
        { id: "behind", positionId: 12, coins: 0 },
      ],
      changedPositionPlayerIds: ["active"],
    });
    expect(
      applyMysteryEffect({ cardId: "magnet", activePlayerId: "active", players }),
    ).toMatchObject({
      players: [
        { id: "active", positionId: 12, coins: 3 },
        { id: "ahead-far", positionId: 44, coins: 0 },
        { id: "ahead-near", positionId: 38, coins: 0 },
        { id: "behind", positionId: 12, coins: 0 },
      ],
      changedPositionPlayerIds: ["active"],
    });
  });

  test("keeps rocket and magnet in place when there is no matching player", () => {
    const players = [
      { id: "active", positionId: 30, coins: 3 },
      { id: "tied", positionId: 30, coins: 0 },
    ];

    expect(
      applyMysteryEffect({ cardId: "rocket", activePlayerId: "active", players }),
    ).toMatchObject({
      players,
      changedPositionPlayerIds: [],
    });
    expect(
      applyMysteryEffect({ cardId: "magnet", activePlayerId: "active", players }),
    ).toMatchObject({
      players,
      changedPositionPlayerIds: [],
    });
  });

  test("permutes all player positions for wand using injected randomness", () => {
    const players = [
      { id: "active", positionId: 17, coins: 3 },
      { id: "second", positionId: 22, coins: 0 },
      { id: "third", positionId: 60, coins: 5 },
    ];
    const randomValues = [0.1, 0.3, 0.2];

    expect(
      applyMysteryEffect({
        cardId: "wand",
        activePlayerId: "active",
        players,
        random: () => randomValues.shift() ?? 0,
      }),
    ).toMatchObject({
      players: [
        { id: "active", positionId: 22, coins: 3 },
        { id: "second", positionId: 60, coins: 0 },
        { id: "third", positionId: 17, coins: 5 },
      ],
      changedPositionPlayerIds: ["active", "second", "third"],
    });
  });
});
