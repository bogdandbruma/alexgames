import { ShoppingBag } from "lucide-react";
import { useGameStore } from "../../../game/store";
import { shopItems } from "../../../game/shop";
import { CoinAmount } from "../CoinAmount";

export function ShopOverlay() {
  const pendingShop = useGameStore((state) => state.pendingShop);
  const shopStock = useGameStore((state) => state.shopStock);
  const players = useGameStore((state) => state.players);
  const currentPlayerIndex = useGameStore((state) => state.currentPlayerIndex);
  const buyShopItem = useGameStore((state) => state.buyShopItem);
  const closeShop = useGameStore((state) => state.closeShop);

  const currentPlayer = players[currentPlayerIndex];
  const currentInventory = currentPlayer?.inventory ?? [];

  if (!pendingShop || !currentPlayer) {
    return null;
  }

  return (
    <div className="shop-overlay" role="dialog" aria-modal="true">
      <div className="shop-panel">
        <div className="shop-heading">
          <ShoppingBag aria-hidden="true" size={22} />
          <div>
            <span>In magazin</span>
            <strong>Camera {pendingShop.roomId}</strong>
          </div>
          <CoinAmount
            amount={currentPlayer.coins}
            className="coin-amount-shop-balance"
          />
        </div>

        <div className="shop-grid">
          {shopItems.map((item) => {
            const inStock = shopStock[item.id];
            const inventoryFull = currentInventory.length >= 3;
            const disabled =
              pendingShop.purchased ||
              !inStock ||
              inventoryFull ||
              currentPlayer.coins < item.cost;

            return (
              <button
                key={item.id}
                type="button"
                className={inStock ? "shop-item" : "shop-item shop-item-empty"}
                disabled={disabled}
                onClick={() => buyShopItem(item.id)}
              >
                <span className="shop-item-icon">
                  {inStock ? item.icon : "-"}
                </span>
                <strong>{inStock ? item.name : "Raft gol"}</strong>
                <small>
                  {inStock ? (
                    <CoinAmount
                      amount={item.cost}
                      className="coin-amount-price"
                    />
                  ) : (
                    "Vandut"
                  )}
                </small>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="primary-button shop-done-button"
          onClick={closeShop}
        >
          <span>Gata</span>
        </button>
      </div>
    </div>
  );
}
