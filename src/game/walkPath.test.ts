import { describe, expect, test } from "vitest";
import {
  buildWalkPathBetweenRooms,
  getWalkProgress,
  getWalkSamplePosition,
  sampleWalkPath,
} from "./walkPath";

describe("walkPath", () => {
  test("starts at the path origin and ends at the destination", () => {
    const path = buildWalkPathBetweenRooms(1, 3);

    expect(path.length).toBeGreaterThan(1);
    expect(sampleWalkPath(path, 0)).toEqual(path[0]);
    expect(sampleWalkPath(path, 1)).toEqual(path[path.length - 1]);
  });

  test("interpolates along a multi-room dice move", () => {
    const start = getWalkSamplePosition(1, 6, 0);
    const mid = getWalkSamplePosition(1, 6, 0.5);
    const end = getWalkSamplePosition(1, 6, 1);

    expect(mid[0]).not.toBe(start[0]);
    expect(mid[0]).not.toBe(end[0]);
  });

  test("clamps walk progress to 0..1", () => {
    expect(getWalkProgress(1_000, 2_000, 500)).toBe(0);
    expect(getWalkProgress(1_000, 2_000, 2_000)).toBe(0.5);
    expect(getWalkProgress(1_000, 2_000, 4_000)).toBe(1);
  });
});
