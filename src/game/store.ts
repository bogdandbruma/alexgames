import { create } from "zustand";
import { persist } from "zustand/middleware";
import { rooms } from "./board";
import { finishRoomId, trapEscapeCoinCost } from "./rooms";
import {
  resolvePositionChange,
  resolveDiceMove,
  resolveDiceTurn,
  resolveTriviaAnswer,
  type DiceTurnResult,
  type TriviaAnswer,
} from "./rules";
import {
  applyMysteryEffect,
  createMysteryOffer,
  getMysteryCardById,
  type MysteryCard,
  type MysteryCardId,
  type MysteryPlayerState,
} from "./mystery";
import {
  createInitialShopStock,
  getShopItemById,
  isActionShopItem,
  MAX_INVENTORY_ITEMS,
  shopItems,
  type ShopItemId,
  type ShopStock,
} from "./shop";
import { drawTriviaQuestion, type TriviaQuestion } from "./trivia";
import {
  defaultAvatarId,
  normalizeAvatarId,
  type AvatarId,
} from "./avatars";
import {
  pushPlayerCoinBursts,
  type PlayerCoinBurst,
} from "./playerCoinBurst";
import { getWalkDurationMs } from "./movementTiming";

export type { AvatarId } from "./avatars";

export type { PlayerCoinBurst } from "./playerCoinBurst";
export { PLAYER_COIN_BURST_MS } from "./playerCoinBurst";

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

type PersistedState = {
  phase: GamePhase;
  players: GamePlayer[];
  currentPlayerIndex: number;
  diceValue: number | null;
  message: string;
  shopStock: ShopStock;
  winnerId: string | null;
};

type GameState = PersistedState & {
  actionItemUsedThisTurn: boolean;
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
  acknowledgeMystery: () => void;
  startGame: (players: PlayerSetup[]) => void;
  rollDice: () => Promise<void>;
  resetGame: () => void;
  useInventoryItem: (itemId: ShopItemId, targetPlayerId?: string) => boolean;
};

const defaultPlayers: GamePlayer[] = [
  {
    id: "player-1",
    name: "Jucător 1",
    avatarId: defaultAvatarId,
    controller: "player",
    positionIndex: 0,
    coins: 0,
    lastDice: null,
    trapped: false,
    inventory: [],
    armedCoinsX3: false,
    armedDiceX2: false,
  },
];

const initialPersistedState: PersistedState = {
  phase: "setup",
  players: defaultPlayers,
  currentPlayerIndex: 0,
  diceValue: null,
  shopStock: createInitialShopStock(),
  winnerId: null,
  message: "Alege jucători și prieteni blănoși, apoi pornește jocul!",
};

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });

const DICE_ROLL_MIN_MS = 1_000;
const DICE_ROLL_MAX_MS = 2_000;
const DICE_RESULT_HOLD_MS = 2_000;
const DICE_FLY_HOME_MS = 920;
const DICE_POST_REVEAL_MS = DICE_RESULT_HOLD_MS + DICE_FLY_HOME_MS + 80;

const getRandomDiceRollDuration = () => {
  const range = DICE_ROLL_MAX_MS - DICE_ROLL_MIN_MS + 1;
  let randomValue: number;

  if (globalThis.crypto?.getRandomValues) {
    const randomValues = new Uint32Array(1);
    globalThis.crypto.getRandomValues(randomValues);
    randomValue = randomValues[0];
  } else {
    randomValue = Math.abs(
      Math.floor((globalThis.performance?.now() ?? Date.now()) * 1_000),
    );
  }

  return DICE_ROLL_MIN_MS + (randomValue % range);
};

const getNextPlayerIndex = (players: GamePlayer[], currentIndex: number) =>
  (currentIndex + 1) % players.length;

const getPlayerName = (player: GamePlayer | undefined) =>
  player?.name.trim() || "Jucător";

const getPlayerInventory = (player: GamePlayer | undefined): ShopItemId[] =>
  player?.inventory ?? [];

const hasInventorySpace = (player: GamePlayer) =>
  getPlayerInventory(player).length < MAX_INVENTORY_ITEMS;

const normalizePlayerRuntimeState = (player: GamePlayer): GamePlayer => ({
  ...player,
  inventory: getPlayerInventory(player),
  armedCoinsX3: player.armedCoinsX3 ?? false,
  armedDiceX2: player.armedDiceX2 ?? false,
});

const hasRolledThisTurn = (state: GameState) =>
  state.diceValue !== null && !state.rolling;

const getAffordableShopItems = (player: GamePlayer, shopStock: ShopStock) =>
  shopItems.filter(
    (item) =>
      shopStock[item.id] &&
      player.coins >= item.cost &&
      hasInventorySpace(player),
  );

let toastId = 0;
let portalTransitionId = 0;
let portalAcknowledgementId: number | null = null;
let resolvePortalAcknowledgement: (() => void) | null = null;

const waitForPortalAcknowledgement = (portalId: number) =>
  new Promise<void>((resolve) => {
    portalAcknowledgementId = portalId;
    resolvePortalAcknowledgement = () => {
      portalAcknowledgementId = null;
      resolvePortalAcknowledgement = null;
      resolve();
    };
  });

const completePortalAcknowledgement = (portalId?: number) => {
  if (
    resolvePortalAcknowledgement &&
    (portalId === undefined || portalAcknowledgementId === portalId)
  ) {
    resolvePortalAcknowledgement();
  }
};

const createTurnToast = (player: GamePlayer | undefined): GameToast => ({
  id: (toastId += 1),
  title: "Urmează jucătorul",
  description: getPlayerName(player),
  tone: "player",
});

const createRoomToast = (
  player: GamePlayer | undefined,
  roomIndex: number,
  tone: GameToast["tone"] = "room",
  coinsDelta = 0,
): GameToast => {
  const room = rooms[roomIndex];

  return {
    id: (toastId += 1),
    title: `Camera ${room.id}`,
    description: `${getPlayerName(player)} a ajuns la ${room.name}.`,
    ...(coinsDelta > 0 ? { coinsDelta } : {}),
    tone,
  };
};

const createTriviaToast = (
  player: GamePlayer | undefined,
  feedback: TriviaFeedback,
): GameToast => ({
  id: (toastId += 1),
  title: feedback.answer === "correct" ? "Raspuns corect" : "Raspuns gresit",
  description:
    feedback.answer === "correct"
      ? `${getPlayerName(player)} primeste coins.`
      : feedback.coinsDelta < 0
        ? `${getPlayerName(player)} pierde coins.`
        : `${getPlayerName(player)} nu avea coins de pierdut.`,
  tone: feedback.answer === "correct" ? "coins" : "loss",
  ...(feedback.coinsDelta !== 0 ? { coinsDelta: feedback.coinsDelta } : {}),
});

const MYSTERY_COIN_TOAST_MS = 2_400;
const TRIVIA_MODAL_RESULT_MS = 1_800;
const TRIVIA_TOAST_MS = 2_400;

const createMysteryCoinToast = (
  player: GamePlayer | undefined,
  card: MysteryCard,
  coinsDelta: number,
): GameToast => ({
  id: (toastId += 1),
  title: card.title,
  description:
    coinsDelta > 0
      ? `${getPlayerName(player)} primeste coins.`
      : coinsDelta < 0
        ? `${getPlayerName(player)} pierde coins.`
        : `${getPlayerName(player)} nu avea coins de pierdut.`,
  tone: coinsDelta > 0 ? "coins" : "loss",
  ...(coinsDelta !== 0 ? { coinsDelta } : {}),
});

const createCoinDeltaToast = (
  title: string,
  player: GamePlayer | undefined,
  coinsDelta: number,
): GameToast => ({
  id: (toastId += 1),
  title,
  description:
    coinsDelta > 0
      ? `${getPlayerName(player)} primeste coins.`
      : coinsDelta < 0
        ? `${getPlayerName(player)} cheltuie coins.`
        : `${getPlayerName(player)} nu a schimbat coins.`,
  tone: coinsDelta >= 0 ? "coins" : "loss",
  ...(coinsDelta !== 0 ? { coinsDelta } : {}),
});

const createEndTurnState = (
  state: GameState,
  message: string,
): Pick<
  GameState,
  | "actionItemUsedThisTurn"
  | "currentPlayerIndex"
  | "diceValue"
  | "diceMultiplier"
  | "message"
  | "pendingMystery"
  | "pendingPortal"
  | "pendingShop"
  | "pendingTrivia"
  | "rolling"
  | "uiToast"
> => {
  const nextPlayerIndex = getNextPlayerIndex(
    state.players,
    state.currentPlayerIndex,
  );
  const nextPlayer = state.players[nextPlayerIndex];

  return {
    actionItemUsedThisTurn: false,
    currentPlayerIndex: nextPlayerIndex,
    diceValue: null,
    diceMultiplier: 1,
    message: `${message} Randul lui ${getPlayerName(nextPlayer)}.`,
    pendingMystery: null,
    pendingPortal: null,
    pendingShop: null,
    pendingTrivia: null,
    rolling: false,
    uiToast: createTurnToast(nextPlayer),
  };
};

const createFinishedState = (
  winnerId: string,
  message: string,
  uiToast: GameToast | null = null,
): Pick<
  GameState,
  | "actionItemUsedThisTurn"
  | "diceAnimating"
  | "message"
  | "pendingMystery"
  | "pendingPortal"
  | "pendingShop"
  | "pendingTrivia"
  | "phase"
  | "rolling"
  | "uiToast"
  | "winnerId"
> => ({
  actionItemUsedThisTurn: false,
  diceAnimating: false,
  message,
  pendingMystery: null,
  pendingPortal: null,
  pendingShop: null,
  pendingTrivia: null,
  phase: "finished",
  rolling: false,
  uiToast,
  winnerId,
});

const clearFinishedInteractiveState = (): Pick<
  GameState,
  | "diceAnimating"
  | "diceMultiplier"
  | "pendingMystery"
  | "pendingPortal"
  | "pendingShop"
  | "pendingTrivia"
  | "rolling"
> => ({
  diceAnimating: false,
  diceMultiplier: 1,
  pendingMystery: null,
  pendingPortal: null,
  pendingShop: null,
  pendingTrivia: null,
  rolling: false,
});

const purchaseShopItem = (
  state: GameState,
  playerId: string,
  itemId: ShopItemId,
  markPendingShopPurchased: boolean,
): Pick<GameState, "pendingShop" | "players" | "shopStock"> | null => {
  const item = getShopItemById(itemId);
  const player = state.players.find(({ id }) => id === playerId);

  if (
    !player ||
    !state.shopStock[itemId] ||
    player.coins < item.cost ||
    !hasInventorySpace(player)
  ) {
    return null;
  }

  return {
    pendingShop:
      markPendingShopPurchased && state.pendingShop
        ? { ...state.pendingShop, purchased: true }
        : state.pendingShop,
    players: state.players.map((candidate) =>
      candidate.id === playerId
        ? {
            ...candidate,
            coins: candidate.coins - item.cost,
            inventory: [...getPlayerInventory(candidate), itemId],
          }
        : candidate,
    ),
    shopStock: {
      ...state.shopStock,
      [itemId]: false,
    },
  };
};

const removeInventoryItem = (
  player: GamePlayer,
  itemId: ShopItemId,
): GamePlayer => {
  const inventory = getPlayerInventory(player);
  const itemIndex = inventory.indexOf(itemId);

  if (itemIndex === -1) {
    return player;
  }

  return {
    ...player,
    inventory: [
      ...inventory.slice(0, itemIndex),
      ...inventory.slice(itemIndex + 1),
    ],
  };
};

const applyPositionResultToPlayer = (
  player: GamePlayer,
  positionId: number,
  steps: number,
): { player: GamePlayer; finished: boolean; result: DiceTurnResult } => {
  const result = resolvePositionChange({
    positionId,
    steps,
    coins: player.coins,
  });

  return {
    player: {
      ...player,
      positionIndex: result.positionId - 1,
      coins: result.coins,
      trapped: result.trap !== undefined,
    },
    finished: result.outcome === "finished",
    result,
  };
};

const createPortalTransition = (
  playerId: string,
  result: DiceTurnResult,
): GamePortalTransition | null =>
  result.portal
    ? {
        id: (portalTransitionId += 1),
        playerId,
        fromRoomId: result.portal.from,
        toRoomId: result.portal.to,
      }
    : null;

const createPendingRoomActionState = (
  state: GameState,
  playerId: string,
  result: DiceTurnResult,
  message: string,
): Partial<GameState> => {
  const player = state.players.find(({ id }) => id === playerId);

  switch (result.action) {
    case "trivia":
      return {
        pendingMystery: null,
        pendingShop: null,
        pendingTrivia: {
          playerId,
          roomId: result.positionId,
          question: drawTriviaQuestion(),
          result: null,
        },
        rolling: false,
        message: `${message} Raspunde la intrebarea trivia.`,
      };
    case "shop":
      return {
        pendingMystery: null,
        pendingShop: {
          playerId,
          roomId: result.positionId,
          purchased: false,
        },
        pendingTrivia: null,
        rolling: false,
        message: `${message} A intrat in magazin.`,
      };
    case "mystery": {
      const offer = createMysteryOffer();

      return {
        pendingMystery: {
          playerId,
          roomId: result.positionId,
          cards: offer.cards,
          revealedCardId: null,
        },
        pendingShop: null,
        pendingTrivia: null,
        rolling: false,
        message: `${message} A gasit carti misterioase.`,
      };
    }
    case "coins":
    case "portal":
    case "trap":
      return {
        message,
      };
    case "finish":
      return createFinishedState(
        playerId,
        `${getPlayerName(player)} a ajuns pe Luna!`,
      );
    case null:
      return {
        message,
      };
    default: {
      const exhaustiveCheck: never = result.action;
      return exhaustiveCheck;
    }
  }
};

const shouldPauseForRoomAction = (result: DiceTurnResult | null) =>
  result?.action === "trivia" ||
  result?.action === "shop" ||
  result?.action === "mystery";

const applyMysteryPlayersToStore = (
  state: GameState,
  mysteryPlayers: MysteryPlayerState[],
  changedPositionPlayerIds: string[],
  activePlayerId: string,
): {
  activeResult: DiceTurnResult | null;
  players: GamePlayer[];
  winnerId: string | null;
} => {
  let activeResult: DiceTurnResult | null = null;
  let winnerId: string | null = null;
  const players = state.players.map((player) => {
    const mysteryPlayer = mysteryPlayers.find(({ id }) => id === player.id);

    if (!mysteryPlayer) {
      return player;
    }

    if (!changedPositionPlayerIds.includes(player.id)) {
      return {
        ...player,
        coins: mysteryPlayer.coins,
      };
    }

    const movement = applyPositionResultToPlayer(
      {
        ...player,
        coins: mysteryPlayer.coins,
      },
      mysteryPlayer.positionId,
      0,
    );

    if (movement.finished) {
      winnerId = player.id;
    }

    if (player.id === activePlayerId) {
      activeResult = movement.result;
    }

    return movement.player;
  });

  return {
    activeResult,
    players,
    winnerId,
  };
};

const resolvePlayerRoomEntry = (
  player: GamePlayer,
  positionId: number,
  coins: number,
  trapped: boolean,
): GamePlayer => ({
  ...player,
  positionIndex: positionId - 1,
  coins,
  trapped,
});

const normalizePlayerSetup = (
  player: PlayerSetup,
  index: number,
): GamePlayer => ({
  id: `player-${index + 1}`,
  name: (
    player.name.trim() || `Jucător ${index + 1}`
  ).slice(0, PLAYER_NAME_MAX_LENGTH),
  avatarId: normalizeAvatarId(player.avatarId),
  controller: player.controller,
  positionIndex: 0,
  coins: 0,
  lastDice: null,
  trapped: false,
  inventory: [],
  armedCoinsX3: false,
  armedDiceX2: false,
});

const migratePersistedState = (persistedState: unknown): PersistedState => {
  if (
    typeof persistedState === "object" &&
    persistedState !== null &&
    "players" in persistedState &&
    Array.isArray((persistedState as Partial<PersistedState>).players)
  ) {
    const state = persistedState as PersistedState;

    return {
      ...state,
      shopStock: state.shopStock ?? createInitialShopStock(),
      winnerId: state.winnerId ?? null,
      players: state.players.map((player) =>
        normalizePlayerRuntimeState({
          ...player,
          avatarId: normalizeAvatarId(player.avatarId),
          coins: player.coins ?? 0,
          trapped: player.trapped ?? false,
        }),
      ),
    };
  }

  return initialPersistedState;
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...initialPersistedState,
      actionItemUsedThisTurn: false,
      diceAnimating: false,
      diceMultiplier: 1,
      pendingMystery: null,
      pendingPortal: null,
      pendingShop: null,
      pendingTrivia: null,
      portalTransition: null,
      rolling: false,
      uiToast: null,
      playerCoinBursts: [],

      dismissPlayerCoinBurst: (burstId) => {
        set((state) => ({
          playerCoinBursts: (state.playerCoinBursts ?? []).filter(
            ({ id }) => id !== burstId,
          ),
        }));
      },

      acknowledgePortalTransition: () => {
        const pendingPortal = get().pendingPortal;

        if (!pendingPortal) {
          return;
        }

        set({
          pendingPortal: null,
        });
        completePortalAcknowledgement(pendingPortal.id);
      },

      answerTrivia: (answer) => {
        const state = get();
        const pendingTrivia = state.pendingTrivia;

        if (
          !pendingTrivia ||
          pendingTrivia.result ||
          state.phase !== "playing" ||
          state.rolling
        ) {
          if (state.phase === "finished") {
            set(clearFinishedInteractiveState());
          }

          return;
        }

        const nextPlayerIndex = getNextPlayerIndex(
          state.players,
          state.currentPlayerIndex,
        );
        const nextPlayer = state.players[nextPlayerIndex];
        const answeredPlayer = state.players.find(
          (player) => player.id === pendingTrivia.playerId,
        );
        const coinsBefore = answeredPlayer?.coins ?? 0;
        const coinsAfter = resolveTriviaAnswer({
          coins: coinsBefore,
          answer,
        });
        const triviaFeedback: TriviaFeedback = {
          answer,
          coinsDelta: coinsAfter - coinsBefore,
        };
        const resultMessage =
          answer === "correct" ? "Raspuns corect." : "Raspuns gresit.";

        set({
          pendingTrivia: {
            ...pendingTrivia,
            result: triviaFeedback,
          },
          players: state.players.map((player) =>
            player.id === pendingTrivia.playerId
              ? {
                  ...player,
                  coins: resolveTriviaAnswer({ coins: player.coins, answer }),
                }
              : player,
          ),
          actionItemUsedThisTurn: false,
          message: `${resultMessage} ${getPlayerName(answeredPlayer)} ${
            triviaFeedback.coinsDelta > 0
              ? "primeste 1 coin."
              : triviaFeedback.coinsDelta < 0
                ? "pierde 1 coin."
                : "nu avea coins de pierdut."
          }`,
          uiToast: null,
        });

        window.setTimeout(() => {
          set((latestState) => {
            const latestTrivia = latestState.pendingTrivia;

            if (
              latestState.phase !== "playing" ||
              latestTrivia?.playerId !== pendingTrivia.playerId ||
              latestTrivia.question.id !== pendingTrivia.question.id ||
              !latestTrivia.result
            ) {
              return {};
            }

            return {
              pendingTrivia: null,
              uiToast: createTriviaToast(answeredPlayer, triviaFeedback),
              playerCoinBursts: pushPlayerCoinBursts(
                latestState.playerCoinBursts,
                pendingTrivia.playerId,
                triviaFeedback.coinsDelta,
              ),
            };
          });
        }, TRIVIA_MODAL_RESULT_MS);

        window.setTimeout(() => {
          set((latestState) => {
            const latestTrivia = latestState.pendingTrivia;

            if (
              latestState.phase !== "playing" ||
              latestTrivia !== null ||
              latestState.currentPlayerIndex !== state.currentPlayerIndex
            ) {
              return {};
            }

            return {
              currentPlayerIndex: nextPlayerIndex,
              message: `${resultMessage} ${getPlayerName(answeredPlayer)} continua aventura. Randul lui ${getPlayerName(nextPlayer)}.`,
              uiToast: createTurnToast(nextPlayer),
            };
          });
        }, TRIVIA_MODAL_RESULT_MS + TRIVIA_TOAST_MS);
      },

      buyShopItem: (itemId) => {
        let bought = false;

        set((state) => {
          const pendingShop = state.pendingShop;

          if (state.phase !== "playing") {
            return state.phase === "finished"
              ? clearFinishedInteractiveState()
              : {};
          }

          if (!pendingShop || pendingShop.purchased) {
            return {};
          }

          const purchase = purchaseShopItem(
            state,
            pendingShop.playerId,
            itemId,
            true,
          );

          if (!purchase) {
            return {};
          }

          bought = true;
          const item = getShopItemById(itemId);

          return {
            ...purchase,
            playerCoinBursts: pushPlayerCoinBursts(
              state.playerCoinBursts,
              pendingShop.playerId,
              -item.cost,
            ),
            uiToast: createCoinDeltaToast(
              "Achizitie",
              purchase.players.find(({ id }) => id === pendingShop.playerId),
              -item.cost,
            ),
            message: `${getPlayerName(
              purchase.players.find(({ id }) => id === pendingShop.playerId),
            )} a cumparat ${getShopItemById(itemId).name}.`,
          };
        });

        return bought;
      },

      closeShop: () => {
        set((state) => {
          if (state.phase !== "playing") {
            return state.phase === "finished"
              ? clearFinishedInteractiveState()
              : {};
          }

          if (!state.pendingShop) {
            return {};
          }

          const player = state.players.find(
            ({ id }) => id === state.pendingShop?.playerId,
          );

          return createEndTurnState(
            state,
            `${getPlayerName(player)} a iesit din magazin.`,
          );
        });
      },

      pickMysteryCard: (cardId) => {
        let picked = false;

        set((state) => {
          const pendingMystery = state.pendingMystery;

          if (
            !pendingMystery ||
            pendingMystery.revealedCardId !== null ||
            state.phase !== "playing" ||
            state.rolling ||
            !pendingMystery.cards.some(({ id }) => id === cardId)
          ) {
            if (state.phase === "finished") {
              return clearFinishedInteractiveState();
            }

            return {};
          }

          const player = state.players.find(
            ({ id }) => id === pendingMystery.playerId,
          );
          const card = getMysteryCardById(cardId);

          picked = true;

          return {
            pendingMystery: {
              ...pendingMystery,
              revealedCardId: cardId,
            },
            message: `${getPlayerName(player)} a ales ${card.title}. ${card.description}`,
          };
        });

        return picked;
      },

      acknowledgeMystery: () => {
        let pendingResultAfterReveal: DiceTurnResult | null = null;
        let pendingResultPlayerId: string | null = null;
        let shouldEndTurn = false;
        let revealedCardId: MysteryCardId | null = null;
        let mysteryCoinsDelta = 0;
        let mysteryPlayerId: string | null = null;

        set((state) => {
          const pendingMystery = state.pendingMystery;
          const cardId = pendingMystery?.revealedCardId ?? null;

          if (
            !pendingMystery ||
            cardId === null ||
            state.phase !== "playing" ||
            state.rolling
          ) {
            if (state.phase === "finished") {
              return clearFinishedInteractiveState();
            }

            return {};
          }

          const playerBefore = state.players.find(
            ({ id }) => id === pendingMystery.playerId,
          );
          const coinsBefore = playerBefore?.coins ?? 0;

          const effect = applyMysteryEffect({
            activePlayerId: pendingMystery.playerId,
            cardId,
            players: state.players.map((player) => ({
              id: player.id,
              positionId: player.positionIndex + 1,
              coins: player.coins,
            })),
          });
          const mysteryResult = applyMysteryPlayersToStore(
            state,
            effect.players,
            effect.changedPositionPlayerIds,
            pendingMystery.playerId,
          );
          const player = mysteryResult.players.find(
            ({ id }) => id === pendingMystery.playerId,
          );
          const card = getMysteryCardById(cardId);
          mysteryCoinsDelta = (player?.coins ?? coinsBefore) - coinsBefore;
          mysteryPlayerId = pendingMystery.playerId;
          const portalTransition =
            player && mysteryResult.activeResult
              ? createPortalTransition(player.id, mysteryResult.activeResult)
              : null;

          revealedCardId = cardId;
          pendingResultAfterReveal =
            mysteryResult.winnerId === null &&
            shouldPauseForRoomAction(mysteryResult.activeResult)
              ? mysteryResult.activeResult
              : null;
          pendingResultPlayerId =
            pendingResultAfterReveal && player ? player.id : null;
          shouldEndTurn =
            mysteryResult.winnerId === null && pendingResultAfterReveal === null;

          return {
            players: mysteryResult.players,
            ...(portalTransition ? { portalTransition } : {}),
            ...(mysteryResult.winnerId
              ? createFinishedState(
                  mysteryResult.winnerId,
                  `${getPlayerName(player)} a dezvaluit ${card.title} si a castigat!`,
                )
              : {
                  pendingMystery: {
                    ...pendingMystery,
                    revealedCardId: cardId,
                  },
                  message: `${getPlayerName(player)} a dezvaluit ${card.title}.`,
                }),
          };
        });

        if (!revealedCardId) {
          return;
        }

        if (pendingResultAfterReveal && pendingResultPlayerId) {
          const result = pendingResultAfterReveal;
          const playerId = pendingResultPlayerId;
          const cardId = revealedCardId;

          set((state) => {
            if (
              !state.pendingMystery ||
              state.pendingMystery.revealedCardId !== cardId
            ) {
              return {};
            }

            const player = state.players.find(({ id }) => id === playerId);

            return createPendingRoomActionState(
              state,
              playerId,
              result,
              `${getPlayerName(player)} a terminat misterul.`,
            );
          });
        } else if (shouldEndTurn) {
          const cardId = revealedCardId;
          const coinsDelta = mysteryCoinsDelta;
          const playerId = mysteryPlayerId;

          if (coinsDelta !== 0 && playerId) {
            set((state) => {
              if (
                !state.pendingMystery ||
                state.pendingMystery.revealedCardId !== cardId
              ) {
                return {};
              }

              const player = state.players.find(({ id }) => id === playerId);
              const card = getMysteryCardById(cardId);
              const coinMessage =
                coinsDelta > 0
                  ? "primeste coins."
                  : coinsDelta < 0
                    ? "pierde coins."
                    : "nu avea coins de pierdut.";

              return {
                pendingMystery: null,
                message: `${getPlayerName(player)} a terminat misterul. ${getPlayerName(player)} ${coinMessage}`,
                uiToast: createMysteryCoinToast(player, card, coinsDelta),
                playerCoinBursts: pushPlayerCoinBursts(
                  state.playerCoinBursts,
                  playerId,
                  coinsDelta,
                ),
              };
            });

            window.setTimeout(() => {
              set((latestState) => {
                if (latestState.phase !== "playing") {
                  return {};
                }

                const player = latestState.players.find(
                  ({ id }) => id === playerId,
                );

                return createEndTurnState(
                  latestState,
                  `${getPlayerName(player)} a terminat misterul.`,
                );
              });
            }, MYSTERY_COIN_TOAST_MS);

            return;
          }

          set((state) => {
            if (
              !state.pendingMystery ||
              state.pendingMystery.revealedCardId !== cardId
            ) {
              return {};
            }

            const player = state.players.find(
              ({ id }) => id === state.pendingMystery?.playerId,
            );

            return createEndTurnState(
              state,
              `${getPlayerName(player)} a terminat misterul.`,
            );
          });
        }
      },

      useInventoryItem: (itemId, targetPlayerId) => {
        let used = false;

        set((state) => {
          if (
            state.phase !== "playing" ||
            state.rolling ||
            state.pendingMystery !== null ||
            state.pendingShop !== null ||
            state.pendingTrivia !== null
          ) {
            if (state.phase === "finished") {
              return clearFinishedInteractiveState();
            }

            return {};
          }

          const currentPlayer = state.players[state.currentPlayerIndex];

          if (
            !currentPlayer ||
            !getPlayerInventory(currentPlayer).includes(itemId)
          ) {
            return {};
          }

          if (
            isActionShopItem(itemId) &&
            (state.actionItemUsedThisTurn ||
              currentPlayer.trapped ||
              !hasRolledThisTurn(state))
          ) {
            return {};
          }

          const removeCurrentItem = (player: GamePlayer) =>
            player.id === currentPlayer.id
              ? removeInventoryItem(player, itemId)
              : player;

          switch (itemId) {
            case "dice-x2":
              used = true;

              return {
                players: state.players.map((player) =>
                  player.id === currentPlayer.id
                    ? {
                        ...removeInventoryItem(player, itemId),
                        armedDiceX2: true,
                      }
                    : player,
                ),
                message: `${getPlayerName(currentPlayer)} a armat zarul x2.`,
              };
            case "coins-x3":
              used = true;

              return {
                players: state.players.map((player) =>
                  player.id === currentPlayer.id
                    ? {
                        ...removeInventoryItem(player, itemId),
                        armedCoinsX3: true,
                      }
                    : player,
                ),
                message: `${getPlayerName(currentPlayer)} a armat coins x3.`,
              };
            case "cosmic-key":
              if (!currentPlayer.trapped) {
                return {};
              }

              used = true;

              return {
                players: state.players.map((player) =>
                  player.id === currentPlayer.id
                    ? {
                        ...removeInventoryItem(player, itemId),
                        trapped: false,
                      }
                    : player,
                ),
                message: `${getPlayerName(currentPlayer)} a folosit cheia cosmica.`,
              };
            case "trivia-cancel":
              return {};
            case "star": {
              const movement = applyPositionResultToPlayer(
                currentPlayer,
                currentPlayer.positionIndex + 1,
                8,
              );
              const portalTransition = createPortalTransition(
                currentPlayer.id,
                movement.result,
              );
              const message = `${getPlayerName(currentPlayer)} a folosit steluta.`;

              used = true;

              return {
                actionItemUsedThisTurn: true,
                ...(portalTransition ? { portalTransition } : {}),
                players: state.players.map((player) =>
                  player.id === currentPlayer.id
                    ? removeInventoryItem(movement.player, itemId)
                    : player,
                ),
                ...(movement.finished
                  ? createFinishedState(
                      currentPlayer.id,
                      `${getPlayerName(currentPlayer)} a folosit steluta si a castigat!`,
                    )
                  : {
                      ...createPendingRoomActionState(
                        state,
                        currentPlayer.id,
                        movement.result,
                        message,
                      ),
                    }),
              };
            }
            case "pistol": {
              const targetPlayer = state.players.find(
                ({ id }) => id === targetPlayerId,
              );

              if (!targetPlayer) {
                return {};
              }

              const movement = applyPositionResultToPlayer(
                targetPlayer,
                targetPlayer.positionIndex + 1,
                1,
              );
              const portalTransition = createPortalTransition(
                targetPlayer.id,
                movement.result,
              );

              used = true;

              return {
                actionItemUsedThisTurn: true,
                ...(portalTransition ? { portalTransition } : {}),
                players: state.players.map((player) => {
                  if (player.id === currentPlayer.id) {
                    return removeCurrentItem(player);
                  }

                  return player.id === targetPlayer.id ? movement.player : player;
                }),
                ...(movement.finished
                  ? createFinishedState(
                      targetPlayer.id,
                      `${getPlayerName(targetPlayer)} a ajuns pe Luna!`,
                    )
                  : {
                      message: `${getPlayerName(currentPlayer)} a folosit pistolul.`,
                    }),
              };
            }
            case "claw": {
              const targetPlayer = state.players.find(
                ({ id }) => id === targetPlayerId,
              );

              if (!targetPlayer) {
                return {};
              }

              const movement = applyPositionResultToPlayer(
                targetPlayer,
                targetPlayer.positionIndex + 1,
                -3,
              );
              const portalTransition = createPortalTransition(
                targetPlayer.id,
                movement.result,
              );

              used = true;

              return {
                actionItemUsedThisTurn: true,
                ...(portalTransition ? { portalTransition } : {}),
                players: state.players.map((player) => {
                  if (player.id === currentPlayer.id) {
                    return removeCurrentItem(player);
                  }

                  return player.id === targetPlayer.id ? movement.player : player;
                }),
                message: `${getPlayerName(currentPlayer)} a folosit gheara.`,
              };
            }
            case "swap-arrow": {
              const targetPlayer = state.players.find(
                ({ id }) => id === targetPlayerId,
              );

              if (!targetPlayer) {
                return {};
              }

              const currentLanding = applyPositionResultToPlayer(
                currentPlayer,
                targetPlayer.positionIndex + 1,
                0,
              );
              const targetLanding = applyPositionResultToPlayer(
                targetPlayer,
                currentPlayer.positionIndex + 1,
                0,
              );
              const currentPortalTransition = createPortalTransition(
                currentPlayer.id,
                currentLanding.result,
              );
              const targetPortalTransition = createPortalTransition(
                targetPlayer.id,
                targetLanding.result,
              );

              used = true;

              return {
                actionItemUsedThisTurn: true,
                ...(currentPortalTransition || targetPortalTransition
                  ? {
                      portalTransition:
                        currentPortalTransition ?? targetPortalTransition,
                    }
                  : {}),
                players: state.players.map((player) => {
                  if (player.id === currentPlayer.id) {
                    return removeInventoryItem(currentLanding.player, itemId);
                  }

                  return player.id === targetPlayer.id
                    ? targetLanding.player
                    : player;
                }),
                ...(currentLanding.finished || targetLanding.finished
                  ? createFinishedState(
                      currentLanding.finished ? currentPlayer.id : targetPlayer.id,
                      `${getPlayerName(
                        currentLanding.finished ? currentPlayer : targetPlayer,
                      )} a ajuns pe Luna!`,
                    )
                  : {
                      ...createPendingRoomActionState(
                        state,
                        currentPlayer.id,
                        currentLanding.result,
                        `${getPlayerName(currentPlayer)} a folosit sageata.`,
                      ),
                    }),
              };
            }
            case "bomb": {
              let bombPortalTransition: GamePortalTransition | null = null;
              let winnerId: string | null = null;
              const movedPlayers = state.players.map((player) => {
                if (player.id === currentPlayer.id) {
                  return removeCurrentItem(player);
                }

                const movement = applyPositionResultToPlayer(
                  player,
                  player.positionIndex + 1,
                  -6,
                );
                const portalTransition = createPortalTransition(
                  player.id,
                  movement.result,
                );

                if (movement.finished) {
                  winnerId = player.id;
                }

                if (portalTransition) {
                  bombPortalTransition = portalTransition;
                }

                return movement.player;
              });

              used = true;

              return {
                actionItemUsedThisTurn: true,
                players: movedPlayers,
                ...(bombPortalTransition
                  ? { portalTransition: bombPortalTransition }
                  : {}),
                ...(winnerId
                  ? createFinishedState(
                      winnerId,
                      `${getPlayerName(
                        state.players.find(({ id }) => id === winnerId),
                      )} a ajuns pe Luna!`,
                    )
                  : {
                      message: `${getPlayerName(currentPlayer)} a folosit bomba.`,
                    }),
              };
            }
            default: {
              const exhaustiveCheck: never = itemId;
              return exhaustiveCheck;
            }
          }
        });

        return used;
      },

      startGame: (playerSetups) => {
        if (get().rolling) {
          return;
        }

        const players = playerSetups.slice(0, 4).map(normalizePlayerSetup);
        const playablePlayers = players.length > 0 ? players : defaultPlayers;
        const firstPlayer = playablePlayers[0];

        set({
          phase: "playing",
          players: playablePlayers,
          currentPlayerIndex: 0,
          diceValue: null,
          actionItemUsedThisTurn: false,
          diceAnimating: false,
          diceMultiplier: 1,
          pendingPortal: null,
          pendingShop: null,
          pendingMystery: null,
          pendingTrivia: null,
          portalTransition: null,
          rolling: false,
          shopStock: createInitialShopStock(),
          winnerId: null,
          message: `Rândul lui ${getPlayerName(firstPlayer)}.`,
          uiToast: createTurnToast(firstPlayer),
          playerCoinBursts: [],
        });
        completePortalAcknowledgement();
      },

      rollDice: async () => {
        const currentState = get();
        const currentPlayer =
          currentState.players[currentState.currentPlayerIndex];

        if (
          currentState.rolling ||
          currentState.pendingShop !== null ||
          currentState.pendingMystery !== null ||
          currentState.pendingPortal !== null ||
          currentState.pendingTrivia !== null ||
          currentState.phase !== "playing" ||
          !currentPlayer ||
          currentPlayer.positionIndex === rooms.length - 1
        ) {
          if (currentState.phase === "finished") {
            set(clearFinishedInteractiveState());
          }

          return;
        }

        const cosmicKeyIndex = getPlayerInventory(currentPlayer).indexOf("cosmic-key");
        const escapesTrapWithKey = currentPlayer.trapped && cosmicKeyIndex !== -1;

        if (
          currentPlayer.trapped &&
          !escapesTrapWithKey &&
          currentPlayer.coins < trapEscapeCoinCost
        ) {
          set((state) => {
            const nextPlayerIndex = getNextPlayerIndex(
              state.players,
              state.currentPlayerIndex,
            );
            const nextPlayer = state.players[nextPlayerIndex];

            return {
              actionItemUsedThisTurn: false,
              diceAnimating: false,
              diceMultiplier: 1,
              diceValue: null,
              rolling: false,
              currentPlayerIndex: nextPlayerIndex,
              players: state.players.map((player) =>
                player.id === currentPlayer.id
                  ? { ...player, trapped: false }
                  : player,
              ),
              message: `${getPlayerName(currentPlayer)} pierde turul in capcana. Randul lui ${getPlayerName(nextPlayer)}.`,
              uiToast: createTurnToast(nextPlayer),
            };
          });

          return;
        }

        const trapEscapeCost =
          currentPlayer.trapped &&
          !escapesTrapWithKey &&
          currentPlayer.coins >= trapEscapeCoinCost
            ? trapEscapeCoinCost
            : 0;
        const turnCoins = currentPlayer.coins - trapEscapeCost;

        if (trapEscapeCost > 0 || escapesTrapWithKey) {
          set((state) => ({
            players: state.players.map((player) =>
              player.id === currentPlayer.id
                ? {
                    ...removeInventoryItem(player, "cosmic-key"),
                    coins: turnCoins,
                    trapped: false,
                  }
                : player,
            ),
            ...(trapEscapeCost > 0
              ? {
                  uiToast: createCoinDeltaToast(
                    "Capcana",
                    currentPlayer,
                    -trapEscapeCost,
                  ),
                  playerCoinBursts: pushPlayerCoinBursts(
                    state.playerCoinBursts,
                    currentPlayer.id,
                    -trapEscapeCost,
                  ),
                }
              : {}),
          }));
        }

        const currentDiceMultiplier = currentPlayer.armedDiceX2 ? 2 : 1;

        set({
          rolling: true,
          diceAnimating: true,
          diceMultiplier: currentDiceMultiplier,
          message: `${getPlayerName(currentPlayer)} dă cu zarul...`,
        });

        const rolledDiceValue = Math.floor(Math.random() * 6) + 1;
        const diceRollDuration = getRandomDiceRollDuration();

        await sleep(diceRollDuration);

        const latestCurrentPlayer =
          get().players[currentState.currentPlayerIndex] ?? currentPlayer;
        const diceMultiplier = latestCurrentPlayer.armedDiceX2 ? 2 : 1;
        const diceValue = rolledDiceValue * diceMultiplier;
        const coinsOnEnterMultiplier = latestCurrentPlayer.armedCoinsX3 ? 3 : 1;
        const startingIndex = get().players[currentState.currentPlayerIndex]
          ?.positionIndex ?? currentPlayer.positionIndex;
        const moveResult = resolveDiceMove({
          positionId: startingIndex + 1,
          dice: diceValue,
        });
        const turnResult = resolveDiceTurn({
          positionId: startingIndex + 1,
          dice: diceValue,
          coins: turnCoins,
          coinsOnEnterMultiplier,
        });
        const portalTransition = createPortalTransition(
          currentPlayer.id,
          turnResult,
        );
        const landingIndex = moveResult.positionId - 1;

        set((state) => ({
          diceValue,
          diceAnimating: false,
          diceMultiplier,
          players: state.players.map((player) =>
            player.id === currentPlayer.id
              ? { ...player, armedDiceX2: false, lastDice: diceValue }
              : player,
          ),
          message: `${getPlayerName(currentPlayer)} a dat ${diceValue}.`,
        }));

        await sleep(DICE_POST_REVEAL_MS);

        const stepCount = Math.max(0, landingIndex - startingIndex);
        if (stepCount > 0) {
          set((state) => ({
            players: state.players.map((player) =>
              player.id === currentPlayer.id
                ? { ...player, positionIndex: landingIndex }
                : player,
            ),
          }));
          await sleep(getWalkDurationMs(stepCount));
        }

        const resolvedLandingIndex = turnResult.positionId - 1;
        const landedRoom = rooms[resolvedLandingIndex];

        if (moveResult.outcome === "overshot") {
          const message = `${getPlayerName(currentPlayer)} trebuie sa ajunga exact la camera ${finishRoomId}.`;

          await sleep(2_400);

          set((state) => createEndTurnState(state, message));

          return;
        }

        if (moveResult.outcome === "finished") {
          set((state) => ({
            phase: "finished",
            rolling: false,
            message: `${getPlayerName(currentPlayer)} a ajuns la ${landedRoom.name} și a câștigat!`,
            uiToast: createRoomToast(currentPlayer, landingIndex, "win"),
            players: state.players.map((player) =>
              player.id === currentPlayer.id
                ? { ...player, positionIndex: landingIndex }
                : player,
            ),
          }));

          set({
            actionItemUsedThisTurn: false,
            diceAnimating: false,
            pendingMystery: null,
            pendingShop: null,
            pendingTrivia: null,
            winnerId: currentPlayer.id,
          });

          return;
        }

        if (portalTransition) {
          const portalSourceRoom = rooms[landingIndex];

          set({
            pendingPortal: portalTransition,
            message: `${getPlayerName(currentPlayer)} a activat portalul din ${portalSourceRoom.name}.`,
          });

          if (currentPlayer.controller === "ai") {
            window.setTimeout(() => {
              get().acknowledgePortalTransition();
            }, 1_150);
          }

          await waitForPortalAcknowledgement(portalTransition.id);
          await sleep(150);
        }

        const message = `${getPlayerName(currentPlayer)} a ajuns la ${landedRoom.name}.`;
        const coinsDelta =
          turnResult.action === "coins"
            ? Math.max(0, turnResult.coins - turnCoins)
            : 0;
        set((state) => ({
          rolling: false,
          players: state.players.map((player) =>
            player.id === currentPlayer.id
              ? {
                  ...resolvePlayerRoomEntry(
                    player,
                    turnResult.positionId,
                    turnResult.coins,
                    turnResult.trap !== undefined,
                  ),
                  armedCoinsX3:
                    turnResult.action === "coins" ? false : player.armedCoinsX3,
                }
              : player,
          ),
          ...(portalTransition ? { portalTransition } : {}),
          uiToast: createRoomToast(
            currentPlayer,
            resolvedLandingIndex,
            coinsDelta > 0 ? "coins" : "room",
            coinsDelta,
          ),
          ...(coinsDelta > 0
            ? {
                playerCoinBursts: pushPlayerCoinBursts(
                  state.playerCoinBursts,
                  currentPlayer.id,
                  coinsDelta,
                ),
              }
            : {}),
        }));

        if (turnResult.action === "trivia") {
          const playerWithTriviaCancel = get().players.find(
            ({ id }) => id === currentPlayer.id,
          );

          if (
            getPlayerInventory(playerWithTriviaCancel).includes("trivia-cancel")
          ) {
            set((state) => ({
              players: state.players.map((player) =>
                player.id === currentPlayer.id
                  ? removeInventoryItem(player, "trivia-cancel")
                  : player,
              ),
              message: `${message} Anularea trivia a sarit intrebarea.`,
            }));

            await sleep(2_400);

            set((state) =>
              createEndTurnState(
                state,
                `${getPlayerName(currentPlayer)} a sarit trivia.`,
              ),
            );

            return;
          }

          set({
            rolling: false,
            pendingTrivia: {
              playerId: currentPlayer.id,
              roomId: turnResult.positionId,
              question: drawTriviaQuestion(),
              result: null,
            },
            message: `${message} Raspunde la intrebarea trivia.`,
          });

          return;
        }

        if (turnResult.action === "mystery") {
          const offer = createMysteryOffer();

          set({
            pendingMystery: {
              playerId: currentPlayer.id,
              roomId: turnResult.positionId,
              cards: offer.cards,
              revealedCardId: null,
            },
            rolling: false,
            message: `${message} A gasit carti misterioase.`,
          });

          if (currentPlayer.controller === "ai") {
            await sleep(900);

            const pendingMystery = get().pendingMystery;
            const randomIndex = pendingMystery
              ? Math.floor(Math.random() * pendingMystery.cards.length)
              : -1;
            const selectedCard = pendingMystery?.cards[randomIndex];

            if (selectedCard) {
              get().pickMysteryCard(selectedCard.id);
              await sleep(3_400);
              get().acknowledgeMystery();
            }
          }

          return;
        }

        if (turnResult.action === "shop") {
          if (currentPlayer.controller === "ai") {
            set((state) => {
              const aiPlayer = state.players.find(
                ({ id }) => id === currentPlayer.id,
              );
              const affordableItems = aiPlayer
                ? getAffordableShopItems(aiPlayer, state.shopStock)
                : [];
              const randomIndex = Math.floor(
                Math.random() * affordableItems.length,
              );
              const item = affordableItems[randomIndex];

              if (!aiPlayer || !item) {
                return {};
              }

              return purchaseShopItem(state, aiPlayer.id, item.id, false) ?? {};
            });

            await sleep(2_400);

            set((state) =>
              createEndTurnState(
                state,
                `${getPlayerName(currentPlayer)} a vizitat magazinul.`,
              ),
            );

            return;
          }

          set({
            pendingShop: {
              playerId: currentPlayer.id,
              roomId: turnResult.positionId,
              purchased: false,
            },
            rolling: false,
            message: `${message} A intrat in magazin.`,
          });

          return;
        }

        await sleep(2_400);

        set((state) => {
          if (
            state.pendingShop !== null ||
            state.pendingMystery !== null ||
            state.pendingTrivia !== null ||
            state.pendingPortal !== null
          ) {
            return { rolling: false };
          }

          return createEndTurnState(state, message);
        });
      },

      resetGame: () => {
        set({
          ...initialPersistedState,
          actionItemUsedThisTurn: false,
          diceAnimating: false,
          diceMultiplier: 1,
          pendingPortal: null,
          pendingShop: null,
          pendingMystery: null,
          pendingTrivia: null,
          portalTransition: null,
          rolling: false,
          shopStock: createInitialShopStock(),
          winnerId: null,
          uiToast: null,
          playerCoinBursts: [],
        });
        completePortalAcknowledgement();
      },
    }),
    {
      name: "space-board-demo",
      version: 4,
      migrate: migratePersistedState,
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as PersistedState),
        playerCoinBursts: currentState.playerCoinBursts ?? [],
      }),
      partialize: (state): PersistedState => ({
        phase: state.phase,
        players: state.players,
        currentPlayerIndex: state.currentPlayerIndex,
        diceValue: state.diceValue,
        message: state.message,
        shopStock: state.shopStock,
        winnerId: state.winnerId,
      }),
    },
  ),
);
