import { useEffect } from "react";
import type { TriviaAnswer } from "../../game/rules";
import { useGameStore } from "../../game/store";

export function useAiTriviaAnswer() {
  const pendingTrivia = useGameStore((state) => state.pendingTrivia);
  const players = useGameStore((state) => state.players);
  const answerTrivia = useGameStore((state) => state.answerTrivia);

  const triviaPlayer = pendingTrivia
    ? players.find(({ id }) => id === pendingTrivia.playerId)
    : undefined;

  const isAiTriviaPending =
    pendingTrivia !== null &&
    pendingTrivia.result === null &&
    triviaPlayer?.controller === "ai";

  useEffect(() => {
    if (!isAiTriviaPending || !pendingTrivia) {
      return;
    }

    const options = pendingTrivia.question.options;

    const aiAnswer = window.setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * options.length);
      const picked = options[randomIndex];

      if (picked) {
        answerTrivia(picked.result as TriviaAnswer);
      }
    }, 1_400);

    return () => window.clearTimeout(aiAnswer);
  }, [
    isAiTriviaPending,
    pendingTrivia?.playerId,
    pendingTrivia?.question.id,
    answerTrivia,
  ]);
}
