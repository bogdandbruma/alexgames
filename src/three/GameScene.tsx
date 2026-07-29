import { Html, MapControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import type { MapControls as MapControlsImpl } from "three-stdlib";
import {
  roomConnections,
  roomDoorsById,
  rooms,
  type Vector3Tuple,
} from "../game/board";
import { useGameStore } from "../game/store";
import { Avatar } from "./Avatar";
import { Dice } from "./Dice";
import { Hallway } from "./Hallway";
import { SpaceRoom } from "./SpaceRoom";

const turnPullbackOffset = new THREE.Vector3(13, 31, 33);
const turnCloseOffset = new THREE.Vector3(9, 24, 27);
const movementOverviewOffset = new THREE.Vector3(5, 41, 24);
const turnFocusDuration = 4.4;

function easeInOut(value: number) {
  const clampedValue = THREE.MathUtils.clamp(value, 0, 1);

  return clampedValue * clampedValue * (3 - 2 * clampedValue);
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

export function GameScene() {
  const players = useGameStore((state) => state.players);
  const currentPlayerIndex = useGameStore((state) => state.currentPlayerIndex);
  const diceValue = useGameStore((state) => state.diceValue);
  const diceAnimating = useGameStore((state) => state.diceAnimating);
  const phase = useGameStore((state) => state.phase);
  const rolling = useGameStore((state) => state.rolling);
  const focusedPlayer = players[currentPlayerIndex] ?? players[0];
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
    >
      <color attach="background" args={["#101113"]} />
      <ambientLight intensity={1.45} />
      <directionalLight castShadow position={[10, 18, 8]} intensity={2.1} />
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

        {players.map((player, index) => (
          <Avatar
            key={player.id}
            active={index === currentPlayerIndex}
            avatarId={player.avatarId}
            label={player.name}
            markerColor={index === currentPlayerIndex ? "#f3c969" : "#67d5c8"}
            targetPosition={getPlayerPosition(
              rooms[player.positionIndex].position,
              index,
            )}
          />
        ))}

        <Dice
          rolling={diceAnimating}
          value={diceValue}
          anchorPosition={currentRoom.position}
        />
      </Suspense>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[24, -0.14, 18]}
        receiveShadow
      >
        <planeGeometry args={[70, 62]} />
        <shadowMaterial opacity={0.25} />
      </mesh>

      <SceneControls
        focusKey={`${phase}-${focusedPlayer?.id ?? "setup"}`}
        moving={rolling}
        targetPosition={focusedPlayerPosition}
      />
    </Canvas>
  );
}
