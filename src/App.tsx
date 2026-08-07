import { Box, Gamepad2, Palette, Play, Sparkles, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { avatarOptionById } from "./game/avatars";
import { games } from "./games/registry";
import { parseAppRouteFromHash, setGameHash } from "./online/onlineRoute";
import { PlaySession } from "./online/PlaySession";

function App() {
  const [route, setRoute] = useState(parseAppRouteFromHash);
  const selectedGame = games.find((game) => game.id === route.gameId);

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseAppRouteFromHash());
    };

    window.addEventListener("hashchange", handleHashChange);

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const selectGame = (gameId: string) => {
    setGameHash(gameId);
    setRoute({ gameId, onlineRoomId: null });
  };

  const returnToDashboard = () => {
    window.history.pushState(
      "",
      document.title,
      `${window.location.pathname}${window.location.search}`,
    );
    setRoute({ gameId: null, onlineRoomId: null });
  };

  if (selectedGame) {
    const SelectedGame = selectedGame.Component;

    return (
      <PlaySession
        Game={SelectedGame}
        gameSlug={selectedGame.id}
        OnlinePlay={selectedGame.OnlinePlay}
        initialOnlineRoomId={route.onlineRoomId}
        onExit={returnToDashboard}
      />
    );
  }

  const gameCountLabel = games.length === 1 ? "joc" : "jocuri";

  return (
    <main className="dashboard-shell">
      <div className="dashboard-body">
        <section className="dashboard-hero" aria-labelledby="games-heading">
          <div className="dashboard-hero-copy">
            <p className="eyebrow dashboard-eyebrow">Bibliotecă de jocuri</p>
            <h1 id="games-heading">Jocurile Brumix</h1>
            <p className="subtitle dashboard-subtitle">
              Alege un joc și distrează-te — fiecare are locul lui special.
            </p>
          </div>

          <div className="library-summary" aria-label="Rezumat bibliotecă">
            <Gamepad2 aria-hidden="true" size={24} />
            <strong>{games.length}</strong>
            <span>{gameCountLabel}</span>
          </div>
        </section>

        <section className="games-grid" aria-label="Jocuri disponibile">
          {games.map(
            ({
              id,
              title,
              cardHighlight,
              cardBody,
              featuredAvatarIds,
              status,
              players,
              theme,
              creatorName,
              Icon,
            }) => (
            <article className="game-card" key={id}>
              <div className="game-card-header">
                <span className="game-icon" aria-hidden="true">
                  <Icon size={28} strokeWidth={2.25} />
                </span>
                <div className="game-card-head-copy">
                  <h2>{title}</h2>
                  <div className="game-card-teaser">
                    <div
                      className="game-card-pets"
                      aria-label="Alege un prieten blănos"
                    >
                      {featuredAvatarIds.map((avatarId, index) => {
                        const { Icon: PetIcon, labelRo } =
                          avatarOptionById[avatarId];
                        return (
                          <span
                            key={avatarId}
                            className={`game-card-pet game-card-pet--${avatarId}`}
                            style={{ animationDelay: `${index * 0.12}s` }}
                            title={labelRo}
                            role="img"
                            aria-label={labelRo}
                            tabIndex={0}
                          >
                            <PetIcon aria-hidden="true" size={22} strokeWidth={2.25} />
                            <span className="game-card-pet-label">{labelRo}</span>
                          </span>
                        );
                      })}
                    </div>
                    <div className="game-card-story">
                      <p className="game-card-highlight">
                        <Sparkles aria-hidden="true" size={15} />
                        {cardHighlight}
                      </p>
                      <p className="game-card-body">{cardBody}</p>
                    </div>
                  </div>
                </div>
                <span className="game-status">
                  <Sparkles aria-hidden="true" size={14} />
                  {status}
                </span>
              </div>

              <div className="game-card-bottom">
                <div className="game-card-bottom-meta">
                  <ul className="game-meta-chips" aria-label="Detalii joc">
                    <li className="game-meta-chip game-meta-chip--mode">
                      <Box aria-hidden="true" size={16} strokeWidth={2.25} />
                      <span>{theme}</span>
                    </li>
                    <li className="game-meta-chip game-meta-chip--players">
                      <Users aria-hidden="true" size={16} strokeWidth={2.25} />
                      <span>{players}</span>
                    </li>
                    <li
                      className="game-meta-chip game-meta-chip--creator"
                      aria-label={`Joc creat de ${creatorName}`}
                    >
                      <Palette aria-hidden="true" size={16} strokeWidth={2.25} />
                      <span>
                        Creat de <strong>{creatorName}</strong>
                      </span>
                    </li>
                  </ul>
                </div>

              <button
                type="button"
                className="primary-button game-card-action dashboard-play-button"
                onClick={() => selectGame(id)}
              >
                <Play aria-hidden="true" size={19} />
                <span>Joacă</span>
              </button>
              </div>
            </article>
          ),
          )}
        </section>
      </div>

      <footer className="dashboard-footer">
        <p className="dashboard-footer-names">Alex &amp; Sara</p>
        <p className="dashboard-footer-message">
          Am făcut aceste jocuri pentru prietenii noștri — sperăm să vă placă la
          fel de mult cum ne place nouă să le jucăm împreună!
        </p>
      </footer>
    </main>
  );
}

export default App;
