import { MapControls } from "@react-three/drei";
import { invalidate, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { MapControls as MapControlsImpl } from "three-stdlib";
import type { Vector3Tuple } from "../game/board";
import { useGameStore } from "../game/store";
import { getWalkProgress, getWalkSamplePosition } from "../game/walkPath";

const turnPullbackOffset = new THREE.Vector3(13, 31, 33);
const turnCloseOffset = new THREE.Vector3(9, 24, 27);
const movementOverviewOffset = new THREE.Vector3(5, 41, 24);
const turnFocusDuration = 4.4;

function easeInOut(value: number) {
  const clampedValue = THREE.MathUtils.clamp(value, 0, 1);

  return clampedValue * clampedValue * (3 - 2 * clampedValue);
}

export type CameraRigProps = {
  focusKey: string;
  moving: boolean;
  onCameraIdleChange: (idle: boolean) => void;
  targetPosition: Vector3Tuple;
};

export function CameraRig({
  focusKey,
  moving,
  onCameraIdleChange,
  targetPosition,
}: CameraRigProps) {
  const controlsRef = useRef<MapControlsImpl | null>(null);
  const camera = useThree((state) => state.camera);
  const activePlayerWalk = useGameStore((state) => state.activePlayerWalk);
  const currentPlayerIndex = useGameStore((state) => state.currentPlayerIndex);
  const players = useGameStore((state) => state.players);
  const targetRef = useRef(new THREE.Vector3());
  const desiredTargetRef = useRef(new THREE.Vector3());
  const desiredCameraRef = useRef(new THREE.Vector3());
  const desiredOffsetRef = useRef(new THREE.Vector3());
  const initializedRef = useRef(false);
  const cameraMovingRef = useRef(false);
  const focusStartedAtRef = useRef(0);
  const lastIdleRef = useRef<boolean | null>(null);
  const [targetX, targetY, targetZ] = targetPosition;

  useEffect(() => {
    desiredTargetRef.current.set(targetX, targetY, targetZ);

    cameraMovingRef.current = true;
    invalidate();
  }, [targetX, targetY, targetZ]);

  useEffect(() => {
    cameraMovingRef.current = true;
    invalidate();
  }, [moving]);

  useEffect(() => {
    focusStartedAtRef.current = performance.now() / 1_000;
    cameraMovingRef.current = true;
    invalidate();
  }, [focusKey]);

  useFrame((_, delta) => {
    const focusedPlayer = players[currentPlayerIndex];
    const followingWalk =
      activePlayerWalk !== null &&
      focusedPlayer !== undefined &&
      activePlayerWalk.playerId === focusedPlayer.id;

    if (followingWalk) {
      const progress = getWalkProgress(
        activePlayerWalk.startedAt,
        activePlayerWalk.durationMs,
      );
      const [walkX, walkY, walkZ] = getWalkSamplePosition(
        activePlayerWalk.fromRoomId,
        activePlayerWalk.toRoomId,
        progress,
        activePlayerWalk.startPosition,
        activePlayerWalk.endPosition,
      );

      desiredTargetRef.current.set(walkX, walkY, walkZ);
      targetRef.current.copy(desiredTargetRef.current);
      cameraMovingRef.current = true;
    }

    const elapsedSinceFocus = performance.now() / 1_000 - focusStartedAtRef.current;
    const focusProgress = easeInOut(elapsedSinceFocus / turnFocusDuration);
    const cameraMoving = moving || followingWalk;
    const desiredOffset = cameraMoving
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
    } else {
      const targetInterpolation = 1 - Math.exp(-(cameraMoving ? 0.95 : 1.125) * delta);
      const cameraInterpolation = 1 - Math.exp(-(cameraMoving ? 0.825 : 0.95) * delta);

      if (!followingWalk) {
        targetRef.current.lerp(desiredTargetRef.current, targetInterpolation);
      }
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

        cameraMovingRef.current = cameraMoving || focusProgress < 1;
      }
    }

    const cameraIdle = !cameraMovingRef.current && !cameraMoving;

    if (lastIdleRef.current !== cameraIdle) {
      lastIdleRef.current = cameraIdle;
      onCameraIdleChange(cameraIdle);
    }

    if (!cameraIdle) {
      invalidate();
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
      onChange={() => {
        cameraMovingRef.current = true;
        invalidate();
      }}
    />
  );
}
