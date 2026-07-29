import { Html } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useMemo, useState } from "react";
import * as THREE from "three";
import {
  roomConnections,
  rooms,
  type Vector3Tuple,
} from "../game/board";
import { useGameStore } from "../game/store";
import { BoardAvatars } from "./BoardAvatars";
import { BoardRooms } from "./BoardRooms";
import { CameraRig } from "./CameraRig";
import { Hallway } from "./Hallway";
import { sceneQuality } from "./sceneQuality";

const sceneCenter: Vector3Tuple = [42, 0, 37];
const moonHalfExtent = 116;

const craterDetails = [
  { position: [-14, -0.18, 7], radius: 4.8, rotation: 0.28, scale: [1.35, 0.72, 1] },
  { position: [-8, -0.17, 45], radius: 3.1, rotation: -0.35, scale: [1.18, 0.82, 1] },
  { position: [5, -0.17, -11], radius: 2.7, rotation: 0.6, scale: [1.26, 0.78, 1] },
  { position: [9, -0.17, 49], radius: 2.2, rotation: 0.08, scale: [0.95, 1.2, 1] },
  { position: [23, -0.17, -15], radius: 3.8, rotation: -0.18, scale: [1.36, 0.82, 1] },
  { position: [37, -0.17, 51], radius: 3.2, rotation: 0.42, scale: [1.2, 0.86, 1] },
  { position: [54, -0.17, -8], radius: 4.2, rotation: -0.52, scale: [1.42, 0.78, 1] },
  { position: [64, -0.17, 24], radius: 5.1, rotation: 0.18, scale: [1.18, 0.88, 1] },
  { position: [58, -0.17, 51], radius: 2.6, rotation: -0.12, scale: [1.05, 0.95, 1] },
] satisfies Array<{
  position: Vector3Tuple;
  radius: number;
  rotation: number;
  scale: Vector3Tuple;
}>;

const moonRocks = [
  [-18, -0.01, 20, 0.24],
  [-4, -0.02, -16, 0.2],
  [2, -0.02, 47, 0.16],
  [17, -0.02, -13, 0.18],
  [31, -0.02, 50, 0.24],
  [44, -0.02, -11, 0.18],
  [60, -0.02, 8, 0.22],
  [66, -0.02, 39, 0.26],
] satisfies Array<[number, number, number, number]>;

function seededRandom(seed: number) {
  let value = seed;

  return () => {
    value = (value * 16_807) % 2_147_483_647;

    return (value - 1) / 2_147_483_646;
  };
}

function MoonSky() {
  const starsGeometry = useMemo(() => {
    const random = seededRandom(44);
    const positions: number[] = [];

    for (let index = 0; index < 520; index += 1) {
      const angle = random() * Math.PI * 2;
      const elevation = THREE.MathUtils.lerp(0.08, 1.22, random());
      const radius = THREE.MathUtils.lerp(92, 128, random());
      const twinkle = index % 19 === 0 ? 1.55 : 1;

      positions.push(
        sceneCenter[0] + Math.cos(angle) * Math.cos(elevation) * radius,
        THREE.MathUtils.lerp(15, 82, random()) * twinkle,
        sceneCenter[2] + Math.sin(angle) * Math.cos(elevation) * radius,
      );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );

    return geometry;
  }, []);

  return (
    <>
      <points geometry={starsGeometry}>
        <pointsMaterial
          color="#f8fbff"
          size={1.35}
          sizeAttenuation={false}
          transparent
          opacity={1}
          fog={false}
          depthWrite={false}
        />
      </points>

      <mesh position={[86, 48, -42]}>
        <sphereGeometry args={[3.3, 48, 24]} />
        <meshBasicMaterial color="#dce9ff" transparent opacity={0.88} />
      </mesh>
      <mesh position={[84.9, 48.28, -41.7]}>
        <sphereGeometry args={[3.35, 48, 24]} />
        <meshBasicMaterial color="#07101f" transparent opacity={0.9} />
      </mesh>
    </>
  );
}

function MoonSurface() {
  const moonSize = moonHalfExtent * 2;
  const innerSquare = 92;
  const frameSquare = 108;

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[sceneCenter[0], -0.23, sceneCenter[2]]}
        receiveShadow
      >
        <planeGeometry args={[moonSize, moonSize]} />
        <meshStandardMaterial
          color="#8e918d"
          roughness={1}
          metalness={0}
        />
      </mesh>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[sceneCenter[0], -0.225, sceneCenter[2]]}
      >
        <planeGeometry args={[frameSquare, frameSquare]} />
        <meshBasicMaterial color="#c4c7c2" transparent opacity={0.1} />
      </mesh>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[sceneCenter[0], -0.224, sceneCenter[2]]}
      >
        <planeGeometry args={[innerSquare, innerSquare]} />
        <meshBasicMaterial color="#9a9d98" transparent opacity={0.14} />
      </mesh>

      {craterDetails.map((crater) => (
        <group
          key={crater.position.join(":")}
          position={crater.position}
          rotation={[-Math.PI / 2, 0, crater.rotation]}
          scale={crater.scale}
        >
          <mesh position={[0, 0, 0.002]}>
            <circleGeometry args={[crater.radius, 48]} />
            <meshBasicMaterial color="#5e6261" transparent opacity={0.36} />
          </mesh>
          <mesh position={[0, 0, 0.006]}>
            <ringGeometry args={[crater.radius * 0.78, crater.radius, 64]} />
            <meshBasicMaterial color="#d0d2cd" transparent opacity={0.2} />
          </mesh>
        </group>
      ))}

      {moonRocks.map(([x, y, z, radius], index) => (
        <mesh
          key={`${x}:${z}:${index}`}
          castShadow
          receiveShadow
          position={[x, y, z]}
          rotation={[0.4 + index * 0.12, index * 0.47, -0.18]}
        >
          <dodecahedronGeometry args={[radius, 0]} />
          <meshStandardMaterial color="#a9aca7" roughness={0.96} />
        </mesh>
      ))}
    </group>
  );
}

function getPlayerPosition(
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

export function GameScene() {
  const players = useGameStore((state) => state.players);
  const currentPlayerIndex = useGameStore((state) => state.currentPlayerIndex);
  const phase = useGameStore((state) => state.phase);
  const portalTransition = useGameStore((state) => state.portalTransition);
  const winnerId = useGameStore((state) => state.winnerId);
  const rolling = useGameStore((state) => state.rolling);
  const [cameraIdle, setCameraIdle] = useState(false);
  const onCameraIdleChange = useCallback((idle: boolean) => {
    setCameraIdle(idle);
  }, []);

  const winner =
    players.find(({ id }) => id === winnerId) ??
    players.find(({ positionIndex }) => positionIndex === rooms.length - 1);
  const focusedPlayer =
    phase === "finished"
      ? winner ?? players[0]
      : players[currentPlayerIndex] ?? players[0];
  const currentRoom = rooms[focusedPlayer?.positionIndex ?? 0];
  const focusedPlayerPosition = focusedPlayer
    ? getPlayerPosition(
        currentRoom.position,
        currentPlayerIndex,
        players.length,
      )
    : currentRoom.position;
  const cinematicTargetPosition: Vector3Tuple =
    phase === "finished"
      ? [
          rooms[rooms.length - 1].position[0] + 10,
          9,
          rooms[rooms.length - 1].position[2] - 10,
        ]
      : focusedPlayerPosition;

  const frameloop =
    cameraIdle && !rolling && phase !== "finished" ? "demand" : "always";

  return (
    <Canvas
      shadows={sceneQuality.shadows}
      frameloop={frameloop}
      camera={{
        position: [9, 21, 23],
        fov: 52,
        near: 0.1,
        far: 240,
      }}
      dpr={sceneQuality.dpr}
      gl={{ antialias: sceneQuality.antialias }}
      onCreated={({ gl }) => {
        if (sceneQuality.shadows) {
          gl.shadowMap.type = THREE.PCFShadowMap;
        }
      }}
    >
      <color attach="background" args={["#07101f"]} />
      <fog attach="fog" args={["#07101f", 58, 155]} />
      <MoonSky />
      <MoonSurface />
      <ambientLight intensity={1.08} color="#d9e7ff" />
      <hemisphereLight args={["#edf5ff", "#5d625f", 0.72]} />
      <directionalLight
        castShadow
        position={[-18, 34, -12]}
        intensity={2.8}
        color="#f4f7ff"
      />
      <pointLight
        position={[4, 6, 8]}
        intensity={12}
        distance={24}
        color="#67d5c8"
      />
      <pointLight
        position={[26, 6, 2]}
        intensity={8}
        distance={20}
        color="#f3c969"
      />

      <Suspense
        fallback={
          <Html center>
            <div className="loading-assets">Loading assets</div>
          </Html>
        }
      >
        {roomConnections.map((connection) => (
          <Hallway
            key={`${connection.from.join(":")}-${connection.to.join(":")}`}
            from={connection.from}
            kind={connection.kind}
            points={connection.points}
            to={connection.to}
            width={connection.width}
          />
        ))}

        <BoardRooms activeRoomId={currentRoom.id} />

        <BoardAvatars
          currentPlayerIndex={currentPlayerIndex}
          phase={phase}
          players={players}
          portalTransition={portalTransition}
          winnerId={winnerId}
        />
      </Suspense>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[41, -0.14, 33]}
        receiveShadow
      >
        <planeGeometry args={[104, 88]} />
        <shadowMaterial opacity={0.25} />
      </mesh>

      <CameraRig
        focusKey={`${phase}-${winnerId ?? focusedPlayer?.id ?? "setup"}`}
        moving={rolling || phase === "finished"}
        onCameraIdleChange={onCameraIdleChange}
        targetPosition={cinematicTargetPosition}
      />
    </Canvas>
  );
}
