import type { AvatarId } from "../../../game/avatars";
import type { MysteryCardId } from "../../../game/mystery";
import type { PlayerCoinBurst } from "../../../game/playerCoinBurst";
import type { TriviaAnswer } from "../../../game/rules";
import {
  type ShopItemId,
  type ShopStock,
  shopItems,
} from "../../../game/shop";
import type { TrapEscapeChoice } from "../../../game/store/pendingEvent";
import type {
  ActivePlayerWalk,
  GameToast,
  GamePhase,
  GamePlayer,
  GamePortalTransition,
  PendingEvent,
  PlayerController,
} from "../../../game/store/types";

export const SPACE_BOARD_GAME_SLUG = "space-board";

export type SpaceBoardSimpleActionType =
  | "roll"
  | "move"
  | "endTurn"
  | "acknowledgeMystery"
  | "closeShop"
  | "acknowledgePortal";

export type SpaceBoardActionPayload =
  | { type: SpaceBoardSimpleActionType }
  | { type: "answerTrivia"; answer: TriviaAnswer }
  | { type: "pickMystery"; cardId: MysteryCardId }
  | { type: "buyShopItem"; itemId: ShopItemId }
  | {
      type: "useInventoryItem";
      itemId: ShopItemId;
      targetPlayerId?: string;
    }
  | { type: "resolveTrap"; choice: TrapEscapeChoice };

export type SpaceBoardActionType = SpaceBoardActionPayload["type"];

export type SpaceBoardPlayerSnapshot = {
  id: string;
  name: string;
  avatarId: AvatarId;
  controller: PlayerController;
  positionIndex: number;
  coins: number;
  lastDice: number | null;
  trapped: boolean;
  inventory?: GamePlayer["inventory"];
  armedCoinsX3?: boolean;
  armedDiceX2?: boolean;
};

export type SpaceBoardStatePayload = {
  phase: GamePhase;
  players: SpaceBoardPlayerSnapshot[];
  currentPlayerIndex: number;
  diceValue: number | null;
  actionItemUsedThisTurn: boolean;
  message: string;
  shopStock: ShopStock;
  winnerId: string | null;
  pendingEvent: PendingEvent;
  activePlayerWalk: ActivePlayerWalk | null;
  diceAnimating: boolean;
  diceMultiplier: number;
  rolling: boolean;
  portalTransition: GamePortalTransition | null;
  playerCoinBursts: PlayerCoinBurst[];
  /** Who this filtered snapshot is for; null = spectator / public view. */
  viewerPlayerId?: string | null;
};

export type SpaceBoardUiEventPayload =
  | {
      type: "dice";
      playerId: string;
      value: number | null;
      animating: boolean;
      durationMs?: number;
    }
  | {
      type: "walk";
      walk: ActivePlayerWalk;
    }
  | {
      type: "portal";
      transition: GamePortalTransition;
    }
  | {
      type: "coin_burst";
      bursts: PlayerCoinBurst[];
    }
  | {
      type: "toast";
      toast: GameToast | null;
    }
  | {
      type: "coins_update";
      players: Array<{
        playerId: string;
        coins: number;
      }>;
    }
  | {
      type: "item_use";
      playerId: string;
      itemId: ShopItemId;
      targetPlayerId?: string;
    };

const SIMPLE_ACTION_TYPES = new Set<SpaceBoardSimpleActionType>([
  "roll",
  "move",
  "endTurn",
  "acknowledgeMystery",
  "closeShop",
  "acknowledgePortal",
]);

const TRIVIA_ANSWERS = new Set<TriviaAnswer>(["correct", "wrong"]);
const TRAP_CHOICES = new Set<TrapEscapeChoice>(["key", "pay", "stay"]);
const SHOP_ITEM_IDS = new Set<ShopItemId>(shopItems.map((item) => item.id));
const MYSTERY_CARD_IDS = new Set<MysteryCardId>([
  "car",
  "phone",
  "card",
  "rocket",
  "wand",
  "magnet",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseSpaceBoardAction(
  payload: unknown,
): SpaceBoardActionPayload | null {
  if (!isRecord(payload) || typeof payload.type !== "string") {
    return null;
  }

  const type = payload.type;

  if (SIMPLE_ACTION_TYPES.has(type as SpaceBoardSimpleActionType)) {
    return { type: type as SpaceBoardSimpleActionType };
  }

  switch (type) {
    case "answerTrivia": {
      const answer = payload.answer;
      if (typeof answer !== "string" || !TRIVIA_ANSWERS.has(answer as TriviaAnswer)) {
        return null;
      }
      return { type, answer: answer as TriviaAnswer };
    }
    case "pickMystery": {
      const cardId = payload.cardId;
      if (
        typeof cardId !== "string" ||
        !MYSTERY_CARD_IDS.has(cardId as MysteryCardId)
      ) {
        return null;
      }
      return { type, cardId: cardId as MysteryCardId };
    }
    case "buyShopItem": {
      const itemId = payload.itemId;
      if (typeof itemId !== "string" || !SHOP_ITEM_IDS.has(itemId as ShopItemId)) {
        return null;
      }
      return { type, itemId: itemId as ShopItemId };
    }
    case "useInventoryItem": {
      const itemId = payload.itemId;
      if (typeof itemId !== "string" || !SHOP_ITEM_IDS.has(itemId as ShopItemId)) {
        return null;
      }
      const targetPlayerId = payload.targetPlayerId;
      if (
        targetPlayerId !== undefined &&
        typeof targetPlayerId !== "string"
      ) {
        return null;
      }
      return {
        type,
        itemId: itemId as ShopItemId,
        ...(typeof targetPlayerId === "string" ? { targetPlayerId } : {}),
      };
    }
    case "resolveTrap": {
      const choice = payload.choice;
      if (
        typeof choice !== "string" ||
        !TRAP_CHOICES.has(choice as TrapEscapeChoice)
      ) {
        return null;
      }
      return { type, choice: choice as TrapEscapeChoice };
    }
    default:
      return null;
  }
}

export function isSpaceBoardStatePayload(
  payload: unknown,
): payload is SpaceBoardStatePayload {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }
  const candidate = payload as Partial<SpaceBoardStatePayload>;
  return (
    typeof candidate.phase === "string" &&
    Array.isArray(candidate.players) &&
    typeof candidate.currentPlayerIndex === "number"
  );
}

export function isSpaceBoardUiEventPayload(
  payload: unknown,
): payload is SpaceBoardUiEventPayload {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }
  const type = (payload as { type?: unknown }).type;
  return (
    type === "dice" ||
    type === "walk" ||
    type === "portal" ||
    type === "coin_burst" ||
    type === "toast" ||
    type === "coins_update" ||
    type === "item_use"
  );
}
