import type { ComponentType } from "react";
import { useState } from "react";
import { ArrowLeft, CloudOff, Wifi } from "lucide-react";
import { OnlineEntry } from "./OnlineEntry";
import { setGameHash } from "./onlineRoute";
import type { OnlinePlaySurface } from "./playSurface";
import {
  clearRememberedPlayMode,
  getRememberedPlayMode,
  rememberOnlinePlayMode,
} from "./sessionMemory";

export type PlayMode = "choose" | "offline" | "online";

type GameProps = {
  onExit: () => void;
};

type PlaySessionProps = {
  Game: ComponentType<GameProps>;
  gameSlug: string;
  OnlinePlay?: OnlinePlaySurface;
  initialOnlineRoomId?: string | null;
  onExit: () => void;
};

export function PlaySession({
  Game,
  gameSlug,
  OnlinePlay,
  initialOnlineRoomId = null,
  onExit,
}: PlaySessionProps) {
  const [mode, setMode] = useState<PlayMode>(() =>
    initialOnlineRoomId ? "online" : getRememberedPlayMode(gameSlug),
  );

  const chooseMode = () => {
    clearRememberedPlayMode(gameSlug);
    setGameHash(gameSlug);
    setMode("choose");
  };

  switch (mode) {
    case "offline":
      return <Game onExit={chooseMode} />;
    case "online":
      return (
        <OnlineEntry
          gameSlug={gameSlug}
          OnlinePlay={OnlinePlay}
          autoConnect
          initialRoomId={initialOnlineRoomId}
          onBack={chooseMode}
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
                  onClick={() => {
                    clearRememberedPlayMode(gameSlug);
                    setMode("offline");
                  }}
                >
                  <CloudOff aria-hidden="true" size={20} />
                  <span>Offline</span>
                </button>
                <button
                  type="button"
                  className="primary-button online-mode-online-button"
                  onClick={() => {
                    rememberOnlinePlayMode(gameSlug);
                    setMode("online");
                  }}
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
