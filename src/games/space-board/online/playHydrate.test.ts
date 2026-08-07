import { describe, expect, test } from "vitest";
import { createRoomEnvelope } from "../../../online/envelope";
import { createInitialShopStock } from "../../../game/shop";
import {
  SPACE_BOARD_GAME_SLUG,
  type SpaceBoardStatePayload,
} from "./payloads";
import {
  resolveLastStateForHydrate,
  shouldApplyStateEnvelope,
} from "./playHydrate";

function baseState(
  overrides: Partial<SpaceBoardStatePayload> = {},
): SpaceBoardStatePayload {
  return {
    phase: "playing",
    players: [
      {
        id: "p0",
        name: "Host",
        avatarId: "cat",
        controller: "player",
        positionIndex: 3,
        coins: 8,
        lastDice: 2,
        trapped: false,
        inventory: ["dice-x2", "bomb"],
        armedDiceX2: false,
        armedCoinsX3: false,
      },
      {
        id: "p1",
        name: "Guest",
        avatarId: "dog",
        controller: "player",
        positionIndex: 1,
        coins: 4,
        lastDice: null,
        trapped: false,
        inventory: ["cosmic-key"],
        armedDiceX2: false,
        armedCoinsX3: false,
      },
    ],
    currentPlayerIndex: 0,
    diceValue: null,
    actionItemUsedThisTurn: false,
    message: "ok",
    shopStock: {
      ...createInitialShopStock(),
      "dice-x2": false,
      bomb: false,
      "cosmic-key": false,
    },
    winnerId: null,
    pendingEvent: null,
    activePlayerWalk: null,
    diceAnimating: false,
    diceMultiplier: 1,
    rolling: false,
    portalTransition: null,
    playerCoinBursts: [],
    ...overrides,
  };
}

function stateEnvelope(payload: SpaceBoardStatePayload) {
  return createRoomEnvelope({
    gameSlug: SPACE_BOARD_GAME_SLUG,
    kind: "state",
    roomId: "room-1",
    senderDeviceId: "host",
    payload,
  });
}

describe("shouldApplyStateEnvelope", () => {
  test("rejects public spectator snapshot for seated player by default", () => {
    const envelope = stateEnvelope({
      ...baseState(),
      viewerPlayerId: null,
      players: baseState().players.map(({ inventory: _i, ...rest }) => rest),
    });
    expect(shouldApplyStateEnvelope(envelope, "p1", "player")).toBe(false);
  });

  test("allows public snapshot as bootstrap when local phase is setup", () => {
    const envelope = stateEnvelope({
      ...baseState(),
      viewerPlayerId: null,
      players: baseState().players.map(({ inventory: _i, ...rest }) => rest),
    });
    expect(
      shouldApplyStateEnvelope(envelope, "p1", "player", {
        localPhase: "setup",
      }),
    ).toBe(true);
  });

  test("still applies matching private viewer snapshot while playing", () => {
    const envelope = stateEnvelope({
      ...baseState(),
      viewerPlayerId: "p1",
    });
    expect(
      shouldApplyStateEnvelope(envelope, "p1", "player", {
        localPhase: "playing",
      }),
    ).toBe(true);
  });

  test("spectators only apply null-viewer snapshots", () => {
    expect(
      shouldApplyStateEnvelope(
        stateEnvelope({ ...baseState(), viewerPlayerId: "p0" }),
        null,
        "spectator",
      ),
    ).toBe(false);
    expect(
      shouldApplyStateEnvelope(
        stateEnvelope({ ...baseState(), viewerPlayerId: null }),
        null,
        "spectator",
      ),
    ).toBe(true);
  });
});

describe("resolveLastStateForHydrate", () => {
  test("host keeps full authoritative inventories from last_state", () => {
    const authoritative = baseState(); // no viewerPlayerId
    const resolved = resolveLastStateForHydrate(authoritative, {
      isHost: true,
      role: "host",
      myPlayerId: "p0",
    });
    expect(resolved?.players[0]?.inventory).toEqual(["dice-x2", "bomb"]);
    expect(resolved?.players[1]?.inventory).toEqual(["cosmic-key"]);
  });

  test("seated remote filters authoritative last_state for own viewer", () => {
    const resolved = resolveLastStateForHydrate(baseState(), {
      isHost: false,
      role: "player",
      myPlayerId: "p1",
    });
    expect(resolved?.players[1]?.inventory).toEqual(["cosmic-key"]);
    expect(resolved?.players[0]?.inventory).toBeUndefined();
    expect(resolved?.viewerPlayerId).toBe("p1");
  });

  test("spectator filters authoritative last_state to public view", () => {
    const resolved = resolveLastStateForHydrate(baseState(), {
      isHost: false,
      role: "spectator",
      myPlayerId: null,
    });
    expect(resolved?.players[0]?.inventory).toBeUndefined();
    expect(resolved?.players[1]?.inventory).toBeUndefined();
    expect(resolved?.viewerPlayerId).toBeNull();
  });

  test("seated remote bootstraps from legacy public last_state", () => {
    const publicLegacy = {
      ...baseState(),
      viewerPlayerId: null as null,
      players: baseState().players.map(({ inventory: _i, ...rest }) => rest),
    };
    const resolved = resolveLastStateForHydrate(publicLegacy, {
      isHost: false,
      role: "player",
      myPlayerId: "p1",
    });
    expect(resolved?.phase).toBe("playing");
    expect(resolved?.players[1]?.id).toBe("p1");
  });
});
