import { render, act } from "@testing-library/react";
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { useTriviaCountdown } from "./TriviaAnswerTimer";

let renderCount = 0;

function Probe({ onExpire }: { onExpire: () => void }) {
  renderCount += 1;
  useTriviaCountdown({ active: true, resetKey: "q1", onExpire });
  return null;
}

describe("useTriviaCountdown", () => {
  let clock = 0;

  beforeEach(() => {
    renderCount = 0;
    clock = 0;
    vi.useFakeTimers();
    vi.spyOn(performance, "now").mockImplementation(() => clock);
    vi.stubGlobal(
      "requestAnimationFrame",
      (callback: FrameRequestCallback) =>
        window.setTimeout(() => callback(clock), 0),
    );
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      window.clearTimeout(id);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  async function advanceAnimationFrames(frameCount: number) {
    for (let frame = 0; frame < frameCount; frame += 1) {
      clock += 16;
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
    }
  }

  test("updates progress without exceeding ~2 renders per second on average", async () => {
    const onExpire = vi.fn();
    render(<Probe onExpire={onExpire} />);
    await advanceAnimationFrames(1);
    const before = renderCount;
    await advanceAnimationFrames(30);
    const delta = renderCount - before;
    expect(delta).toBeLessThan(12);
  });
});
