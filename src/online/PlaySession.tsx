import type { ComponentType } from "react";
import { useState } from "react";
import { ArrowLeft, CloudOff, Wifi } from "lucide-react";
import { OnlineEntry } from "./OnlineEntry";
import type { OnlinePlaySurface } from "./playSurface";

export type PlayMode = "choose" | "offline" | "online";

type GameProps = {
  onExit: () => void;
};

type PlaySessionProps = {
  Game: ComponentType<GameProps>;
  gameSlug: string;
  OnlinePlay?: OnlinePlaySurface;
  onExit: () => void;
};

export function PlaySession({
  Game,
  gameSlug,
  OnlinePlay,
  onExit,
}: PlaySessionProps) {
  const [mode, setMode] = useState<PlayMode>("choose");

  switch (mode) {
    case "offline":
      return <Game onExit={() => setMode("choose")} />;
    case "online":
      return (
        <OnlineEntry
          gameSlug={gameSlug}
          OnlinePlay={OnlinePlay}
          onBack={() => setMode("choose")}
        />
      );
    case "choose":
      return (
        <main className="dashboard-shell online-mode-shell">
          <div className="dashboard-body online-mode-body">
            <button
              type="button"
              className="secondary-button online-mode-back"
              onClick={onExit}
            >
              <ArrowLeft aria-hidden="true" size={18} />
              <span>Înapoi</span>
            </button>
            <section
              className="online-mode-chooser"
              aria-labelledby="play-mode-heading"
            >
              <h1 id="play-mode-heading">Cum vrei să joci?</h1>
              <p className="subtitle">
                Offline funcționează fără internet. Online folosește platforma
                Brumix.
              </p>
              <div className="online-mode-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setMode("offline")}
                >
                  <CloudOff aria-hidden="true" size={20} />
                  <span>Offline</span>
                </button>
                <button
                  type="button"
                  className="primary-button online-mode-online-button"
                  onClick={() => setMode("online")}
                >
                  <Wifi aria-hidden="true" size={20} />
                  <span>Online</span>
                </button>
              </div>
            </section>
          </div>
        </main>
      );
    default: {
      const exhaustive: never = mode;
      return exhaustive;
    }
  }
}
