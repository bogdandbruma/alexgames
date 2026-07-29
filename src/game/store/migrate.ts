import { createInitialShopStock } from "../shop";
import { normalizeAvatarId } from "../avatars";
import type { PersistedState } from "./types";
import {
  initialPersistedState,
  normalizePlayerRuntimeState,
} from "./helpers";

export const migratePersistedState = (persistedState: unknown): PersistedState => {
  if (
    typeof persistedState === "object" &&
    persistedState !== null &&
    "players" in persistedState &&
    Array.isArray((persistedState as Partial<PersistedState>).players)
  ) {
    const state = persistedState as PersistedState;

    return {
      ...state,
      shopStock: state.shopStock ?? createInitialShopStock(),
      winnerId: state.winnerId ?? null,
      players: state.players.map((player) =>
        normalizePlayerRuntimeState({
          ...player,
          avatarId: normalizeAvatarId(player.avatarId),
          coins: player.coins ?? 0,
          trapped: player.trapped ?? false,
        }),
      ),
    };
  }

  return initialPersistedState;
};
