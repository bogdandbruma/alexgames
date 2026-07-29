import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createDebouncedStorage } from "./persist/debounceStorage";
import { resolveTriviaAnswer, type DiceTurnResult } from "./rules";
import {
  applyMysteryEffect,
  getMysteryCardById,
  type MysteryCardId,
} from "./mystery";
import {
  createInitialShopStock,
  getShopItemById,
  isActionShopItem,
} from "./shop";
import { pushPlayerCoinBursts } from "./playerCoinBurst";
import { portalAcknowledgement } from "./store/portalAck";
import { migratePersistedState } from "./store/migrate";
import { executeRollDice } from "./store/rollDice";
import {
  applyMysteryPlayersToStore,
  applyPositionResultToPlayer,
  clearFinishedInteractiveState,
  createCoinDeltaToast,
  createEndTurnState,
  createFinishedState,
  createMysteryCoinToast,
  createPendingRoomActionState,
  createPortalTransition,
  createTriviaToast,
  createTurnToast,
  defaultPlayers,
  getPlayerInventory,
  getPlayerName,
  canPlayerEndTurn,
  hasRolledThisTurn,
  initialPersistedState,
  MYSTERY_COIN_TOAST_MS,
  normalizePlayerSetup,
  purchaseShopItem,
  removeInventoryItem,
  shouldPauseForRoomAction,
  TRIVIA_MODAL_RESULT_MS,
  TRIVIA_TOAST_MS,
} from "./store/helpers";
import type {
  GamePlayer,
  GamePortalTransition,
  GameState,
  PersistedState,
  TriviaFeedback,
} from "./store/types";

export * from "./store/types";

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
        portalAcknowledgement.completeAcknowledgement(pendingPortal.id);
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

            return createEndTurnState(
              latestState,
              `${resultMessage} ${getPlayerName(answeredPlayer)} continua aventura.`,
            );
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

      endTurn: () => {
        set((state) => {
          if (!canPlayerEndTurn(state)) {
            if (state.phase === "finished") {
              return clearFinishedInteractiveState();
            }

            return {};
          }

          const player = state.players[state.currentPlayerIndex];

          return createEndTurnState(
            state,
            `${getPlayerName(player)} a terminat turul.`,
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
        portalAcknowledgement.completeAcknowledgement();
      },

      rollDice: () => executeRollDice({ get, set }),

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
        portalAcknowledgement.completeAcknowledgement();
      },
    }),
    {
      name: "space-board-demo",
      storage: createJSONStorage(() =>
        createDebouncedStorage(localStorage, 300),
      ),
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
