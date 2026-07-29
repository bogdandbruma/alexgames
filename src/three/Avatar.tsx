import { Html, useGLTF } from "@react-three/drei";
import { invalidate, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  getTravelRouteBetweenRooms,
  type Vector3Tuple,
} from "../game/board";
import {
  WALK_POINT_EPSILON,
} from "../game/movementConstants";
import { getWalkDurationSecondsFromPathLength } from "../game/movementTiming";
import { avatarModelUrls, avatarOptionById } from "../game/avatars";
import type { AvatarId, GamePortalTransition } from "../game/store";
import { AvatarCoinBursts } from "./AvatarCoinBursts";

type AvatarProps = {
  active: boolean;
  avatarId: AvatarId;
  label: string;
  markerColor: string;
  playerId: string;
  portalTransition?: GamePortalTransition | null;
  roomId: number;
  showNameLabel: boolean;
  targetPosition: Vector3Tuple;
};

type WalkAnimation = {
  duration: number;
  elapsed: number;
  lengths: number[];
  points: THREE.Vector3[];
  totalLength: number;
};

type PortalAnimation = {
  duration: number;
  elapsed: number;
  from: THREE.Vector3;
  id: number;
  to: THREE.Vector3;
};

const AVATAR_LIFT = 0.55;
const PORTAL_DURATION = 1.86;

function easeInOut(value: number) {
  const clampedValue = THREE.MathUtils.clamp(value, 0, 1);

  return clampedValue * clampedValue * (3 - 2 * clampedValue);
}

function easeOut(value: number) {
  const clampedValue = THREE.MathUtils.clamp(value, 0, 1);

  return 1 - (1 - clampedValue) * (1 - clampedValue);
}

function toAvatarVector(position: Vector3Tuple) {
  return new THREE.Vector3(position[0], position[1] + AVATAR_LIFT, position[2]);
}

function compactVectors(points: THREE.Vector3[]) {
  return points.filter((point, index) => {
    const previousPoint = points[index - 1];

    return !previousPoint || previousPoint.distanceTo(point) > WALK_POINT_EPSILON;
  });
}

function createWalkAnimation(points: THREE.Vector3[]): WalkAnimation | null {
  const compactedPoints = compactVectors(points);

  if (compactedPoints.length < 2) {
    return null;
  }

  const lengths = compactedPoints.slice(0, -1).map((point, index) =>
    point.distanceTo(compactedPoints[index + 1]),
  );
  const totalLength = lengths.reduce((total, length) => total + length, 0);

  if (totalLength < WALK_POINT_EPSILON) {
    return null;
  }

  return {
    duration: getWalkDurationSecondsFromPathLength(totalLength),
    elapsed: 0,
    lengths,
    points: compactedPoints,
    totalLength,
  };
}

function sampleWalk(animation: WalkAnimation, progress: number) {
  const easedProgress = easeInOut(progress);
  let remainingDistance = animation.totalLength * easedProgress;

  for (let index = 0; index < animation.lengths.length; index += 1) {
    const segmentLength = animation.lengths[index];

    if (remainingDistance <= segmentLength || index === animation.lengths.length - 1) {
      const segmentProgress =
        segmentLength <= 0 ? 1 : remainingDistance / segmentLength;

      return animation.points[index]
        .clone()
        .lerp(animation.points[index + 1], segmentProgress);
    }

    remainingDistance -= segmentLength;
  }

  return animation.points[animation.points.length - 1].clone();
}

export function Avatar({
  active,
  avatarId,
  label,
  markerColor,
  playerId,
  portalTransition,
  roomId,
  showNameLabel,
  targetPosition,
}: AvatarProps) {
  const avatarConfig = avatarOptionById[avatarId];
  const model = useGLTF(avatarConfig.modelUrl);
  const avatarScene = useMemo(() => cloneSkeleton(model.scene), [model.scene]);
  const moverRef = useRef<THREE.Group>(null);
  const petRef = useRef<THREE.Group>(null);
  const beaconRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const portalRef = useRef<THREE.Group>(null);
  const portalDiskRef = useRef<THREE.MeshBasicMaterial>(null);
  const portalRingRef = useRef<THREE.MeshBasicMaterial>(null);
  const previousRoomIdRef = useRef(roomId);
  const handledPortalIdRef = useRef<number | null>(null);
  const walkAnimationRef = useRef<WalkAnimation | null>(null);
  const portalAnimationRef = useRef<PortalAnimation | null>(null);
  const facingYRef = useRef(Math.PI);
  const [targetX, targetY, targetZ] = targetPosition;

  const destination = useMemo(
    () =>
      new THREE.Vector3(
        targetX,
        targetY + 0.55,
        targetZ,
      ),
    [targetX, targetY, targetZ],
  );

  const initialPosition = useRef(destination.clone()).current;

  useEffect(() => {
    const previousRoomId = previousRoomIdRef.current;
    const isPortalMove =
      portalTransition?.playerId === playerId &&
      portalTransition.id !== handledPortalIdRef.current &&
      portalTransition.toRoomId === roomId;

    if (!moverRef.current) {
      previousRoomIdRef.current = roomId;
      return;
    }

    if (previousRoomId === roomId) {
      return;
    }

    if (isPortalMove && portalTransition) {
      handledPortalIdRef.current = portalTransition.id;
      portalAnimationRef.current = {
        duration: PORTAL_DURATION,
        elapsed: 0,
        from: moverRef.current.position.clone(),
        id: portalTransition.id,
        to: destination.clone(),
      };
      walkAnimationRef.current = null;
    } else {
      const routePoints = getTravelRouteBetweenRooms(previousRoomId, roomId).map(
        toAvatarVector,
      );

      walkAnimationRef.current = createWalkAnimation([
        moverRef.current.position.clone(),
        ...routePoints,
        destination.clone(),
      ]);
      portalAnimationRef.current = null;
    }

    previousRoomIdRef.current = roomId;
  }, [destination, playerId, portalTransition, roomId]);

  useFrame(({ clock }, delta) => {
    if (moverRef.current) {
      const portalAnimation = portalAnimationRef.current;
      const walkAnimation = walkAnimationRef.current;

      if (portalAnimation) {
        portalAnimation.elapsed += delta;
        const progress = THREE.MathUtils.clamp(
          portalAnimation.elapsed / portalAnimation.duration,
          0,
          1,
        );
        const liftProgress = easeOut(Math.min(progress / 0.24, 1));
        const enterProgress = easeInOut(
          THREE.MathUtils.clamp((progress - 0.18) / 0.28, 0, 1),
        );
        const fallProgress = easeOut(
          THREE.MathUtils.clamp((progress - 0.62) / 0.38, 0, 1),
        );
        const sourceHoleVisible = progress < 0.54;
        const destinationHoleVisible = progress >= 0.5 && progress < 0.96;
        const visibleAvatar = progress < 0.48 || progress >= 0.6;

        if (progress < 0.5) {
          moverRef.current.position.copy(portalAnimation.from);
          moverRef.current.position.y =
            portalAnimation.from.y + liftProgress * 1.42;
          moverRef.current.scale.setScalar(THREE.MathUtils.lerp(1, 0.08, enterProgress));
        } else {
          moverRef.current.position.copy(portalAnimation.to);
          moverRef.current.position.y =
            portalAnimation.to.y + (1 - fallProgress) * 2.35;
          moverRef.current.scale.setScalar(
            progress < 0.62
              ? 0.08
              : THREE.MathUtils.lerp(0.3, 1, fallProgress),
          );
        }

        moverRef.current.visible = visibleAvatar;

        if (portalRef.current) {
          const holePosition = sourceHoleVisible
            ? portalAnimation.from
            : portalAnimation.to;
          const holeOpacity = sourceHoleVisible
            ? Math.sin(THREE.MathUtils.clamp(progress / 0.54, 0, 1) * Math.PI)
            : destinationHoleVisible
              ? Math.sin(
                  THREE.MathUtils.clamp((progress - 0.5) / 0.46, 0, 1) *
                    Math.PI,
                )
              : 0;

          portalRef.current.visible = holeOpacity > 0.01;
          portalRef.current.position.set(holePosition.x, holePosition.y + 1.92, holePosition.z);
          portalRef.current.rotation.y += delta * 2.8;
          portalRef.current.scale.setScalar(0.62 + holeOpacity * 0.78);

          if (portalDiskRef.current) {
            portalDiskRef.current.opacity = holeOpacity * 0.88;
          }

          if (portalRingRef.current) {
            portalRingRef.current.opacity = holeOpacity;
          }
        }

        if (progress >= 1) {
          moverRef.current.position.copy(portalAnimation.to);
          moverRef.current.scale.setScalar(1);
          moverRef.current.visible = true;
          portalAnimationRef.current = null;

          if (portalRef.current) {
            portalRef.current.visible = false;
          }
        }
      } else if (walkAnimation) {
        const previousPosition = moverRef.current.position.clone();

        walkAnimation.elapsed += delta;
        moverRef.current.position.copy(
          sampleWalk(
            walkAnimation,
            walkAnimation.elapsed / walkAnimation.duration,
          ),
        );
        moverRef.current.scale.setScalar(1);
        moverRef.current.visible = true;

        const movementDirection = moverRef.current.position
          .clone()
          .sub(previousPosition);

        if (movementDirection.lengthSq() > 0.0001) {
          facingYRef.current = Math.atan2(
            movementDirection.x,
            movementDirection.z,
          );
        }

        if (walkAnimation.elapsed >= walkAnimation.duration) {
          moverRef.current.position.copy(destination);
          walkAnimationRef.current = null;
        }
      } else {
        const interpolation = 1 - Math.exp(-4.2 * delta);
        moverRef.current.position.lerp(destination, interpolation);
        moverRef.current.scale.setScalar(1);
        moverRef.current.visible = true;
      }
    }

    if (petRef.current) {
      const isMoving =
        walkAnimationRef.current !== null || portalAnimationRef.current !== null;
      const walkBounce = isMoving
        ? Math.abs(Math.sin(clock.elapsedTime * 12)) * 0.075
        : Math.sin(clock.elapsedTime * 2) * 0.04;

      petRef.current.position.y = walkBounce;
      petRef.current.rotation.y =
        facingYRef.current + Math.sin(clock.elapsedTime) * 0.045;
    }

    const pulse = 1 + Math.sin(clock.elapsedTime * 2.5) * 0.12;

    if (beaconRef.current) {
      beaconRef.current.position.y = 2.4 + Math.sin(clock.elapsedTime * 2) * 0.08;
      beaconRef.current.scale.setScalar(pulse);
    }

    if (haloRef.current) {
      haloRef.current.scale.set(pulse, pulse, pulse);
    }

    if (walkAnimationRef.current || portalAnimationRef.current) {
      invalidate();
    }
  });

  return (
    <>
      <group ref={portalRef} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.94, 48]} />
          <meshBasicMaterial
            ref={portalDiskRef}
            color="#05050a"
            depthWrite={false}
            transparent
            opacity={0}
          />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.78, 1.14, 64]} />
          <meshBasicMaterial
            ref={portalRingRef}
            color="#c8a1ff"
            depthWrite={false}
            transparent
            opacity={0}
          />
        </mesh>
      </group>

      <group ref={moverRef} position={initialPosition}>
      {showNameLabel ? (
      <Html
        center
        distanceFactor={34}
        occlude={false}
        pointerEvents="none"
        position={[0, 2.75, 0]}
        zIndexRange={[20, 0]}
      >
        <span
          className={
            active
              ? "pet-marker-label pet-marker-label-active"
              : "pet-marker-label"
          }
          style={{ background: markerColor, color: "#171410" }}
        >
          {label.trim() || "Jucător"}
        </span>
      </Html>
      ) : null}

      <AvatarCoinBursts playerId={playerId} />

      <mesh
        ref={haloRef}
        position={[0, 0.035, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.62, 0.82, 48]} />
        <meshBasicMaterial
          color={markerColor}
          transparent
          opacity={active ? 0.9 : 0.58}
        />
      </mesh>

      <mesh ref={beaconRef} position={[0, 2.4, 0]}>
        <sphereGeometry args={[0.3, 22, 22]} />
        <meshBasicMaterial color={markerColor} depthTest={false} />
      </mesh>

      <mesh position={[0, 1.42, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 2.25, 12]} />
        <meshBasicMaterial
          color={markerColor}
          depthTest={false}
          transparent
          opacity={active ? 0.78 : 0.42}
        />
      </mesh>

      <group
        ref={petRef}
        scale={avatarConfig.modelScale}
        rotation={[0, Math.PI, 0]}
      >
        <primitive object={avatarScene} />
      </group>
    </group>
    </>
  );
}

avatarModelUrls.forEach((url) => {
  useGLTF.preload(url);
});
