import { useGameStore } from "../../../game/store";
import { shopItems, type ShopItemId } from "../../../game/shop";

type TargetOverlayProps = {
  targetItemId: ShopItemId | null;
  onClose: () => void;
};

export function TargetOverlay({ targetItemId, onClose }: TargetOverlayProps) {
  const players = useGameStore((state) => state.players);
  const currentPlayerIndex = useGameStore((state) => state.currentPlayerIndex);
  const activateInventoryItem = useGameStore((state) => state.useInventoryItem);

  const currentPlayer = players[currentPlayerIndex];
  const targetablePlayers = players.filter(({ id }) => id !== currentPlayer?.id);

  if (!targetItemId || !currentPlayer) {
    return null;
  }

  return (
    <div className="target-overlay" role="dialog" aria-modal="true">
      <div className="target-panel">
        <div className="target-heading">
          <span>Alege jucator</span>
          <strong>
            {shopItems.find(({ id }) => id === targetItemId)?.name ??
              targetItemId}
          </strong>
        </div>

        <div className="target-list">
          {targetablePlayers.map((player) => (
            <button
              key={player.id}
              type="button"
              className="target-player-button"
              onClick={() => {
                const used = activateInventoryItem(targetItemId, player.id);
                if (used) {
                  onClose();
                }
              }}
            >
              <strong>{player.name}</strong>
              <span>Camera {player.positionIndex + 1}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="secondary-button target-cancel-button"
          onClick={onClose}
        >
          <span>Anuleaza</span>
        </button>
      </div>
    </div>
  );
}
