import type {
  ActivePlayerWalk,
  GameState,
  GamePortalTransition,
} from "../../../game/store/types";
import type { PlayerCoinBurst } from "../../../game/playerCoinBurst";
import type { ShopItemId } from "../../../game/shop";
import type {
  SpaceBoardStatePayload,
  SpaceBoardUiEventPayload,
} from "./payloads";

export type SpaceBoardStoreSlice = Pick<
  GameState,
  | "phase"
  | "players"
  | "currentPlayerIndex"
  | "diceValue"
  | "actionItemUsedThisTurn"
  | "message"
  | "shopStock"
  | "winnerId"
  | "pendingEvent"
  | "activePlayerWalk"
  | "diceAnimating"
  | "diceMultiplier"
  | "rolling"
  | "portalTransition"
  | "playerCoinBursts"
>;

export type SpaceBoardStoreApi = {
  getState: () => SpaceBoardStoreSlice;
  subscribe: (listener: (state: SpaceBoardStoreSlice) => void) => () => void;
};

export function snapshotSpaceBoardState(
  state: SpaceBoardStoreSlice,
): SpaceBoardStatePayload {
  return {
    phase: state.phase,
    players: state.players.map((player) => ({
      id: player.id,
      name: player.name,
      avatarId: player.avatarId,
      controller: player.controller,
      positionIndex: player.positionIndex,
      coins: player.coins,
      lastDice: player.lastDice,
      trapped: player.trapped,
      inventory: player.inventory,
      armedCoinsX3: player.armedCoinsX3,
      armedDiceX2: player.armedDiceX2,
    })),
    currentPlayerIndex: state.currentPlayerIndex,
    diceValue: state.diceValue,
    actionItemUsedThisTurn: state.actionItemUsedThisTurn,
    message: state.message,
    shopStock: state.shopStock,
    winnerId: state.winnerId,
    pendingEvent: state.pendingEvent,
    activePlayerWalk: state.activePlayerWalk,
    diceAnimating: state.diceAnimating,
    diceMultiplier: state.diceMultiplier,
    rolling: state.rolling,
    portalTransition: state.portalTransition,
    playerCoinBursts: state.playerCoinBursts ?? [],
  };
}

function currentPlayerId(state: SpaceBoardStoreSlice): string {
  return state.players[state.currentPlayerIndex]?.id ?? "";
}

function diffUiEvents(
  prev: SpaceBoardStoreSlice,
  next: SpaceBoardStoreSlice,
): SpaceBoardUiEventPayload[] {
  const events: SpaceBoardUiEventPayload[] = [];
  const playerId = currentPlayerId(next) || currentPlayerId(prev);

  if (next.diceAnimating !== prev.diceAnimating || next.diceValue !== prev.diceValue) {
    if (next.diceAnimating && !prev.diceAnimating) {
      events.push({
        type: "dice",
        playerId,
        value: next.diceValue,
        animating: true,
      });
    } else if (!next.diceAnimating && prev.diceAnimating) {
      events.push({
        type: "dice",
        playerId,
        value: next.diceValue,
        animating: false,
      });
    } else if (next.diceValue !== prev.diceValue) {
      events.push({
        type: "dice",
        playerId,
        value: next.diceValue,
        animating: next.diceAnimating,
      });
    }
  }

  const nextWalk = next.activePlayerWalk;
  const prevWalk = prev.activePlayerWalk;
  if (nextWalk && walkChanged(prevWalk, nextWalk)) {
    events.push({ type: "walk", walk: nextWalk });
  }

  const nextPortal = next.portalTransition;
  const prevPortal = prev.portalTransition;
  if (nextPortal && portalChanged(prevPortal, nextPortal)) {
    events.push({ type: "portal", transition: nextPortal });
  }

  const nextBursts = next.playerCoinBursts ?? [];
  const prevBursts = prev.playerCoinBursts ?? [];
  if (burstsChanged(prevBursts, nextBursts)) {
    events.push({ type: "coin_burst", bursts: nextBursts });
  }

  events.push(...diffItemUseEvents(prev, next));

  return events;
}

function inventoryOf(
  player: SpaceBoardStoreSlice["players"][number] | undefined,
): string[] {
  return player?.inventory ?? [];
}

function diffItemUseEvents(
  prev: SpaceBoardStoreSlice,
  next: SpaceBoardStoreSlice,
): SpaceBoardUiEventPayload[] {
  const events: SpaceBoardUiEventPayload[] = [];
  for (const nextPlayer of next.players) {
    const prevPlayer = prev.players.find((p) => p.id === nextPlayer.id);
    if (!prevPlayer) continue;
    const prevInv = inventoryOf(prevPlayer);
    const nextInv = inventoryOf(nextPlayer);
    for (const itemId of prevInv) {
      const prevCount = prevInv.filter((id) => id === itemId).length;
      const nextCount = nextInv.filter((id) => id === itemId).length;
      if (nextCount < prevCount) {
        events.push({
          type: "item_use",
          playerId: nextPlayer.id,
          itemId: itemId as ShopItemId,
        });
      }
    }
  }
  return events;
}

function walkChanged(
  prev: ActivePlayerWalk | null,
  next: ActivePlayerWalk,
): boolean {
  if (!prev) return true;
  return (
    prev.playerId !== next.playerId ||
    prev.fromRoomId !== next.fromRoomId ||
    prev.toRoomId !== next.toRoomId ||
    prev.startedAt !== next.startedAt
  );
}

function portalChanged(
  prev: GamePortalTransition | null,
  next: GamePortalTransition,
): boolean {
  if (!prev) return true;
  return prev.id !== next.id;
}

function burstsChanged(
  prev: PlayerCoinBurst[],
  next: PlayerCoinBurst[],
): boolean {
  if (prev.length !== next.length) return true;
  const prevIds = new Set(prev.map((b) => b.id));
  return next.some((b) => !prevIds.has(b.id));
}

export async function collectUiEventsDuring(
  api: SpaceBoardStoreApi,
  run: () => Promise<void>,
  options?: {
    /** Fired as soon as each UI event is detected (for live Realtime stream). */
    onUiEvent?: (
      event: SpaceBoardUiEventPayload,
    ) => void | Promise<void>;
  },
): Promise<SpaceBoardUiEventPayload[]> {
  const events: SpaceBoardUiEventPayload[] = [];
  const pending: Promise<void>[] = [];
  let prev = api.getState();
  const unsubscribe = api.subscribe((next) => {
    const batch = diffUiEvents(prev, next);
    prev = next;
    for (const event of batch) {
      events.push(event);
      if (options?.onUiEvent) {
        pending.push(Promise.resolve(options.onUiEvent(event)));
      }
    }
  });
  try {
    await run();
  } finally {
    unsubscribe();
  }
  await Promise.all(pending);
  return events;
}
