import { ShoppingBag } from "lucide-react";
import { useGameStore } from "../../../game/store";
import { getPendingShop } from "../../../game/store/pendingEvent";
import { shopItems, type ShopItemId } from "../../../game/shop";
import { CoinAmount } from "../CoinAmount";
import { useSpaceBoardOnlineActions } from "../online/onlineActionsContext";

export function ShopOverlay() {
  const pendingEvent = useGameStore((state) => state.pendingEvent);
  const pendingShop = getPendingShop(pendingEvent);
  const shopStock = useGameStore((state) => state.shopStock);
  const players = useGameStore((state) => state.players);
  const currentPlayerIndex = useGameStore((state) => state.currentPlayerIndex);
  const buyShopItem = useGameStore((state) => state.buyShopItem);
  const closeShop = useGameStore((state) => state.closeShop);
  const online = useSpaceBoardOnlineActions();

  const currentPlayer = players[currentPlayerIndex];
  const currentInventory = currentPlayer?.inventory ?? [];

  if (!pendingShop || !currentPlayer) {
    return null;
  }

  const submitBuy = (itemId: ShopItemId) => {
    if (online) {
      if (online.canAct) {
        online.onBuyShopItem(itemId);
      }
      return;
    }
    buyShopItem(itemId);
  };

  const submitClose = () => {
    if (online) {
      if (online.canAct) {
        online.onCloseShop();
      }
      return;
    }
    closeShop();
  };

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
              currentPlayer.coins < item.cost ||
              (online ? !online.canAct : false);

            return (
              <button
                key={item.id}
                type="button"
                className={inStock ? "shop-item" : "shop-item shop-item-empty"}
                disabled={disabled}
                onClick={() => submitBuy(item.id)}
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
          disabled={online ? !online.canAct : false}
          onClick={submitClose}
        >
          <span>Gata</span>
        </button>
      </div>
    </div>
  );
}
