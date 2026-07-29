import type { RefObject } from "react";
import { DiceFace } from "./DiceFace";

type DiceCubeFace = {
  className: string;
  value: number;
};

const diceCubeFaces: DiceCubeFace[] = [
  { className: "dice-cube-face-front", value: 1 },
  { className: "dice-cube-face-back", value: 6 },
  { className: "dice-cube-face-right", value: 3 },
  { className: "dice-cube-face-left", value: 4 },
  { className: "dice-cube-face-top", value: 2 },
  { className: "dice-cube-face-bottom", value: 5 },
];

export function DiceCube({
  ariaLabel,
  cubeRef,
  multiplier = 1,
  rolling,
  value,
}: {
  ariaLabel: string;
  cubeRef?: RefObject<HTMLDivElement | null>;
  multiplier?: number;
  rolling: boolean;
  value: number;
}) {
  const boosted = multiplier > 1;

  return (
    <div
      ref={cubeRef}
      className={[
        "dice-cube-shell",
        boosted ? "dice-cube-shell-boosted" : "",
        rolling ? "dice-cube-shell-rolling" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={ariaLabel}
    >
      <div className="dice-cube">
        {diceCubeFaces.map((face) => (
          <div
            key={face.className}
            className={`dice-cube-face ${face.className}`}
          >
            <DiceFace
              className="dice-cube-face-plate"
              ariaLabel=""
              multiplier={multiplier}
              value={
                face.className === "dice-cube-face-front"
                  ? value
                  : face.value * multiplier
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
