import { useEffect } from "react";
import { pickAiTrapChoice } from "../../game/aiInventory";
import { trapEscapeCoinCost } from "../../game/rooms";
import { useGameStore } from "../../game/store";
import { getPendingTrap } from "../../game/store/pendingEvent";

const AI_TRAP_DELAY_MS = 1_400;

export function useAiTrapResolve() {
  const pendingEvent = useGameStore((state) => state.pendingEvent);
  const pendingTrap = getPendingTrap(pendingEvent);
  const players = useGameStore((state) => state.players);
  const resolveTrap = useGameStore((state) => state.resolveTrap);

  const trapPlayer = pendingTrap
    ? players.find(({ id }) => id === pendingTrap.playerId)
    : undefined;

  const isAiTrapPending =
    pendingTrap !== null && trapPlayer?.controller === "ai";

  useEffect(() => {
    if (!isAiTrapPending || !trapPlayer) {
      return;
    }

    const choice = pickAiTrapChoice(trapPlayer, trapEscapeCoinCost);
    const timer = window.setTimeout(() => {
      resolveTrap(choice);
    }, AI_TRAP_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [isAiTrapPending, resolveTrap, trapPlayer]);
}
