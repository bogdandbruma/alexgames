import { describe, expect, test } from "vitest";
import {
  WALK_MAX_DURATION_S,
  WALK_MIN_DURATION_S,
} from "./movementConstants";
import {
  getWalkDurationMsBetweenRooms,
  getWalkDurationSecondsFromPathLength,
  getWalkPathLengthBetweenRooms,
} from "./movementTiming";

describe("getWalkDurationSecondsFromPathLength", () => {
  test("returns zero for negligible paths", () => {
    expect(getWalkDurationSecondsFromPathLength(0)).toBe(0);
    expect(getWalkDurationSecondsFromPathLength(0.02)).toBe(0);
  });

  test("clamps to configured walk bounds", () => {
    expect(getWalkDurationSecondsFromPathLength(1)).toBe(WALK_MIN_DURATION_S);
    expect(getWalkDurationSecondsFromPathLength(500)).toBe(WALK_MAX_DURATION_S);
  });
});

describe("getWalkDurationMsBetweenRooms", () => {
  test("returns zero when staying in the same room", () => {
    expect(getWalkDurationMsBetweenRooms(4, 4)).toBe(0);
  });

  test("uses one capped duration for multi-room dice moves, not per-step stacking", () => {
    const oneStepMs = getWalkDurationMsBetweenRooms(1, 2);
    const fiveStepMs = getWalkDurationMsBetweenRooms(1, 6);
    const legacyFiveStepMs = 5 * 1_560 + 1_560;

    expect(oneStepMs).toBeGreaterThan(0);
    expect(fiveStepMs).toBeLessThan(legacyFiveStepMs);
    expect(fiveStepMs).toBeLessThanOrEqual(WALK_MAX_DURATION_S * 1_000);
  });

  test("matches path length helper for adjacent rooms", () => {
    const pathLength = getWalkPathLengthBetweenRooms(10, 11);

    expect(pathLength).toBeGreaterThan(0);
    expect(getWalkDurationMsBetweenRooms(10, 11)).toBe(
      Math.round(getWalkDurationSecondsFromPathLength(pathLength) * 1_000),
    );
  });
});
