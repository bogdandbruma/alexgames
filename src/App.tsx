import { Gamepad2, Play, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { games } from "./games/registry";

const getSelectedGameIdFromHash = () =>
  window.location.hash.replace(/^#\/?/, "") || null;

function App() {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(
    getSelectedGameIdFromHash,
  );
  const selectedGame = games.find((game) => game.id === selectedGameId);

  useEffect(() => {
    const handleHashChange = () => {
      setSelectedGameId(getSelectedGameIdFromHash());
    };

    window.addEventListener("hashchange", handleHashChange);

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const selectGame = (gameId: string) => {
    window.location.hash = gameId;
    setSelectedGameId(gameId);
  };

  const returnToDashboard = () => {
    window.history.pushState(
      "",
      document.title,
      `${window.location.pathname}${window.location.search}`,
    );
    setSelectedGameId(null);
  };

  if (selectedGame) {
    const SelectedGame = selectedGame.Component;

    return <SelectedGame onExit={returnToDashboard} />;
  }

  return (
    <main className="dashboard-shell">
      <section className="dashboard-hero" aria-labelledby="games-heading">
        <div className="dashboard-hero-copy">
          <p className="eyebrow">Game library</p>
          <h1 id="games-heading">Games</h1>
          <p className="subtitle">
            Choose a saved prototype and keep each game in its own space.
          </p>
        </div>

        <div className="library-summary" aria-label="Library summary">
          <Gamepad2 aria-hidden="true" size={24} />
          <strong>{games.length}</strong>
          <span>{games.length === 1 ? "game" : "games"}</span>
        </div>
      </section>

      <section className="games-grid" aria-label="Available games">
        {games.map(({ id, title, summary, status, players, theme, Icon }) => (
          <article className="game-card" key={id}>
            <div className="game-card-topline">
              <span className="game-icon">
                <Icon aria-hidden="true" size={24} />
              </span>
              <span className="game-status">
                <Sparkles aria-hidden="true" size={14} />
                {status}
              </span>
            </div>

            <div className="game-card-copy">
              <h2>{title}</h2>
              <p>{summary}</p>
            </div>

            <dl className="game-meta">
              <div>
                <dt>Mode</dt>
                <dd>{theme}</dd>
              </div>
              <div>
                <dt>Players</dt>
                <dd>{players}</dd>
              </div>
            </dl>

            <button
              type="button"
              className="primary-button game-card-action"
              onClick={() => selectGame(id)}
            >
              <Play aria-hidden="true" size={19} />
              <span>Play</span>
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}

export default App;
