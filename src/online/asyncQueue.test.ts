import { describe, expect, test } from "vitest";
import { createAsyncQueue } from "./asyncQueue";

describe("createAsyncQueue", () => {
  test("runs enqueued tasks strictly in order", async () => {
    const queue = createAsyncQueue();
    const order: number[] = [];

    const first = queue(async () => {
      await new Promise((r) => setTimeout(r, 30));
      order.push(1);
      return "a";
    });
    const second = queue(async () => {
      order.push(2);
      return "b";
    });

    await expect(Promise.all([first, second])).resolves.toEqual(["a", "b"]);
    expect(order).toEqual([1, 2]);
  });

  test("continues after a rejected task", async () => {
    const queue = createAsyncQueue();
    const order: string[] = [];

    const failing = queue(async () => {
      order.push("fail");
      throw new Error("boom");
    });
    const next = queue(async () => {
      order.push("ok");
      return 42;
    });

    await expect(failing).rejects.toThrow(/boom/);
    await expect(next).resolves.toBe(42);
    expect(order).toEqual(["fail", "ok"]);
  });
});
