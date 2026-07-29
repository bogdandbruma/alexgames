import { act, render } from "@testing-library/react";
import { describe, expect, test, vi, beforeEach } from "vitest";
import { BoardViewport } from "./BoardViewport";

vi.mock("../../three/GameScene", () => ({
  GameScene: () => null,
}));

vi.mock("./SpaceMinimap", () => ({
  SpaceMinimap: () => null,
}));

let viewportRenderCount = 0;

function ViewportProbe() {
  viewportRenderCount += 1;
  return <BoardViewport />;
}

describe("BoardViewport", () => {
  beforeEach(() => {
    viewportRenderCount = 0;
  });

  test("does not re-render when only message changes", async () => {
    const { useGameStore } = await import("../../game/store");

    useGameStore.setState({
      phase: "playing",
      message: "Initial",
      players: [
        {
          id: "player-1",
          name: "Test",
          avatarId: "cat",
          controller: "player",
          positionIndex: 0,
          coins: 0,
          inventory: [],
          lastDice: null,
          armedDiceX2: false,
        },
      ],
      currentPlayerIndex: 0,
      diceValue: 3,
      diceAnimating: false,
      diceMultiplier: 1,
    });

    render(<ViewportProbe />);
    const rendersAfterMount = viewportRenderCount;

    await act(async () => {
      useGameStore.setState({ message: "Updated narrative text" });
    });

    expect(viewportRenderCount).toBe(rendersAfterMount);
  });
});
