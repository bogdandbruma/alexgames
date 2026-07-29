import roomsContent from "../../content/space-board-rooms.json";

export type RoomAction =
  | "coins"
  | "finish"
  | "mystery"
  | "portal"
  | "shop"
  | "trap"
  | "trivia";

export type RoomZone = "branch" | "mid" | "moon" | "start" | "trivia";

export const roomActionColors: Record<RoomAction, string> = {
  coins: "#b8e06a",
  finish: "#dce9ff",
  mystery: "#c8a1ff",
  portal: "#67d5c8",
  shop: "#f3c969",
  trap: "#ff7867",
  trivia: "#8fb1ff",
};

export const roomActionLabels: Record<RoomAction, string> = {
  coins: "Coins",
  finish: "Final",
  mystery: "Mister",
  portal: "Portal",
  shop: "Shop",
  trap: "Capcana",
  trivia: "Trivia",
};

export type GameplayRoom = {
  id: number;
  zone: RoomZone;
  action: RoomAction;
  coinsOnEnter: number;
  portalTo?: number;
};

type RoomsContent = {
  finishRoomId: number;
  maxInventory: number;
  trapEscapeCoinCost: number;
  rooms: GameplayRoom[];
};

const content = roomsContent as RoomsContent;

export const finishRoomId = content.finishRoomId;
export const maxInventory = content.maxInventory;
export const trapEscapeCoinCost = content.trapEscapeCoinCost;
export const gameplayRooms: GameplayRoom[] = content.rooms;

export function getRoomById(roomId: number): GameplayRoom {
  const room = gameplayRooms.find(({ id }) => id === roomId);

  if (!room) {
    throw new Error(`Unknown room id: ${roomId}`);
  }

  return room;
}
