import type { RefObject } from "react";
import { createDicePipMarkers, getDiceFaceValue } from "./dicePips";

export function DiceFace({
  ariaLabel,
  className = "",
  faceRef,
  multiplier = 1,
  value,
}: {
  ariaLabel: string;
  className?: string;
  faceRef?: RefObject<HTMLDivElement | null>;
  multiplier?: number;
  value: number;
}) {
  const faceValue = getDiceFaceValue(value, multiplier);
  const pips = createDicePipMarkers(faceValue);
  const boosted = multiplier > 1;

  return (
    <div
      ref={faceRef}
      className={[
        "dice-face-large",
        boosted ? "dice-face-boosted" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={ariaLabel}
    >
      {pips.map((pip) => (
        <span key={pip.key} className={pip.className} style={pip.style} />
      ))}
      {boosted ? <span className="dice-multiplier-badge">x2</span> : null}
    </div>
  );
}
