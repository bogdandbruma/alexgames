import type { CSSProperties } from "react";
import { getDicePips } from "../../../game/dice";

export type DicePipMarker = {
  key: string;
  className: string;
  style?: CSSProperties;
};

export function createDicePipMarkers(value: number): DicePipMarker[] {
  const standardPips = getDicePips(value);

  if (standardPips.length > 0) {
    return standardPips.map((pip) => ({
      key: pip,
      className: `dice-pip dice-pip-${pip}`,
    }));
  }

  const pipCount = Math.max(1, Math.min(value, 12));
  const columns = pipCount > 9 ? 4 : 3;
  const rows = Math.ceil(pipCount / columns);
  const xStep = columns === 4 ? 16.5 : 20;
  const yStep = rows >= 4 ? 16 : 18;

  return Array.from({ length: pipCount }, (_, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;

    return {
      key: `dense-${index}`,
      className: "dice-pip dice-pip-dense",
      style: {
        "--pip-x": `${50 + (column - (columns - 1) / 2) * xStep}%`,
        "--pip-y": `${50 + (row - (rows - 1) / 2) * yStep}%`,
      } as CSSProperties,
    };
  });
}

export function getDiceFaceValue(value: number, multiplier: number) {
  return multiplier > 1
    ? Math.max(1, Math.min(6, Math.round(value / multiplier)))
    : value;
}
