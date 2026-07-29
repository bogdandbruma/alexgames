import {
  isActionShopItem,
  type ShopItemId,
} from "./shop";
import type { GamePlayer, AiGameSnapshot } from "./store/types";
import {
  getAffordableShopItems,
  hasRolledThisTurn,
  playerHasUsableActionItem,
  shouldDeferTurnEndForActionItems,
} from "./store/helpers";

const PRE_ROLL_ITEM_ORDER: ShopItemId[] = ["dice-x2", "coins-x3"];

export function shopItemNeedsTarget(itemId: ShopItemId): boolean {
  switch (itemId) {
    case "claw":
    case "pistol":
    case "swap-arrow":
      return true;
    case "bomb":
    case "coins-x3":
    case "cosmic-key":
    case "dice-x2":
    case "star":
    case "trivia-cancel":
      return false;
    default: {
      const exhaustiveCheck: never = itemId;
      return exhaustiveCheck;
    }
  }
}

export function getAiPreRollItems(inventory: ShopItemId[]): ShopItemId[] {
  return PRE_ROLL_ITEM_ORDER.filter((itemId) => inventory.includes(itemId));
}

export type AiActionItemPick = {
  itemId: ShopItemId;
  targetPlayerId?: string;
};

export function pickAiActionItem(
  inventory: ShopItemId[],
  players: GamePlayer[],
  currentPlayerId: string,
  random: () => number,
): AiActionItemPick | null {
  const actionItems = inventory.filter(isActionShopItem);

  if (actionItems.length === 0) {
    return null;
  }

  const index = Math.floor(random() * actionItems.length);
  const itemId = actionItems[index];

  if (!itemId) {
    return null;
  }

  if (!shopItemNeedsTarget(itemId)) {
    return { itemId };
  }

  const targets = players.filter(({ id }) => id !== currentPlayerId);

  if (targets.length === 0) {
    return null;
  }

  const targetIndex = Math.floor(random() * targets.length);
  const target = targets[targetIndex];

  if (!target) {
    return null;
  }

  return { itemId, targetPlayerId: target.id };
}

export function isAiPlayBlocked(state: AiGameSnapshot): boolean {
  return (
    state.pendingMystery !== null ||
    state.pendingPortal !== null ||
    state.pendingShop !== null ||
    state.pendingTrivia !== null ||
    state.rolling ||
    state.activePlayerWalk !== null
  );
}

export function isAiPreRollTurn(state: AiGameSnapshot): boolean {
  const player = state.players[state.currentPlayerIndex];

  return (
    state.phase === "playing" &&
    player?.controller === "ai" &&
    !isAiPlayBlocked(state) &&
    state.diceValue === null &&
    !state.diceAnimating
  );
}

export function isAiPostRollActionTurn(state: AiGameSnapshot): boolean {
  const player = state.players[state.currentPlayerIndex];

  return (
    state.phase === "playing" &&
    player?.controller === "ai" &&
    !player.trapped &&
    !isAiPlayBlocked(state) &&
    hasRolledThisTurn(state) &&
    !state.actionItemUsedThisTurn &&
    playerHasUsableActionItem(player)
  );
}

export function canAiAutoEndTurn(state: AiGameSnapshot): boolean {
  const player = state.players[state.currentPlayerIndex];

  if (
    state.phase !== "playing" ||
    state.rolling ||
    state.diceAnimating ||
    !player ||
    player.controller !== "ai" ||
    isAiPlayBlocked(state)
  ) {
    return false;
  }

  if (!hasRolledThisTurn(state)) {
    return false;
  }

  if (shouldDeferTurnEndForActionItems(state)) {
    return false;
  }

  return true;
}

export function getAffordableShopItemIdsForPlayer(
  state: AiGameSnapshot,
  playerId: string,
): ShopItemId[] {
  const player = state.players.find(({ id }) => id === playerId);

  if (!player) {
    return [];
  }

  return getAffordableShopItems(player, state.shopStock).map(({ id }) => id);
}
