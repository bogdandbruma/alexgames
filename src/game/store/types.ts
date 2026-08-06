import type { Vector3Tuple } from "../board";
import type { AvatarId } from "../avatars";
import type { PlayerCoinBurst } from "../playerCoinBurst";
import type { MysteryCardId } from "../mystery";
import type { ShopItemId, ShopStock } from "../shop";
import type { TriviaAnswer } from "../rules";
import type {
  GamePortalTransition,
  PendingEvent,
  TrapEscapeChoice,
} from "./pendingEvent";

export type { AvatarId } from "../avatars";
export type { PlayerCoinBurst } from "../playerCoinBurst";
export { PLAYER_COIN_BURST_MS } from "../playerCoinBurst";
export type {
  GamePortalTransition,
  PendingEvent,
  PendingMysteryEvent,
  PendingPortalEvent,
  PendingShopEvent,
  PendingTrapEvent,
  PendingTriviaEvent,
  TrapEscapeChoice,
  TriviaFeedback,
} from "./pendingEvent";

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
  actionItemUsedThisTurn: boolean;
  message: string;
  shopStock: ShopStock;
  winnerId: string | null;
  pendingEvent: PendingEvent;
};

export type GameState = PersistedState & {
  activePlayerWalk: ActivePlayerWalk | null;
  diceAnimating: boolean;
  diceMultiplier: number;
  rolling: boolean;
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
  resolveTrap: (choice: TrapEscapeChoice) => boolean;
  startGame: (players: PlayerSetup[]) => void;
  rollDice: () => Promise<void>;
  endTurn: () => void;
  resetGame: () => void;
  useInventoryItem: (itemId: ShopItemId, targetPlayerId?: string) => boolean;
};

export type AiGameSnapshot = Pick<
  GameState,
  | "phase"
  | "players"
  | "currentPlayerIndex"
  | "rolling"
  | "diceAnimating"
  | "diceValue"
  | "actionItemUsedThisTurn"
  | "activePlayerWalk"
  | "pendingEvent"
  | "shopStock"
>;

export type GameStoreSet = (
  partial:
    | Partial<GameState>
    | ((state: GameState) => Partial<GameState>),
) => void;
