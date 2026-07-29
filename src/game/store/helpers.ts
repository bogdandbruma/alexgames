import { rooms } from "../board";
import {
  resolvePositionChange,
  type DiceTurnResult,
} from "../rules";
import {
  createMysteryOffer,
  type MysteryCard,
  type MysteryPlayerState,
} from "../mystery";
import {
  createInitialShopStock,
  getShopItemById,
  MAX_INVENTORY_ITEMS,
  shopItems,
  type ShopItemId,
  type ShopStock,
} from "../shop";
import { drawTriviaQuestion } from "../trivia";
import {
  defaultAvatarId,
  normalizeAvatarId,
} from "../avatars";
import type {
  GamePlayer,
  GamePortalTransition,
  GameState,
  GameToast,
  PlayerSetup,
  PersistedState,
  TriviaFeedback,
} from "./types";
import { PLAYER_NAME_MAX_LENGTH } from "./types";
import { nextPortalTransitionId } from "./portalTransitionId";

export const defaultPlayers: GamePlayer[] = [
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

export const initialPersistedState: PersistedState = {
  phase: "setup",
  players: defaultPlayers,
  currentPlayerIndex: 0,
  diceValue: null,
  shopStock: createInitialShopStock(),
  winnerId: null,
  message: "Alege jucători și prieteni blănoși, apoi pornește jocul!",
};

export const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });

export const DICE_ROLL_MIN_MS = 1_000;
export const DICE_ROLL_MAX_MS = 2_000;
export const DICE_RESULT_HOLD_MS = 2_000;
export const DICE_FLY_HOME_MS = 920;
export const DICE_POST_REVEAL_MS =
  DICE_RESULT_HOLD_MS + DICE_FLY_HOME_MS + 80;

export const MYSTERY_COIN_TOAST_MS = 2_400;
export const TRIVIA_MODAL_RESULT_MS = 1_800;
export const TRIVIA_TOAST_MS = 2_400;

export const getRandomDiceRollDuration = () => {
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

export const getNextPlayerIndex = (players: GamePlayer[], currentIndex: number) =>
  (currentIndex + 1) % players.length;

export const getPlayerName = (player: GamePlayer | undefined) =>
  player?.name.trim() || "Jucător";

export const getPlayerInventory = (player: GamePlayer | undefined): ShopItemId[] =>
  player?.inventory ?? [];

export const hasInventorySpace = (player: GamePlayer) =>
  getPlayerInventory(player).length < MAX_INVENTORY_ITEMS;

export const normalizePlayerRuntimeState = (player: GamePlayer): GamePlayer => ({
  ...player,
  inventory: getPlayerInventory(player),
  armedCoinsX3: player.armedCoinsX3 ?? false,
  armedDiceX2: player.armedDiceX2 ?? false,
});

export const hasRolledThisTurn = (state: GameState) =>
  state.diceValue !== null && !state.rolling;

export const getAffordableShopItems = (player: GamePlayer, shopStock: ShopStock) =>
  shopItems.filter(
    (item) =>
      shopStock[item.id] &&
      player.coins >= item.cost &&
      hasInventorySpace(player),
  );

let toastId = 0;

export const createTurnToast = (player: GamePlayer | undefined): GameToast => ({
  id: (toastId += 1),
  title: "Urmează jucătorul",
  description: getPlayerName(player),
  tone: "player",
});

export const createRoomToast = (
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

export const createTriviaToast = (
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

export const createMysteryCoinToast = (
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

export const createCoinDeltaToast = (
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

export const createEndTurnState = (
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

export const createFinishedState = (
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

export const clearFinishedInteractiveState = (): Pick<
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

export const purchaseShopItem = (
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

export const removeInventoryItem = (
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

export const applyPositionResultToPlayer = (
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

export const createPortalTransition = (
  playerId: string,
  result: DiceTurnResult,
): GamePortalTransition | null =>
  result.portal
    ? {
        id: nextPortalTransitionId(),
        playerId,
        fromRoomId: result.portal.from,
        toRoomId: result.portal.to,
      }
    : null;

export const createPendingRoomActionState = (
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

export const shouldPauseForRoomAction = (result: DiceTurnResult | null) =>
  result?.action === "trivia" ||
  result?.action === "shop" ||
  result?.action === "mystery";

export const applyMysteryPlayersToStore = (
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

export const resolvePlayerRoomEntry = (
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

export const normalizePlayerSetup = (
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
