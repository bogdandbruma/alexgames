import { describe, expect, test, vi } from "vitest";
import { createRoomEnvelope } from "../../../online/envelope";
import {
  applySpaceBoardRemoteEnvelope,
  createEmptyRemoteView,
} from "./remoteSession";
import { createSpaceBoardHostSession } from "./hostSession";
import type { SpaceBoardHostEngine } from "./hostSession";
import type { SpaceBoardStatePayload, SpaceBoardUiEventPayload } from "./payloads";
import { createInitialShopStock } from "../../../game/shop";

/**
 * End-to-end seam: host roll → ui_event walk/dice → remote animates before state.
 * Also covers interaction visibility (shop private / trivia public).
 */
describe("Space Board online play sync", () => {
  test("remote sees walk ui_event before final positions from state", async () => {
    const walk: NonNullable<SpaceBoardStatePayload["activePlayerWalk"]> = {
      durationMs: 500,
      endPosition: [3, 0, 0],
      fromRoomId: 1,
      playerId: "p0",
      startPosition: [0, 0, 0],
      startedAt: 1,
      toRoomId: 4,
    };
    const dice: SpaceBoardUiEventPayload = {
      type: "dice",
      playerId: "p0",
      value: 3,
      animating: true,
      durationMs: 200,
    };
    const after: SpaceBoardStatePayload = {
      phase: "playing",
      players: [
        {
          id: "p0",
          name: "Host",
          avatarId: "cat",
          controller: "player",
          positionIndex: 3,
          coins: 0,
          lastDice: 3,
          trapped: false,
        },
      ],
      currentPlayerIndex: 0,
      diceValue: 3,
      actionItemUsedThisTurn: false,
      message: "done",
      shopStock: createInitialShopStock(),
      winnerId: null,
      pendingEvent: null,
      activePlayerWalk: null,
      diceAnimating: false,
      diceMultiplier: 1,
      rolling: false,
      portalTransition: null,
      playerCoinBursts: [],
    };

    const engine: SpaceBoardHostEngine = {
      getState: vi.fn(() => after),
      roll: vi.fn().mockResolvedValue({
        uiEvents: [dice, { type: "walk", walk }],
        state: after,
      }),
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
    };

    const host = createSpaceBoardHostSession({
      roomId: "room-1",
      hostDeviceId: "host",
      members: [
        {
          deviceId: "host",
          role: "host",
          seat: 0,
          isAi: false,
          playerId: "p0",
        },
      ],
      engine,
    });

    const outbound = await host.handleEnvelope(
      createRoomEnvelope({
        gameSlug: "space-board",
        kind: "action",
        roomId: "room-1",
        senderDeviceId: "host",
        payload: { type: "roll" },
      }),
    );

    let remote = createEmptyRemoteView();
    const kinds: string[] = [];
    for (const envelope of outbound) {
      kinds.push(envelope.kind);
      remote = applySpaceBoardRemoteEnvelope(remote, envelope);
      if (envelope.kind === "ui_event") {
        const payload = envelope.payload as { type: string };
        if (payload.type === "walk") {
          expect(remote.activePlayerWalk?.toRoomId).toBe(4);
          expect(remote.players[0]?.positionIndex ?? 0).toBe(0);
        }
        if (payload.type === "dice") {
          expect(remote.diceAnimating).toBe(true);
        }
      }
    }

    expect(kinds).toEqual(["ui_event", "ui_event", "state", "state"]);
    expect(remote.players[0]?.positionIndex).toBe(3);
    expect(remote.activePlayerWalk).toBeNull();
  });

  test("trivia stays public while shop inventories stay private per viewer", async () => {
    const afterBuy: SpaceBoardStatePayload = {
      phase: "playing",
      players: [
        {
          id: "p0",
          name: "Host",
          avatarId: "cat",
          controller: "player",
          positionIndex: 15,
          coins: 3,
          lastDice: null,
          trapped: false,
          inventory: ["dice-x2"],
        },
        {
          id: "p1",
          name: "Guest",
          avatarId: "dog",
          controller: "player",
          positionIndex: 2,
          coins: 5,
          lastDice: null,
          trapped: false,
          inventory: ["bomb"],
        },
      ],
      currentPlayerIndex: 0,
      diceValue: null,
      actionItemUsedThisTurn: false,
      message: "shopping",
      shopStock: { ...createInitialShopStock(), "dice-x2": false },
      winnerId: null,
      pendingEvent: {
        type: "shop",
        playerId: "p0",
        roomId: 15,
        purchased: true,
      },
      activePlayerWalk: null,
      diceAnimating: false,
      diceMultiplier: 1,
      rolling: false,
      portalTransition: null,
      playerCoinBursts: [],
    };

    const engine: SpaceBoardHostEngine = {
      getState: vi.fn(() => afterBuy),
      roll: vi.fn(),
      move: vi.fn(),
      endTurn: vi.fn(),
      answerTrivia: vi.fn(),
      pickMystery: vi.fn(),
      acknowledgeMystery: vi.fn(),
      buyShopItem: vi.fn().mockResolvedValue({
        uiEvents: [],
        state: afterBuy,
      }),
      closeShop: vi.fn(),
      useInventoryItem: vi.fn(),
      resolveTrap: vi.fn(),
      acknowledgePortal: vi.fn(),
      runAiTurnIfNeeded: vi.fn().mockResolvedValue([]),
    };

    const host = createSpaceBoardHostSession({
      roomId: "room-1",
      hostDeviceId: "host",
      members: [
        {
          deviceId: "host",
          role: "host",
          seat: 0,
          isAi: false,
          playerId: "p0",
        },
        {
          deviceId: "guest",
          role: "player",
          seat: 1,
          isAi: false,
          playerId: "p1",
        },
      ],
      engine,
    });

    const outbound = await host.handleEnvelope(
      createRoomEnvelope({
        gameSlug: "space-board",
        kind: "action",
        roomId: "room-1",
        senderDeviceId: "host",
        payload: { type: "buyShopItem", itemId: "dice-x2" },
      }),
    );

    const forGuest = outbound.find(
      (e) =>
        e.kind === "state" &&
        (e.payload as SpaceBoardStatePayload).viewerPlayerId === "p1",
    );
    const guestState = forGuest?.payload as SpaceBoardStatePayload;
    expect(guestState.pendingEvent).toEqual({
      type: "shop",
      playerId: "p0",
      roomId: 15,
      purchased: true,
    });
    expect(guestState.players[0]?.inventory).toBeUndefined();
    expect(guestState.shopStock["dice-x2"]).toBe(true);

    const triviaState: SpaceBoardStatePayload = {
      ...afterBuy,
      pendingEvent: {
        type: "trivia",
        playerId: "p0",
        roomId: 12,
        question: {
          id: 9,
          question: "Public Q?",
          options: [
            { answer: "Yes", result: "correct" },
            { answer: "No", result: "wrong" },
          ],
        },
        result: { answer: "correct", coinsDelta: 2 },
      },
      playerCoinBursts: [{ id: 1, playerId: "p0", amount: 2 }],
    };
    engine.answerTrivia = vi.fn().mockResolvedValue({
      uiEvents: [{ type: "coin_burst", bursts: triviaState.playerCoinBursts }],
      state: triviaState,
    });

    const triviaOut = await host.handleEnvelope(
      createRoomEnvelope({
        gameSlug: "space-board",
        kind: "action",
        roomId: "room-1",
        senderDeviceId: "host",
        payload: { type: "answerTrivia", answer: "correct" },
      }),
    );
    const triviaForGuest = triviaOut.find(
      (e) =>
        e.kind === "state" &&
        (e.payload as SpaceBoardStatePayload).viewerPlayerId === "p1",
    )?.payload as SpaceBoardStatePayload;
    expect(triviaForGuest.pendingEvent).toMatchObject({
      type: "trivia",
      question: { question: "Public Q?" },
      result: { answer: "correct", coinsDelta: 2 },
    });
    expect(
      triviaOut.some(
        (e) =>
          e.kind === "ui_event" &&
          (e.payload as SpaceBoardUiEventPayload).type === "coin_burst",
      ),
    ).toBe(true);
  });
});
