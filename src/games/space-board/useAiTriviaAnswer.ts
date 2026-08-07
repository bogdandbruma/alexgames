import { useEffect } from "react";
import type { TriviaAnswer } from "../../game/rules";
import { getPlayerInventory } from "../../game/store/helpers";
import { useGameStore } from "../../game/store";
import { getPendingTrivia } from "../../game/store/pendingEvent";

export function useAiTriviaAnswer() {
  const pendingEvent = useGameStore((state) => state.pendingEvent);
  const pendingTrivia = getPendingTrivia(pendingEvent);
  const players = useGameStore((state) => state.players);
  const answerTrivia = useGameStore((state) => state.answerTrivia);
  const activateInventoryItem = useGameStore((state) => state.useInventoryItem);

  const triviaPlayer = pendingTrivia
    ? players.find(({ id }) => id === pendingTrivia.playerId)
    : undefined;

  const isAiTriviaPending =
    pendingTrivia !== null &&
    pendingTrivia.result === null &&
    triviaPlayer?.controller === "ai";

  useEffect(() => {
    if (!isAiTriviaPending || !pendingTrivia || !triviaPlayer) {
      return;
    }

    const hasTriviaCancel =
      getPlayerInventory(triviaPlayer).includes("trivia-cancel");

    const aiAnswer = window.setTimeout(() => {
      if (hasTriviaCancel) {
        activateInventoryItem("trivia-cancel");
        return;
      }

      const options = pendingTrivia.question.options;
      const randomIndex = Math.floor(Math.random() * options.length);
      const picked = options[randomIndex];

      if (picked) {
        answerTrivia(picked.result as TriviaAnswer);
      }
    }, 1_400);

    return () => window.clearTimeout(aiAnswer);
  }, [
    answerTrivia,
    isAiTriviaPending,
    pendingTrivia,
    triviaPlayer,
    activateInventoryItem,
  ]);
}
