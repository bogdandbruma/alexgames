export const USERNAME_MAX_LENGTH = 10;

export const DEVICE_ID_STORAGE_KEY = "brumix.online.device_id";
export const USERNAME_STORAGE_KEY = "brumix.online.username";

function resolveStorage(storage?: Storage): Storage {
  return storage ?? localStorage;
}

function createDeviceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const nibble = (Math.random() * 16) | 0;
    const value = char === "x" ? nibble : (nibble & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function getOrCreateDeviceId(storage?: Storage): string {
  const store = resolveStorage(storage);
  const existing = store.getItem(DEVICE_ID_STORAGE_KEY);
  if (existing) {
    return existing;
  }
  const deviceId = createDeviceId();
  store.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
  return deviceId;
}

export function getUsername(storage?: Storage): string | null {
  return resolveStorage(storage).getItem(USERNAME_STORAGE_KEY);
}

export function setUsername(username: string, storage?: Storage): string {
  const trimmed = username.trim().slice(0, USERNAME_MAX_LENGTH);
  resolveStorage(storage).setItem(USERNAME_STORAGE_KEY, trimmed);
  return trimmed;
}
