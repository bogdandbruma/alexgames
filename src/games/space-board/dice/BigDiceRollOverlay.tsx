import { useEffect, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import { DiceCube } from "./DiceCube";

export function BigDiceRollOverlay({
  rolling,
  targetFaceRef,
  multiplier,
  value,
}: {
  rolling: boolean;
  targetFaceRef: RefObject<HTMLDivElement | null>;
  multiplier: number;
  value: number | null;
}) {
  const overlayFaceRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [flyingHome, setFlyingHome] = useState(false);
  const [rollingFrame, setRollingFrame] = useState(1);
  const [flyStyle, setFlyStyle] = useState<CSSProperties>({});
  const visibleValue = rolling
    ? rollingFrame * multiplier
    : (value ?? rollingFrame);

  useEffect(() => {
    if (!rolling) {
      return;
    }

    const rollingValues = [1, 5, 2, 6, 3, 4];
    let frameIndex = 0;

    setVisible(true);
    setFlyingHome(false);
    setFlyStyle({});
    setRollingFrame(rollingValues[frameIndex]);

    const frameTimer = window.setInterval(() => {
      frameIndex = (frameIndex + 1) % rollingValues.length;
      setRollingFrame(rollingValues[frameIndex]);
    }, 120);

    return () => window.clearInterval(frameTimer);
  }, [rolling]);

  useEffect(() => {
    if (rolling || !visible) {
      return;
    }

    if (value == null) {
      setVisible(false);
      return;
    }

    setRollingFrame(value);

    const flyTimer = window.setTimeout(() => {
      const overlayRect = overlayFaceRef.current?.getBoundingClientRect();
      const targetRect = targetFaceRef.current?.getBoundingClientRect();

      if (overlayRect && targetRect) {
        const overlayCenterX = overlayRect.left + overlayRect.width / 2;
        const overlayCenterY = overlayRect.top + overlayRect.height / 2;
        const targetCenterX = targetRect.left + targetRect.width / 2;
        const targetCenterY = targetRect.top + targetRect.height / 2;

        setFlyStyle({
          "--dice-fly-x": `${targetCenterX - overlayCenterX}px`,
          "--dice-fly-y": `${targetCenterY - overlayCenterY}px`,
          "--dice-fly-scale": `${targetRect.width / overlayRect.width}`,
        } as CSSProperties);
      }

      setFlyingHome(true);
    }, 2_000);
    const hideTimer = window.setTimeout(() => setVisible(false), 2_920);

    return () => {
      window.clearTimeout(flyTimer);
      window.clearTimeout(hideTimer);
    };
  }, [rolling, targetFaceRef, value, visible]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className={
        flyingHome
          ? "dice-roll-overlay dice-roll-overlay-fly-home"
          : rolling
            ? "dice-roll-overlay dice-roll-overlay-rolling"
            : "dice-roll-overlay dice-roll-overlay-revealed"
      }
      style={flyStyle}
      aria-live="polite"
    >
      <DiceCube
        cubeRef={overlayFaceRef}
        multiplier={multiplier}
        rolling={rolling}
        ariaLabel={
          rolling ? "Zarul mare se invarte" : `Zarul a picat ${visibleValue}`
        }
        value={visibleValue}
      />
    </div>
  );
}
