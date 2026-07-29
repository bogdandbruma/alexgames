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
import { type RoomAction } from "../game/rooms";

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

const roomTypeDecorPosition: Vector3Tuple = [0.84, 0.02, -0.84];

const coinScatter = [
  [-0.35, 0.03, -0.08, 0.18],
  [-0.12, 0.03, 0.14, -0.36],
  [0.18, 0.03, -0.02, 0.42],
  [0.42, 0.03, 0.18, -0.12],
  [0.08, 0.03, 0.38, 0.28],
] satisfies Array<[number, number, number, number]>;

function CoinMesh({
  position,
  rotationY = 0,
  scale = 1,
}: {
  position: Vector3Tuple;
  rotationY?: number;
  scale?: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <mesh receiveShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.045, 28]} />
        <meshStandardMaterial
          color="#f3c969"
          emissive="#8a5b18"
          emissiveIntensity={0.1}
          metalness={0.6}
          roughness={0.34}
        />
      </mesh>
      <mesh position={[0, 0.026, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.115, 0.012, 8, 24]} />
        <meshStandardMaterial color="#fff1a8" metalness={0.5} roughness={0.28} />
      </mesh>
    </group>
  );
}

function CoinPileDecor() {
  return (
    <group rotation={[0, -Math.PI / 8, 0]}>
      {Array.from({ length: 7 }).map((_, index) => (
        <CoinMesh
          key={`stack-${index}`}
          position={[0, index * 0.046, 0]}
          rotationY={index * 0.42}
          scale={1.04}
        />
      ))}
      {coinScatter.map(([x, y, z, rotationY], index) => (
        <CoinMesh
          key={`scatter-${index}`}
          position={[x, y, z]}
          rotationY={rotationY}
          scale={0.82}
        />
      ))}
    </group>
  );
}

function ShopStallDecor() {
  return (
    <group rotation={[0, -Math.PI / 4, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.28, 0]}>
        <boxGeometry args={[1.15, 0.18, 0.58]} />
        <meshStandardMaterial color="#7c5141" roughness={0.68} />
      </mesh>
      <mesh castShadow position={[0, 0.5, 0.02]}>
        <boxGeometry args={[1.02, 0.12, 0.5]} />
        <meshStandardMaterial color="#3e2b25" roughness={0.72} />
      </mesh>
      {[-0.42, 0.42].map((x) => (
        <mesh key={`stall-leg-${x}`} castShadow position={[x, 0.13, 0.18]}>
          <boxGeometry args={[0.08, 0.28, 0.08]} />
          <meshStandardMaterial color="#493128" roughness={0.72} />
        </mesh>
      ))}
      {[-0.48, -0.24, 0, 0.24, 0.48].map((x, index) => (
        <mesh key={`awning-${x}`} castShadow position={[x, 0.94, -0.02]}>
          <boxGeometry args={[0.24, 0.14, 0.78]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? "#f3c969" : "#f8fbf7"}
            roughness={0.48}
          />
        </mesh>
      ))}
      <mesh castShadow position={[0, 0.78, -0.43]}>
        <boxGeometry args={[1.2, 0.1, 0.12]} />
        <meshStandardMaterial color="#303540" metalness={0.22} roughness={0.56} />
      </mesh>
      <Text
        position={[0, 0.79, -0.5]}
        rotation={[-0.12, 0, 0]}
        fontSize={0.18}
        color="#15120f"
        anchorX="center"
        anchorY="middle"
      >
        SHOP
      </Text>
      <CoinMesh position={[-0.28, 0.42, 0.02]} scale={0.58} />
      <mesh castShadow position={[0.22, 0.45, -0.05]}>
        <boxGeometry args={[0.22, 0.22, 0.22]} />
        <meshStandardMaterial color="#8fb1ff" roughness={0.5} />
      </mesh>
    </group>
  );
}

function WizardHatDecor({ color }: { color: string }) {
  return (
    <group rotation={[0, Math.PI / 6, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.56, 0.56, 0.08, 42]} />
        <meshStandardMaterial color="#312044" roughness={0.62} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.58, 0]} rotation={[0.18, 0, -0.08]}>
        <coneGeometry args={[0.42, 1.02, 42]} />
        <meshStandardMaterial
          color="#6f4aa0"
          emissive={color}
          emissiveIntensity={0.07}
          roughness={0.52}
        />
      </mesh>
      <mesh castShadow position={[0, 0.33, 0]}>
        <torusGeometry args={[0.33, 0.035, 10, 36]} />
        <meshStandardMaterial color="#f3c969" metalness={0.3} roughness={0.36} />
      </mesh>
      {[
        [-0.16, 0.65, 0.3],
        [0.18, 0.82, -0.24],
        [0.33, 0.42, 0.18],
      ].map(([x, y, z], index) => (
        <mesh key={`hat-star-${index}`} position={[x, y, z]}>
          <sphereGeometry args={[0.055, 12, 8]} />
          <meshBasicMaterial color="#fff1a8" />
        </mesh>
      ))}
    </group>
  );
}

function TriviaSignDecor({ color }: { color: string }) {
  return (
    <group rotation={[0, -Math.PI / 7, 0]}>
      <mesh castShadow position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.045, 0.055, 0.76, 12]} />
        <meshStandardMaterial color="#d7dfd4" metalness={0.35} roughness={0.42} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.86, 0]}>
        <boxGeometry args={[0.72, 0.52, 0.08]} />
        <meshStandardMaterial
          color="#182744"
          emissive={color}
          emissiveIntensity={0.18}
          roughness={0.5}
        />
      </mesh>
      <Text
        position={[0, 0.87, 0.052]}
        fontSize={0.42}
        color="#f8fbf7"
        anchorX="center"
        anchorY="middle"
      >
        ?
      </Text>
      {[-0.28, 0, 0.28].map((x, index) => (
        <mesh key={`quiz-button-${x}`} castShadow position={[x, 0.11, 0.36]}>
          <cylinderGeometry args={[0.09, 0.09, 0.055, 18]} />
          <meshStandardMaterial
            color={["#ff7867", "#f3c969", "#67d5c8"][index]}
            emissive={["#ff7867", "#f3c969", "#67d5c8"][index]}
            emissiveIntensity={0.08}
            roughness={0.36}
          />
        </mesh>
      ))}
    </group>
  );
}

function NetherPortalDecor({ color }: { color: string }) {
  const blockMaterial = (
    <meshStandardMaterial
      color="#15101f"
      emissive="#352052"
      emissiveIntensity={0.16}
      roughness={0.58}
    />
  );

  return (
    <group rotation={[0, -Math.PI / 5, 0]}>
      {[-0.45, 0.45].map((x) => (
        <mesh key={`portal-column-${x}`} castShadow receiveShadow position={[x, 0.62, 0]}>
          <boxGeometry args={[0.2, 1.24, 0.22]} />
          {blockMaterial}
        </mesh>
      ))}
      {[0.08, 1.16].map((y) => (
        <mesh key={`portal-beam-${y}`} castShadow receiveShadow position={[0, y, 0]}>
          <boxGeometry args={[1.08, 0.2, 0.22]} />
          {blockMaterial}
        </mesh>
      ))}
      <mesh position={[0, 0.62, 0.018]}>
        <planeGeometry args={[0.7, 0.9]} />
        <meshBasicMaterial color="#8f55ff" transparent opacity={0.72} />
      </mesh>
      <mesh position={[0, 0.62, 0.028]}>
        <planeGeometry args={[0.48, 0.7]} />
        <meshBasicMaterial color={color} transparent opacity={0.34} />
      </mesh>
      {[
        [-0.18, 0.32, 0.08],
        [0.17, 0.56, 0.08],
        [-0.08, 0.92, 0.08],
        [0.28, 0.78, 0.08],
      ].map(([x, y, z], index) => (
        <mesh key={`portal-spark-${index}`} position={[x, y, z]}>
          <boxGeometry args={[0.055, 0.055, 0.055]} />
          <meshBasicMaterial color={index % 2 === 0 ? "#c8a1ff" : "#67d5c8"} />
        </mesh>
      ))}
    </group>
  );
}

function RoomTypeDecor({
  action,
  color,
}: {
  action: RoomAction;
  color: string;
}) {
  switch (action) {
    case "coins":
      return (
        <group position={roomTypeDecorPosition} scale={0.78}>
          <CoinPileDecor />
        </group>
      );
    case "shop":
      return (
        <group position={roomTypeDecorPosition} scale={0.56}>
          <ShopStallDecor />
        </group>
      );
    case "mystery":
      return (
        <group position={roomTypeDecorPosition} scale={0.62}>
          <WizardHatDecor color={color} />
        </group>
      );
    case "trivia":
      return (
        <group position={roomTypeDecorPosition} scale={0.66}>
          <TriviaSignDecor color={color} />
        </group>
      );
    case "portal":
      return (
        <group position={roomTypeDecorPosition} scale={0.6}>
          <NetherPortalDecor color={color} />
        </group>
      );
    case "finish":
    case "trap":
      return null;
    default: {
      const exhaustiveAction: never = action;
      return exhaustiveAction;
    }
  }
}

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

function FinishMountedFlag({
  flagDirection,
  position,
}: {
  flagDirection: -1 | 1;
  position: Vector3Tuple;
}) {
  const flagColumns = 4;
  const flagRows = 3;
  const tileSize = 0.18;

  return (
    <group position={position}>
      <mesh position={[0, 0.16, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.022, 0.32, 10]} />
        <meshStandardMaterial color="#171410" metalness={0.35} roughness={0.38} />
      </mesh>
      <group position={[flagDirection * 0.33, 0.26, 0]}>
        {Array.from({ length: flagRows }).map((_, row) =>
          Array.from({ length: flagColumns }).map((__, column) => {
            const isWhite = (row + column) % 2 === 0;

            return (
              <mesh
                key={`${row}-${column}`}
                position={[
                  flagDirection *
                    (column + 0.5) *
                    tileSize,
                  ((flagRows - 1) / 2 - row) * tileSize,
                  0,
                ]}
                castShadow
              >
                <boxGeometry args={[tileSize, tileSize, 0.025]} />
                <meshStandardMaterial
                  color={isWhite ? "#f8fbf7" : "#171410"}
                  roughness={0.5}
                />
              </mesh>
            );
          }),
        )}
      </group>
    </group>
  );
}

function FinishMarkers() {
  return (
    <group>
      <FinishMountedFlag flagDirection={-1} position={[-1.55, 1.16, -1.82]} />
      <FinishMountedFlag flagDirection={1} position={[0.72, 1.16, 0.58]} />
    </group>
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
  const roomTypeColor = room.accentColor;

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
            color={roomTypeColor}
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

      {doors.map((door, index) => {
        const position = getDoorPosition(room, door.direction);
        const thresholdSize: Vector3Tuple =
          door.direction === "east" || door.direction === "west"
            ? [0.34, 0.05, door.width]
            : [door.width, 0.05, 0.34];

        return (
          <group key={`door-${door.direction}-${index}`}>
            <mesh position={[position[0], 0.005, position[2]]} receiveShadow>
              <boxGeometry args={thresholdSize} />
              <meshStandardMaterial
                color={roomTypeColor}
                emissive={roomTypeColor}
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

      <RoomTypeDecor action={room.action} color={roomTypeColor} />

      <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.3, 64]} />
        <meshBasicMaterial
          color={roomTypeColor}
          transparent
          opacity={active ? 0.34 : 0.18}
        />
      </mesh>

      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.22, 1.5, 64]} />
        <meshBasicMaterial
          color={roomTypeColor}
          transparent
          opacity={active ? 0.92 : 0.78}
        />
      </mesh>

      {room.action === "finish" ? <FinishMarkers /> : null}

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
