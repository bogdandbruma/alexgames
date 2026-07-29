import { describe, expect, test } from "vitest";
import { AVATAR_STEP_MS } from "./movementConstants";
import { getWalkDurationMs } from "./movementTiming";

describe("getWalkDurationMs", () => {
  test("matches legacy step loop total for five steps", () => {
    const steps = 5;
    const legacy = steps * AVATAR_STEP_MS + AVATAR_STEP_MS;
    expect(getWalkDurationMs(steps)).toBe(legacy);
  });

  test("returns zero when there are no steps", () => {
    expect(getWalkDurationMs(0)).toBe(0);
    expect(getWalkDurationMs(-1)).toBe(0);
  });
});
