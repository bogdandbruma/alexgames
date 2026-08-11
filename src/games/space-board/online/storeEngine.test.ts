import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  TRIVIA_MODAL_RESULT_MS,
  TRIVIA_TOAST_MS,
} from "../../../game/store/helpers";
import { createStoreHostEngine } from "./storeEngine";
import type { SpaceBoardStatePayload } from "./payloads";

describe("createStoreHostEngine deferred modal sync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("answerTrivia waits for modal close + end turn before returning final state", async () => {
    const { useGameStore } = await import("../../../game/store");

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Alex",
          avatarId: "cat",
          controller: "player",
          positionIndex: 31,
          coins: 5,
          lastDice: 1,
          trapped: false,
          inventory: [],
        },
        {
          id: "player-2",
          name: "Bogdan",
          avatarId: "dog",
          controller: "player",
          positionIndex: 2,
          coins: 3,
          lastDice: null,
          trapped: false,
          inventory: [],
        },
      ],
      currentPlayerIndex: 0,
      diceValue: 1,
      actionItemUsedThisTurn: false,
      rolling: false,
      diceAnimating: false,
      pendingEvent: {
        type: "trivia",
        playerId: "player-1",
        roomId: 32,
        question: {
          id: 1,
          question: "Q?",
          options: [
            { answer: "Yes", result: "correct" },
            { answer: "No", result: "wrong" },
          ],
        },
        result: null,
      },
      message: "Trivia",
      uiToast: null,
      playerCoinBursts: [],
    });

    const liveStates: SpaceBoardStatePayload[] = [];
    const engine = createStoreHostEngine(useGameStore, {
      roomId: "room-1",
      hostDeviceId: "host",
      viewerPlayerIds: ["player-1", "player-2", null],
      onStateLive: (state) => {
        liveStates.push(state);
      },
    });

    const pending = engine.answerTrivia("correct");
    let settled = false;
    void pending.then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(false);
    expect(liveStates.some((s) => s.pendingEvent?.type === "trivia")).toBe(
      true,
    );
    expect(
      liveStates.some(
        (s) =>
          s.pendingEvent?.type === "trivia" &&
          s.pendingEvent.result?.answer === "correct",
      ),
    ).toBe(true);

    await vi.advanceTimersByTimeAsync(TRIVIA_MODAL_RESULT_MS);
    expect(settled).toBe(false);
    expect(liveStates.some((s) => s.pendingEvent === null)).toBe(true);

    await vi.advanceTimersByTimeAsync(TRIVIA_TOAST_MS);
    const result = await pending;
    expect(settled).toBe(true);
    expect(result.state.pendingEvent).toBeNull();
    expect(result.state.currentPlayerIndex).toBe(1);
    expect(result.state.diceValue).toBeNull();
  });

  test("useInventoryItem trivia-cancel waits for end turn before returning", async () => {
    const { useGameStore } = await import("../../../game/store");

    useGameStore.setState({
      phase: "playing",
      players: [
        {
          id: "player-1",
          name: "Alex",
          avatarId: "cat",
          controller: "player",
          positionIndex: 31,
          coins: 5,
          lastDice: 1,
          trapped: false,
          inventory: ["trivia-cancel"],
        },
        {
          id: "player-2",
          name: "Bogdan",
          avatarId: "dog",
          controller: "player",
          positionIndex: 2,
          coins: 3,
          lastDice: null,
          trapped: false,
          inventory: [],
        },
      ],
      currentPlayerIndex: 0,
      diceValue: 1,
      actionItemUsedThisTurn: false,
      rolling: false,
      diceAnimating: false,
      pendingEvent: {
        type: "trivia",
        playerId: "player-1",
        roomId: 32,
        question: {
          id: 2,
          question: "Skip?",
          options: [
            { answer: "A", result: "correct" },
            { answer: "B", result: "wrong" },
          ],
        },
        result: null,
      },
      message: "Trivia",
      uiToast: null,
      playerCoinBursts: [],
    });

    const engine = createStoreHostEngine(useGameStore, {
      roomId: "room-1",
      hostDeviceId: "host",
      viewerPlayerIds: [null],
    });

    const pending = engine.useInventoryItem("trivia-cancel");
    let settled = false;
    void pending.then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(useGameStore.getState().pendingEvent).toBeNull();
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1_200);
    const result = await pending;
    expect(settled).toBe(true);
    expect(result.state.pendingEvent).toBeNull();
    expect(result.state.currentPlayerIndex).toBe(1);
  });
});
