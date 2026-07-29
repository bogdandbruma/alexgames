import shopCatalogContent from "../../content/space-shop-catalog.json";
import { maxInventory } from "./rooms";

export type ShopItemId =
  | "bomb"
  | "claw"
  | "coins-x3"
  | "cosmic-key"
  | "dice-x2"
  | "pistol"
  | "star"
  | "swap-arrow"
  | "trivia-cancel";

export type ActionShopItemId =
  | "bomb"
  | "claw"
  | "pistol"
  | "star"
  | "swap-arrow";

export type ShopStock = Record<ShopItemId, boolean>;

export type ShopItem = {
  id: ShopItemId;
  name: string;
  cost: number;
  icon: string;
  description: string;
  effectKey: ShopItemId;
};

type RawShopCatalog = {
  maxPerVisit: number;
  globalStockPerItem: number;
  items: ShopItem[];
};

export const MAX_INVENTORY_ITEMS = maxInventory;

const catalog = shopCatalogContent as RawShopCatalog;

export const shopItems: ShopItem[] = catalog.items;

export function createInitialShopStock(): ShopStock {
  return shopItems.reduce<ShopStock>(
    (stock, item) => ({
      ...stock,
      [item.id]: true,
    }),
    {} as ShopStock,
  );
}

export function getShopItemById(itemId: ShopItemId): ShopItem {
  const item = shopItems.find(({ id }) => id === itemId);

  if (!item) {
    throw new Error(`Unknown shop item id: ${itemId}`);
  }

  return item;
}

export function isActionShopItem(
  itemId: ShopItemId,
): itemId is ActionShopItemId {
  switch (itemId) {
    case "bomb":
    case "claw":
    case "pistol":
    case "star":
    case "swap-arrow":
      return true;
    case "coins-x3":
    case "cosmic-key":
    case "dice-x2":
    case "trivia-cancel":
      return false;
    default: {
      const exhaustiveCheck: never = itemId;
      return exhaustiveCheck;
    }
  }
}
