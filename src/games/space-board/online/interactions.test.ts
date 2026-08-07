import { describe, expect, test } from "vitest";
import {
  isSpaceBoardUiEventPayload,
  parseSpaceBoardAction,
} from "./payloads";

describe("Space Board interaction action payloads", () => {
  test("parses trivia, mystery, shop, trap, portal, and item-use actions", () => {
    expect(parseSpaceBoardAction({ type: "answerTrivia", answer: "correct" })).toEqual({
      type: "answerTrivia",
      answer: "correct",
    });
    expect(parseSpaceBoardAction({ type: "pickMystery", cardId: "rocket" })).toEqual({
      type: "pickMystery",
      cardId: "rocket",
    });
    expect(parseSpaceBoardAction({ type: "acknowledgeMystery" })).toEqual({
      type: "acknowledgeMystery",
    });
    expect(parseSpaceBoardAction({ type: "buyShopItem", itemId: "dice-x2" })).toEqual({
      type: "buyShopItem",
      itemId: "dice-x2",
    });
    expect(parseSpaceBoardAction({ type: "closeShop" })).toEqual({
      type: "closeShop",
    });
    expect(
      parseSpaceBoardAction({
        type: "useInventoryItem",
        itemId: "pistol",
        targetPlayerId: "p1",
      }),
    ).toEqual({
      type: "useInventoryItem",
      itemId: "pistol",
      targetPlayerId: "p1",
    });
    expect(parseSpaceBoardAction({ type: "resolveTrap", choice: "pay" })).toEqual({
      type: "resolveTrap",
      choice: "pay",
    });
    expect(parseSpaceBoardAction({ type: "acknowledgePortal" })).toEqual({
      type: "acknowledgePortal",
    });
  });

  test("rejects malformed interaction actions", () => {
    expect(parseSpaceBoardAction({ type: "answerTrivia" })).toBeNull();
    expect(parseSpaceBoardAction({ type: "buyShopItem", itemId: "nope" })).toBeNull();
    expect(parseSpaceBoardAction({ type: "resolveTrap", choice: "fly" })).toBeNull();
    expect(parseSpaceBoardAction({ type: "buy" })).toBeNull();
  });

  test("recognizes public item_use ui_event", () => {
    expect(
      isSpaceBoardUiEventPayload({
        type: "item_use",
        playerId: "p0",
        itemId: "dice-x2",
      }),
    ).toBe(true);
    expect(
      isSpaceBoardUiEventPayload({
        type: "item_use",
        playerId: "p0",
        itemId: "claw",
        targetPlayerId: "p1",
      }),
    ).toBe(true);
  });
});
