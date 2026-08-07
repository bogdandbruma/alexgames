import type { GamePlayer } from "../../../game/store/types";
import { useGameStore } from "../../../game/store";
import type { SpaceBoardRemoteView } from "./remoteSession";

/** Apply remote snapshot/ui view into the shared store (animation fields included). */
export function hydrateGameStoreFromRemoteView(
  view: SpaceBoardRemoteView,
): void {
  const players: GamePlayer[] = view.players.map((player) => ({
    ...player,
  }));
  useGameStore.setState({
    phase: view.phase,
    players,
    currentPlayerIndex: view.currentPlayerIndex,
    diceValue: view.diceValue,
    actionItemUsedThisTurn: view.actionItemUsedThisTurn,
    message: view.message,
    shopStock: view.shopStock,
    winnerId: view.winnerId,
    pendingEvent: view.pendingEvent,
    activePlayerWalk: view.activePlayerWalk,
    diceAnimating: view.diceAnimating,
    diceMultiplier: view.diceMultiplier,
    rolling: view.rolling,
    portalTransition: view.portalTransition,
    playerCoinBursts: view.playerCoinBursts,
    uiToast: null,
  });
}
