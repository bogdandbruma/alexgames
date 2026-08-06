import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { createInitialShopStock } from "../../game/shop";
import { useGameStore } from "../../game/store";
import { useAiTrapResolve } from "./useAiTrapResolve";

function Harness() {
  useAiTrapResolve();
  return null;
}

describe("useAiTrapResolve", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "ai-1",
          name: "Robot",
          avatarId: "cat",
          controller: "ai",
          positionIndex: 51,
          coins: 12,
          lastDice: null,
          trapped: true,
          inventory: ["cosmic-key"],
        },
      ],
      currentPlayerIndex: 0,
      diceValue: null,
      diceAnimating: false,
      rolling: false,
      actionItemUsedThisTurn: false,
      activePlayerWalk: null,
      pendingEvent: {
        type: "trap",
        playerId: "ai-1",
        roomId: 52,
      },
      shopStock: createInitialShopStock(),
      message: "Trap",
      uiToast: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("prefers cosmic key over paying for AI trap escape", async () => {
    render(<Harness />);

    await vi.advanceTimersByTimeAsync(1_400);

    const state = useGameStore.getState();
    expect(state.pendingEvent).toBeNull();
    expect(state.players[0]).toMatchObject({
      trapped: false,
      coins: 12,
      inventory: [],
    });
  });
});
