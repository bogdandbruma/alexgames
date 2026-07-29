import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Vector3Tuple } from "../game/board";
import type { GamePlayer } from "../game/store";
import { Avatar } from "./Avatar";
import { VictoryFireworksShow } from "./VictoryFireworks";

function easeInOut(value: number) {
  const clampedValue = THREE.MathUtils.clamp(value, 0, 1);

  return clampedValue * clampedValue * (3 - 2 * clampedValue);
}

export function VictoryCinematic({
  anchorPosition,
  winner,
}: {
  anchorPosition: Vector3Tuple;
  winner: GamePlayer;
}) {
  const rocketRef = useRef<THREE.Group>(null);
  const flameRef = useRef<THREE.MeshBasicMaterial>(null);
  const startedAtRef = useRef(performance.now() / 1_000);
  const launchPosition = useMemo(() => new THREE.Vector3(...anchorPosition), [
    anchorPosition,
  ]);

  useFrame(() => {
    const elapsed = performance.now() / 1_000 - startedAtRef.current;
    const cycle = elapsed % 8.2;
    const launchProgress = easeInOut(Math.min(cycle / 3.4, 1));
    const cruiseProgress = easeInOut(
      THREE.MathUtils.clamp((cycle - 3.1) / 3.4, 0, 1),
    );
    const bob = Math.sin(elapsed * 3.2) * 0.22;

    if (rocketRef.current) {
      rocketRef.current.position.set(
        launchPosition.x + cruiseProgress * 25,
        launchPosition.y + 1.85 + launchProgress * 18 + bob,
        launchPosition.z - cruiseProgress * 22,
      );
      rocketRef.current.rotation.z = THREE.MathUtils.lerp(
        0,
        -0.48,
        cruiseProgress,
      );
      rocketRef.current.rotation.x = Math.sin(elapsed * 1.1) * 0.035;
    }

    if (flameRef.current) {
      flameRef.current.opacity = 0.54 + Math.sin(elapsed * 16) * 0.22;
    }
  });

  return (
    <group>
      <mesh
        position={[anchorPosition[0], 0.025, anchorPosition[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[2.2, 3.05, 72]} />
        <meshBasicMaterial color="#f3c969" transparent opacity={0.72} />
      </mesh>
      <mesh position={[anchorPosition[0], 0.16, anchorPosition[2]]}>
        <cylinderGeometry args={[2.25, 2.25, 0.28, 48]} />
        <meshStandardMaterial color="#4f565f" metalness={0.18} roughness={0.64} />
      </mesh>

      <group ref={rocketRef} scale={1.45}>
        <pointLight
          position={[0, -1.1, 0]}
          intensity={16}
          distance={12}
          color="#f3c969"
        />
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.46, 0.58, 2.8, 32]} />
          <meshStandardMaterial color="#f8fbf7" metalness={0.2} roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.65, 0]}>
          <coneGeometry args={[0.5, 0.92, 32]} />
          <meshStandardMaterial color="#ff7867" roughness={0.48} />
        </mesh>
        <mesh position={[0, 0.45, -0.48]}>
          <sphereGeometry args={[0.24, 24, 12]} />
          <meshBasicMaterial color="#8fb1ff" transparent opacity={0.86} />
        </mesh>
        <mesh position={[-0.55, -0.82, 0]} rotation={[0, 0, 0.58]}>
          <boxGeometry args={[0.2, 0.86, 0.5]} />
          <meshStandardMaterial color="#67d5c8" roughness={0.52} />
        </mesh>
        <mesh position={[0.55, -0.82, 0]} rotation={[0, 0, -0.58]}>
          <boxGeometry args={[0.2, 0.86, 0.5]} />
          <meshStandardMaterial color="#67d5c8" roughness={0.52} />
        </mesh>
        <mesh position={[0, -1.68, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.36, 1.2, 28]} />
          <meshBasicMaterial
            ref={flameRef}
            color="#f3c969"
            transparent
            opacity={0.72}
            depthWrite={false}
          />
        </mesh>

        <Avatar
          active
          avatarId={winner.avatarId}
          label={winner.name}
          markerColor="#f3c969"
          playerId={winner.id}
          roomId={winner.positionIndex + 1}
          showNameLabel
          targetPosition={[0, 2.05, 0]}
        />
      </group>

      <VictoryFireworksShow
        anchorPosition={anchorPosition}
        playerName={winner.name}
      />
    </group>
  );
}
