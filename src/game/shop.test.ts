import { describe, expect, test } from "vitest";
import { getShopItemById, shopItems } from "./shop";

describe("space board shop catalog", () => {
  test("loads the nine configured shop items from one catalog", () => {
    expect(shopItems.map((item) => [item.id, item.cost])).toEqual([
      ["pistol", 1],
      ["dice-x2", 5],
      ["coins-x3", 5],
      ["trivia-cancel", 3],
      ["claw", 9],
      ["bomb", 6],
      ["star", 7],
      ["cosmic-key", 6],
      ["swap-arrow", 14],
    ]);
  });

  test("returns catalog items by id", () => {
    expect(getShopItemById("star")).toMatchObject({
      id: "star",
      cost: 7,
      effectKey: "star",
    });
  });
});
