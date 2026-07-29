import type { Vector3Tuple } from "../game/board";

type HallwayProps = {
  from: Vector3Tuple;
  kind?: "bridge" | "path" | "portal";
  points?: Vector3Tuple[];
  to: Vector3Tuple;
  width: number;
};

const HALLWAY_OVERLAP = 0.42;
const WALL_HEIGHT = 0.58;
const WALL_THICKNESS = 0.18;

type HallwayDirection = "north" | "east" | "south" | "west";

type HallwaySegmentProps = {
  from: Vector3Tuple;
  kind: "bridge" | "path" | "portal";
  to: Vector3Tuple;
  trimEnd?: number;
  trimStart?: number;
  width: number;
};

function HallwaySegment({
  from,
  kind,
  to,
  trimEnd = 0,
  trimStart = 0,
  width,
}: HallwaySegmentProps) {
  const deltaX = to[0] - from[0];
  const deltaZ = to[2] - from[2];
  const horizontal = Math.abs(deltaX) >= Math.abs(deltaZ);
  const distance = Math.abs(horizontal ? deltaX : deltaZ);

  if (distance < 0.05) {
    return null;
  }

  const floorTrimStart = Math.max(trimStart - WALL_THICKNESS, 0);
  const floorTrimEnd = Math.max(trimEnd - WALL_THICKNESS, 0);
  const length = Math.max(
    distance + HALLWAY_OVERLAP - floorTrimStart - floorTrimEnd,
    1.2,
  );
  const wallLength = Math.max(
    distance + HALLWAY_OVERLAP - trimStart - trimEnd,
    0.2,
  );
  const centerX = (from[0] + to[0]) / 2;
  const centerZ = (from[2] + to[2]) / 2;
  const axisDirection = Math.sign(horizontal ? deltaX : deltaZ);
  const floorAxisOffset =
    (axisDirection * (floorTrimStart - floorTrimEnd)) / 2;
  const wallAxisOffset = (axisDirection * (trimStart - trimEnd)) / 2;

  const floorSize: Vector3Tuple = horizontal
    ? [length, 0.08, width]
    : [width, 0.08, length];

  const wallOnePosition: Vector3Tuple = horizontal
    ? [wallAxisOffset, WALL_HEIGHT / 2, width / 2]
    : [width / 2, WALL_HEIGHT / 2, wallAxisOffset];

  const wallTwoPosition: Vector3Tuple = horizontal
    ? [wallAxisOffset, WALL_HEIGHT / 2, -width / 2]
    : [-width / 2, WALL_HEIGHT / 2, wallAxisOffset];

  const wallSize: Vector3Tuple = horizontal
    ? [wallLength + WALL_THICKNESS, WALL_HEIGHT, WALL_THICKNESS]
    : [WALL_THICKNESS, WALL_HEIGHT, wallLength + WALL_THICKNESS];

  const floorColor =
    kind === "portal" ? "#1b263d" : kind === "bridge" ? "#222a31" : "#202630";
  const wallColor =
    kind === "portal" ? "#4e66a8" : kind === "bridge" ? "#65717a" : "#5c6d8d";
  const glowColor = kind === "portal" ? "#c8a1ff" : "#67d5c8";
  const glowOpacity = kind === "portal" ? 0.28 : kind === "bridge" ? 0.16 : 0.12;

  return (
    <group position={[centerX, -0.06, centerZ]}>
      <mesh
        position={horizontal ? [floorAxisOffset, 0, 0] : [0, 0, floorAxisOffset]}
        receiveShadow
      >
        <boxGeometry args={floorSize} />
        <meshStandardMaterial color={floorColor} roughness={0.82} />
      </mesh>

      {[wallOnePosition, wallTwoPosition].map((position) => (
        <mesh key={position.join(":")} position={position} castShadow>
          <boxGeometry args={wallSize} />
          <meshStandardMaterial color={wallColor} roughness={0.7} />
        </mesh>
      ))}

      <mesh
        position={
          horizontal
            ? [floorAxisOffset, 0.005, 0]
            : [0, 0.005, floorAxisOffset]
        }
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry
          args={
            horizontal
              ? [length - 0.25, Math.max(width - 0.65, 0.8)]
              : [Math.max(width - 0.65, 0.8), length - 0.25]
          }
        />
        <meshBasicMaterial color={glowColor} transparent opacity={glowOpacity} />
      </mesh>
    </group>
  );
}

function HallwayCorner({
  kind,
  next,
  position,
  previous,
  width,
}: {
  kind: "bridge" | "path" | "portal";
  next: Vector3Tuple;
  position: Vector3Tuple;
  previous: Vector3Tuple;
  width: number;
}) {
  const floorColor =
    kind === "portal" ? "#1b263d" : kind === "bridge" ? "#222a31" : "#202630";
  const wallColor =
    kind === "portal" ? "#4e66a8" : kind === "bridge" ? "#65717a" : "#5c6d8d";
  const glowColor = kind === "portal" ? "#c8a1ff" : "#67d5c8";
  const glowOpacity = kind === "portal" ? 0.28 : kind === "bridge" ? 0.16 : 0.12;
  const openDirections = new Set([
    getDirectionBetweenPoints(position, previous),
    getDirectionBetweenPoints(position, next),
  ]);
  const wallDirections: HallwayDirection[] = [
    "north",
    "east",
    "south",
    "west",
  ];

  return (
    <group position={[position[0], -0.06, position[2]]}>
      <mesh receiveShadow>
        <boxGeometry args={[width + WALL_THICKNESS, 0.08, width + WALL_THICKNESS]} />
        <meshStandardMaterial color={floorColor} roughness={0.82} />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[Math.max(width - 0.65, 0.8), Math.max(width - 0.65, 0.8)]} />
        <meshBasicMaterial color={glowColor} transparent opacity={glowOpacity} />
      </mesh>
      {wallDirections
        .filter((direction) => !openDirections.has(direction))
        .map((direction) => {
          const horizontal = direction === "north" || direction === "south";
          const offset = width / 2;
          const wallPosition: Vector3Tuple =
            direction === "north"
              ? [0, WALL_HEIGHT / 2, -offset]
              : direction === "south"
                ? [0, WALL_HEIGHT / 2, offset]
                : direction === "east"
                  ? [offset, WALL_HEIGHT / 2, 0]
                  : [-offset, WALL_HEIGHT / 2, 0];
          const wallSize: Vector3Tuple = horizontal
            ? [width + WALL_THICKNESS, WALL_HEIGHT, WALL_THICKNESS]
            : [WALL_THICKNESS, WALL_HEIGHT, width + WALL_THICKNESS];

          return (
            <mesh key={direction} position={wallPosition} castShadow>
              <boxGeometry args={wallSize} />
              <meshStandardMaterial color={wallColor} roughness={0.7} />
            </mesh>
          );
        })}
    </group>
  );
}

function getDirectionBetweenPoints(from: Vector3Tuple, to: Vector3Tuple): HallwayDirection {
  const deltaX = to[0] - from[0];
  const deltaZ = to[2] - from[2];

  if (Math.abs(deltaX) >= Math.abs(deltaZ)) {
    return deltaX >= 0 ? "east" : "west";
  }

  return deltaZ >= 0 ? "south" : "north";
}

function getSegmentAxis(from: Vector3Tuple, to: Vector3Tuple) {
  return Math.abs(to[0] - from[0]) >= Math.abs(to[2] - from[2])
    ? "horizontal"
    : "vertical";
}

export function Hallway({
  from,
  kind = "path",
  points,
  to,
  width,
}: HallwayProps) {
  const routePoints = points && points.length >= 2 ? points : [from, to];
  const cornerTrim = width / 2 + WALL_THICKNESS;

  return (
    <group>
      {routePoints.slice(0, -1).map((point, index) => {
        const segmentTo = routePoints[index + 1];
        const previousPoint = routePoints[index - 1];
        const nextPoint = routePoints[index + 2];
        const segmentAxis = getSegmentAxis(point, segmentTo);
        const previousAxis = previousPoint
          ? getSegmentAxis(previousPoint, point)
          : segmentAxis;
        const nextAxis = nextPoint ? getSegmentAxis(segmentTo, nextPoint) : segmentAxis;

        return (
          <HallwaySegment
            key={`${point.join(":")}-${segmentTo.join(":")}`}
            from={point}
            kind={kind}
            to={segmentTo}
            trimStart={previousAxis !== segmentAxis ? cornerTrim : 0}
            trimEnd={nextAxis !== segmentAxis ? cornerTrim : 0}
            width={width}
          />
        );
      })}
      {routePoints.slice(1, -1).map((point, index) => {
        const previousPoint = routePoints[index];
        const nextPoint = routePoints[index + 2];

        if (
          getSegmentAxis(previousPoint, point) === getSegmentAxis(point, nextPoint)
        ) {
          return null;
        }

        return (
          <HallwayCorner
            key={`corner-${previousPoint.join(":")}-${point.join(":")}-${nextPoint.join(":")}`}
            kind={kind}
            next={nextPoint}
            position={point}
            previous={previousPoint}
            width={width}
          />
        );
      })}
    </group>
  );
}
