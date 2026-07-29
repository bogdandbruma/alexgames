import type { Vector3Tuple } from "../game/board";

type HallwayProps = {
  from: Vector3Tuple;
  to: Vector3Tuple;
  width: number;
};

const HALLWAY_OVERLAP = 0.42;
const WALL_HEIGHT = 0.58;
const WALL_THICKNESS = 0.18;

export function Hallway({ from, to, width }: HallwayProps) {
  const deltaX = to[0] - from[0];
  const deltaZ = to[2] - from[2];
  const horizontal = Math.abs(deltaX) >= Math.abs(deltaZ);
  const distance = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
  const length = Math.max(distance + HALLWAY_OVERLAP, 1.2);
  const centerX = (from[0] + to[0]) / 2;
  const centerZ = (from[2] + to[2]) / 2;

  const floorSize: Vector3Tuple = horizontal
    ? [length, 0.08, width]
    : [width, 0.08, length];

  const wallOnePosition: Vector3Tuple = horizontal
    ? [0, WALL_HEIGHT / 2, width / 2]
    : [width / 2, WALL_HEIGHT / 2, 0];

  const wallTwoPosition: Vector3Tuple = horizontal
    ? [0, WALL_HEIGHT / 2, -width / 2]
    : [-width / 2, WALL_HEIGHT / 2, 0];

  const wallSize: Vector3Tuple = horizontal
    ? [length + WALL_THICKNESS, WALL_HEIGHT, WALL_THICKNESS]
    : [WALL_THICKNESS, WALL_HEIGHT, length + WALL_THICKNESS];

  return (
    <group position={[centerX, -0.06, centerZ]}>
      <mesh receiveShadow>
        <boxGeometry args={floorSize} />
        <meshStandardMaterial color="#202630" roughness={0.82} />
      </mesh>

      {[wallOnePosition, wallTwoPosition].map((position) => (
        <mesh key={position.join(":")} position={position} castShadow>
          <boxGeometry args={wallSize} />
          <meshStandardMaterial color="#5c6d8d" roughness={0.7} />
        </mesh>
      ))}

      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry
          args={
            horizontal
              ? [length - 0.25, Math.max(width - 0.65, 0.8)]
              : [Math.max(width - 0.65, 0.8), length - 0.25]
          }
        />
        <meshBasicMaterial color="#67d5c8" transparent opacity={0.12} />
      </mesh>
    </group>
  );
}
