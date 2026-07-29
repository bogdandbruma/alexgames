import { useEffect, useState } from "react";
import type { RefObject } from "react";
import { DiceFace } from "./DiceFace";

export function DiceTray({
  faceRef,
  multiplier,
  rolling,
  value,
}: {
  faceRef: RefObject<HTMLDivElement | null>;
  multiplier: number;
  rolling: boolean;
  value: number | null;
}) {
  const [rollingFrame, setRollingFrame] = useState(1);
  const visibleValue = rolling ? rollingFrame * multiplier : (value ?? 1);
  const boosted = multiplier > 1;

  useEffect(() => {
    if (!rolling) {
      return;
    }

    const rollingValues = [1, 4, 2, 6, 3, 5];
    let frameIndex = 0;

    setRollingFrame(rollingValues[frameIndex]);

    const frameTimer = window.setInterval(() => {
      frameIndex = (frameIndex + 1) % rollingValues.length;
      setRollingFrame(rollingValues[frameIndex]);
    }, 170);

    return () => window.clearInterval(frameTimer);
  }, [rolling]);

  return (
    <div
      className={boosted ? "dice-tray dice-tray-boosted" : "dice-tray"}
      aria-live="polite"
    >
      <DiceFace
        className={rolling ? "dice-face-rolling" : ""}
        faceRef={faceRef}
        multiplier={multiplier}
        ariaLabel={
          rolling ? "Zarul se invarte" : `Zarul a picat ${visibleValue}`
        }
        value={visibleValue}
      />

      <div className="dice-readout">
        <span>{boosted ? "Total" : "Zar"}</span>
        <strong>{rolling ? "..." : (value ?? "-")}</strong>
      </div>
    </div>
  );
}
