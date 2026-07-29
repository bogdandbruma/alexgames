import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const storage = new Map<string, string>();

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  storage.clear();
  const localStorage = {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      storage.delete(key);
    }),
  };

  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("window", {
    clearTimeout: globalThis.clearTimeout,
    localStorage,
    setTimeout: globalThis.setTimeout,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useAiInventory", () => {
  test("arms dice-x2 before the robot rolls", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { useGameStore } = await import("../../game/store");
    const { useAiInventory } = await import("./useAiInventory");

    function AiInventoryHost() {
      useAiInventory();
      return null;
    }

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "human",
          name: "Human",
          avatarId: "cat",
          controller: "player",
          positionIndex: 0,
          coins: 0,
          lastDice: null,
          trapped: false,
          inventory: [],
        },
        {
          id: "robot",
          name: "Robot",
          avatarId: "dog",
          controller: "ai",
          positionIndex: 0,
          coins: 0,
          lastDice: null,
          trapped: false,
          inventory: ["dice-x2"],
        },
      ],
      currentPlayerIndex: 1,
      diceValue: null,
      diceAnimating: false,
      diceMultiplier: 1,
      message: "Robot turn",
      rolling: false,
      uiToast: null,
      pendingShop: null,
      pendingMystery: null,
      pendingPortal: null,
      pendingTrivia: null,
      actionItemUsedThisTurn: false,
      activePlayerWalk: null,
    });

    render(<AiInventoryHost />);

    await vi.advanceTimersByTimeAsync(500);

    const armed = useGameStore.getState().players.find(({ id }) => id === "robot");

    expect(armed?.inventory).toEqual([]);
    expect(armed?.armedDiceX2).toBe(true);

    const roll = useGameStore.getState().rollDice();

    await vi.advanceTimersByTimeAsync(20_000);
    await roll;

    const robot = useGameStore.getState().players.find(({ id }) => id === "robot");

    expect(robot?.lastDice).toBe(2);
  });

  test("uses an action item after rolling when the turn stays open", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { useGameStore } = await import("../../game/store");
    const { useAiInventory } = await import("./useAiInventory");

    function AiInventoryHost() {
      useAiInventory();
      return null;
    }

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "robot",
          name: "Robot",
          avatarId: "dog",
          controller: "ai",
          positionIndex: 0,
          coins: 0,
          lastDice: null,
          trapped: false,
          inventory: ["star"],
        },
        {
          id: "human",
          name: "Human",
          avatarId: "cat",
          controller: "player",
          positionIndex: 0,
          coins: 0,
          lastDice: null,
          trapped: false,
          inventory: [],
        },
      ],
      currentPlayerIndex: 0,
      diceValue: 1,
      diceAnimating: false,
      diceMultiplier: 1,
      message: "Inventar",
      rolling: false,
      uiToast: null,
      pendingShop: null,
      pendingMystery: null,
      pendingPortal: null,
      pendingTrivia: null,
      actionItemUsedThisTurn: false,
      activePlayerWalk: null,
    });

    render(<AiInventoryHost />);

    await vi.advanceTimersByTimeAsync(2_000);

    const robot = useGameStore.getState().players.find(({ id }) => id === "robot");

    expect(robot?.positionIndex).toBe(8);
    expect(robot?.inventory).toEqual([]);
    expect(useGameStore.getState().actionItemUsedThisTurn).toBe(true);
  });
});
