import type { RoomEnvelope } from "../../../online/envelope";
import type { GamePhase } from "../../../game/store/types";
import type { MemberRole } from "../../../online/rooms";
import {
  isSpaceBoardStatePayload,
  type SpaceBoardStatePayload,
} from "./payloads";
import { filterSpaceBoardStateForViewer } from "./visibility";

export type ApplyStateOptions = {
  /** When setup/not synced, allow public (null-viewer) snapshot as bootstrap. */
  localPhase?: GamePhase;
};

/**
 * Decide whether a live (or fetched) state envelope is meant for this client.
 * Public null-viewer snapshots are only applied for spectators, or as bootstrap
 * while the local store is still in setup.
 */
export function shouldApplyStateEnvelope(
  envelope: RoomEnvelope,
  myPlayerId: string | null,
  role: MemberRole,
  options: ApplyStateOptions = {},
): boolean {
  if (envelope.kind !== "state" || !isSpaceBoardStatePayload(envelope.payload)) {
    return true;
  }
  const viewerPlayerId = envelope.payload.viewerPlayerId;
  if (viewerPlayerId === undefined) {
    return true;
  }
  if (role === "spectator") {
    return viewerPlayerId === null;
  }
  if (viewerPlayerId === myPlayerId) {
    return true;
  }
  if (viewerPlayerId === null && options.localPhase === "setup") {
    return true;
  }
  return false;
}

export type LastStateHydrateInput = {
  isHost: boolean;
  role: MemberRole;
  myPlayerId: string | null;
};

/**
 * Prepare rooms.last_state for local hydrate.
 * Authoritative snapshots (no viewerPlayerId) keep full inventories for host
 * reclaim; remotes/spectators filter-on-read. Legacy public last_state still
 * bootstraps seated remotes so the UI is not stuck on sync.
 */
export function resolveLastStateForHydrate(
  payload: SpaceBoardStatePayload,
  input: LastStateHydrateInput,
): SpaceBoardStatePayload | null {
  const isAuthoritative = payload.viewerPlayerId === undefined;

  if (input.isHost) {
    return payload;
  }

  if (isAuthoritative) {
    const viewerId =
      input.role === "spectator" ? null : input.myPlayerId;
    return filterSpaceBoardStateForViewer(payload, viewerId);
  }

  if (input.role === "spectator") {
    return payload.viewerPlayerId === null ? payload : null;
  }

  if (payload.viewerPlayerId === input.myPlayerId) {
    return payload;
  }

  // Legacy public snapshot — bootstrap until host private resync.
  if (payload.viewerPlayerId === null) {
    return payload;
  }

  return null;
}
