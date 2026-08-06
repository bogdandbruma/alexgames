import { describe, expect, test } from "vitest";
import {
  getAiPreRollItems,
  pickAiActionItem,
  pickAiTrapChoice,
  shopItemNeedsTarget,
} from "./aiInventory";
import { trapEscapeCoinCost } from "./rooms";

describe("aiInventory", () => {
  test("orders pre-roll buffs as dice-x2 then coins-x3", () => {
    expect(getAiPreRollItems(["coins-x3", "star", "dice-x2"])).toEqual([
      "dice-x2",
      "coins-x3",
    ]);
  });

  test("flags targeted shop items", () => {
    expect(shopItemNeedsTarget("pistol")).toBe(true);
    expect(shopItemNeedsTarget("star")).toBe(false);
  });

  test("picks trap escape as key, then pay, then stay", () => {
    expect(
      pickAiTrapChoice(
        {
          coins: trapEscapeCoinCost,
          inventory: ["cosmic-key"],
        },
        trapEscapeCoinCost,
      ),
    ).toBe("key");
    expect(
      pickAiTrapChoice(
        {
          coins: trapEscapeCoinCost,
          inventory: [],
        },
        trapEscapeCoinCost,
      ),
    ).toBe("pay");
    expect(
      pickAiTrapChoice(
        {
          coins: trapEscapeCoinCost - 1,
          inventory: [],
        },
        trapEscapeCoinCost,
      ),
    ).toBe("stay");
  });

  test("picks a random action item with a target when needed", () => {
    const pick = pickAiActionItem(
      ["dice-x2", "pistol"],
      [
        {
          id: "ai",
          name: "Robot",
          avatarId: "dog",
          controller: "ai",
          positionIndex: 0,
          coins: 0,
          lastDice: null,
          trapped: false,
        },
        {
          id: "human",
          name: "Human",
          avatarId: "cat",
          controller: "player",
          positionIndex: 2,
          coins: 0,
          lastDice: null,
          trapped: false,
        },
      ],
      "ai",
      () => 0,
    );

    expect(pick).toEqual({ itemId: "pistol", targetPlayerId: "human" });
  });
});
