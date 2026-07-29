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

describe("useAiTriviaAnswer", () => {
  test("auto-answers trivia for AI players at room 42", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { useGameStore } = await import("../../game/store");
    const { useAiTriviaAnswer } = await import("./useAiTriviaAnswer");

    function AiTriviaHost() {
      useAiTriviaAnswer();
      return null;
    }

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "robot-1",
          name: "Robot 1",
          avatarId: "dog",
          controller: "ai",
          positionIndex: 41,
          coins: 2,
          lastDice: 1,
          trapped: false,
        },
        {
          id: "human",
          name: "Jucător 1",
          avatarId: "cat",
          controller: "player",
          positionIndex: 10,
          coins: 0,
          lastDice: null,
          trapped: false,
        },
      ],
      currentPlayerIndex: 0,
      diceValue: 1,
      diceAnimating: false,
      message: "Trivia",
      rolling: false,
      uiToast: null,
      pendingTrivia: {
        playerId: "robot-1",
        roomId: 42,
        question: {
          id: 1,
          question: "Q",
          options: [
            { answer: "Mercur", result: "correct" },
            { answer: "Venus", result: "wrong" },
          ],
        },
        result: null,
      },
    });

    render(<AiTriviaHost />);

    await vi.advanceTimersByTimeAsync(1_400);

    const answered = useGameStore.getState();

    expect(answered.pendingTrivia?.result).toMatchObject({
      answer: "correct",
    });
  });
});
