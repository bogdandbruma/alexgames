import type { RoomEnvelope } from "../../../online/envelope";
import { getPendingPortal } from "../../../game/store/pendingEvent";
import type { GameState } from "../../../game/store/types";
import type { SpaceBoardSeatMember } from "./hostSession";
import { parseSpaceBoardAction, SPACE_BOARD_GAME_SLUG } from "./payloads";

type HostPortalAckInput = {
  envelope: RoomEnvelope;
  roomId: string;
  members: SpaceBoardSeatMember[];
  getState: () => Pick<
    GameState,
    "phase" | "players" | "currentPlayerIndex" | "pendingEvent"
  >;
  acknowledgePortal: () => void;
};

function canDeviceAcknowledgePortal(
  deviceId: string | undefined,
  members: SpaceBoardSeatMember[],
  state: Pick<GameState, "phase" | "players" | "currentPlayerIndex" | "pendingEvent">,
): boolean {
  const pendingPortal = getPendingPortal(state.pendingEvent);
  const currentPlayer = state.players[state.currentPlayerIndex];
  const member = members.find(
    (candidate) => candidate.deviceId !== null && candidate.deviceId === deviceId,
  );

  return (
    state.phase === "playing" &&
    pendingPortal !== null &&
    currentPlayer !== undefined &&
    currentPlayer.controller !== "ai" &&
    member !== undefined &&
    member.role !== "spectator" &&
    member.seat !== null &&
    member.playerId === currentPlayer.id &&
    pendingPortal.playerId === currentPlayer.id
  );
}

/**
 * Portal ACK resumes an in-flight roll. If it enters the normal host action
 * queue, it can sit behind the roll that is waiting for that very ACK.
 */
export function acknowledgePortalActionImmediately({
  envelope,
  roomId,
  members,
  getState,
  acknowledgePortal,
}: HostPortalAckInput): boolean {
  if (
    envelope.game_slug !== SPACE_BOARD_GAME_SLUG ||
    envelope.room_id !== roomId ||
    envelope.kind !== "action"
  ) {
    return false;
  }

  const action = parseSpaceBoardAction(envelope.payload);
  if (action?.type !== "acknowledgePortal") {
    return false;
  }

  if (canDeviceAcknowledgePortal(envelope.sender_device_id, members, getState())) {
    acknowledgePortal();
  }

  return true;
}
