import { useEffect, useRef, useState } from "react";

export const TRIVIA_ANSWER_SECONDS = 10;
export const TRIVIA_ANSWER_MS = TRIVIA_ANSWER_SECONDS * 1000;

const RING_RADIUS = 15;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type UseTriviaCountdownInput = {
  active: boolean;
  resetKey: string;
  onExpire: () => void;
};

export function useTriviaCountdown({
  active,
  resetKey,
  onExpire,
}: UseTriviaCountdownInput) {
  const [secondsLeft, setSecondsLeft] = useState(TRIVIA_ANSWER_SECONDS);
  const [progress, setProgress] = useState(1);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!active) {
      return;
    }

    setSecondsLeft(TRIVIA_ANSWER_SECONDS);
    setProgress(1);
    let cancelled = false;
    const start = performance.now();
    let lastProgress = 1;
    let lastSecond = TRIVIA_ANSWER_SECONDS;

    const tick = () => {
      if (cancelled) {
        return;
      }

      const elapsed = performance.now() - start;
      const remaining = Math.max(0, TRIVIA_ANSWER_MS - elapsed);
      const nextProgress = remaining / TRIVIA_ANSWER_MS;
      const nextSecond = remaining <= 0 ? 0 : Math.ceil(remaining / 1000);

      if (Math.abs(nextProgress - lastProgress) >= 1 / 120) {
        lastProgress = nextProgress;
        setProgress(nextProgress);
      }
      if (nextSecond !== lastSecond) {
        lastSecond = nextSecond;
        setSecondsLeft(nextSecond);
      }

      if (remaining <= 0) {
        onExpireRef.current();
        return;
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);

    return () => {
      cancelled = true;
    };
  }, [active, resetKey]);

  return { secondsLeft, progress };
}

type TriviaTimerVisualProps = {
  secondsLeft: number;
  progress: number;
};

export function TriviaTimerRing({
  secondsLeft,
  progress,
}: TriviaTimerVisualProps) {
  const ringOffset = RING_CIRCUMFERENCE * (1 - progress);
  const urgent = secondsLeft <= 3;

  return (
    <div
      className={`trivia-timer-ring-wrap${urgent ? " trivia-timer-ring-wrap-urgent" : ""}`}
      aria-live="polite"
      aria-label={`Timp ramas: ${secondsLeft} secunde`}
    >
      <svg
        className="trivia-timer-ring-svg"
        viewBox="0 0 36 36"
        aria-hidden="true"
      >
        <circle
          className="trivia-timer-ring-track"
          cx="18"
          cy="18"
          r={RING_RADIUS}
        />
        <circle
          className="trivia-timer-ring-progress"
          cx="18"
          cy="18"
          r={RING_RADIUS}
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={ringOffset}
        />
      </svg>
      <span className="trivia-timer-ring-value">{secondsLeft}</span>
    </div>
  );
}

export function TriviaTimeBar({
  secondsLeft,
  progress,
}: TriviaTimerVisualProps) {
  const urgent = secondsLeft <= 3;

  return (
    <div className="trivia-time-track" aria-hidden="true">
      <div
        className={`trivia-time-bar${urgent ? " trivia-time-bar-urgent" : ""}`}
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}
