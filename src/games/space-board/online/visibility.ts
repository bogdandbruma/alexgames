import type { ShopItemId, ShopStock } from "../../../game/shop";
import type {
  SpaceBoardPlayerSnapshot,
  SpaceBoardStatePayload,
} from "./payloads";

function inventoryOf(player: SpaceBoardPlayerSnapshot): ShopItemId[] {
  return player.inventory ?? [];
}

/**
 * Items sitting in private inventories should look "still in stock" to everyone
 * except the holder (purchase stays secret until use).
 */
function maskShopStockForViewer(
  state: SpaceBoardStatePayload,
  viewerPlayerId: string | null,
): ShopStock {
  const masked: ShopStock = { ...state.shopStock };

  for (const player of state.players) {
    if (viewerPlayerId !== null && player.id === viewerPlayerId) {
      continue;
    }
    for (const itemId of inventoryOf(player)) {
      if (!state.shopStock[itemId]) {
        masked[itemId] = true;
      }
    }
  }

  return masked;
}

function filterPlayerForViewer(
  player: SpaceBoardPlayerSnapshot,
  viewerPlayerId: string | null,
): SpaceBoardPlayerSnapshot {
  if (viewerPlayerId !== null && player.id === viewerPlayerId) {
    return { ...player };
  }
  const { inventory: _inventory, ...rest } = player;
  return rest;
}

/**
 * Build outbound Space Board state for one viewer.
 * Trivia/mystery/trap/portal stay fully public; shop inventories + purchase
 * stock effects are private until item use (armed flags remain public).
 */
export function filterSpaceBoardStateForViewer(
  state: SpaceBoardStatePayload,
  viewerPlayerId: string | null,
): SpaceBoardStatePayload {
  return {
    ...state,
    players: state.players.map((player) =>
      filterPlayerForViewer(player, viewerPlayerId),
    ),
    shopStock: maskShopStockForViewer(state, viewerPlayerId),
    viewerPlayerId,
  };
}
