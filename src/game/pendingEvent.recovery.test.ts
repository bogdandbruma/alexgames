import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { migratePersistedState } from "./store/migrate";
import { resolveOrphanedPortalLanding } from "./store/helpers";
import type { GameState } from "./store/types";

describe("pendingEvent refresh recovery", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("migrates legacy pendingShop into pendingEvent", () => {
    const migrated = migratePersistedState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Alex",
          avatarId: "cat",
          controller: "player",
          positionIndex: 12,
          coins: 4,
          lastDice: 3,
          trapped: false,
        },
      ],
      currentPlayerIndex: 0,
      diceValue: 3,
      message: "In magazin",
      pendingShop: {
        playerId: "player-1",
        roomId: 13,
        purchased: false,
      },
    });

    expect(migrated.pendingEvent).toEqual({
      type: "shop",
      playerId: "player-1",
      roomId: 13,
      purchased: false,
    });
    expect(migrated.actionItemUsedThisTurn).toBe(false);
    expect(migrated.diceValue).toBe(3);
  });

  test("restores shop overlay from persisted pendingEvent", async () => {
    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Alex",
          avatarId: "cat",
          controller: "player",
          positionIndex: 12,
          coins: 5,
          lastDice: 2,
          trapped: false,
          inventory: [],
        },
      ],
      currentPlayerIndex: 0,
      diceValue: 2,
      actionItemUsedThisTurn: false,
      rolling: false,
      diceAnimating: false,
      pendingEvent: {
        type: "shop",
        playerId: "player-1",
        roomId: 13,
        purchased: false,
      },
      message: "Alex a intrat in magazin.",
    });

    const state = useGameStore.getState();

    expect(state.pendingEvent).toMatchObject({
      type: "shop",
      playerId: "player-1",
      roomId: 13,
    });
    expect(state.buyShopItem("pistol")).toBe(true);
    expect(useGameStore.getState().players[0].inventory).toEqual(["pistol"]);
  });

  test("orphaned portal ack after refresh completes destination room", () => {
    const state = {
      phase: "playing" as const,
      players: [
        {
          id: "player-1",
          name: "Alex",
          avatarId: "cat" as const,
          controller: "player" as const,
          positionIndex: 21,
          coins: 0,
          lastDice: 1,
          trapped: false,
          inventory: [],
          armedCoinsX3: false,
          armedDiceX2: false,
        },
      ],
      currentPlayerIndex: 0,
      diceValue: 1,
      actionItemUsedThisTurn: false,
      message: "Portal",
      shopStock: {} as GameState["shopStock"],
      winnerId: null,
      pendingEvent: {
        type: "portal" as const,
        id: "portal-refresh-1",
        playerId: "player-1",
        fromRoomId: 22,
        toRoomId: 28,
      },
      activePlayerWalk: null,
      diceAnimating: false,
      diceMultiplier: 1,
      rolling: false,
      portalTransition: null,
      uiToast: null,
      playerCoinBursts: [],
    } as unknown as GameState;

    const next = resolveOrphanedPortalLanding(state);

    expect(next?.players?.[0]?.positionIndex).toBe(27);
    expect(next?.pendingEvent).toMatchObject({
      type: "shop",
      roomId: 28,
      playerId: "player-1",
    });
    expect(next?.portalTransition).toMatchObject({
      fromRoomId: 22,
      toRoomId: 28,
    });
  });
});
