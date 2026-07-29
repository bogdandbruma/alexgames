import { Html, MapControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { MapControls as MapControlsImpl } from "three-stdlib";
import {
  roomConnections,
  roomDoorsById,
  rooms,
  type Vector3Tuple,
} from "../game/board";
import { useGameStore, type GamePlayer } from "../game/store";
import { Avatar } from "./Avatar";
import { Hallway } from "./Hallway";
import { SpaceRoom } from "./SpaceRoom";
import { VictoryFireworksShow } from "./VictoryFireworks";

const turnPullbackOffset = new THREE.Vector3(13, 31, 33);
const turnCloseOffset = new THREE.Vector3(9, 24, 27);
const movementOverviewOffset = new THREE.Vector3(5, 41, 24);
const turnFocusDuration = 4.4;
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

function easeInOut(value: number) {
  const clampedValue = THREE.MathUtils.clamp(value, 0, 1);

  return clampedValue * clampedValue * (3 - 2 * clampedValue);
}

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

function SceneControls({
  focusKey,
  moving,
  targetPosition,
}: {
  focusKey: string;
  moving: boolean;
  targetPosition: Vector3Tuple;
}) {
  const controlsRef = useRef<MapControlsImpl | null>(null);
  const camera = useThree((state) => state.camera);
  const targetRef = useRef(new THREE.Vector3());
  const desiredTargetRef = useRef(new THREE.Vector3());
  const desiredCameraRef = useRef(new THREE.Vector3());
  const desiredOffsetRef = useRef(new THREE.Vector3());
  const initializedRef = useRef(false);
  const cameraMovingRef = useRef(false);
  const focusStartedAtRef = useRef(0);
  const [targetX, targetY, targetZ] = targetPosition;

  useEffect(() => {
    desiredTargetRef.current.set(
      targetX,
      targetY,
      targetZ,
    );

    cameraMovingRef.current = true;
  }, [targetX, targetY, targetZ]);

  useEffect(() => {
    cameraMovingRef.current = true;
  }, [moving]);

  useEffect(() => {
    focusStartedAtRef.current = performance.now() / 1_000;
    cameraMovingRef.current = true;
  }, [focusKey]);

  useFrame((_, delta) => {
    const elapsedSinceFocus = performance.now() / 1_000 - focusStartedAtRef.current;
    const focusProgress = easeInOut(elapsedSinceFocus / turnFocusDuration);
    const desiredOffset = moving
      ? desiredOffsetRef.current.copy(movementOverviewOffset)
      : desiredOffsetRef.current
          .copy(turnPullbackOffset)
          .lerp(turnCloseOffset, focusProgress);

    desiredCameraRef.current.copy(desiredTargetRef.current).add(desiredOffset);

    if (!initializedRef.current) {
      targetRef.current.copy(desiredTargetRef.current);
      camera.position.copy(desiredCameraRef.current);
      camera.lookAt(targetRef.current);
      initializedRef.current = true;
    }

    if (!cameraMovingRef.current) {
      controlsRef.current?.update();
      return;
    }

    const targetInterpolation = 1 - Math.exp(-(moving ? 0.95 : 1.125) * delta);
    const cameraInterpolation = 1 - Math.exp(-(moving ? 0.825 : 0.95) * delta);

    targetRef.current.lerp(desiredTargetRef.current, targetInterpolation);
    camera.position.lerp(desiredCameraRef.current, cameraInterpolation);

    if (controlsRef.current) {
      controlsRef.current.target.copy(targetRef.current);
      controlsRef.current.update();
    } else {
      camera.lookAt(targetRef.current);
    }

    if (
      targetRef.current.distanceTo(desiredTargetRef.current) < 0.035 &&
      camera.position.distanceTo(desiredCameraRef.current) < 0.055
    ) {
      targetRef.current.copy(desiredTargetRef.current);
      camera.position.copy(desiredCameraRef.current);

      if (controlsRef.current) {
        controlsRef.current.target.copy(targetRef.current);
        controlsRef.current.update();
      }

      cameraMovingRef.current = moving || focusProgress < 1;
    }
  });

  return (
    <MapControls
      ref={controlsRef}
      enableDamping
      enablePan
      enableRotate
      enableZoom
      dampingFactor={0.06}
      minDistance={5}
      maxDistance={170}
      mouseButtons={{
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      }}
      touches={{
        ONE: THREE.TOUCH.PAN,
        TWO: THREE.TOUCH.DOLLY_ROTATE,
      }}
      panSpeed={1.1}
      zoomSpeed={1.25}
      maxPolarAngle={Math.PI / 2.05}
    />
  );
}

function VictoryCinematic({
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

export function GameScene() {
  const players = useGameStore((state) => state.players);
  const currentPlayerIndex = useGameStore((state) => state.currentPlayerIndex);
  const phase = useGameStore((state) => state.phase);
  const portalTransition = useGameStore((state) => state.portalTransition);
  const winnerId = useGameStore((state) => state.winnerId);
  const rolling = useGameStore((state) => state.rolling);
  const winner =
    players.find(({ id }) => id === winnerId) ??
    players.find(({ positionIndex }) => positionIndex === rooms.length - 1);
  const focusedPlayer =
    phase === "finished"
      ? winner ?? players[0]
      : players[currentPlayerIndex] ?? players[0];
  const currentRoom = rooms[focusedPlayer?.positionIndex ?? 0];
  const getPlayerPosition = (
    roomPosition: Vector3Tuple,
    playerIndex: number,
  ): Vector3Tuple => {
    if (players.length <= 1) {
      return roomPosition;
    }

    const angle = (playerIndex / players.length) * Math.PI * 2;
    const radius = 0.88;

    return [
      roomPosition[0] + Math.cos(angle) * radius,
      roomPosition[1],
      roomPosition[2] + Math.sin(angle) * radius,
    ];
  };

  const focusedPlayerPosition = focusedPlayer
    ? getPlayerPosition(currentRoom.position, currentPlayerIndex)
    : currentRoom.position;
  const cinematicTargetPosition: Vector3Tuple =
    phase === "finished"
      ? [rooms[rooms.length - 1].position[0] + 10, 9, rooms[rooms.length - 1].position[2] - 10]
      : focusedPlayerPosition;

  return (
    <Canvas
      shadows
      camera={{
        position: [9, 21, 23],
        fov: 52,
        near: 0.1,
        far: 240,
      }}
      dpr={[1, 1.75]}
      gl={{ antialias: true }}
      onCreated={({ gl }) => {
        gl.shadowMap.type = THREE.PCFShadowMap;
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

        {rooms.map((room) => (
          <SpaceRoom
            key={room.id}
            active={currentRoom === room}
            doors={roomDoorsById[room.id] ?? []}
            room={room}
          />
        ))}

        {players.map((player, index) =>
          phase === "finished" && player.id === winner?.id ? null : (
            <Avatar
              key={player.id}
              active={index === currentPlayerIndex}
              avatarId={player.avatarId}
              label={player.name}
              markerColor={index === currentPlayerIndex ? "#f3c969" : "#67d5c8"}
              playerId={player.id}
              portalTransition={portalTransition}
              roomId={player.positionIndex + 1}
              targetPosition={getPlayerPosition(
                rooms[player.positionIndex].position,
                index,
              )}
            />
          ),
        )}

        {phase === "finished" && winner ? (
          <VictoryCinematic
            anchorPosition={rooms[rooms.length - 1].position}
            winner={winner}
          />
        ) : null}

      </Suspense>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[41, -0.14, 33]}
        receiveShadow
      >
        <planeGeometry args={[104, 88]} />
        <shadowMaterial opacity={0.25} />
      </mesh>

      <SceneControls
        focusKey={`${phase}-${winnerId ?? focusedPlayer?.id ?? "setup"}`}
        moving={rolling || phase === "finished"}
        targetPosition={cinematicTargetPosition}
      />
    </Canvas>
  );
}
