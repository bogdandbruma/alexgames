import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createDebouncedStorage } from "./persist/debounceStorage";
import { canAiAutoEndTurn } from "./aiInventory";
import { resolveTriviaAnswer } from "./rules";
import { getMysteryCardById } from "./mystery";
import {
  createInitialShopStock,
  getShopItemById,
  isActionShopItem,
} from "./shop";
import { pushPlayerCoinBursts } from "./playerCoinBurst";
import { portalAcknowledgement } from "./store/portalAck";
import { migratePersistedState } from "./store/migrate";
import { executeRollDice } from "./store/rollDice";
import { executeAcknowledgeMystery } from "./store/acknowledgeMystery";
import { executeResolveTrap } from "./store/resolveTrap";
import { syncFocusedPlayerWalkIfMoved } from "./store/playerWalk";
import {
  applyPositionResultToPlayer,
  canPlayerEndTurn,
  clearFinishedInteractiveState,
  createCoinDeltaToast,
  createEndTurnState,
  createFinishedState,
  createPendingRoomActionState,
  createPortalTransition,
  createTriviaToast,
  createTurnToast,
  defaultPlayers,
  getPlayerInventory,
  getPlayerName,
  hasRolledThisTurn,
  initialPersistedState,
  normalizePlayerSetup,
  purchaseShopItem,
  removeInventoryItem,
  resolveOrphanedPortalLanding,
  sleep,
  TRIVIA_MODAL_RESULT_MS,
  TRIVIA_TOAST_MS,
  waitForPortalTransitionBeforeTrivia,
} from "./store/helpers";
import {
  getPendingMystery,
  getPendingPortal,
  getPendingShop,
  getPendingTrap,
  getPendingTrivia,
} from "./store/pendingEvent";
import type {
  GamePlayer,
  GamePortalTransition,
  GameState,
  PersistedState,
  TrapEscapeChoice,
  TriviaFeedback,
} from "./store/types";

export * from "./store/types";

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...initialPersistedState,
      activePlayerWalk: null,
      diceAnimating: false,
      diceMultiplier: 1,
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
        const pendingPortal = getPendingPortal(get().pendingEvent);
        if (!pendingPortal) return;
        const resumed = portalAcknowledgement.completeAcknowledgement(pendingPortal.id);
        if (resumed) {
          set({ pendingEvent: null });
          return;
        }
        set((state) => resolveOrphanedPortalLanding(state) ?? {});
      },

      answerTrivia: async (answer) => {
        const state = get();
        const pendingTrivia = getPendingTrivia(state.pendingEvent);

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
        const answeredAtPlayerIndex = state.currentPlayerIndex;

        set({
          pendingEvent: {
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

        await sleep(TRIVIA_MODAL_RESULT_MS);

        set((latestState) => {
          const latestTrivia = getPendingTrivia(latestState.pendingEvent);

          if (
            latestState.phase !== "playing" ||
            latestTrivia?.playerId !== pendingTrivia.playerId ||
            latestTrivia.question.id !== pendingTrivia.question.id ||
            !latestTrivia.result
          ) {
            return {};
          }

          return {
            pendingEvent: null,
            uiToast: createTriviaToast(answeredPlayer, triviaFeedback),
            playerCoinBursts: pushPlayerCoinBursts(
              latestState.playerCoinBursts,
              pendingTrivia.playerId,
              triviaFeedback.coinsDelta,
            ),
          };
        });

        await sleep(TRIVIA_TOAST_MS);

        set((latestState) => {
          const latestTrivia = getPendingTrivia(latestState.pendingEvent);

          if (
            latestState.phase !== "playing" ||
            latestTrivia !== null ||
            latestState.currentPlayerIndex !== answeredAtPlayerIndex
          ) {
            return {};
          }

          return createEndTurnState(
            latestState,
            `${resultMessage} ${getPlayerName(answeredPlayer)} continua aventura.`,
          );
        });
      },

      buyShopItem: (itemId) => {
        let bought = false;

        set((state) => {
          const pendingShop = getPendingShop(state.pendingEvent);

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

          const pendingShop = getPendingShop(state.pendingEvent);

          if (!pendingShop) {
            return {};
          }

          const player = state.players.find(
            ({ id }) => id === pendingShop.playerId,
          );

          return createEndTurnState(
            state,
            `${getPlayerName(player)} a iesit din magazin.`,
          );
        });
      },

      endTurn: () => {
        set((state) => {
          if (!canPlayerEndTurn(state) && !canAiAutoEndTurn(state)) {
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
          const pendingMystery = getPendingMystery(state.pendingEvent);

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
            pendingEvent: {
              ...pendingMystery,
              revealedCardId: cardId,
            },
            message: `${getPlayerName(player)} a ales ${card.title}. ${card.description}`,
          };
        });

        return picked;
      },

      acknowledgeMystery: () => executeAcknowledgeMystery({ get, set }),

      resolveTrap: (choice: TrapEscapeChoice) =>
        executeResolveTrap({ set, choice }),

      useInventoryItem: async (itemId, targetPlayerId) => {
        let used = false;
        let endTurnAfterTriviaCancel = false;
        const deferredUpdate: {
          state: Partial<GameState> | null;
          triviaPlayerId: string | null;
        } = {
          state: null,
          triviaPlayerId: null,
        };
        const playersBefore = get().players;
        const focusedPlayerId =
          get().players[get().currentPlayerIndex]?.id ?? null;

        set((state) => {
          if (
            state.phase !== "playing" ||
            state.rolling ||
            (state.pendingEvent !== null &&
              (state.pendingEvent.type !== "trivia" || itemId !== "trivia-cancel"))
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
                pendingEvent: getPendingTrap(state.pendingEvent)
                  ? null
                  : state.pendingEvent,
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
            case "trivia-cancel": {
              const pendingTrivia = getPendingTrivia(state.pendingEvent);

              if (
                !pendingTrivia ||
                pendingTrivia.playerId !== currentPlayer.id ||
                pendingTrivia.result !== null
              ) {
                return {};
              }

              used = true;
              endTurnAfterTriviaCancel = true;

              return {
                pendingEvent: null,
                players: state.players.map((player) =>
                  player.id === currentPlayer.id
                    ? removeInventoryItem(player, itemId)
                    : player,
                ),
                message: `${getPlayerName(currentPlayer)} a sarit trivia.`,
              };
            }
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
              const playersAfterMove = state.players.map((player) =>
                player.id === currentPlayer.id
                  ? removeInventoryItem(movement.player, itemId)
                  : player,
              );

              used = true;

              if (movement.finished) {
                return {
                  ...(portalTransition ? { portalTransition } : {}),
                  players: playersAfterMove,
                  ...createFinishedState(
                    currentPlayer.id,
                    `${getPlayerName(currentPlayer)} a folosit steluta si a castigat!`,
                  ),
                  actionItemUsedThisTurn: true,
                };
              }

              deferredUpdate.state = createPendingRoomActionState(
                { ...state, players: playersAfterMove },
                currentPlayer.id,
                movement.result,
                message,
              );
              deferredUpdate.triviaPlayerId =
                getPendingTrivia(deferredUpdate.state.pendingEvent ?? null)
                  ?.playerId ?? null;

              return {
                actionItemUsedThisTurn: true,
                ...(portalTransition ? { portalTransition } : {}),
                players: playersAfterMove,
                message,
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

              const swapMessage = `${getPlayerName(currentPlayer)} a folosit sageata.`;
              const playersAfterSwap = state.players.map((player) => {
                if (player.id === currentPlayer.id) {
                  return removeInventoryItem(currentLanding.player, itemId);
                }

                return player.id === targetPlayer.id
                  ? targetLanding.player
                  : player;
              });

              if (currentLanding.finished || targetLanding.finished) {
                return {
                  ...(currentPortalTransition || targetPortalTransition
                    ? {
                        portalTransition:
                          currentPortalTransition ?? targetPortalTransition,
                      }
                    : {}),
                  players: playersAfterSwap,
                  ...createFinishedState(
                    currentLanding.finished ? currentPlayer.id : targetPlayer.id,
                    `${getPlayerName(
                      currentLanding.finished ? currentPlayer : targetPlayer,
                    )} a ajuns pe Luna!`,
                  ),
                  actionItemUsedThisTurn: true,
                };
              }

              deferredUpdate.state = createPendingRoomActionState(
                { ...state, players: playersAfterSwap },
                currentPlayer.id,
                currentLanding.result,
                swapMessage,
              );
              deferredUpdate.triviaPlayerId =
                getPendingTrivia(deferredUpdate.state.pendingEvent ?? null)
                  ?.playerId ?? null;

              return {
                actionItemUsedThisTurn: true,
                ...(currentPortalTransition || targetPortalTransition
                  ? {
                      portalTransition:
                        currentPortalTransition ?? targetPortalTransition,
                    }
                  : {}),
                players: playersAfterSwap,
                message: swapMessage,
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

        if (used && focusedPlayerId) {
          await syncFocusedPlayerWalkIfMoved(
            get,
            set,
            playersBefore,
            focusedPlayerId,
          );

          if (endTurnAfterTriviaCancel) {
            await sleep(1_200);
            set((state) => {
              if (state.phase !== "playing") {
                return {};
              }

              const player = state.players[state.currentPlayerIndex];

              return createEndTurnState(
                state,
                `${getPlayerName(player)} a sarit trivia.`,
              );
            });
            return used;
          }

          if (deferredUpdate.state) {
            if (deferredUpdate.triviaPlayerId) {
              await waitForPortalTransitionBeforeTrivia(
                get,
                deferredUpdate.triviaPlayerId,
              );
            }

            set((state) => {
              if (state.phase !== "playing") {
                return {};
              }

              return deferredUpdate.state ?? {};
            });
          }
        }

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
          activePlayerWalk: null,
          diceAnimating: false,
          diceMultiplier: 1,
          pendingEvent: null,
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
          activePlayerWalk: null,
          diceAnimating: false,
          diceMultiplier: 1,
          pendingEvent: null,
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
      version: 5,
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
        actionItemUsedThisTurn: state.actionItemUsedThisTurn,
        message: state.message,
        shopStock: state.shopStock,
        winnerId: state.winnerId,
        pendingEvent: state.pendingEvent,
      }),
    },
  ),
);
