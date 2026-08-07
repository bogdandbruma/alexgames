import { describe, expect, test } from "vitest";
import { createInitialShopStock } from "../../../game/shop";
import type { SpaceBoardStatePayload } from "./payloads";
import { filterSpaceBoardStateForViewer } from "./visibility";

function baseState(
  overrides: Partial<SpaceBoardStatePayload> = {},
): SpaceBoardStatePayload {
  return {
    phase: "playing",
    players: [
      {
        id: "p0",
        name: "Host",
        avatarId: "cat",
        controller: "player",
        positionIndex: 3,
        coins: 8,
        lastDice: 2,
        trapped: false,
        inventory: ["dice-x2", "bomb"],
        armedDiceX2: false,
        armedCoinsX3: false,
      },
      {
        id: "p1",
        name: "Guest",
        avatarId: "dog",
        controller: "player",
        positionIndex: 1,
        coins: 4,
        lastDice: null,
        trapped: false,
        inventory: ["cosmic-key"],
        armedDiceX2: false,
        armedCoinsX3: false,
      },
    ],
    currentPlayerIndex: 0,
    diceValue: null,
    actionItemUsedThisTurn: false,
    message: "ok",
    shopStock: {
      ...createInitialShopStock(),
      "dice-x2": false,
      bomb: false,
      "cosmic-key": false,
    },
    winnerId: null,
    pendingEvent: null,
    activePlayerWalk: null,
    diceAnimating: false,
    diceMultiplier: 1,
    rolling: false,
    portalTransition: null,
    playerCoinBursts: [],
    ...overrides,
  };
}

describe("filterSpaceBoardStateForViewer", () => {
  test("keeps viewer inventory and strips others", () => {
    const filtered = filterSpaceBoardStateForViewer(baseState(), "p0");

    expect(filtered.players[0]?.inventory).toEqual(["dice-x2", "bomb"]);
    expect(filtered.players[1]?.inventory).toBeUndefined();
    expect(filtered.viewerPlayerId).toBe("p0");
  });

  test("strips all inventories for spectators (null viewer)", () => {
    const filtered = filterSpaceBoardStateForViewer(baseState(), null);

    expect(filtered.players[0]?.inventory).toBeUndefined();
    expect(filtered.players[1]?.inventory).toBeUndefined();
    expect(filtered.viewerPlayerId).toBeNull();
  });

  test("masks shop stock so privately held items look available to others", () => {
    const forOther = filterSpaceBoardStateForViewer(baseState(), "p1");
    // p0 holds dice-x2 + bomb; those should look in stock to p1
    expect(forOther.shopStock["dice-x2"]).toBe(true);
    expect(forOther.shopStock.bomb).toBe(true);
    // cosmic-key is held by p1 (viewer) — real stock stays false for them
    expect(forOther.shopStock["cosmic-key"]).toBe(false);

    const forSpectator = filterSpaceBoardStateForViewer(baseState(), null);
    expect(forSpectator.shopStock["dice-x2"]).toBe(true);
    expect(forSpectator.shopStock.bomb).toBe(true);
    expect(forSpectator.shopStock["cosmic-key"]).toBe(true);
  });

  test("keeps trivia pending event fully public", () => {
    const trivia = {
      type: "trivia" as const,
      playerId: "p0",
      roomId: 12,
      question: {
        id: 1,
        question: "Q?",
        options: [
          { answer: "A", result: "correct" as const },
          { answer: "B", result: "wrong" as const },
        ],
      },
      result: {
        answer: "correct" as const,
        coinsDelta: 2,
      },
    };
    const filtered = filterSpaceBoardStateForViewer(
      baseState({ pendingEvent: trivia }),
      "p1",
    );
    expect(filtered.pendingEvent).toEqual(trivia);
  });

  test("keeps mystery pending event fully public", () => {
    const mystery = {
      type: "mystery" as const,
      playerId: "p0",
      roomId: 20,
      cards: [
        {
          id: "rocket" as const,
          icon: "R",
          title: "Rocket",
          description: "Fly ahead",
          effectKey: "rocket" as const,
        },
      ],
      revealedCardId: "rocket" as const,
    };
    const filtered = filterSpaceBoardStateForViewer(
      baseState({ pendingEvent: mystery }),
      null,
    );
    expect(filtered.pendingEvent).toEqual(mystery);
  });

  test("keeps trap and portal pending events public", () => {
    const trap = {
      type: "trap" as const,
      playerId: "p1",
      roomId: 7,
    };
    expect(
      filterSpaceBoardStateForViewer(baseState({ pendingEvent: trap }), "p0")
        .pendingEvent,
    ).toEqual(trap);

    const portal = {
      type: "portal" as const,
      id: "portal-1",
      playerId: "p0",
      fromRoomId: 5,
      toRoomId: 30,
    };
    expect(
      filterSpaceBoardStateForViewer(baseState({ pendingEvent: portal }), null)
        .pendingEvent,
    ).toEqual(portal);
  });

  test("shop pending stays public without revealing purchased item id", () => {
    const shop = {
      type: "shop" as const,
      playerId: "p0",
      roomId: 15,
      purchased: true,
    };
    const filtered = filterSpaceBoardStateForViewer(
      baseState({ pendingEvent: shop }),
      "p1",
    );
    expect(filtered.pendingEvent).toEqual(shop);
    expect(filtered.pendingEvent).not.toHaveProperty("itemId");
  });

  test("armed item-use flags stay public even when inventory is stripped", () => {
    const state = baseState({
      players: [
        {
          id: "p0",
          name: "Host",
          avatarId: "cat",
          controller: "player",
          positionIndex: 3,
          coins: 8,
          lastDice: 2,
          trapped: false,
          inventory: [],
          armedDiceX2: true,
          armedCoinsX3: false,
        },
        {
          id: "p1",
          name: "Guest",
          avatarId: "dog",
          controller: "player",
          positionIndex: 1,
          coins: 4,
          lastDice: null,
          trapped: false,
          inventory: ["cosmic-key"],
          armedDiceX2: false,
          armedCoinsX3: false,
        },
      ],
    });
    const filtered = filterSpaceBoardStateForViewer(state, "p1");
    expect(filtered.players[0]?.armedDiceX2).toBe(true);
    expect(filtered.players[0]?.inventory).toBeUndefined();
  });
});
