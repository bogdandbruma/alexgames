import { rooms, type Vector3Tuple } from "../board";
import { getWalkDurationMsBetweenRooms } from "../movementTiming";
import type { ActivePlayerWalk, GamePlayer, GameState } from "./types";
import { sleep } from "./helpers";

export function getPlayerBoardPosition(
  roomPosition: Vector3Tuple,
  playerIndex: number,
  playerCount: number,
): Vector3Tuple {
  if (playerCount <= 1) {
    return roomPosition;
  }

  const angle = (playerIndex / playerCount) * Math.PI * 2;
  const radius = 0.88;

  return [
    roomPosition[0] + Math.cos(angle) * radius,
    roomPosition[1],
    roomPosition[2] + Math.sin(angle) * radius,
  ];
}

export function createActivePlayerWalk(
  state: GameState,
  playerId: string,
  fromRoomId: number,
  toRoomId: number,
): ActivePlayerWalk | null {
  if (fromRoomId === toRoomId) {
    return null;
  }

  const playerIndex = state.players.findIndex(({ id }) => id === playerId);

  if (playerIndex < 0) {
    return null;
  }

  const fromRoom = rooms[fromRoomId - 1];
  const toRoom = rooms[toRoomId - 1];

  if (!fromRoom || !toRoom) {
    return null;
  }

  const walkDurationMs = getWalkDurationMsBetweenRooms(fromRoomId, toRoomId);

  if (walkDurationMs <= 0) {
    return null;
  }

  return {
    durationMs: walkDurationMs,
    endPosition: getPlayerBoardPosition(
      toRoom.position,
      playerIndex,
      state.players.length,
    ),
    fromRoomId,
    playerId,
    startPosition: getPlayerBoardPosition(
      fromRoom.position,
      playerIndex,
      state.players.length,
    ),
    startedAt: performance.now(),
    toRoomId,
  };
}

export function getPlayerRoomId(player: GamePlayer) {
  return player.positionIndex + 1;
}

export async function runActivePlayerWalk(
  set: (partial: Partial<GameState>) => void,
  walk: ActivePlayerWalk,
) {
  set({ activePlayerWalk: walk });
  await sleep(walk.durationMs);
  set({ activePlayerWalk: null });
}

export async function syncFocusedPlayerWalkIfMoved(
  get: () => GameState,
  set: (partial: Partial<GameState>) => void,
  playersBefore: GamePlayer[],
  focusedPlayerId: string,
) {
  const state = get();
  const before = playersBefore.find(({ id }) => id === focusedPlayerId);
  const after = state.players.find(({ id }) => id === focusedPlayerId);

  if (!before || !after || before.positionIndex === after.positionIndex) {
    return;
  }

  const walk = createActivePlayerWalk(
    state,
    focusedPlayerId,
    getPlayerRoomId(before),
    getPlayerRoomId(after),
  );

  if (!walk) {
    return;
  }

  set({ activePlayerWalk: walk });
  await runActivePlayerWalk(set, walk);
}
