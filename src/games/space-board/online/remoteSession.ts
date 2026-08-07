import type { RoomEnvelope } from "../../../online/envelope";
import type { ActivePlayerWalk, GameToast } from "../../../game/store/types";
import { createInitialShopStock } from "../../../game/shop";
import type { ShopItemId } from "../../../game/shop";
import {
  isSpaceBoardStatePayload,
  isSpaceBoardUiEventPayload,
  SPACE_BOARD_GAME_SLUG,
  type SpaceBoardStatePayload,
  type SpaceBoardUiEventPayload,
} from "./payloads";

export type SpaceBoardRemoteView = SpaceBoardStatePayload & {
  uiToast: GameToast | null;
  lastItemUse: {
    playerId: string;
    itemId: ShopItemId;
    targetPlayerId?: string;
  } | null;
};

export function createEmptyRemoteView(): SpaceBoardRemoteView {
  return {
    phase: "setup",
    players: [],
    currentPlayerIndex: 0,
    diceValue: null,
    actionItemUsedThisTurn: false,
    message: "",
    shopStock: createInitialShopStock(),
    winnerId: null,
    pendingEvent: null,
    activePlayerWalk: null,
    diceAnimating: false,
    diceMultiplier: 1,
    rolling: false,
    portalTransition: null,
    playerCoinBursts: [],
    uiToast: null,
    lastItemUse: null,
  };
}

function resolveRemoteWalk(
  fromState: ActivePlayerWalk | null,
  fromView: ActivePlayerWalk | null,
  nowMs = getAnimationNowMs(),
): ActivePlayerWalk | null {
  if (fromState) {
    return rebaseRemoteWalk(fromState, nowMs);
  }
  if (!fromView) {
    return null;
  }
  if (nowMs < fromView.startedAt + fromView.durationMs) {
    return fromView;
  }
  return null;
}

function getAnimationNowMs(): number {
  return globalThis.performance?.now() ?? Date.now();
}

function rebaseRemoteWalk(
  walk: ActivePlayerWalk,
  startedAt = getAnimationNowMs(),
): ActivePlayerWalk {
  return {
    ...walk,
    startedAt,
  };
}

function applyUiEvent(
  view: SpaceBoardRemoteView,
  event: SpaceBoardUiEventPayload,
): SpaceBoardRemoteView {
  switch (event.type) {
    case "dice":
      return {
        ...view,
        diceAnimating: event.animating,
        diceValue: event.value,
        rolling: event.animating || view.rolling,
      };
    case "walk": {
      const walk = rebaseRemoteWalk(event.walk);
      return {
        ...view,
        players: view.players.map((player) =>
          player.id === walk.playerId
            ? { ...player, positionIndex: walk.toRoomId - 1 }
            : player,
        ),
        activePlayerWalk: walk,
        diceAnimating: false,
        rolling: true,
      };
    }
    case "portal":
      return {
        ...view,
        portalTransition: event.transition,
      };
    case "coin_burst":
      return {
        ...view,
        playerCoinBursts: event.bursts,
      };
    case "toast":
      return {
        ...view,
        uiToast: event.toast,
      };
    case "coins_update": {
      const coinsByPlayerId = new Map(
        event.players.map(({ playerId, coins }) => [playerId, coins]),
      );
      return {
        ...view,
        players: view.players.map((player) => {
          const coins = coinsByPlayerId.get(player.id);
          return coins === undefined ? player : { ...player, coins };
        }),
      };
    }
    case "item_use":
      return {
        ...view,
        lastItemUse: {
          playerId: event.playerId,
          itemId: event.itemId,
          ...(event.targetPlayerId
            ? { targetPlayerId: event.targetPlayerId }
            : {}),
        },
      };
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}

export function applySpaceBoardRemoteEnvelope(
  view: SpaceBoardRemoteView,
  envelope: RoomEnvelope,
): SpaceBoardRemoteView {
  if (envelope.game_slug !== SPACE_BOARD_GAME_SLUG) {
    return view;
  }

  switch (envelope.kind) {
    case "action":
      return view;
    case "ui_event": {
      if (!isSpaceBoardUiEventPayload(envelope.payload)) {
        return view;
      }
      return applyUiEvent(view, envelope.payload);
    }
    case "state": {
      if (!isSpaceBoardStatePayload(envelope.payload)) {
        return view;
      }
      const payload = envelope.payload;
      return {
        ...payload,
        lastItemUse: view.lastItemUse,
        // Live ui_events start walks/portals early; don't snap-clear them when
        // the final snapshot arrives a bit before the remote animation ends.
        activePlayerWalk: resolveRemoteWalk(
          payload.activePlayerWalk,
          view.activePlayerWalk,
        ),
        portalTransition:
          payload.portalTransition ?? view.portalTransition,
        uiToast: view.uiToast,
      };
    }
    default: {
      const exhaustive: never = envelope.kind;
      return exhaustive;
    }
  }
}
