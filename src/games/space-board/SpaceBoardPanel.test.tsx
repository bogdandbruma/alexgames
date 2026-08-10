import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createInitialShopStock } from "../../game/shop";
import { useGameStore } from "../../game/store";
import { SpaceBoardPanel } from "./SpaceBoardPanel";

describe("SpaceBoardPanel end-turn action", () => {
  beforeEach(() => {
    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Test",
          avatarId: "cat",
          controller: "player",
          positionIndex: 0,
          coins: 0,
          inventory: [],
          lastDice: 4,
          armedDiceX2: false,
          trapped: false,
        },
      ],
      currentPlayerIndex: 0,
      diceValue: 4,
      diceAnimating: false,
      diceMultiplier: 1,
      rolling: false,
      actionItemUsedThisTurn: false,
      activePlayerWalk: null,
      pendingEvent: null,
      shopStock: createInitialShopStock(),
      message: "Ai dat 4.",
      uiToast: null,
      winnerId: null,
    });
  });

  afterEach(() => {
    cleanup();
  });

  test("end-turn button keeps an icon so mobile icon-only styles stay readable", () => {
    render(
      <SpaceBoardPanel onExit={() => {}} onRequestTargetItem={() => {}} />,
    );

    const endTurnButton = screen.getByRole("button", { name: /termină turul/i });
    expect(endTurnButton.querySelector("svg")).not.toBeNull();
  });
});
