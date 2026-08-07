/** Gate persist writes so Online sessions do not clobber Offline saves. */
let writesEnabled = true;

export function setGamePersistWritesEnabled(enabled: boolean): void {
  writesEnabled = enabled;
}

export function gamePersistWritesEnabled(): boolean {
  return writesEnabled;
}
