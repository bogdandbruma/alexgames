import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { GamePlayer } from "./store/types";

/**
 * One-by-one feedback loop for purchased shop inventory items.
 * Asserts each catalog effect against the PRD behavior.
 */

const basePlayer = (overrides: Partial<GamePlayer> = {}): GamePlayer => ({
  id: "player-1",
  name: "Active",
  avatarId: "cat",
  controller: "player",
  positionIndex: 0,
  coins: 20,
  lastDice: null,
  trapped: false,
  inventory: [],
  armedCoinsX3: false,
  armedDiceX2: false,
  ...overrides,
});

const otherPlayer = (overrides: Partial<GamePlayer> = {}): GamePlayer =>
  basePlayer({
    id: "player-2",
    name: "Target",
    avatarId: "dog",
    positionIndex: 10,
    coins: 0,
    inventory: [],
    ...overrides,
  });

describe("shop inventory items one-by-one", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("1) pistol: pushes target +1 after roll", async () => {
    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        basePlayer({ inventory: ["pistol"], positionIndex: 0 }),
        otherPlayer({ positionIndex: 4 }),
      ],
      currentPlayerIndex: 0,
      diceValue: 3,
      rolling: false,
      diceAnimating: false,
      actionItemUsedThisTurn: false,
      pendingEvent: null,
    });

    const __inventoryItemResult1 = useGameStore.getState().useInventoryItem("pistol", "player-2");
    await vi.advanceTimersByTimeAsync(20_000);
    await expect(__inventoryItemResult1).resolves.toBe(true);

    const state = useGameStore.getState();
    expect(state.players[1].positionIndex + 1).toBe(6);
    expect(state.players[0].inventory).toEqual([]);
    expect(state.actionItemUsedThisTurn).toBe(true);
  });

  test("2) dice-x2: arms next roll ×2", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [basePlayer({ inventory: ["dice-x2"], positionIndex: 0 })],
      currentPlayerIndex: 0,
      diceValue: null,
      rolling: false,
      diceAnimating: false,
      pendingEvent: null,
    });

    const __inventoryItemResult2 = useGameStore.getState().useInventoryItem("dice-x2");
    await vi.advanceTimersByTimeAsync(20_000);
    await expect(__inventoryItemResult2).resolves.toBe(true);
    expect(useGameStore.getState().players[0]).toMatchObject({
      inventory: [],
      armedDiceX2: true,
    });

    const roll = useGameStore.getState().rollDice();
    await vi.advanceTimersByTimeAsync(14_000);
    await roll;

    const player = useGameStore.getState().players[0];
    expect(player.lastDice).toBe(2);
    expect(player.positionIndex + 1).toBe(3);
    expect(player.armedDiceX2).toBe(false);
  });

  test("3) coins-x3: triples next coinsOnEnter only", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [basePlayer({ inventory: ["coins-x3"], positionIndex: 0 })],
      currentPlayerIndex: 0,
      diceValue: null,
      rolling: false,
      diceAnimating: false,
      pendingEvent: null,
    });

    const __inventoryItemResult3 = useGameStore.getState().useInventoryItem("coins-x3");
    await vi.advanceTimersByTimeAsync(20_000);
    await expect(__inventoryItemResult3).resolves.toBe(true);

    const roll = useGameStore.getState().rollDice();
    await vi.advanceTimersByTimeAsync(14_000);
    await roll;

    // room 2 has coinsOnEnter 2 → ×3 = 6
    expect(useGameStore.getState().players[0]).toMatchObject({
      positionIndex: 1,
      coins: 26,
      armedCoinsX3: false,
      inventory: [],
    });
  });

  test("4a) trivia-cancel: auto-skips when rolling onto trivia", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        basePlayer({ inventory: ["trivia-cancel"], positionIndex: 31 }),
      ],
      currentPlayerIndex: 0,
      diceValue: null,
      rolling: false,
      diceAnimating: false,
      pendingEvent: null,
    });

    const roll = useGameStore.getState().rollDice();
    await vi.advanceTimersByTimeAsync(14_000);
    await roll;

    const state = useGameStore.getState();
    expect(state.pendingEvent).toBeNull();
    expect(state.players[0].inventory).toEqual([]);
    expect(state.players[0].coins).toBe(20);
  });

  test("4b) trivia-cancel: click during pending trivia should skip (PRD)", async () => {
    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        basePlayer({ inventory: ["trivia-cancel"], positionIndex: 31 }),
      ],
      currentPlayerIndex: 0,
      diceValue: 1,
      rolling: false,
      diceAnimating: false,
      actionItemUsedThisTurn: false,
      pendingEvent: {
        type: "trivia",
        playerId: "player-1",
        roomId: 32,
        question: {
          id: 1,
          question: "Test?",
          options: [
            { answer: "A", result: "correct" },
            { answer: "B", result: "wrong" },
          ],
        },
        result: null,
      },
    });

    const __inventoryItemResult4 = useGameStore.getState().useInventoryItem("trivia-cancel");
    await vi.advanceTimersByTimeAsync(20_000);
    const used = await __inventoryItemResult4;
    const state = useGameStore.getState();

    expect(used).toBe(true);
    expect(state.pendingEvent).toBeNull();
    expect(state.players[0].inventory).toEqual([]);
    expect(state.players[0].coins).toBe(20);
  });

  test("4c) trivia-cancel: star landing on trivia should honor cancel", async () => {
    const { useGameStore } = await import("./store");

    // position 26 (room 27) +8 → room 35 portal → 42 trivia
    useGameStore.setState({
      phase: "playing",
      players: [
        basePlayer({
          inventory: ["star", "trivia-cancel"],
          positionIndex: 26,
        }),
      ],
      currentPlayerIndex: 0,
      diceValue: 2,
      rolling: false,
      diceAnimating: false,
      actionItemUsedThisTurn: false,
      pendingEvent: null,
    });

    const __inventoryItemResult5 = useGameStore.getState().useInventoryItem("star");
    await vi.advanceTimersByTimeAsync(20_000);
    await expect(__inventoryItemResult5).resolves.toBe(true);
    await vi.advanceTimersByTimeAsync(15_000);

    const state = useGameStore.getState();
    expect(state.players[0].positionIndex + 1).toBe(42);
    expect(state.pendingEvent).toBeNull();
    expect(state.players[0].inventory).toEqual([]);
  });

  test("5) claw: pulls target -3 after roll", async () => {
    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        basePlayer({ inventory: ["claw"] }),
        otherPlayer({ positionIndex: 9 }),
      ],
      currentPlayerIndex: 0,
      diceValue: 2,
      rolling: false,
      diceAnimating: false,
      actionItemUsedThisTurn: false,
      pendingEvent: null,
    });

    const __inventoryItemResult6 = useGameStore.getState().useInventoryItem("claw", "player-2");
    await vi.advanceTimersByTimeAsync(20_000);
    await expect(__inventoryItemResult6).resolves.toBe(true);
    expect(useGameStore.getState().players[1].positionIndex + 1).toBe(7);
    expect(useGameStore.getState().players[0].inventory).toEqual([]);
  });

  test("6) bomb: all others -6, self stays", async () => {
    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        basePlayer({ inventory: ["bomb"], positionIndex: 20 }),
        otherPlayer({ positionIndex: 14 }),
        basePlayer({
          id: "player-3",
          name: "Other",
          avatarId: "fox",
          positionIndex: 8,
          inventory: [],
        }),
      ],
      currentPlayerIndex: 0,
      diceValue: 1,
      rolling: false,
      diceAnimating: false,
      actionItemUsedThisTurn: false,
      pendingEvent: null,
    });

    const __inventoryItemResult7 = useGameStore.getState().useInventoryItem("bomb");
    await vi.advanceTimersByTimeAsync(20_000);
    await expect(__inventoryItemResult7).resolves.toBe(true);

    const state = useGameStore.getState();
    expect(state.players[0].positionIndex + 1).toBe(21);
    expect(state.players[1].positionIndex + 1).toBe(9);
    expect(state.players[2].positionIndex + 1).toBe(3);
    expect(state.players[0].inventory).toEqual([]);
  });

  test("7) star: self +8 and re-checks portal/destination", async () => {
    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [basePlayer({ inventory: ["star"], positionIndex: 26 })],
      currentPlayerIndex: 0,
      diceValue: 2,
      rolling: false,
      diceAnimating: false,
      actionItemUsedThisTurn: false,
      pendingEvent: null,
    });

    const __inventoryItemResult8 = useGameStore.getState().useInventoryItem("star");
    await vi.advanceTimersByTimeAsync(20_000);
    await expect(__inventoryItemResult8).resolves.toBe(true);
    await vi.advanceTimersByTimeAsync(15_000);

    const state = useGameStore.getState();
    expect(state.players[0].positionIndex + 1).toBe(42);
    expect(state.pendingEvent).toMatchObject({
      playerId: "player-1",
      roomId: 42,
    });
    expect(state.players[0].inventory).toEqual([]);
  });

  test("8) cosmic-key: click while trapped escapes", async () => {
    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        basePlayer({
          inventory: ["cosmic-key"],
          trapped: true,
          positionIndex: 51,
          coins: 0,
        }),
      ],
      currentPlayerIndex: 0,
      diceValue: null,
      rolling: false,
      diceAnimating: false,
      pendingEvent: null,
    });

    const __inventoryItemResult9 = useGameStore.getState().useInventoryItem("cosmic-key");
    await vi.advanceTimersByTimeAsync(20_000);
    await expect(__inventoryItemResult9).resolves.toBe(true);
    expect(useGameStore.getState().players[0]).toMatchObject({
      trapped: false,
      inventory: [],
      coins: 0,
    });
  });

  test("8b) cosmic-key: escapes trap from the trap modal without paying coins", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        basePlayer({
          inventory: ["cosmic-key"],
          trapped: true,
          positionIndex: 51,
          coins: 10,
        }),
      ],
      currentPlayerIndex: 0,
      diceValue: null,
      rolling: false,
      diceAnimating: false,
      pendingEvent: {
        type: "trap",
        playerId: "player-1",
        roomId: 52,
      },
    });

    expect(useGameStore.getState().resolveTrap("key")).toBe(true);

    expect(useGameStore.getState().players[0]).toMatchObject({
      trapped: false,
      inventory: [],
      coins: 10,
    });
    expect(useGameStore.getState().pendingEvent).toBeNull();

    const roll = useGameStore.getState().rollDice();
    await vi.advanceTimersByTimeAsync(14_000);
    await roll;

    expect(useGameStore.getState().players[0].lastDice).toBe(1);
  });

  test("9) swap-arrow: swaps positions and re-checks portals", async () => {
    const { useGameStore } = await import("./store");

    useGameStore.setState({
      phase: "playing",
      players: [
        basePlayer({ inventory: ["swap-arrow"], positionIndex: 0 }),
        otherPlayer({ positionIndex: 21 }),
      ],
      currentPlayerIndex: 0,
      diceValue: 2,
      rolling: false,
      diceAnimating: false,
      actionItemUsedThisTurn: false,
      pendingEvent: null,
    });

    const __inventoryItemResult10 = useGameStore.getState().useInventoryItem("swap-arrow", "player-2");
    await vi.advanceTimersByTimeAsync(20_000);
    await expect(__inventoryItemResult10).resolves.toBe(true);

    const state = useGameStore.getState();
    // target was on 22 → portal to 28 for active player
    expect(state.players[0].positionIndex + 1).toBe(28);
    expect(state.players[1].positionIndex + 1).toBe(1);
    expect(state.players[0].inventory).toEqual([]);
  });
});
