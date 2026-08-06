import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useAiDiceRoll } from "./useAiDiceRoll";

const storage = new Map<string, string>();

function AiDiceHost() {
  useAiDiceRoll();
  return null;
}

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

describe("useAiDiceRoll", () => {
  test("waits until the dice readout clears before auto-rolling again", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { useGameStore } = await import("../../game/store");

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
        },
      ],
      currentPlayerIndex: 1,
      diceValue: null,
      diceAnimating: false,
      diceMultiplier: 1,
      message: "Robot turn",
      rolling: false,
      uiToast: null,
      pendingEvent: null,
    });

    render(<AiDiceHost />);

    const firstRoll = useGameStore.getState().rollDice();

    await vi.advanceTimersByTimeAsync(20_000);
    await firstRoll;

    const state = useGameStore.getState();
    const robot = state.players.find(({ id }) => id === "robot");
    const human = state.players.find(({ id }) => id === "human");

    expect(state.currentPlayerIndex).toBe(0);
    expect(robot?.positionIndex).toBe(1);
    expect(human?.positionIndex).toBe(0);
    expect(state.rolling).toBe(false);
  });
});
