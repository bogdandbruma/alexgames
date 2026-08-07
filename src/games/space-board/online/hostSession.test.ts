import { describe, expect, test, vi } from "vitest";
import { createRoomEnvelope } from "../../../online/envelope";
import {
  createSpaceBoardHostSession,
  type SpaceBoardHostEngine,
} from "./hostSession";
import {
  parseSpaceBoardAction,
  type SpaceBoardStatePayload,
  type SpaceBoardUiEventPayload,
} from "./payloads";
import { createInitialShopStock } from "../../../game/shop";

const ROOM_ID = "room-1";
const HOST_DEVICE = "host-device";
const PLAYER_DEVICE = "player-device";
const SPECTATOR_DEVICE = "spectator-device";

const baseState = (): SpaceBoardStatePayload => ({
  phase: "playing",
  players: [
    {
      id: "p0",
      name: "Host",
      avatarId: "cat",
      controller: "player",
      positionIndex: 0,
      coins: 0,
      lastDice: null,
      trapped: false,
    },
    {
      id: "p1",
      name: "Guest",
      avatarId: "dog",
      controller: "player",
      positionIndex: 0,
      coins: 0,
      lastDice: null,
      trapped: false,
    },
  ],
  currentPlayerIndex: 0,
  diceValue: null,
  actionItemUsedThisTurn: false,
  message: "Rândul lui Host.",
  shopStock: createInitialShopStock(),
  winnerId: null,
  pendingEvent: null,
  activePlayerWalk: null,
  diceAnimating: false,
  diceMultiplier: 1,
  rolling: false,
  portalTransition: null,
  playerCoinBursts: [],
});

describe("Space Board action payloads", () => {
  test("parses roll, move, and endTurn actions", () => {
    expect(parseSpaceBoardAction({ type: "roll" })).toEqual({ type: "roll" });
    expect(parseSpaceBoardAction({ type: "move" })).toEqual({ type: "move" });
    expect(parseSpaceBoardAction({ type: "endTurn" })).toEqual({
      type: "endTurn",
    });
    expect(parseSpaceBoardAction({ type: "buy" })).toBeNull();
  });
});

function engineStub(
  overrides: Partial<SpaceBoardHostEngine> = {},
): SpaceBoardHostEngine {
  return {
    getState: vi.fn(baseState),
    roll: vi.fn(),
    move: vi.fn(),
    endTurn: vi.fn(),
    answerTrivia: vi.fn(),
    pickMystery: vi.fn(),
    acknowledgeMystery: vi.fn(),
    buyShopItem: vi.fn(),
    closeShop: vi.fn(),
    useInventoryItem: vi.fn(),
    resolveTrap: vi.fn(),
    acknowledgePortal: vi.fn(),
    runAiTurnIfNeeded: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe("Space Board host session", () => {
  test("ignores spectator actions and wrong-turn actions", async () => {
    const engine = engineStub();
    const session = createSpaceBoardHostSession({
      roomId: ROOM_ID,
      hostDeviceId: HOST_DEVICE,
      members: [
        {
          deviceId: HOST_DEVICE,
          role: "host",
          seat: 0,
          isAi: false,
          playerId: "p0",
        },
        {
          deviceId: PLAYER_DEVICE,
          role: "player",
          seat: 1,
          isAi: false,
          playerId: "p1",
        },
        {
          deviceId: SPECTATOR_DEVICE,
          role: "spectator",
          seat: null,
          isAi: false,
          playerId: null,
        },
      ],
      engine,
    });

    const spectatorAction = createRoomEnvelope({
      gameSlug: "space-board",
      kind: "action",
      roomId: ROOM_ID,
      senderDeviceId: SPECTATOR_DEVICE,
      payload: { type: "roll" },
    });
    expect(await session.handleEnvelope(spectatorAction)).toEqual([]);
    expect(engine.roll).not.toHaveBeenCalled();

    // seat 1 player while currentPlayerIndex is 0
    const wrongTurn = createRoomEnvelope({
      gameSlug: "space-board",
      kind: "action",
      roomId: ROOM_ID,
      senderDeviceId: PLAYER_DEVICE,
      payload: { type: "roll" },
    });
    expect(await session.handleEnvelope(wrongTurn)).toEqual([]);
    expect(engine.roll).not.toHaveBeenCalled();
  });

  test("maps roll through engine and broadcasts ui_events then state", async () => {
    const walk: NonNullable<SpaceBoardStatePayload["activePlayerWalk"]> = {
      durationMs: 400,
      endPosition: [1, 0, 0],
      fromRoomId: 1,
      playerId: "p0",
      startPosition: [0, 0, 0],
      startedAt: 100,
      toRoomId: 4,
    };
    const diceEvent: SpaceBoardUiEventPayload = {
      type: "dice",
      playerId: "p0",
      value: 3,
      animating: true,
      durationMs: 200,
    };
    const walkEvent: SpaceBoardUiEventPayload = {
      type: "walk",
      walk,
    };
    const afterRoll = {
      ...baseState(),
      diceValue: 3,
      players: baseState().players.map((p, i) =>
        i === 0 ? { ...p, positionIndex: 3, lastDice: 3 } : p,
      ),
    };
    const engine = engineStub({
      roll: vi.fn().mockResolvedValue({
        uiEvents: [diceEvent, walkEvent],
        state: {
          ...afterRoll,
          players: afterRoll.players.map((p, i) =>
            i === 0 ? { ...p, inventory: ["dice-x2"] } : { ...p, inventory: ["bomb"] },
          ),
        },
      }),
    });
    const session = createSpaceBoardHostSession({
      roomId: ROOM_ID,
      hostDeviceId: HOST_DEVICE,
      members: [
        {
          deviceId: HOST_DEVICE,
          role: "host",
          seat: 0,
          isAi: false,
          playerId: "p0",
        },
        {
          deviceId: PLAYER_DEVICE,
          role: "player",
          seat: 1,
          isAi: false,
          playerId: "p1",
        },
      ],
      engine,
    });

    const action = createRoomEnvelope({
      gameSlug: "space-board",
      kind: "action",
      roomId: ROOM_ID,
      senderDeviceId: HOST_DEVICE,
      payload: { type: "roll" },
    });
    const outbound = await session.handleEnvelope(action);

    expect(engine.roll).toHaveBeenCalledOnce();
    expect(outbound.map((e) => e.kind)).toEqual([
      "ui_event",
      "ui_event",
      "state",
      "state",
      "state",
    ]);
    expect(outbound[0]?.payload).toEqual(diceEvent);
    expect(outbound[1]?.payload).toEqual(walkEvent);
    const states = outbound.filter((e) => e.kind === "state");
    expect(states).toHaveLength(3);
    expect(
      states.map((e) => (e.payload as SpaceBoardStatePayload).viewerPlayerId),
    ).toEqual(["p0", "p1", null]);
    expect(
      (states[1]?.payload as SpaceBoardStatePayload).players[0]?.inventory,
    ).toBeUndefined();
    expect(outbound.every((e) => e.game_slug === "space-board")).toBe(true);
  });

  test("maps endTurn and move through engine", async () => {
    const afterEnd = {
      ...baseState(),
      currentPlayerIndex: 1,
      message: "Rândul lui Guest.",
    };
    const engine = engineStub({
      move: vi.fn().mockResolvedValue({
        uiEvents: [],
        state: baseState(),
      }),
      endTurn: vi.fn().mockResolvedValue({
        uiEvents: [],
        state: afterEnd,
      }),
    });
    const session = createSpaceBoardHostSession({
      roomId: ROOM_ID,
      hostDeviceId: HOST_DEVICE,
      members: [
        {
          deviceId: HOST_DEVICE,
          role: "host",
          seat: 0,
          isAi: false,
          playerId: "p0",
        },
      ],
      engine,
    });

    const endTurnOut = await session.handleEnvelope(
      createRoomEnvelope({
        gameSlug: "space-board",
        kind: "action",
        roomId: ROOM_ID,
        senderDeviceId: HOST_DEVICE,
        payload: { type: "endTurn" },
      }),
    );
    expect(engine.endTurn).toHaveBeenCalledOnce();
    expect(endTurnOut.map((e) => e.kind)).toEqual(["state", "state"]);
    expect(
      (endTurnOut[0]?.payload as SpaceBoardStatePayload).viewerPlayerId,
    ).toBe("p0");
    expect(
      (endTurnOut[1]?.payload as SpaceBoardStatePayload).viewerPlayerId,
    ).toBeNull();
    expect(
      (endTurnOut[0]?.payload as SpaceBoardStatePayload).currentPlayerIndex,
    ).toBe(1);

    const moveOut = await session.handleEnvelope(
      createRoomEnvelope({
        gameSlug: "space-board",
        kind: "action",
        roomId: ROOM_ID,
        senderDeviceId: HOST_DEVICE,
        payload: { type: "move" },
      }),
    );
    expect(engine.move).toHaveBeenCalledOnce();
    expect(moveOut.map((e) => e.kind)).toEqual(["state", "state"]);
  });

  test("routes interaction actions and emits public item_use then filtered states", async () => {
    const afterUse = {
      ...baseState(),
      players: baseState().players.map((p, i) =>
        i === 0
          ? { ...p, inventory: [], armedDiceX2: true }
          : { ...p, inventory: ["bomb"] },
      ),
      message: "Host a armat zarul x2.",
    };
    const itemUse = {
      type: "item_use" as const,
      playerId: "p0",
      itemId: "dice-x2" as const,
    };
    const engine = engineStub({
      useInventoryItem: vi.fn().mockResolvedValue({
        uiEvents: [itemUse],
        state: afterUse,
      }),
      answerTrivia: vi.fn().mockResolvedValue({
        uiEvents: [],
        state: {
          ...baseState(),
          pendingEvent: {
            type: "trivia",
            playerId: "p0",
            roomId: 12,
            question: {
              id: 1,
              question: "Q?",
              options: [
                { answer: "A", result: "correct" },
                { answer: "B", result: "wrong" },
              ],
            },
            result: { answer: "correct", coinsDelta: 2 },
          },
        },
      }),
    });
    const session = createSpaceBoardHostSession({
      roomId: ROOM_ID,
      hostDeviceId: HOST_DEVICE,
      members: [
        {
          deviceId: HOST_DEVICE,
          role: "host",
          seat: 0,
          isAi: false,
          playerId: "p0",
        },
        {
          deviceId: PLAYER_DEVICE,
          role: "player",
          seat: 1,
          isAi: false,
          playerId: "p1",
        },
        {
          deviceId: SPECTATOR_DEVICE,
          role: "spectator",
          seat: null,
          isAi: false,
          playerId: null,
        },
      ],
      engine,
    });

    const useOut = await session.handleEnvelope(
      createRoomEnvelope({
        gameSlug: "space-board",
        kind: "action",
        roomId: ROOM_ID,
        senderDeviceId: HOST_DEVICE,
        payload: { type: "useInventoryItem", itemId: "dice-x2" },
      }),
    );
    expect(engine.useInventoryItem).toHaveBeenCalledWith("dice-x2", undefined);
    expect(useOut[0]?.payload).toEqual(itemUse);
    const useStates = useOut.filter((e) => e.kind === "state");
    expect(
      useStates.map((e) => (e.payload as SpaceBoardStatePayload).viewerPlayerId),
    ).toEqual(["p0", "p1", null]);
    const forOther = useStates.find(
      (e) => (e.payload as SpaceBoardStatePayload).viewerPlayerId === "p1",
    );
    expect(
      (forOther?.payload as SpaceBoardStatePayload).players[0]?.armedDiceX2,
    ).toBe(true);
    expect(
      (forOther?.payload as SpaceBoardStatePayload).players[0]?.inventory,
    ).toBeUndefined();

    const triviaOut = await session.handleEnvelope(
      createRoomEnvelope({
        gameSlug: "space-board",
        kind: "action",
        roomId: ROOM_ID,
        senderDeviceId: HOST_DEVICE,
        payload: { type: "answerTrivia", answer: "correct" },
      }),
    );
    expect(engine.answerTrivia).toHaveBeenCalledWith("correct");
    const triviaState = triviaOut.find((e) => e.kind === "state")
      ?.payload as SpaceBoardStatePayload;
    expect(triviaState.pendingEvent).toMatchObject({
      type: "trivia",
      result: { answer: "correct", coinsDelta: 2 },
    });
  });
});
