import { CheckCircle2, Coins, HelpCircle, XCircle } from "lucide-react";
import {
  TriviaTimeBar,
  TriviaTimerRing,
  useTriviaCountdown,
} from "../TriviaAnswerTimer";
import { useGameStore } from "../../../game/store";
import { getPendingTrivia } from "../../../game/store/pendingEvent";

function CoinAmount({
  amount,
  className = "",
  signed = false,
}: {
  amount: number;
  className?: string;
  signed?: boolean;
}) {
  const displayAmount = signed && amount > 0 ? `+${amount}` : `${amount}`;

  return (
    <span
      className={className ? `coin-amount ${className}` : "coin-amount"}
      aria-label={`${displayAmount} coins`}
    >
      <Coins aria-hidden="true" size={16} />
      <strong>{displayAmount}</strong>
      <span>coins</span>
    </span>
  );
}

export function TriviaOverlay() {
  const pendingEvent = useGameStore((state) => state.pendingEvent);
  const pendingTrivia = getPendingTrivia(pendingEvent);
  const answerTrivia = useGameStore((state) => state.answerTrivia);

  const triviaAwaitingAnswer =
    pendingTrivia != null && pendingTrivia.result == null;
  const triviaCountdownKey = pendingTrivia
    ? `${pendingTrivia.playerId}-${pendingTrivia.question.id}`
    : "";
  const { secondsLeft: triviaSecondsLeft, progress: triviaTimeProgress } =
    useTriviaCountdown({
      active: triviaAwaitingAnswer,
      resetKey: triviaCountdownKey,
      onExpire: () => answerTrivia("wrong"),
    });

  if (!pendingTrivia) {
    return null;
  }

  return (
    <div className="trivia-overlay" role="dialog" aria-modal="true">
      {triviaAwaitingAnswer ? (
        <TriviaTimerRing
          secondsLeft={triviaSecondsLeft}
          progress={triviaTimeProgress}
        />
      ) : null}
      <div
        className={
          pendingTrivia.result
            ? `trivia-panel trivia-panel-${pendingTrivia.result.answer}`
            : "trivia-panel"
        }
      >
        {triviaAwaitingAnswer ? (
          <TriviaTimeBar
            secondsLeft={triviaSecondsLeft}
            progress={triviaTimeProgress}
          />
        ) : null}
        <div className="trivia-heading">
          <HelpCircle aria-hidden="true" size={22} />
          <span>Trivia spatiala</span>
        </div>

        <p className="trivia-question">{pendingTrivia.question.question}</p>

        <div className="trivia-options">
          {pendingTrivia.question.options.map((option) => {
            const answered = pendingTrivia.result != null;
            const selected = pendingTrivia.result?.answer === option.result;

            return (
              <button
                key={`${pendingTrivia.question.id}-${option.answer}`}
                type="button"
                className={
                  selected
                    ? `trivia-option-button trivia-option-${option.result}`
                    : answered
                      ? "trivia-option-button trivia-option-dimmed"
                      : "trivia-option-button"
                }
                disabled={answered}
                onClick={() => answerTrivia(option.result)}
              >
                {option.answer}
              </button>
            );
          })}
        </div>

        {pendingTrivia.result ? (
          <div
            key={`${pendingTrivia.question.id}-${pendingTrivia.result.answer}`}
            className={`trivia-result trivia-result-${pendingTrivia.result.answer}`}
            aria-live="polite"
          >
            {pendingTrivia.result.answer === "correct" ? (
              <CheckCircle2 aria-hidden="true" size={26} />
            ) : (
              <XCircle aria-hidden="true" size={26} />
            )}
            <div>
              <strong>
                {pendingTrivia.result.answer === "correct"
                  ? "Raspuns corect"
                  : "Raspuns gresit"}
              </strong>
              <span>
                {pendingTrivia.result.coinsDelta > 0
                  ? "Ai castigat coins."
                  : pendingTrivia.result.coinsDelta < 0
                    ? "Ai pierdut coins."
                    : "Nu ai avut coins de pierdut."}
              </span>
            </div>
            <CoinAmount
              amount={pendingTrivia.result.coinsDelta}
              className={
                pendingTrivia.result.coinsDelta < 0
                  ? "coin-amount-trivia coin-amount-trivia-loss"
                  : "coin-amount-trivia"
              }
              signed
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
