import { createContext, useContext } from "react";
import type { MysteryCardId } from "../../../game/mystery";
import type { TriviaAnswer } from "../../../game/rules";
import type { ShopItemId } from "../../../game/shop";
import type { TrapEscapeChoice } from "../../../game/store/pendingEvent";

export type SpaceBoardOnlineActions = {
  canAct: boolean;
  onRoll: () => void;
  onEndTurn: () => void;
  onAnswerTrivia: (answer: TriviaAnswer) => void;
  onPickMystery: (cardId: MysteryCardId) => void;
  onAcknowledgeMystery: () => void;
  onBuyShopItem: (itemId: ShopItemId) => void;
  onCloseShop: () => void;
  onUseInventoryItem: (
    itemId: ShopItemId,
    targetPlayerId?: string,
  ) => void;
  onResolveTrap: (choice: TrapEscapeChoice) => void;
  onAcknowledgePortal: () => void;
};

const SpaceBoardOnlineActionsContext =
  createContext<SpaceBoardOnlineActions | null>(null);

export const SpaceBoardOnlineActionsProvider =
  SpaceBoardOnlineActionsContext.Provider;

export function useSpaceBoardOnlineActions(): SpaceBoardOnlineActions | null {
  return useContext(SpaceBoardOnlineActionsContext);
}
