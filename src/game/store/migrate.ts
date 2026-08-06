import { createInitialShopStock } from "../shop";
import { normalizeAvatarId } from "../avatars";
import type { MysteryCard, MysteryCardId } from "../mystery";
import type { TriviaQuestion } from "../trivia";
import type { PersistedState, TriviaFeedback } from "./types";
import type { PendingEvent } from "./pendingEvent";
import {
  initialPersistedState,
  normalizePlayerRuntimeState,
} from "./helpers";

type LegacyPersistedShape = Partial<PersistedState> & {
  pendingShop?: {
    playerId: string;
    roomId: number;
    purchased: boolean;
  } | null;
  pendingTrivia?: {
    playerId: string;
    roomId: number;
    question: TriviaQuestion;
    result?: TriviaFeedback | null;
  } | null;
  pendingMystery?: {
    playerId: string;
    roomId: number;
    cards: MysteryCard[];
    revealedCardId: MysteryCardId | null;
  } | null;
  pendingPortal?: {
    id: number | string;
    playerId: string;
    fromRoomId: number;
    toRoomId: number;
  } | null;
};

function migratePendingEvent(raw: LegacyPersistedShape): PendingEvent {
  if ("pendingEvent" in raw && raw.pendingEvent !== undefined) {
    return raw.pendingEvent ?? null;
  }

  if (raw.pendingShop) {
    return { type: "shop", ...raw.pendingShop };
  }

  if (raw.pendingTrivia) {
    return {
      type: "trivia",
      playerId: raw.pendingTrivia.playerId,
      roomId: raw.pendingTrivia.roomId,
      question: raw.pendingTrivia.question,
      result: raw.pendingTrivia.result ?? null,
    };
  }

  if (raw.pendingMystery) {
    return { type: "mystery", ...raw.pendingMystery };
  }

  if (raw.pendingPortal) {
    return {
      type: "portal",
      id: String(raw.pendingPortal.id),
      playerId: raw.pendingPortal.playerId,
      fromRoomId: raw.pendingPortal.fromRoomId,
      toRoomId: raw.pendingPortal.toRoomId,
    };
  }

  return null;
}

export const migratePersistedState = (persistedState: unknown): PersistedState => {
  if (
    typeof persistedState === "object" &&
    persistedState !== null &&
    "players" in persistedState &&
    Array.isArray((persistedState as Partial<PersistedState>).players)
  ) {
    const state = persistedState as LegacyPersistedShape;

    return {
      phase: state.phase ?? initialPersistedState.phase,
      players: (state.players ?? []).map((player) =>
        normalizePlayerRuntimeState({
          ...player,
          avatarId: normalizeAvatarId(player.avatarId),
          coins: player.coins ?? 0,
          trapped: player.trapped ?? false,
        }),
      ),
      currentPlayerIndex:
        state.currentPlayerIndex ?? initialPersistedState.currentPlayerIndex,
      diceValue: state.diceValue ?? null,
      actionItemUsedThisTurn: state.actionItemUsedThisTurn ?? false,
      message: state.message ?? initialPersistedState.message,
      shopStock: state.shopStock ?? createInitialShopStock(),
      winnerId: state.winnerId ?? null,
      pendingEvent: migratePendingEvent(state),
    };
  }

  return initialPersistedState;
};
