import { describe, expect, test } from "vitest";
import { drawTriviaQuestion } from "./trivia";

describe("space board trivia content", () => {
  test("draws a two-option question from the bundled trivia pool", () => {
    const question = drawTriviaQuestion({ random: () => 0 });

    expect({
      id: question.id,
      options: question.options,
    }).toEqual({
      id: 1,
      options: [
        { answer: "Mercur", result: "correct" },
        { answer: "Venus", result: "wrong" },
      ],
    });
  });

  test("uses the injected random value to draw across the full trivia pool", () => {
    const question = drawTriviaQuestion({ random: () => 0.999 });

    expect(question.id).toBe(200);
    expect(question.options).toHaveLength(2);
  });

  test("shuffles correct and wrong options when the second random draw is high", () => {
    let call = 0;
    const question = drawTriviaQuestion({
      random: () => {
        call += 1;
        return call === 1 ? 0 : 0.75;
      },
    });

    expect(question.options).toEqual([
      { answer: "Venus", result: "wrong" },
      { answer: "Mercur", result: "correct" },
    ]);
  });
});
