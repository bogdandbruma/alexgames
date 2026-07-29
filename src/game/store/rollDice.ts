import { rooms } from "../board";
import { finishRoomId, trapEscapeCoinCost } from "../rooms";
import { resolveDiceMove, resolveDiceTurn } from "../rules";
import { createMysteryOffer } from "../mystery";
import { drawTriviaQuestion } from "../trivia";
import { pushPlayerCoinBursts } from "../playerCoinBurst";
import { getWalkDurationMsBetweenRooms } from "../movementTiming";
import { portalAcknowledgement } from "./portalAck";
import type { GameState, GameStoreSet } from "./types";
import {
  clearFinishedInteractiveState,
  createCoinDeltaToast,
  createEndTurnState,
  createPortalTransition,
  createRoomToast,
  createTurnToast,
  DICE_POST_REVEAL_MS,
  getAffordableShopItems,
  getNextPlayerIndex,
  getPlayerInventory,
  getPlayerName,
  getRandomDiceRollDuration,
  purchaseShopItem,
  removeInventoryItem,
  resolvePlayerRoomEntry,
  sleep,
} from "./helpers";

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
    set((state) => ({
      players: state.players.map((player) =>
        player.id === currentPlayer.id
          ? { ...player, positionIndex: landingIndex }
          : player,
      ),
    }));
    await sleep(
      getWalkDurationMsBetweenRooms(startingIndex + 1, landingIndex + 1),
    );
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
}
