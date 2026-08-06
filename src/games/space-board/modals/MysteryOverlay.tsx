import { Sparkles } from "lucide-react";
import { useGameStore } from "../../../game/store";
import { getPendingMystery } from "../../../game/store/pendingEvent";
import { MysteryCardDescription } from "./MysteryCardDescription";

export function MysteryOverlay() {
  const pendingEvent = useGameStore((state) => state.pendingEvent);
  const pendingMystery = getPendingMystery(pendingEvent);
  const pickMysteryCard = useGameStore((state) => state.pickMysteryCard);
  const acknowledgeMystery = useGameStore((state) => state.acknowledgeMystery);

  if (!pendingMystery) {
    return null;
  }

  const revealedMysteryCard =
    pendingMystery.revealedCardId != null
      ? pendingMystery.cards.find(
          ({ id }) => id === pendingMystery.revealedCardId,
        )
      : undefined;

  return (
    <div className="mystery-overlay" role="dialog" aria-modal="true">
      <div className="mystery-panel">
        <div className="mystery-heading">
          <Sparkles aria-hidden="true" size={22} />
          <div>
            <span>Mister spatial</span>
            <strong>Camera {pendingMystery.roomId}</strong>
          </div>
        </div>

        <div className="mystery-card-row" aria-label="Carti misterioase">
          {pendingMystery.cards.map((card, cardIndex) => {
            const revealed = pendingMystery.revealedCardId === card.id;
            const locked = pendingMystery.revealedCardId !== null;

            return (
              <button
                key={`${pendingMystery.roomId}-${card.id}-${cardIndex}`}
                type="button"
                className={
                  revealed
                    ? "mystery-card-button mystery-card-revealed"
                    : locked
                      ? "mystery-card-button mystery-card-dimmed"
                      : "mystery-card-button mystery-card-hidden"
                }
                disabled={locked}
                onClick={() => pickMysteryCard(card.id)}
                aria-label={
                  revealed
                    ? `Carte dezvaluita: ${card.title}`
                    : "Alege carte misterioasa"
                }
              >
                <span className="mystery-card-back">
                  <Sparkles aria-hidden="true" size={24} />
                </span>
                <span className="mystery-card-face">
                  <span className="mystery-card-icon">{card.icon}</span>
                  <strong>{card.title}</strong>
                  <small>
                    <MysteryCardDescription text={card.description} />
                  </small>
                </span>
              </button>
            );
          })}
        </div>

        {pendingMystery.revealedCardId ? (
          revealedMysteryCard ? (
            <div className="mystery-reveal-footer">
              <p className="mystery-reveal-summary">
                <span className="mystery-reveal-icon" aria-hidden="true">
                  {revealedMysteryCard.icon}
                </span>
                <span>
                  <strong>{revealedMysteryCard.title}</strong>
                  <small>
                    <MysteryCardDescription
                      text={revealedMysteryCard.description}
                    />
                  </small>
                </span>
              </p>
              <button
                type="button"
                className="primary-button mystery-ok-button"
                onClick={() => void acknowledgeMystery()}
              >
                <Sparkles aria-hidden="true" size={18} />
                <span>Am înțeles</span>
              </button>
            </div>
          ) : null
        ) : (
          <p className="mystery-pick-hint">Alege o carte misterioasă.</p>
        )}
      </div>
    </div>
  );
}
