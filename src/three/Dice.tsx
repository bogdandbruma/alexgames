import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Vector3Tuple } from "../game/board";

type DiceProps = {
  rolling: boolean;
  value: number | null;
  anchorPosition: Vector3Tuple;
};

const createSettledQuaternion = (x: number, y: number, z: number) =>
  new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));

const settledQuaternions: Record<number, THREE.Quaternion> = {
  1: createSettledQuaternion(-Math.PI / 2, 0, 0),
  2: createSettledQuaternion(0, 0, 0),
  3: createSettledQuaternion(0, 0, Math.PI / 2),
  4: createSettledQuaternion(0, 0, -Math.PI / 2),
  5: createSettledQuaternion(Math.PI, 0, 0),
  6: createSettledQuaternion(Math.PI / 2, 0, 0),
};

export function Dice({ rolling, value, anchorPosition }: DiceProps) {
  const containerRef = useRef<THREE.Group>(null);
  const throwRef = useRef<THREE.Group>(null);
  const spinnerRef = useRef<THREE.Group>(null);
  const previousRollingRef = useRef(rolling);
  const rollStartedAtRef = useRef(0);
  const landedAtRef = useRef(-10);

  const destination = useMemo(
    () =>
      new THREE.Vector3(
        anchorPosition[0] + 1.25,
        anchorPosition[1] + 1.55,
        anchorPosition[2] + 1.2,
      ),
    [anchorPosition],
  );

  useFrame(({ clock }, delta) => {
    const elapsedTime = clock.getElapsedTime();

    if (rolling && !previousRollingRef.current) {
      rollStartedAtRef.current = elapsedTime;
    }

    if (!rolling && previousRollingRef.current) {
      landedAtRef.current = elapsedTime;
    }

    previousRollingRef.current = rolling;

    if (containerRef.current) {
      const interpolation = 1 - Math.exp(-3.5 * delta);
      containerRef.current.position.lerp(destination, interpolation);
    }

    if (throwRef.current) {
      if (rolling) {
        const rollTime = elapsedTime - rollStartedAtRef.current;
        const hop = Math.abs(Math.sin(rollTime * Math.PI * 1.575));
        const orbit = rollTime * 2.7;

        throwRef.current.position.x = Math.sin(orbit) * 0.55;
        throwRef.current.position.y = 0.18 + hop * 0.95;
        throwRef.current.position.z = Math.cos(orbit * 0.78) * 0.38;
        throwRef.current.scale.setScalar(1 + hop * 0.08);
      } else {
        const landingTime = elapsedTime - landedAtRef.current;
        const landingBounce =
          landingTime < 1
            ? Math.sin(landingTime * Math.PI) * 0.24
            : 0;
        const interpolation = 1 - Math.exp(-5 * delta);

        throwRef.current.position.x = THREE.MathUtils.lerp(
          throwRef.current.position.x,
          0,
          interpolation,
        );
        throwRef.current.position.y = THREE.MathUtils.lerp(
          throwRef.current.position.y,
          landingBounce,
          interpolation,
        );
        throwRef.current.position.z = THREE.MathUtils.lerp(
          throwRef.current.position.z,
          0,
          interpolation,
        );
        const landingSquash =
          landingTime < 0.56
            ? Math.sin((landingTime / 0.56) * Math.PI) * 0.08
            : 0;
        throwRef.current.scale.set(
          1 + landingSquash,
          1 - landingSquash * 0.7,
          1 + landingSquash,
        );
      }
    }

    if (!spinnerRef.current) {
      return;
    }

    if (rolling) {
      const rollTime = elapsedTime - rollStartedAtRef.current;
      const spinBoost = 1 + Math.sin(rollTime * 9) * 0.18;

      spinnerRef.current.rotation.x += delta * 9 * spinBoost;
      spinnerRef.current.rotation.y += delta * 11.5;
      spinnerRef.current.rotation.z += delta * 7.5;
    } else {
      const settledQuaternion = settledQuaternions[value ?? 2];
      const interpolation = 1 - Math.exp(-3 * delta);
      spinnerRef.current.quaternion.slerp(settledQuaternion, interpolation);
    }
  });

  return (
    <group ref={containerRef} position={destination}>
      <group ref={throwRef}>
        <group ref={spinnerRef}>
          <mesh castShadow>
            <boxGeometry args={[0.9, 0.9, 0.9]} />
            <meshStandardMaterial color="#f8fbf7" roughness={0.45} />
          </mesh>

          <Text position={[0, 0, 0.456]} fontSize={0.32} color="#131313">
            1
          </Text>
          <Text
            position={[0, 0, -0.456]}
            rotation={[0, Math.PI, 0]}
            fontSize={0.32}
            color="#131313"
          >
            6
          </Text>
          <Text
            position={[0.456, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
            fontSize={0.32}
            color="#131313"
          >
            3
          </Text>
          <Text
            position={[-0.456, 0, 0]}
            rotation={[0, -Math.PI / 2, 0]}
            fontSize={0.32}
            color="#131313"
          >
            4
          </Text>
          <Text
            position={[0, 0.456, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.32}
            color="#131313"
          >
            2
          </Text>
          <Text
            position={[0, -0.456, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            fontSize={0.32}
            color="#131313"
          >
            5
          </Text>
        </group>

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.48, 0]}>
          <circleGeometry args={[0.62, 32]} />
          <meshBasicMaterial
            color="#000000"
            transparent
            opacity={rolling ? 0.22 : 0.14}
            depthWrite={false}
          />
        </mesh>

        <Text position={[0, 0.88, 0]} fontSize={0.34} color="#f5f7ef">
          {value ?? "?"}
        </Text>
      </group>
    </group>
  );
}
