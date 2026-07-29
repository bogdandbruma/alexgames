import { Html } from "@react-three/drei";
import { Coins } from "lucide-react";
import { useEffect } from "react";
import {
  getPlayerCoinBursts,
  PLAYER_COIN_BURST_MS,
  type PlayerCoinBurst,
} from "../game/playerCoinBurst";
import { useGameStore } from "../game/store";

function AvatarCoinBurstLabel({ burst }: { burst: PlayerCoinBurst }) {
  const isGain = burst.amount > 0;
  const display = burst.amount > 0 ? `+${burst.amount}` : `${burst.amount}`;

  return (
    <div
      className={
        isGain
          ? "avatar-coin-burst avatar-coin-burst-gain"
          : "avatar-coin-burst avatar-coin-burst-loss"
      }
    >
      <Coins aria-hidden="true" size={15} strokeWidth={2.4} />
      <strong>{display}</strong>
      <span>coins</span>
    </div>
  );
}

type AvatarCoinBurstHtmlProps = {
  burst: PlayerCoinBurst;
  index: number;
  total: number;
};

function AvatarCoinBurstHtml({ burst, index, total }: AvatarCoinBurstHtmlProps) {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      useGameStore.getState().dismissPlayerCoinBurst(burst.id);
    }, PLAYER_COIN_BURST_MS);

    return () => window.clearTimeout(timeoutId);
  }, [burst.id]);

  return (
    <Html
      center
      className="avatar-coin-burst-anchor"
      distanceFactor={34}
      occlude={false}
      position={[index * 0.18 - (total - 1) * 0.09, 1.62, 0]}
      zIndexRange={[260, 0]}
    >
      <AvatarCoinBurstLabel burst={burst} />
    </Html>
  );
}

type AvatarCoinBurstsProps = {
  playerId: string;
};

export function AvatarCoinBursts({ playerId }: AvatarCoinBurstsProps) {
  const burstKey = useGameStore((state) =>
    getPlayerCoinBursts(state.playerCoinBursts, playerId)
      .map((burst) => `${burst.id}:${burst.amount}`)
      .join("|"),
  );

  if (!burstKey) {
    return null;
  }

  const bursts = getPlayerCoinBursts(
    useGameStore.getState().playerCoinBursts,
    playerId,
  );

  return (
    <>
      {bursts.map((burst, index) => (
        <AvatarCoinBurstHtml
          key={burst.id}
          burst={burst}
          index={index}
          total={bursts.length}
        />
      ))}
    </>
  );
}
