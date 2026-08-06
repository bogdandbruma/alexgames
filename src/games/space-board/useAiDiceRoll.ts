import { useEffect } from "react";
import { useGameStore } from "../../game/store";

export function useAiDiceRoll() {
  const phase = useGameStore((state) => state.phase);
  const players = useGameStore((state) => state.players);
  const currentPlayerIndex = useGameStore((state) => state.currentPlayerIndex);
  const rolling = useGameStore((state) => state.rolling);
  const pendingEvent = useGameStore((state) => state.pendingEvent);
  const diceValue = useGameStore((state) => state.diceValue);
  const rollDice = useGameStore((state) => state.rollDice);

  const currentPlayer = players[currentPlayerIndex];
  const isAiTurn =
    phase === "playing" &&
    currentPlayer?.controller === "ai" &&
    !rolling &&
    diceValue === null &&
    pendingEvent === null;

  useEffect(() => {
    if (!isAiTurn) {
      return;
    }

    const aiMove = window.setTimeout(() => {
      void rollDice();
    }, 1_700);

    return () => window.clearTimeout(aiMove);
  }, [isAiTurn, currentPlayer?.id, rollDice]);
}
