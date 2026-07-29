import triviaContent from "../../content/trivia-space.json";
import type { TriviaAnswer } from "./rules";

type TriviaContentItem = {
  id: number;
  question: string;
  correct: string;
  wrong: string;
};

export type TriviaOption = {
  answer: string;
  result: TriviaAnswer;
};

export type TriviaQuestion = {
  id: number;
  question: string;
  options: TriviaOption[];
};

type DrawTriviaQuestionInput = {
  random?: () => number;
};

const triviaPool = triviaContent as TriviaContentItem[];

export function drawTriviaQuestion({
  random = Math.random,
}: DrawTriviaQuestionInput = {}): TriviaQuestion {
  const questionIndex = Math.floor(random() * triviaPool.length);
  const item = triviaPool[questionIndex] ?? triviaPool[0];

  const options: TriviaOption[] = [
    { answer: item.correct, result: "correct" },
    { answer: item.wrong, result: "wrong" },
  ];
  if (random() >= 0.5) {
    [options[0], options[1]] = [options[1], options[0]];
  }

  return {
    id: item.id,
    question: item.question,
    options,
  };
}
