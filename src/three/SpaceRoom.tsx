import { Text, useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type {
  DecorationKind,
  Direction,
  RoomDefinition,
  RoomDoor,
  Vector3Tuple,
} from "../game/board";
import { TILE_SIZE } from "../game/board";

const WALL_HEIGHT = 0.72;
const WALL_THICKNESS = 0.2;

const decorationModels: Record<
  DecorationKind,
  { url: string; scale: number; lift: number }
> = {
  barrel: { url: "/models/space/barrel.glb", scale: 0.52, lift: 0 },
  barrels: { url: "/models/space/barrels.glb", scale: 0.48, lift: 0 },
  cables: { url: "/models/space/cables.glb", scale: 0.55, lift: 0.02 },
  chair: { url: "/models/space/chair.glb", scale: 0.42, lift: 0 },
  computer: { url: "/models/space/desk-computer.glb", scale: 0.42, lift: 0 },
  console: { url: "/models/space/console.glb", scale: 0.36, lift: 0 },
  crate: { url: "/models/space/crate.glb", scale: 0.72, lift: 0 },
  crystals: { url: "/models/space/crystals.glb", scale: 0.42, lift: 0 },
  door: { url: "/models/space/door.glb", scale: 0.42, lift: 0 },
  generator: { url: "/models/space/generator.glb", scale: 0.42, lift: 0 },
  panel: { url: "/models/space/panel.glb", scale: 0.38, lift: 0 },
  pipe: { url: "/models/space/pipe.glb", scale: 0.65, lift: 0 },
  rover: { url: "/models/space/rover.glb", scale: 0.48, lift: 0 },
  satellite: { url: "/models/space/satellite-dish.glb", scale: 0.36, lift: 0 },
  turret: { url: "/models/space/turret.glb", scale: 0.45, lift: 0 },
  wireless: { url: "/models/space/wireless.glb", scale: 0.44, lift: 0 },
};

type AssetModelProps = {
  url: string;
  position?: Vector3Tuple;
  rotation?: Vector3Tuple;
  scale?: number | Vector3Tuple;
};

type WallSegment = {
  key: string;
  position: Vector3Tuple;
  size: Vector3Tuple;
};

const directionRotationY: Record<Direction, number> = {
  north: 0,
  east: -Math.PI / 2,
  south: Math.PI,
  west: Math.PI / 2,
};

function AssetModel({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: AssetModelProps) {
  const model = useGLTF(url);
  const scene = useMemo(() => cloneSkeleton(model.scene), [model.scene]);

  return (
    <primitive
      object={scene}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}

function cellKey(x: number, z: number) {
  return `${x}:${z}`;
}

function getDoorEdgeCoordinate(room: RoomDefinition, direction: Direction) {
  if (direction === "east") {
    const edgeX = Math.max(...room.shape.filter(([, z]) => z === 0).map(([x]) => x));
    return (edgeX + 0.5) * TILE_SIZE;
  }

  if (direction === "west") {
    const edgeX = Math.min(...room.shape.filter(([, z]) => z === 0).map(([x]) => x));
    return (edgeX - 0.5) * TILE_SIZE;
  }

  if (direction === "south") {
    const edgeZ = Math.max(...room.shape.filter(([x]) => x === 0).map(([, z]) => z));
    return (edgeZ + 0.5) * TILE_SIZE;
  }

  const edgeZ = Math.min(...room.shape.filter(([x]) => x === 0).map(([, z]) => z));
  return (edgeZ - 0.5) * TILE_SIZE;
}

function splitAroundDoor(start: number, end: number, doorHalfWidth: number) {
  const parts: Array<[number, number]> = [];

  if (start < -doorHalfWidth) {
    parts.push([start, Math.min(end, -doorHalfWidth)]);
  }

  if (end > doorHalfWidth) {
    parts.push([Math.max(start, doorHalfWidth), end]);
  }

  return parts.filter(([partStart, partEnd]) => partEnd - partStart > 0.05);
}

function addHorizontalWall(
  walls: WallSegment[],
  key: string,
  z: number,
  startX: number,
  endX: number,
) {
  walls.push({
    key,
    position: [(startX + endX) / 2, WALL_HEIGHT / 2, z],
    size: [endX - startX + WALL_THICKNESS, WALL_HEIGHT, WALL_THICKNESS],
  });
}

function addVerticalWall(
  walls: WallSegment[],
  key: string,
  x: number,
  startZ: number,
  endZ: number,
) {
  walls.push({
    key,
    position: [x, WALL_HEIGHT / 2, (startZ + endZ) / 2],
    size: [WALL_THICKNESS, WALL_HEIGHT, endZ - startZ + WALL_THICKNESS],
  });
}

function makeWallSegments(room: RoomDefinition, doors: RoomDoor[]) {
  const occupiedCells = new Set(room.shape.map(([x, z]) => cellKey(x, z)));
  const doorByDirection = new Map(
    doors.map((door) => [door.direction, door.width] as const),
  );
  const walls: WallSegment[] = [];

  for (const [cellX, cellZ] of room.shape) {
    const westOpen = !occupiedCells.has(cellKey(cellX - 1, cellZ));
    const eastOpen = !occupiedCells.has(cellKey(cellX + 1, cellZ));
    const northOpen = !occupiedCells.has(cellKey(cellX, cellZ - 1));
    const southOpen = !occupiedCells.has(cellKey(cellX, cellZ + 1));

    const startX = (cellX - 0.5) * TILE_SIZE;
    const endX = (cellX + 0.5) * TILE_SIZE;
    const startZ = (cellZ - 0.5) * TILE_SIZE;
    const endZ = (cellZ + 0.5) * TILE_SIZE;

    if (northOpen) {
      const z = startZ;
      const doorWidth = doorByDirection.get("north");
      const doorZ = getDoorEdgeCoordinate(room, "north");

      if (doorWidth && Math.abs(z - doorZ) < 0.01) {
        splitAroundDoor(startX, endX, doorWidth / 2 + WALL_THICKNESS).forEach(
          ([partStart, partEnd], index) => {
            addHorizontalWall(
              walls,
              `${cellX}:${cellZ}:north:${index}`,
              z,
              partStart,
              partEnd,
            );
          },
        );
      } else {
        addHorizontalWall(walls, `${cellX}:${cellZ}:north`, z, startX, endX);
      }
    }

    if (southOpen) {
      const z = endZ;
      const doorWidth = doorByDirection.get("south");
      const doorZ = getDoorEdgeCoordinate(room, "south");

      if (doorWidth && Math.abs(z - doorZ) < 0.01) {
        splitAroundDoor(startX, endX, doorWidth / 2 + WALL_THICKNESS).forEach(
          ([partStart, partEnd], index) => {
            addHorizontalWall(
              walls,
              `${cellX}:${cellZ}:south:${index}`,
              z,
              partStart,
              partEnd,
            );
          },
        );
      } else {
        addHorizontalWall(walls, `${cellX}:${cellZ}:south`, z, startX, endX);
      }
    }

    if (westOpen) {
      const x = startX;
      const doorWidth = doorByDirection.get("west");
      const doorX = getDoorEdgeCoordinate(room, "west");

      if (doorWidth && Math.abs(x - doorX) < 0.01) {
        splitAroundDoor(startZ, endZ, doorWidth / 2 + WALL_THICKNESS).forEach(
          ([partStart, partEnd], index) => {
            addVerticalWall(
              walls,
              `${cellX}:${cellZ}:west:${index}`,
              x,
              partStart,
              partEnd,
            );
          },
        );
      } else {
        addVerticalWall(walls, `${cellX}:${cellZ}:west`, x, startZ, endZ);
      }
    }

    if (eastOpen) {
      const x = endX;
      const doorWidth = doorByDirection.get("east");
      const doorX = getDoorEdgeCoordinate(room, "east");

      if (doorWidth && Math.abs(x - doorX) < 0.01) {
        splitAroundDoor(startZ, endZ, doorWidth / 2 + WALL_THICKNESS).forEach(
          ([partStart, partEnd], index) => {
            addVerticalWall(
              walls,
              `${cellX}:${cellZ}:east:${index}`,
              x,
              partStart,
              partEnd,
            );
          },
        );
      } else {
        addVerticalWall(walls, `${cellX}:${cellZ}:east`, x, startZ, endZ);
      }
    }
  }

  return walls;
}

function getDoorPosition(room: RoomDefinition, direction: Direction): Vector3Tuple {
  const edge = getDoorEdgeCoordinate(room, direction);

  return direction === "east" || direction === "west"
    ? [edge, 0.02, 0]
    : [0, 0.02, edge];
}

type SpaceRoomProps = {
  active: boolean;
  doors: RoomDoor[];
  room: RoomDefinition;
};

export function SpaceRoom({ active, doors, room }: SpaceRoomProps) {
  const wallSegments = useMemo(
    () => makeWallSegments(room, doors),
    [doors, room],
  );
  const effectColor =
    room.effect?.kind === "forward"
      ? "#64d88a"
      : room.effect?.kind === "backward"
        ? "#ff7867"
        : active
          ? "#f3c969"
          : "#516171";

  return (
    <group position={room.position} rotation={[0, room.rotationY ?? 0, 0]}>
      {room.shape.map(([cellX, cellZ]) => (
        <mesh
          key={`floor-${cellX}:${cellZ}`}
          position={[cellX * TILE_SIZE, -0.055, cellZ * TILE_SIZE]}
          receiveShadow
        >
          <boxGeometry args={[TILE_SIZE, 0.08, TILE_SIZE]} />
          <meshStandardMaterial color="#252a34" roughness={0.9} />
        </mesh>
      ))}

      {room.shape.map(([cellX, cellZ]) => (
        <mesh
          key={`plate-${cellX}:${cellZ}`}
          position={[cellX * TILE_SIZE, -0.006, cellZ * TILE_SIZE]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[TILE_SIZE * 0.82, TILE_SIZE * 0.82]} />
          <meshBasicMaterial
            color={room.accentColor}
            transparent
            opacity={active ? 0.08 : 0.035}
          />
        </mesh>
      ))}

      {wallSegments.map((wall) => (
        <mesh
          key={wall.key}
          position={wall.position}
          castShadow
          receiveShadow
        >
          <boxGeometry args={wall.size} />
          <meshStandardMaterial
            color={active ? "#7b8bb0" : "#5f6f92"}
            roughness={0.72}
          />
        </mesh>
      ))}

      {doors.map((door) => {
        const position = getDoorPosition(room, door.direction);
        const thresholdSize: Vector3Tuple =
          door.direction === "east" || door.direction === "west"
            ? [0.34, 0.05, door.width]
            : [door.width, 0.05, 0.34];

        return (
          <group key={`door-${door.direction}`}>
            <mesh position={[position[0], 0.005, position[2]]} receiveShadow>
              <boxGeometry args={thresholdSize} />
              <meshStandardMaterial
                color={room.accentColor}
                emissive={room.accentColor}
                emissiveIntensity={0.18}
                roughness={0.55}
              />
            </mesh>
            <AssetModel
              url="/models/space/door.glb"
              position={position}
              rotation={[0, directionRotationY[door.direction], 0]}
              scale={0.48}
            />
          </group>
        );
      })}

      {room.decorations.map((decoration, index) => {
        const model = decorationModels[decoration.kind];
        const [x, y, z] = decoration.position;

        return (
          <AssetModel
            key={`${decoration.kind}-${index}`}
            url={model.url}
            position={[x, y + model.lift, z]}
            rotation={[0, decoration.rotationY ?? 0, 0]}
            scale={decoration.scale ?? model.scale}
          />
        );
      })}

      <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.3, 64]} />
        <meshBasicMaterial
          color={room.accentColor}
          transparent
          opacity={active ? 0.24 : 0.1}
        />
      </mesh>

      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.22, 1.5, 64]} />
        <meshBasicMaterial color={effectColor} transparent opacity={0.78} />
      </mesh>

      <Text
        position={[0, 0.082, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.76}
        color="#f8fbf7"
        anchorX="center"
        anchorY="middle"
      >
        {room.id}
      </Text>

      <Text
        position={[0, 0.09, 1.65]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.2}
        color="#d7dfd4"
        anchorX="center"
        anchorY="middle"
        maxWidth={3.8}
      >
        {room.name}
      </Text>
    </group>
  );
}

Object.values(decorationModels).forEach((model) => {
  useGLTF.preload(model.url);
});
