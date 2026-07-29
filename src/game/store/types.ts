import type { Vector3Tuple } from "../board";
import type { AvatarId } from "../avatars";
import type { PlayerCoinBurst } from "../playerCoinBurst";
import type { MysteryCard, MysteryCardId } from "../mystery";
import type { ShopItemId, ShopStock } from "../shop";
import type { TriviaQuestion } from "../trivia";
import type { TriviaAnswer } from "../rules";

export type { AvatarId } from "../avatars";
export type { PlayerCoinBurst } from "../playerCoinBurst";
export { PLAYER_COIN_BURST_MS } from "../playerCoinBurst";

export type PlayerController = "player" | "ai";
export type GamePhase = "setup" | "playing" | "finished";

export const PLAYER_NAME_MAX_LENGTH = 10;

export type PlayerSetup = {
  name: string;
  avatarId: AvatarId;
  controller: PlayerController;
};

export type GamePlayer = PlayerSetup & {
  id: string;
  positionIndex: number;
  coins: number;
  lastDice: number | null;
  trapped: boolean;
  inventory?: ShopItemId[];
  armedCoinsX3?: boolean;
  armedDiceX2?: boolean;
};

export type GameToast = {
  id: number;
  title: string;
  description: string;
  tone: "coins" | "loss" | "player" | "room" | "win";
  coinsDelta?: number;
};

export type TriviaFeedback = {
  answer: TriviaAnswer;
  coinsDelta: number;
};

export type PendingTrivia = {
  playerId: string;
  roomId: number;
  question: TriviaQuestion;
  result?: TriviaFeedback | null;
};

export type PendingShop = {
  playerId: string;
  roomId: number;
  purchased: boolean;
};

export type PendingMystery = {
  playerId: string;
  roomId: number;
  cards: MysteryCard[];
  revealedCardId: MysteryCardId | null;
};

export type GamePortalTransition = {
  id: number;
  playerId: string;
  fromRoomId: number;
  toRoomId: number;
};

export type ActivePlayerWalk = {
  durationMs: number;
  endPosition: Vector3Tuple;
  fromRoomId: number;
  playerId: string;
  startPosition: Vector3Tuple;
  startedAt: number;
  toRoomId: number;
};

export type PersistedState = {
  phase: GamePhase;
  players: GamePlayer[];
  currentPlayerIndex: number;
  diceValue: number | null;
  message: string;
  shopStock: ShopStock;
  winnerId: string | null;
};

export type GameState = PersistedState & {
  actionItemUsedThisTurn: boolean;
  activePlayerWalk: ActivePlayerWalk | null;
  diceAnimating: boolean;
  diceMultiplier: number;
  rolling: boolean;
  pendingMystery: PendingMystery | null;
  pendingPortal: GamePortalTransition | null;
  pendingShop: PendingShop | null;
  pendingTrivia: PendingTrivia | null;
  portalTransition: GamePortalTransition | null;
  uiToast: GameToast | null;
  playerCoinBursts: PlayerCoinBurst[];
  dismissPlayerCoinBurst: (burstId: number) => void;
  acknowledgePortalTransition: () => void;
  answerTrivia: (answer: TriviaAnswer) => void;
  buyShopItem: (itemId: ShopItemId) => boolean;
  closeShop: () => void;
  pickMysteryCard: (cardId: MysteryCardId) => boolean;
  acknowledgeMystery: () => Promise<void>;
  startGame: (players: PlayerSetup[]) => void;
  rollDice: () => Promise<void>;
  endTurn: () => void;
  resetGame: () => void;
  useInventoryItem: (itemId: ShopItemId, targetPlayerId?: string) => boolean;
};

export type GameStoreSet = (
  partial:
    | Partial<GameState>
    | ((state: GameState) => Partial<GameState>),
) => void;
