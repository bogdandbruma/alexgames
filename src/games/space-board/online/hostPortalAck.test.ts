import { describe, expect, test, vi } from "vitest";
import { createRoomEnvelope } from "../../../online/envelope";
import type { GameState } from "../../../game/store/types";
import type { SpaceBoardSeatMember } from "./hostSession";
import { acknowledgePortalActionImmediately } from "./hostPortalAck";

const members: SpaceBoardSeatMember[] = [
  {
    deviceId: "active-device",
    role: "player",
    seat: 0,
    isAi: false,
    playerId: "p0",
  },
  {
    deviceId: "other-device",
    role: "player",
    seat: 1,
    isAi: false,
    playerId: "p1",
  },
];

function state(
  overrides: Partial<
    Pick<GameState, "phase" | "players" | "currentPlayerIndex" | "pendingEvent">
  > = {},
): Pick<GameState, "phase" | "players" | "currentPlayerIndex" | "pendingEvent"> {
  return {
    phase: "playing",
    players: [
      {
        id: "p0",
        name: "Active",
        avatarId: "cat" as const,
        controller: "player" as const,
        positionIndex: 21,
        coins: 0,
        lastDice: 4,
        trapped: false,
      },
      {
        id: "p1",
        name: "Other",
        avatarId: "dog" as const,
        controller: "player" as const,
        positionIndex: 0,
        coins: 0,
        lastDice: null,
        trapped: false,
      },
    ],
    currentPlayerIndex: 0,
    pendingEvent: {
      type: "portal" as const,
      id: "portal-1",
      playerId: "p0",
      fromRoomId: 22,
      toRoomId: 28,
    },
    ...overrides,
  };
}

describe("acknowledgePortalActionImmediately", () => {
  test("consumes active player portal ACK without waiting for the host action queue", () => {
    const acknowledgePortal = vi.fn();
    const handled = acknowledgePortalActionImmediately({
      envelope: createRoomEnvelope({
        gameSlug: "space-board",
        kind: "action",
        roomId: "room-1",
        senderDeviceId: "active-device",
        payload: { type: "acknowledgePortal" },
      }),
      roomId: "room-1",
      members,
      getState: () => state(),
      acknowledgePortal,
    });

    expect(handled).toBe(true);
    expect(acknowledgePortal).toHaveBeenCalledOnce();
  });

  test("consumes but ignores portal ACK from a non-active player", () => {
    const acknowledgePortal = vi.fn();
    const handled = acknowledgePortalActionImmediately({
      envelope: createRoomEnvelope({
        gameSlug: "space-board",
        kind: "action",
        roomId: "room-1",
        senderDeviceId: "other-device",
        payload: { type: "acknowledgePortal" },
      }),
      roomId: "room-1",
      members,
      getState: () => state(),
      acknowledgePortal,
    });

    expect(handled).toBe(true);
    expect(acknowledgePortal).not.toHaveBeenCalled();
  });
});
