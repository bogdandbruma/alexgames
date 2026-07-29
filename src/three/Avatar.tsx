import { Html, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Vector3Tuple } from "../game/board";
import type { AvatarId } from "../game/store";

const avatarUrls: Record<AvatarId, string> = {
  cat: "/models/pets/cat.glb",
  dog: "/models/pets/dog.glb",
  bunny: "/models/pets/bunny.glb",
};

type AvatarProps = {
  active: boolean;
  avatarId: AvatarId;
  label: string;
  markerColor: string;
  targetPosition: Vector3Tuple;
};

export function Avatar({
  active,
  avatarId,
  label,
  markerColor,
  targetPosition,
}: AvatarProps) {
  const model = useGLTF(avatarUrls[avatarId]);
  const avatarScene = useMemo(() => cloneSkeleton(model.scene), [model.scene]);
  const moverRef = useRef<THREE.Group>(null);
  const petRef = useRef<THREE.Group>(null);
  const beaconRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
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

  useFrame(({ clock }, delta) => {
    if (moverRef.current) {
      const interpolation = 1 - Math.exp(-2.3 * delta);
      moverRef.current.position.lerp(destination, interpolation);
    }

    if (petRef.current) {
      petRef.current.position.y = Math.sin(clock.elapsedTime * 2) * 0.06;
      petRef.current.rotation.y = Math.sin(clock.elapsedTime) * 0.08;
    }

    const pulse = 1 + Math.sin(clock.elapsedTime * 2.5) * 0.12;

    if (beaconRef.current) {
      beaconRef.current.position.y = 2.4 + Math.sin(clock.elapsedTime * 2) * 0.08;
      beaconRef.current.scale.setScalar(pulse);
    }

    if (haloRef.current) {
      haloRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group ref={moverRef} position={initialPosition}>
      <Html
        center
        className="pet-marker-label"
        distanceFactor={8}
        occlude={false}
        position={[0, 2.75, 0]}
        style={{
          background: markerColor,
          transform: active ? "scale(1)" : "scale(0.92)",
        }}
      >
        {label}
      </Html>

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

      <group ref={petRef} scale={0.55} rotation={[0, Math.PI, 0]}>
        <primitive object={avatarScene} />
      </group>
    </group>
  );
}

Object.values(avatarUrls).forEach((url) => {
  useGLTF.preload(url);
});
