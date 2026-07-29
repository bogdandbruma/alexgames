import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import type { Vector3Tuple } from "../game/board";
import {
  FIREWORK_LETTER_CELL,
  FIREWORK_LETTER_WIDTH,
  getLetterDots,
  normalizeNameForFireworks,
} from "./victoryFireworkFont";

const FIREWORK_COLORS = [
  "#2f6bff",
  "#ffd84a",
  "#ff3f34",
  "#34d058",
] as const;

export type FireworkVariant = "classic" | "ring" | "glitter" | "willow";

function seededRandom(seed: number) {
  let value = seed;

  return () => {
    value = (value * 16_807) % 2_147_483_647;

    return (value - 1) / 2_147_483_646;
  };
}

function easeInOut(value: number) {
  const clampedValue = THREE.MathUtils.clamp(value, 0, 1);

  return clampedValue * clampedValue * (3 - 2 * clampedValue);
}

function buildBurstOffsets(
  seed: number,
  count: number,
  variant: FireworkVariant,
): Float32Array {
  const random = seededRandom(seed);
  const positions = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const angle = random() * Math.PI * 2;
    let radius: number;
    let lift: number;

    switch (variant) {
      case "ring":
        radius = THREE.MathUtils.lerp(0.95, 1.45, random());
        lift = THREE.MathUtils.lerp(-0.08, 0.08, random());
        break;
      case "glitter":
        radius = THREE.MathUtils.lerp(0.15, 1.85, random());
        lift = THREE.MathUtils.lerp(-0.95, 1.15, random());
        break;
      case "willow":
        radius = THREE.MathUtils.lerp(0.55, 1.25, random());
        lift = THREE.MathUtils.lerp(-1.35, 0.35, random());
        break;
      default:
        radius = THREE.MathUtils.lerp(0.72, 1.55, random());
        lift = THREE.MathUtils.lerp(-0.55, 0.95, random());
        break;
    }

    const i3 = index * 3;
    positions[i3] = Math.cos(angle) * radius;
    positions[i3 + 1] = lift;
    positions[i3 + 2] = Math.sin(angle) * radius;
  }

  return positions;
}

export function FireworkBurst({
  color,
  delay,
  position,
  cycle = 1.55,
  variant = "classic",
  intensity = 1,
  particleCount = 118,
  loop = true,
  startAt,
}: {
  color: string;
  delay: number;
  position: Vector3Tuple;
  cycle?: number;
  variant?: FireworkVariant;
  intensity?: number;
  particleCount?: number;
  loop?: boolean;
  startAt?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const startedAtRef = useRef(performance.now() / 1_000);
  const seed = Math.round(position[0] * 17 + position[2] * 31 + delay * 100);

  const geometry = useMemo(() => {
    const burstGeometry = new THREE.BufferGeometry();
    burstGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        buildBurstOffsets(seed, particleCount, variant),
        3,
      ),
    );

    return burstGeometry;
  }, [particleCount, seed, variant]);

  useFrame(() => {
    const elapsed = performance.now() / 1_000 - startedAtRef.current;
    let progress: number;

    if (startAt !== undefined) {
      const local = elapsed - startAt;
      if (local < 0 || local > cycle) {
        if (groupRef.current) {
          groupRef.current.visible = false;
        }
        if (materialRef.current) {
          materialRef.current.opacity = 0;
        }
        if (lightRef.current) {
          lightRef.current.intensity = 0;
        }
        return;
      }

      if (groupRef.current) {
        groupRef.current.visible = true;
      }
      progress = local / cycle;
    } else if (loop) {
      progress = ((elapsed + delay) % cycle) / cycle;
    } else {
      const local = elapsed - delay;
      if (local < 0 || local > cycle) {
        if (materialRef.current) {
          materialRef.current.opacity = 0;
        }
        if (lightRef.current) {
          lightRef.current.intensity = 0;
        }
        return;
      }
      progress = local / cycle;
    }

    const burst = easeInOut(progress);
    const peak = Math.sin(progress * Math.PI);
    const opacity =
      progress < 0.9 ? THREE.MathUtils.clamp(peak * 1.15 * intensity, 0, 1) : 0;

    if (groupRef.current) {
      const scale =
        variant === "willow"
          ? 1.4 + burst * 7.2
          : variant === "ring"
            ? 1.1 + burst * 6.4
            : 1.35 + burst * 6.8;
      groupRef.current.scale.setScalar(scale);
      groupRef.current.rotation.y += 0.012;
    }

    if (materialRef.current) {
      materialRef.current.opacity = opacity;
      materialRef.current.size =
        (variant === "glitter" ? 0.28 : 0.38) + (1 - progress) * 0.32;
    }

    if (lightRef.current) {
      lightRef.current.intensity = peak * 42 * intensity;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <pointLight
        ref={lightRef}
        color={color}
        distance={28}
        intensity={0}
      />
      <points geometry={geometry}>
        <pointsMaterial
          ref={materialRef}
          blending={THREE.AdditiveBlending}
          color={color}
          depthWrite={false}
          opacity={0}
          size={0.46}
          sizeAttenuation
          transparent
        />
      </points>
    </group>
  );
}

function FireworkLetter({
  char,
  color,
  position,
  phaseOffset,
  scale = 1,
  startedAtRef,
}: {
  char: string;
  color: string;
  position: Vector3Tuple;
  phaseOffset: number;
  scale?: number;
  startedAtRef: MutableRefObject<number>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const letterDuration = 1.05;

  const { geometry, sparkCount } = useMemo(() => {
    const dots = getLetterDots(char);
    const random = seededRandom(char.charCodeAt(0) * 97 + Math.round(position[0]));
    const positions: number[] = [];
    const cell = FIREWORK_LETTER_CELL * scale;

    for (const [dx, dy] of dots) {
      const jitterX = (random() - 0.5) * 0.12;
      const jitterY = (random() - 0.5) * 0.12;
      positions.push(dx * cell + jitterX, dy * cell + jitterY, (random() - 0.5) * 0.2);

      if (random() > 0.55) {
        positions.push(
          dx * cell + (random() - 0.5) * 0.35,
          dy * cell + (random() - 0.5) * 0.35,
          (random() - 0.5) * 0.35,
        );
      }
    }

    const letterGeometry = new THREE.BufferGeometry();
    letterGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );

    return { geometry: letterGeometry, sparkCount: positions.length / 3 };
  }, [char, position, scale]);

  useFrame(() => {
    const elapsed = performance.now() / 1_000 - startedAtRef.current;
    const local = elapsed - phaseOffset;

    if (local < 0 || local > letterDuration + 0.15) {
      if (groupRef.current) {
        groupRef.current.visible = false;
      }
      if (lightRef.current) {
        lightRef.current.intensity = 0;
      }
      return;
    }

    if (groupRef.current) {
      groupRef.current.visible = true;
    }

    const progress = THREE.MathUtils.clamp(local / letterDuration, 0, 1);
    const launch = easeInOut(Math.min(progress / 0.38, 1));
    const hold = progress > 0.32 && progress < 0.78 ? 1 : 0;
    const fade = progress > 0.72 ? 1 - easeInOut((progress - 0.72) / 0.28) : 1;
    const burstScale = 0.25 + launch * 0.75 + hold * 0.15;
    const opacity = THREE.MathUtils.clamp(
      (launch * 0.35 + hold * 0.95) * fade,
      0,
      1,
    );
    const shimmer = 0.88 + Math.sin(local * 22) * 0.12;

    if (groupRef.current) {
      groupRef.current.scale.setScalar(burstScale * (1 + hold * 0.08));
      groupRef.current.rotation.y = Math.sin(local * 1.4) * 0.04;
    }

    if (materialRef.current) {
      materialRef.current.opacity = opacity * shimmer;
      materialRef.current.size = 0.52 + hold * 0.22;
    }

    if (lightRef.current) {
      lightRef.current.intensity = (opacity * 55 + hold * 25) * shimmer;
    }
  });

  return (
    <group ref={groupRef} position={position} visible={false}>
      <pointLight ref={lightRef} color={color} distance={22} intensity={0} />
      <points geometry={geometry}>
        <pointsMaterial
          ref={materialRef}
          blending={THREE.AdditiveBlending}
          color={color}
          depthWrite={false}
          opacity={0}
          size={0.58}
          sizeAttenuation
          transparent
        />
      </points>
      {sparkCount > 0 ? (
        <FireworkBurst
          color={color}
          cycle={1.2}
          delay={phaseOffset % 1.1}
          intensity={1.35}
          particleCount={72}
          position={[0, 0.2, 0]}
          variant="glitter"
        />
      ) : null}
    </group>
  );
}

const AMBIENT_SPECS: Array<{
  offset: Vector3Tuple;
  delay: number;
  variant: FireworkVariant;
  colorIndex: number;
}> = [
  { offset: [16, 23, -18], delay: 0, variant: "classic", colorIndex: 0 },
  { offset: [26, 27, -6], delay: 0.35, variant: "ring", colorIndex: 3 },
  { offset: [8, 25, -28], delay: 0.65, variant: "willow", colorIndex: 1 },
  { offset: [32, 30, -22], delay: 0.2, variant: "glitter", colorIndex: 5 },
  { offset: [4, 28, -12], delay: 0.85, variant: "classic", colorIndex: 6 },
  { offset: [22, 21, -32], delay: 1.05, variant: "ring", colorIndex: 2 },
  { offset: [38, 26, -14], delay: 0.5, variant: "willow", colorIndex: 4 },
  { offset: [12, 32, -8], delay: 1.2, variant: "glitter", colorIndex: 7 },
  { offset: [28, 22, -26], delay: 0.15, variant: "classic", colorIndex: 8 },
  { offset: [18, 34, -20], delay: 0.95, variant: "ring", colorIndex: 9 },
  { offset: [42, 24, -10], delay: 0.45, variant: "glitter", colorIndex: 1 },
  { offset: [6, 20, -34], delay: 1.15, variant: "willow", colorIndex: 3 },
];

const LETTER_START_SECONDS = 3.1;
const LETTER_INTERVAL = 1.02;

export function VictoryFireworksShow({
  anchorPosition,
  playerName,
}: {
  anchorPosition: Vector3Tuple;
  playerName: string;
}) {
  const startedAtRef = useRef(performance.now() / 1_000);
  const displayName = useMemo(
    () => normalizeNameForFireworks(playerName),
    [playerName],
  );
  const letters = useMemo(() => [...displayName], [displayName]);
  const compactLetters = useMemo(
    () => letters.filter((char) => char !== " "),
    [letters],
  );

  const letterBaseY = anchorPosition[1] + 24;
  const letterBaseZ = anchorPosition[2] - 16;
  const finaleStart =
    LETTER_START_SECONDS + compactLetters.length * LETTER_INTERVAL + 0.55;
  const finaleWidth =
    compactLetters.length * FIREWORK_LETTER_WIDTH * 0.72;

  let compactIndex = -1;

  return (
    <group>
      {AMBIENT_SPECS.map((spec, index) => (
        <FireworkBurst
          key={`ambient-${index}`}
          color={FIREWORK_COLORS[spec.colorIndex % FIREWORK_COLORS.length]}
          cycle={1.35 + (index % 4) * 0.12}
          delay={spec.delay}
          intensity={1.25}
          particleCount={index % 3 === 0 ? 140 : 110}
          position={[
            anchorPosition[0] + spec.offset[0],
            spec.offset[1],
            anchorPosition[2] + spec.offset[2],
          ]}
          variant={spec.variant}
        />
      ))}

      {letters.map((char, index) => {
        if (char === " ") {
          return null;
        }

        compactIndex += 1;
        const slot = compactIndex;
        const color = FIREWORK_COLORS[slot % FIREWORK_COLORS.length];
        const x =
          anchorPosition[0] -
          ((compactLetters.length - 1) * FIREWORK_LETTER_WIDTH) / 2 +
          slot * FIREWORK_LETTER_WIDTH;

        return (
          <FireworkLetter
            key={`letter-${char}-${slot}-${index}`}
            char={char}
            color={color}
            phaseOffset={LETTER_START_SECONDS + slot * LETTER_INTERVAL}
            position={[x, letterBaseY, letterBaseZ]}
            startedAtRef={startedAtRef}
          />
        );
      })}

      {compactLetters.map((char, slot) => {
        const color = FIREWORK_COLORS[(slot + 2) % FIREWORK_COLORS.length];
        const x =
          anchorPosition[0] -
          finaleWidth / 2 +
          slot * FIREWORK_LETTER_WIDTH * 0.72;

        return [0, 1, 2].map((repeat) => (
          <FireworkLetter
            key={`finale-${char}-${slot}-${repeat}`}
            char={char}
            color={color}
            phaseOffset={finaleStart + repeat * 2.65}
            position={[x, letterBaseY + 3.5, letterBaseZ - 4]}
            scale={0.92}
            startedAtRef={startedAtRef}
          />
        ));
      })}

      {[0, 1, 2].flatMap((repeat) => [
        <FireworkBurst
          key={`finale-burst-center-${repeat}`}
          color={FIREWORK_COLORS[1]}
          cycle={1.1}
          delay={0}
          intensity={1.6}
          loop={false}
          particleCount={160}
          position={[anchorPosition[0], letterBaseY + 4, letterBaseZ - 3]}
          startAt={finaleStart + repeat * 2.65}
          variant="ring"
        />,
        <FireworkBurst
          key={`finale-burst-left-${repeat}`}
          color={FIREWORK_COLORS[2]}
          cycle={1.25}
          delay={0}
          intensity={1.5}
          loop={false}
          particleCount={150}
          position={[
            anchorPosition[0] - finaleWidth * 0.35,
            letterBaseY + 5,
            letterBaseZ - 2,
          ]}
          startAt={finaleStart + 0.25 + repeat * 2.65}
          variant="willow"
        />,
        <FireworkBurst
          key={`finale-burst-right-${repeat}`}
          color={FIREWORK_COLORS[3]}
          cycle={1.15}
          delay={0}
          intensity={1.5}
          loop={false}
          particleCount={150}
          position={[
            anchorPosition[0] + finaleWidth * 0.35,
            letterBaseY + 5,
            letterBaseZ - 2,
          ]}
          startAt={finaleStart + 0.45 + repeat * 2.65}
          variant="glitter"
        />,
        <FireworkBurst
          key={`finale-burst-high-${repeat}`}
          color={FIREWORK_COLORS[0]}
          cycle={1.2}
          delay={0}
          intensity={1.45}
          loop={false}
          particleCount={148}
          position={[anchorPosition[0], letterBaseY + 7, letterBaseZ - 5]}
          startAt={finaleStart + 0.65 + repeat * 2.65}
          variant="classic"
        />,
      ])}
    </group>
  );
}
