export type PlayerCoinBurst = {
  id: number;
  playerId: string;
  amount: number;
};

export const PLAYER_COIN_BURST_MS = 2_000;

let nextPlayerCoinBurstId = 0;

export function pushPlayerCoinBursts(
  bursts: PlayerCoinBurst[] | undefined,
  playerId: string,
  amount: number,
): PlayerCoinBurst[] {
  if (amount === 0) {
    return bursts ?? [];
  }

  return [
    ...(bursts ?? []),
    {
      id: (nextPlayerCoinBurstId += 1),
      playerId,
      amount,
    },
  ];
}

export function getPlayerCoinBursts(
  bursts: PlayerCoinBurst[] | undefined,
  playerId: string,
): PlayerCoinBurst[] {
  return (bursts ?? []).filter((burst) => burst.playerId === playerId);
}
