import { useEffect } from "react";
import {
  canAiAutoEndTurn,
  getAffordableShopItemIdsForPlayer,
  getAiPreRollItems,
  isAiPostRollActionTurn,
  isAiPreRollTurn,
  pickAiActionItem,
} from "../../game/aiInventory";
import { getPlayerInventory } from "../../game/store/helpers";
import { useGameStore } from "../../game/store";
import {
  getPendingMystery,
  getPendingPortal,
  getPendingShop,
} from "../../game/store/pendingEvent";
import type { AiGameSnapshot } from "../../game/store/types";

const AI_PRE_ROLL_DELAY_MS = 400;
const AI_ACTION_ITEM_DELAY_MS = 1_200;
const AI_END_TURN_DELAY_MS = 800;
const AI_SHOP_DELAY_MS = 900;
const AI_MYSTERY_PICK_DELAY_MS = 900;
const AI_MYSTERY_ACK_DELAY_MS = 3_400;
const AI_PORTAL_ACK_DELAY_MS = 1_150;

export function useAiInventory() {
  const phase = useGameStore((state) => state.phase);
  const players = useGameStore((state) => state.players);
  const currentPlayerIndex = useGameStore((state) => state.currentPlayerIndex);
  const rolling = useGameStore((state) => state.rolling);
  const diceAnimating = useGameStore((state) => state.diceAnimating);
  const diceValue = useGameStore((state) => state.diceValue);
  const actionItemUsedThisTurn = useGameStore(
    (state) => state.actionItemUsedThisTurn,
  );
  const activePlayerWalk = useGameStore((state) => state.activePlayerWalk);
  const pendingEvent = useGameStore((state) => state.pendingEvent);
  const shopStock = useGameStore((state) => state.shopStock);

  const activateInventoryItem = useGameStore((state) => state.useInventoryItem);
  const endTurn = useGameStore((state) => state.endTurn);

  const pendingShop = getPendingShop(pendingEvent);
  const pendingMystery = getPendingMystery(pendingEvent);
  const pendingPortal = getPendingPortal(pendingEvent);

  const snapshot: AiGameSnapshot = {
    phase,
    players,
    currentPlayerIndex,
    rolling,
    diceAnimating,
    diceValue,
    actionItemUsedThisTurn,
    activePlayerWalk,
    pendingEvent,
    shopStock,
  };

  const currentPlayer = players[currentPlayerIndex];
  const preRollTurn = isAiPreRollTurn(snapshot);
  const postRollActionTurn = isAiPostRollActionTurn(snapshot);
  const autoEndTurn = canAiAutoEndTurn(snapshot);

  const pendingShopPlayer =
    pendingShop !== null
      ? players.find(({ id }) => id === pendingShop.playerId)
      : undefined;
  const isAiShopPending =
    pendingShop !== null &&
    pendingShopPlayer?.controller === "ai" &&
    !pendingShop.purchased;

  const pendingMysteryPlayer =
    pendingMystery !== null
      ? players.find(({ id }) => id === pendingMystery.playerId)
      : undefined;
  const isAiMysteryPending =
    pendingMystery !== null &&
    pendingMystery.revealedCardId === null &&
    pendingMysteryPlayer?.controller === "ai";

  const pendingPortalPlayer =
    pendingPortal !== null
      ? players.find(({ id }) => id === pendingPortal.playerId)
      : undefined;
  const isAiPortalPending =
    pendingPortal !== null && pendingPortalPlayer?.controller === "ai";

  useEffect(() => {
    if (!preRollTurn || !currentPlayer) {
      return;
    }

    const inventory = getPlayerInventory(currentPlayer);
    const preRollItems = getAiPreRollItems(inventory);

    if (preRollItems.length === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      for (const itemId of preRollItems) {
        activateInventoryItem(itemId);
      }
    }, AI_PRE_ROLL_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [preRollTurn, currentPlayer?.id, activateInventoryItem]);

  useEffect(() => {
    if (!postRollActionTurn || !currentPlayer) {
      return;
    }

    const timer = window.setTimeout(() => {
      const latest = useGameStore.getState();
      const player = latest.players[latest.currentPlayerIndex];

      if (!player || !isAiPostRollActionTurn(latest)) {
        return;
      }

      const pick = pickAiActionItem(
        getPlayerInventory(player),
        latest.players,
        player.id,
        Math.random,
      );

      if (!pick) {
        endTurn();
        return;
      }

      const used = activateInventoryItem(pick.itemId, pick.targetPlayerId);

      if (!used) {
        endTurn();
      }
    }, AI_ACTION_ITEM_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [postRollActionTurn, currentPlayer?.id, activateInventoryItem, endTurn]);

  useEffect(() => {
    if (!autoEndTurn || !actionItemUsedThisTurn) {
      return;
    }

    const timer = window.setTimeout(() => {
      const latest = useGameStore.getState();

      if (canAiAutoEndTurn(latest) && latest.actionItemUsedThisTurn) {
        endTurn();
      }
    }, AI_END_TURN_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [autoEndTurn, currentPlayer?.id, actionItemUsedThisTurn, endTurn]);

  useEffect(() => {
    if (!isAiShopPending || !pendingShop) {
      return;
    }

    const timer = window.setTimeout(() => {
      const latest = useGameStore.getState();
      const shop = getPendingShop(latest.pendingEvent);

      if (!shop || shop.purchased) {
        return;
      }

      const affordable = getAffordableShopItemIdsForPlayer(latest, shop.playerId);

      if (affordable.length === 0) {
        latest.closeShop();
        return;
      }

      const index = Math.floor(Math.random() * affordable.length);
      const itemId = affordable[index];

      if (itemId) {
        latest.buyShopItem(itemId);
      }

      latest.closeShop();
    }, AI_SHOP_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [isAiShopPending, pendingShop?.playerId, pendingShop?.purchased]);

  useEffect(() => {
    if (!isAiMysteryPending || !pendingMystery) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      await new Promise((resolve) => {
        window.setTimeout(resolve, AI_MYSTERY_PICK_DELAY_MS);
      });

      if (cancelled) {
        return;
      }

      const latest = useGameStore.getState();
      const mystery = getPendingMystery(latest.pendingEvent);

      if (!mystery || mystery.revealedCardId !== null) {
        return;
      }

      const randomIndex = Math.floor(Math.random() * mystery.cards.length);
      const selectedCard = mystery.cards[randomIndex];

      if (selectedCard) {
        latest.pickMysteryCard(selectedCard.id);
      }

      await new Promise((resolve) => {
        window.setTimeout(resolve, AI_MYSTERY_ACK_DELAY_MS);
      });

      if (cancelled) {
        return;
      }

      await latest.acknowledgeMystery();
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    isAiMysteryPending,
    pendingMystery?.playerId,
    pendingMystery?.roomId,
  ]);

  useEffect(() => {
    if (!isAiPortalPending) {
      return;
    }

    const timer = window.setTimeout(() => {
      useGameStore.getState().acknowledgePortalTransition();
    }, AI_PORTAL_ACK_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [isAiPortalPending, pendingPortal?.id]);
}
