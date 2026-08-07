/**
 * Serializes async work so overlapping callers run one-at-a-time in order.
 * Rejected tasks do not block subsequent enqueues.
 */
export function createAsyncQueue(): <T>(fn: () => Promise<T>) => Promise<T> {
  let tail: Promise<unknown> = Promise.resolve();

  return function enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = tail.then(fn, fn);
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };
}
