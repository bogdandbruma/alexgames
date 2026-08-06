import { KeyRound, Link2, Wallet } from "lucide-react";
import { trapEscapeCoinCost } from "../../../game/rooms";
import { getPlayerInventory } from "../../../game/store/helpers";
import { useGameStore } from "../../../game/store";
import { getPendingTrap } from "../../../game/store/pendingEvent";
import { CoinAmount } from "../CoinAmount";

export function TrapOverlay() {
  const pendingEvent = useGameStore((state) => state.pendingEvent);
  const pendingTrap = getPendingTrap(pendingEvent);
  const players = useGameStore((state) => state.players);
  const currentPlayerIndex = useGameStore((state) => state.currentPlayerIndex);
  const resolveTrap = useGameStore((state) => state.resolveTrap);

  const currentPlayer = players[currentPlayerIndex];

  if (!pendingTrap || !currentPlayer || currentPlayer.id !== pendingTrap.playerId) {
    return null;
  }

  const hasKey = getPlayerInventory(currentPlayer).includes("cosmic-key");
  const canPay = currentPlayer.coins >= trapEscapeCoinCost;
  const isHuman = currentPlayer.controller === "player";

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
            amount={currentPlayer.coins}
            className="coin-amount-shop-balance"
          />
        </div>

        <p className="trap-copy">
          Esti prins o tura. Poti iesi cu cheia cosmica, plati taxa, sau pierde
          tura.
        </p>

        <div className="trap-actions">
          {hasKey ? (
            <button
              type="button"
              className="primary-button trap-action-button"
              disabled={!isHuman}
              onClick={() => resolveTrap("key")}
            >
              <KeyRound aria-hidden="true" size={18} />
              <span>Foloseste cheia cosmica</span>
            </button>
          ) : null}

          {canPay ? (
            <button
              type="button"
              className="secondary-button trap-action-button"
              disabled={!isHuman}
              onClick={() => resolveTrap("pay")}
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
            disabled={!isHuman}
            onClick={() => resolveTrap("stay")}
          >
            <Link2 aria-hidden="true" size={18} />
            <span>Stai 1 tura</span>
          </button>
        </div>
      </div>
    </div>
  );
}
