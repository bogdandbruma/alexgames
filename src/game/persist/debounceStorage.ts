import type { StateStorage } from "zustand/middleware";

export function createDebouncedStorage(
  base: Storage,
  debounceMs = 300,
): StateStorage {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: { name: string; value: string } | null = null;

  return {
    getItem: (name) => base.getItem(name),
    setItem: (name, value) => {
      pending = { name, value };
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (pending) base.setItem(pending.name, pending.value);
        pending = null;
        timer = null;
      }, debounceMs);
    },
    removeItem: (name) => base.removeItem(name),
  };
}
