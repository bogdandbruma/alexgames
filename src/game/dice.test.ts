import { describe, expect, test } from "vitest";
import { getDicePips } from "./dice";

describe("space board dice display", () => {
  test("uses pip layouts for normal dice values", () => {
    expect(getDicePips(6)).toEqual([
      "top-left",
      "top-right",
      "middle-left",
      "middle-right",
      "bottom-left",
      "bottom-right",
    ]);
  });

  test("does not crash pip rendering for doubled dice totals above six", () => {
    expect(getDicePips(8)).toEqual([]);
    expect(getDicePips(10)).toEqual([]);
    expect(getDicePips(12)).toEqual([]);
  });
});
