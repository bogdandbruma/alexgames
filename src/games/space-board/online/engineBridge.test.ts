import { describe, expect, test, vi } from "vitest";
import {
  collectUiEventsDuring,
  snapshotSpaceBoardState,
  type SpaceBoardStoreSlice,
} from "./engineBridge";
import { createInitialShopStock } from "../../../game/shop";

function slice(
  partial: Partial<SpaceBoardStoreSlice> &
    Pick<SpaceBoardStoreSlice, "players" | "currentPlayerIndex">,
): SpaceBoardStoreSlice {
  return {
    phase: "playing",
    diceValue: null,
    actionItemUsedThisTurn: false,
    message: "",
    shopStock: createInitialShopStock(),
    winnerId: null,
    pendingEvent: null,
    activePlayerWalk: null,
    diceAnimating: false,
    diceMultiplier: 1,
    rolling: false,
    portalTransition: null,
    playerCoinBursts: [],
    ...partial,
  };
}

describe("engineBridge", () => {
  test("snapshotSpaceBoardState copies authoritative + animation fields", () => {
    const walk = {
      durationMs: 300,
      endPosition: [1, 0, 0] as [number, number, number],
      fromRoomId: 1,
      playerId: "p0",
      startPosition: [0, 0, 0] as [number, number, number],
      startedAt: 1,
      toRoomId: 2,
    };
    const state = snapshotSpaceBoardState(
      slice({
        players: [
          {
            id: "p0",
            name: "A",
            avatarId: "cat",
            controller: "player",
            positionIndex: 0,
            coins: 2,
            lastDice: null,
            trapped: false,
          },
        ],
        currentPlayerIndex: 0,
        activePlayerWalk: walk,
        diceAnimating: true,
      }),
    );
    expect(state.activePlayerWalk).toEqual(walk);
    expect(state.diceAnimating).toBe(true);
    expect(state.players[0]?.coins).toBe(2);
  });

  test("collectUiEventsDuring records dice, walk, portal, coin bursts, and item_use", async () => {
    let current = slice({
      players: [
        {
          id: "p0",
          name: "A",
          avatarId: "cat",
          controller: "player",
          positionIndex: 0,
          coins: 0,
          lastDice: null,
          trapped: false,
          inventory: ["dice-x2"],
        },
      ],
      currentPlayerIndex: 0,
    });
    const listeners = new Set<(s: SpaceBoardStoreSlice) => void>();

    const api = {
      getState: () => current,
      subscribe: (fn: (s: SpaceBoardStoreSlice) => void) => {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
      setState: (next: SpaceBoardStoreSlice) => {
        current = next;
        for (const fn of listeners) fn(current);
      },
    };

    const run = vi.fn(async () => {
      api.setState({
        ...current,
        diceAnimating: true,
        rolling: true,
        diceValue: null,
      });
      api.setState({
        ...current,
        diceAnimating: false,
        diceValue: 4,
      });
      api.setState({
        ...current,
        activePlayerWalk: {
          durationMs: 200,
          endPosition: [1, 0, 0],
          fromRoomId: 1,
          playerId: "p0",
          startPosition: [0, 0, 0],
          startedAt: 10,
          toRoomId: 5,
        },
      });
      api.setState({
        ...current,
        portalTransition: {
          id: "portal-1",
          playerId: "p0",
          fromRoomId: 5,
          toRoomId: 20,
        },
      });
      api.setState({
        ...current,
        playerCoinBursts: [{ id: 1, playerId: "p0", amount: 1 }],
      });
      api.setState({
        ...current,
        players: [
          {
            ...current.players[0]!,
            inventory: [],
            armedDiceX2: true,
          },
        ],
      });
    });

    const events = await collectUiEventsDuring(api, run);

    expect(events.map((e) => e.type)).toEqual([
      "dice",
      "dice",
      "walk",
      "portal",
      "coin_burst",
      "item_use",
    ]);
    expect(events[events.length - 1]).toEqual({
      type: "item_use",
      playerId: "p0",
      itemId: "dice-x2",
    });
    expect(run).toHaveBeenCalledOnce();
  });

  test("collectUiEventsDuring onUiEvent fires during the action, not only after", async () => {
    let current = slice({
      players: [
        {
          id: "p0",
          name: "A",
          avatarId: "cat",
          controller: "player",
          positionIndex: 0,
          coins: 0,
          lastDice: null,
          trapped: false,
        },
      ],
      currentPlayerIndex: 0,
    });
    const listeners = new Set<(s: SpaceBoardStoreSlice) => void>();
    const api = {
      getState: () => current,
      subscribe: (fn: (s: SpaceBoardStoreSlice) => void) => {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
      setState: (next: SpaceBoardStoreSlice) => {
        current = next;
        for (const fn of listeners) fn(current);
      },
    };

    const live: string[] = [];
    let sawLiveDuringRun = false;

    await collectUiEventsDuring(
      api,
      async () => {
        api.setState({
          ...current,
          diceAnimating: true,
          rolling: true,
        });
        await Promise.resolve();
        if (live.includes("dice")) {
          sawLiveDuringRun = true;
        }
        api.setState({
          ...current,
          diceAnimating: false,
          diceValue: 5,
        });
      },
      {
        onUiEvent: (event) => {
          live.push(event.type);
        },
      },
    );

    expect(sawLiveDuringRun).toBe(true);
    expect(live).toEqual(["dice", "dice"]);
  });
});
