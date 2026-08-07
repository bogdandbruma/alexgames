import { KeyRound, Link2, Wallet } from "lucide-react";
import { trapEscapeCoinCost } from "../../../game/rooms";
import { getPlayerInventory } from "../../../game/store/helpers";
import { useGameStore } from "../../../game/store";
import {
  getPendingTrap,
  type TrapEscapeChoice,
} from "../../../game/store/pendingEvent";
import { CoinAmount } from "../CoinAmount";
import { useSpaceBoardOnlineActions } from "../online/onlineActionsContext";

export function TrapOverlay() {
  const pendingEvent = useGameStore((state) => state.pendingEvent);
  const pendingTrap = getPendingTrap(pendingEvent);
  const players = useGameStore((state) => state.players);
  const currentPlayerIndex = useGameStore((state) => state.currentPlayerIndex);
  const resolveTrap = useGameStore((state) => state.resolveTrap);
  const online = useSpaceBoardOnlineActions();

  const currentPlayer = players[currentPlayerIndex];
  const trapPlayer = players.find((player) => player.id === pendingTrap?.playerId);

  if (!pendingTrap || !trapPlayer) {
    return null;
  }

  const hasKey = getPlayerInventory(trapPlayer).includes("cosmic-key");
  const canPay = trapPlayer.coins >= trapEscapeCoinCost;
  const isActor =
    currentPlayer?.id === pendingTrap.playerId &&
    currentPlayer.controller === "player";
  const canResolve = online ? online.canAct && isActor : isActor;

  const submit = (choice: TrapEscapeChoice) => {
    if (online) {
      if (online.canAct) {
        online.onResolveTrap(choice);
      }
      return;
    }
    resolveTrap(choice);
  };

  return (
    <div className="trap-overlay" role="dialog" aria-modal="true">
      <div className="trap-panel">
        <div className="trap-visual" aria-hidden="true">
          <span className="trap-chain trap-chain-left" />
          <span className="trap-lock">
            <Link2 size={36} strokeWidth={2.25} />
          </span>
          <span className="trap-chain trap-chain-right" />
        </div>

        <div className="trap-heading">
          <Link2 aria-hidden="true" size={22} />
          <div>
            <span>Capcana spatiala</span>
            <strong>Camera {pendingTrap.roomId}</strong>
          </div>
          <CoinAmount
            amount={trapPlayer.coins}
            className="coin-amount-shop-balance"
          />
        </div>

        <p className="trap-copy">
          {trapPlayer.name} este prins o tura. Poate iesi cu cheia cosmica, plati
          taxa, sau pierde tura.
        </p>

        <div className="trap-actions">
          {hasKey ? (
            <button
              type="button"
              className="primary-button trap-action-button"
              disabled={!canResolve}
              onClick={() => submit("key")}
            >
              <KeyRound aria-hidden="true" size={18} />
              <span>Foloseste cheia cosmica</span>
            </button>
          ) : null}

          {canPay ? (
            <button
              type="button"
              className="secondary-button trap-action-button"
              disabled={!canResolve}
              onClick={() => submit("pay")}
            >
              <Wallet aria-hidden="true" size={18} />
              <span>
                Plateste{" "}
                <CoinAmount
                  amount={trapEscapeCoinCost}
                  className="coin-amount-price"
                />
              </span>
            </button>
          ) : null}

          <button
            type="button"
            className="secondary-button trap-action-button trap-stay-button"
            disabled={!canResolve}
            onClick={() => submit("stay")}
          >
            <Link2 aria-hidden="true" size={18} />
            <span>Stai 1 tura</span>
          </button>
        </div>
      </div>
    </div>
  );
}
