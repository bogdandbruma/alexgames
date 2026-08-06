import { rooms } from "../board";
import { finishRoomId } from "../rooms";
import { resolveDiceMove, resolveDiceTurn } from "../rules";
import { createMysteryOffer } from "../mystery";
import { drawTriviaQuestion } from "../trivia";
import { pushPlayerCoinBursts } from "../playerCoinBurst";
import { portalAcknowledgement } from "./portalAck";
import {
  createMysteryEvent,
  createPortalEvent,
  createShopEvent,
  createTrapEvent,
  createTriviaEvent,
  getPendingMystery,
} from "./pendingEvent";
import type { GameState, GameStoreSet } from "./types";
import {
  clearFinishedInteractiveState,
  createEndTurnState,
  createPortalTransition,
  createRoomToast,
  DICE_POST_REVEAL_MS,
  applyTriviaCancelIfAvailable,
  getAffordableShopItems,
  getPlayerName,
  getRandomDiceRollDuration,
  purchaseShopItem,
  resolvePlayerRoomEntry,
  shouldDeferTurnEndForActionItems,
  sleep,
  waitForPortalTransitionBeforeTrivia,
} from "./helpers";
import {
  createActivePlayerWalk,
  runActivePlayerWalk,
} from "./playerWalk";

export async function executeRollDice(deps: {
  get: () => GameState;
  set: GameStoreSet;
}): Promise<void> {
  const { get, set } = deps;
  const currentState = get();
  const currentPlayer =
    currentState.players[currentState.currentPlayerIndex];

  if (
    currentState.rolling ||
    currentState.pendingEvent !== null ||
    currentState.phase !== "playing" ||
    !currentPlayer ||
    currentPlayer.positionIndex === rooms.length - 1
  ) {
    if (currentState.phase === "finished") {
      set(clearFinishedInteractiveState());
    }

    return;
  }

  if (currentPlayer.trapped) {
    set({
      pendingEvent: createTrapEvent(
        currentPlayer.id,
        currentPlayer.positionIndex + 1,
      ),
      message: `${getPlayerName(currentPlayer)} e prins in capcana.`,
    });
    return;
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
  const turnCoins = latestCurrentPlayer.coins;
  const startingIndex =
    get().players[currentState.currentPlayerIndex]?.positionIndex ??
    currentPlayer.positionIndex;
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

  if (landingIndex !== startingIndex) {
    const fromRoomId = startingIndex + 1;
    const toRoomId = landingIndex + 1;

    set((state) => {
      const players = state.players.map((player) =>
        player.id === currentPlayer.id
          ? { ...player, positionIndex: landingIndex }
          : player,
      );

      return {
        activePlayerWalk: createActivePlayerWalk(
          { ...state, players },
          currentPlayer.id,
          fromRoomId,
          toRoomId,
        ),
        players,
      };
    });

    const walk = get().activePlayerWalk;

    if (walk) {
      await runActivePlayerWalk(set, walk);
    }
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
      pendingEvent: null,
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
      winnerId: currentPlayer.id,
    });

    return;
  }

  if (portalTransition) {
    const portalSourceRoom = rooms[landingIndex];

    set({
      pendingEvent: createPortalEvent(portalTransition),
      message: `${getPlayerName(currentPlayer)} a activat portalul din ${portalSourceRoom.name}.`,
    });

    if (currentPlayer.controller === "ai") {
      window.setTimeout(() => {
        get().acknowledgePortalTransition();
      }, 1_150);
    }

    await portalAcknowledgement.waitForAcknowledgement(portalTransition.id);
    await sleep(150);
  }

  const message = `${getPlayerName(currentPlayer)} a ajuns la ${landedRoom.name}.`;
  const coinsDelta =
    turnResult.action === "coins"
      ? Math.max(0, turnResult.coins - turnCoins)
      : 0;
  set((state) => ({
    rolling: false,
    pendingEvent: null,
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
    const triviaCancel = applyTriviaCancelIfAvailable(
      get(),
      currentPlayer.id,
      message,
    );

    if (triviaCancel) {
      set(triviaCancel);

      await sleep(2_400);

      set((state) =>
        createEndTurnState(
          state,
          `${getPlayerName(currentPlayer)} a sarit trivia.`,
        ),
      );

      return;
    }

    await waitForPortalTransitionBeforeTrivia(get, currentPlayer.id);

    set({
      rolling: false,
      pendingEvent: createTriviaEvent(
        currentPlayer.id,
        turnResult.positionId,
        drawTriviaQuestion(),
      ),
      message: `${message} Raspunde la intrebarea trivia.`,
    });

    return;
  }

  if (turnResult.action === "mystery") {
    const offer = createMysteryOffer();

    set({
      pendingEvent: createMysteryEvent(
        currentPlayer.id,
        turnResult.positionId,
        offer.cards,
      ),
      rolling: false,
      message: `${message} A gasit carti misterioase.`,
    });

    if (currentPlayer.controller === "ai") {
      await sleep(900);

      const pendingMystery = getPendingMystery(get().pendingEvent);
      const randomIndex = pendingMystery
        ? Math.floor(Math.random() * pendingMystery.cards.length)
        : -1;
      const selectedCard = pendingMystery?.cards[randomIndex];

      if (selectedCard) {
        get().pickMysteryCard(selectedCard.id);
        await sleep(3_400);
        await get().acknowledgeMystery();
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
      pendingEvent: createShopEvent(currentPlayer.id, turnResult.positionId),
      rolling: false,
      message: `${message} A intrat in magazin.`,
    });

    return;
  }

  await sleep(2_400);

  set((state) => {
    if (state.pendingEvent !== null) {
      return { rolling: false };
    }

    const activePlayer = state.players[state.currentPlayerIndex];

    if (
      state.diceValue === null ||
      activePlayer?.id !== currentPlayer.id
    ) {
      return { rolling: false };
    }

    if (shouldDeferTurnEndForActionItems(state)) {
      return {
        rolling: false,
        message: `${message} Poți folosi un item din inventar sau termină turul.`,
      };
    }

    return createEndTurnState(state, message);
  });
}
