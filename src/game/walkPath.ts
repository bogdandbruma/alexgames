import {
  getTravelRouteBetweenRooms,
  rooms,
  type Vector3Tuple,
} from "./board";
import { WALK_POINT_EPSILON } from "./movementConstants";
import { getWalkDurationMsBetweenRooms } from "./movementTiming";

function easeInOut(value: number) {
  const clamped = Math.min(1, Math.max(0, value));

  return clamped * clamped * (3 - 2 * clamped);
}

function distanceBetween(a: Vector3Tuple, b: Vector3Tuple) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function compactPoints(points: Vector3Tuple[]) {
  return points.filter((point, index) => {
    const previousPoint = points[index - 1];

    return (
      !previousPoint || distanceBetween(previousPoint, point) > WALK_POINT_EPSILON
    );
  });
}

export function buildWalkPathBetweenRooms(
  fromRoomId: number,
  toRoomId: number,
  startPosition?: Vector3Tuple,
  endPosition?: Vector3Tuple,
): Vector3Tuple[] {
  const fromRoom = rooms[fromRoomId - 1];
  const toRoom = rooms[toRoomId - 1];

  if (!fromRoom || !toRoom) {
    return [];
  }

  return compactPoints([
    startPosition ?? fromRoom.position,
    ...getTravelRouteBetweenRooms(fromRoomId, toRoomId),
    endPosition ?? toRoom.position,
  ]);
}

export function sampleWalkPath(
  pathPoints: Vector3Tuple[],
  progress: number,
): Vector3Tuple {
  const compacted = compactPoints(pathPoints);

  if (compacted.length === 0) {
    return [0, 0, 0];
  }

  if (compacted.length === 1) {
    return compacted[0];
  }

  const easedProgress = easeInOut(progress);
  const segmentLengths = compacted.slice(0, -1).map((point, index) =>
    distanceBetween(point, compacted[index + 1]),
  );
  const totalLength = segmentLengths.reduce((total, length) => total + length, 0);

  if (totalLength < WALK_POINT_EPSILON) {
    return compacted[compacted.length - 1];
  }

  let remainingDistance = totalLength * easedProgress;

  for (let index = 0; index < segmentLengths.length; index += 1) {
    const segmentLength = segmentLengths[index];

    if (
      remainingDistance <= segmentLength ||
      index === segmentLengths.length - 1
    ) {
      const segmentProgress =
        segmentLength <= 0 ? 1 : remainingDistance / segmentLength;
      const from = compacted[index];
      const to = compacted[index + 1];

      return [
        from[0] + (to[0] - from[0]) * segmentProgress,
        from[1] + (to[1] - from[1]) * segmentProgress,
        from[2] + (to[2] - from[2]) * segmentProgress,
      ];
    }

    remainingDistance -= segmentLength;
  }

  return compacted[compacted.length - 1];
}

export function getWalkSamplePosition(
  fromRoomId: number,
  toRoomId: number,
  progress: number,
  startPosition?: Vector3Tuple,
  endPosition?: Vector3Tuple,
): Vector3Tuple {
  const path = buildWalkPathBetweenRooms(
    fromRoomId,
    toRoomId,
    startPosition,
    endPosition,
  );

  return sampleWalkPath(path, progress);
}

export function getWalkProgress(
  startedAtMs: number,
  durationMs: number,
  nowMs: number = performance.now(),
): number {
  if (durationMs <= 0) {
    return 1;
  }

  return Math.min(1, Math.max(0, (nowMs - startedAtMs) / durationMs));
}

export { getWalkDurationMsBetweenRooms };
