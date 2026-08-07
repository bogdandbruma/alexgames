import { describe, expect, test } from "vitest";
import {
  applySpaceBoardRemoteEnvelope,
  createEmptyRemoteView,
} from "./remoteSession";
import { createRoomEnvelope } from "../../../online/envelope";
import type { SpaceBoardStatePayload } from "./payloads";
import { createInitialShopStock } from "../../../game/shop";

const ROOM_ID = "room-1";

const snapshot = (): SpaceBoardStatePayload => ({
  phase: "playing",
  players: [
    {
      id: "p0",
      name: "Host",
      avatarId: "cat",
      controller: "player",
      positionIndex: 3,
      coins: 1,
      lastDice: 3,
      trapped: false,
    },
  ],
  currentPlayerIndex: 0,
  diceValue: 3,
  actionItemUsedThisTurn: false,
  message: "Host a dat 3.",
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

describe("Space Board remote session", () => {
  test("walk ui_event moves the remote player immediately so the avatar can animate", () => {
    const localStartedAt = performance.now();
    let view = applySpaceBoardRemoteEnvelope(
      createEmptyRemoteView(),
      createRoomEnvelope({
        gameSlug: "space-board",
        kind: "state",
        roomId: ROOM_ID,
        payload: {
          ...snapshot(),
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
        },
      }),
    );

    view = applySpaceBoardRemoteEnvelope(
      view,
      createRoomEnvelope({
        gameSlug: "space-board",
        kind: "ui_event",
        roomId: ROOM_ID,
        payload: {
          type: "walk",
          walk: {
            durationMs: 400,
            endPosition: [2, 0, 0],
            fromRoomId: 1,
            playerId: "p1",
            startPosition: [0, 0, 0],
            startedAt: 12,
            toRoomId: 4,
          },
        },
      }),
    );

    expect(view.players[1]?.positionIndex).toBe(3);
    expect(view.activePlayerWalk?.playerId).toBe("p1");
    expect(view.activePlayerWalk?.startedAt).toBeGreaterThanOrEqual(
      localStartedAt,
    );
  });

  test("keeps a locally timed walk active when the final state arrives early", () => {
    let view = createEmptyRemoteView();
    view = {
      ...view,
      activePlayerWalk: {
        durationMs: 4_000,
        endPosition: [2, 0, 0],
        fromRoomId: 1,
        playerId: "p0",
        startPosition: [0, 0, 0],
        startedAt: performance.now(),
        toRoomId: 4,
      },
    };

    const next = applySpaceBoardRemoteEnvelope(
      view,
      createRoomEnvelope({
        gameSlug: "space-board",
        kind: "state",
        roomId: ROOM_ID,
        payload: snapshot(),
      }),
    );

    expect(next.activePlayerWalk?.playerId).toBe("p0");
  });

  test("applies live coin updates before the final state snapshot", () => {
    let view = applySpaceBoardRemoteEnvelope(
      createEmptyRemoteView(),
      createRoomEnvelope({
        gameSlug: "space-board",
        kind: "state",
        roomId: ROOM_ID,
        payload: {
          ...snapshot(),
          players: [
            {
              ...snapshot().players[0]!,
              id: "p0",
              coins: 1,
            },
            {
              id: "p1",
              name: "Guest",
              avatarId: "dog",
              controller: "player",
              positionIndex: 0,
              coins: 2,
              lastDice: null,
              trapped: false,
            },
          ],
        },
      }),
    );

    view = applySpaceBoardRemoteEnvelope(
      view,
      createRoomEnvelope({
        gameSlug: "space-board",
        kind: "ui_event",
        roomId: ROOM_ID,
        payload: {
          type: "coins_update",
          players: [
            { playerId: "p0", coins: 7 },
            { playerId: "p1", coins: 0 },
          ],
        },
      }),
    );

    expect(view.players.map((player) => player.coins)).toEqual([7, 0]);
  });

  test("applies ui_event walk/dice so remotes animate before final state", () => {
    let view = createEmptyRemoteView();

    view = applySpaceBoardRemoteEnvelope(
      view,
      createRoomEnvelope({
        gameSlug: "space-board",
        kind: "ui_event",
        roomId: ROOM_ID,
        payload: {
          type: "dice",
          playerId: "p0",
          value: 3,
          animating: true,
          durationMs: 250,
        },
      }),
    );
    expect(view.diceAnimating).toBe(true);
    expect(view.diceValue).toBe(3);
    expect(view.rolling).toBe(true);

    view = applySpaceBoardRemoteEnvelope(
      view,
      createRoomEnvelope({
        gameSlug: "space-board",
        kind: "ui_event",
        roomId: ROOM_ID,
        payload: {
          type: "walk",
          walk: {
            durationMs: 400,
            endPosition: [2, 0, 0],
            fromRoomId: 1,
            playerId: "p0",
            startPosition: [0, 0, 0],
            startedAt: 50,
            toRoomId: 4,
          },
        },
      }),
    );
    expect(view.activePlayerWalk?.playerId).toBe("p0");
    expect(view.activePlayerWalk?.fromRoomId).toBe(1);
    expect(view.activePlayerWalk?.toRoomId).toBe(4);

    view = applySpaceBoardRemoteEnvelope(
      view,
      createRoomEnvelope({
        gameSlug: "space-board",
        kind: "state",
        roomId: ROOM_ID,
        payload: snapshot(),
      }),
    );
    expect(view.players[0]?.positionIndex).toBe(3);
    expect(view.diceAnimating).toBe(false);
    expect(view.activePlayerWalk?.playerId).toBe("p0");
  });

  test("ignores action envelopes on remote (no authoritative mutation)", () => {
    const view = createEmptyRemoteView();
    const next = applySpaceBoardRemoteEnvelope(
      view,
      createRoomEnvelope({
        gameSlug: "space-board",
        kind: "action",
        roomId: ROOM_ID,
        payload: { type: "roll" },
      }),
    );
    expect(next).toEqual(view);
  });

  test("applies public item_use ui_event without inventing inventories", () => {
    let view = applySpaceBoardRemoteEnvelope(
      createEmptyRemoteView(),
      createRoomEnvelope({
        gameSlug: "space-board",
        kind: "state",
        roomId: ROOM_ID,
        payload: {
          ...snapshot(),
          players: [
            {
              id: "p0",
              name: "Host",
              avatarId: "cat",
              controller: "player",
              positionIndex: 3,
              coins: 1,
              lastDice: 3,
              trapped: false,
              armedDiceX2: false,
            },
          ],
          viewerPlayerId: "p1",
        },
      }),
    );

    view = applySpaceBoardRemoteEnvelope(
      view,
      createRoomEnvelope({
        gameSlug: "space-board",
        kind: "ui_event",
        roomId: ROOM_ID,
        payload: {
          type: "item_use",
          playerId: "p0",
          itemId: "dice-x2",
        },
      }),
    );

    expect(view.lastItemUse).toEqual({
      playerId: "p0",
      itemId: "dice-x2",
    });
    expect(view.players[0]?.inventory).toBeUndefined();
  });

  test("keeps live toast visible when the final state snapshot arrives", () => {
    let view = createEmptyRemoteView();

    view = applySpaceBoardRemoteEnvelope(
      view,
      createRoomEnvelope({
        gameSlug: "space-board",
        kind: "ui_event",
        roomId: ROOM_ID,
        payload: {
          type: "toast",
          toast: {
            id: 10,
            title: "Camera noua",
            description: "Host a ajuns la camera 4.",
            tone: "room",
          },
        },
      }),
    );
    expect(view.uiToast?.id).toBe(10);

    view = applySpaceBoardRemoteEnvelope(
      view,
      createRoomEnvelope({
        gameSlug: "space-board",
        kind: "state",
        roomId: ROOM_ID,
        payload: snapshot(),
      }),
    );

    expect(view.uiToast?.id).toBe(10);
  });

  test("applies trap/portal pending overlays from public state", () => {
    const withTrap = applySpaceBoardRemoteEnvelope(
      createEmptyRemoteView(),
      createRoomEnvelope({
        gameSlug: "space-board",
        kind: "state",
        roomId: ROOM_ID,
        payload: {
          ...snapshot(),
          pendingEvent: { type: "trap", playerId: "p0", roomId: 7 },
          players: [
            {
              ...snapshot().players[0]!,
              trapped: true,
            },
          ],
        },
      }),
    );
    expect(withTrap.pendingEvent).toEqual({
      type: "trap",
      playerId: "p0",
      roomId: 7,
    });
    expect(withTrap.players[0]?.trapped).toBe(true);

    const withPortal = applySpaceBoardRemoteEnvelope(
      createEmptyRemoteView(),
      createRoomEnvelope({
        gameSlug: "space-board",
        kind: "ui_event",
        roomId: ROOM_ID,
        payload: {
          type: "portal",
          transition: {
            id: "portal-9",
            playerId: "p0",
            fromRoomId: 5,
            toRoomId: 40,
          },
        },
      }),
    );
    expect(withPortal.portalTransition?.toRoomId).toBe(40);
  });
});
