import {
  getTravelRouteBetweenRooms,
  rooms,
  type Vector3Tuple,
} from "./board";
import {
  WALK_MAX_DURATION_S,
  WALK_MIN_DURATION_S,
  WALK_POINT_EPSILON,
  WALK_UNITS_PER_SECOND,
} from "./movementConstants";

function distanceBetween(a: Vector3Tuple, b: Vector3Tuple) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function compactPoints(points: Vector3Tuple[]) {
  return points.filter((point, index) => {
    const previousPoint = points[index - 1];

    return !previousPoint || distanceBetween(previousPoint, point) > WALK_POINT_EPSILON;
  });
}

export function getWalkPathLengthBetweenRooms(
  fromRoomId: number,
  toRoomId: number,
): number {
  if (fromRoomId === toRoomId) {
    return 0;
  }

  const fromRoom = rooms[fromRoomId - 1];
  const toRoom = rooms[toRoomId - 1];

  if (!fromRoom || !toRoom) {
    return 0;
  }

  const pathPoints = compactPoints([
    fromRoom.position,
    ...getTravelRouteBetweenRooms(fromRoomId, toRoomId),
    toRoom.position,
  ]);

  if (pathPoints.length < 2) {
    return 0;
  }

  return pathPoints
    .slice(0, -1)
    .reduce(
      (total, point, index) =>
        total + distanceBetween(point, pathPoints[index + 1]),
      0,
    );
}

export function getWalkDurationSecondsFromPathLength(totalLength: number): number {
  if (totalLength < WALK_POINT_EPSILON) {
    return 0;
  }

  return Math.min(
    WALK_MAX_DURATION_S,
    Math.max(WALK_MIN_DURATION_S, totalLength / WALK_UNITS_PER_SECOND),
  );
}

export function getWalkDurationMsBetweenRooms(
  fromRoomId: number,
  toRoomId: number,
): number {
  const durationSeconds = getWalkDurationSecondsFromPathLength(
    getWalkPathLengthBetweenRooms(fromRoomId, toRoomId),
  );

  return Math.round(durationSeconds * 1_000);
}
