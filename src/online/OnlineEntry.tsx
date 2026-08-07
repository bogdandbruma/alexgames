import { ArrowLeft, LoaderCircle, Wifi } from "lucide-react";
import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getOrCreateDeviceId,
  getUsername,
  setUsername,
  USERNAME_MAX_LENGTH,
} from "./identity";
import { Lobby } from "./Lobby";
import { createSupabaseClient } from "./supabaseClient";
import { upsertProfile, verifyOnlineConnection } from "./profiles";
import type { OnlinePlaySurface } from "./playSurface";

type OnlineEntryProps = {
  gameSlug: string;
  OnlinePlay?: OnlinePlaySurface;
  onBack: () => void;
};

type ConnectionStatus =
  | { kind: "idle" }
  | { kind: "connecting" }
  | {
      kind: "success";
      username: string;
      deviceId: string;
      client: SupabaseClient;
    }
  | { kind: "error"; message: string };

export function OnlineEntry({ gameSlug, OnlinePlay, onBack }: OnlineEntryProps) {
  const [usernameDraft, setUsernameDraft] = useState(
    () => getUsername() ?? "",
  );
  const [status, setStatus] = useState<ConnectionStatus>({ kind: "idle" });

  const connect = async () => {
    const username = setUsername(usernameDraft);
    if (!username) {
      setStatus({
        kind: "error",
        message: "Alege un nume de utilizator înainte de a te conecta.",
      });
      return;
    }

    setStatus({ kind: "connecting" });
    const deviceId = getOrCreateDeviceId();

    try {
      const client = createSupabaseClient();
      await verifyOnlineConnection(client);
      await upsertProfile(client, { deviceId, username });
      setStatus({ kind: "success", username, deviceId, client });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Conexiunea Online a eșuat.";
      setStatus({ kind: "error", message });
    }
  };

  if (status.kind === "success") {
    return (
      <Lobby
        client={status.client}
        gameSlug={gameSlug}
        deviceId={status.deviceId}
        username={status.username}
        OnlinePlay={OnlinePlay}
        onBack={onBack}
      />
    );
  }

  return (
    <main className="dashboard-shell online-mode-shell">
      <div className="dashboard-body online-mode-body">
        <button
          type="button"
          className="secondary-button online-mode-back"
          onClick={onBack}
        >
          <ArrowLeft aria-hidden="true" size={18} />
          <span>Înapoi</span>
        </button>

        <section
          className="online-entry"
          aria-labelledby="online-entry-heading"
        >
          <h1 id="online-entry-heading">Online</h1>
          <p className="subtitle">
            Setează un nume și verifică legătura cu platforma Brumix.
          </p>

          <form
            className="online-entry-form"
            onSubmit={(event) => {
              event.preventDefault();
              void connect();
            }}
          >
            <label className="online-entry-label" htmlFor="online-username">
              Nume utilizator
            </label>
            <input
              id="online-username"
              className="online-entry-input"
              type="text"
              maxLength={USERNAME_MAX_LENGTH}
              value={usernameDraft}
              onChange={(event) =>
                setUsernameDraft(
                  event.target.value.slice(0, USERNAME_MAX_LENGTH),
                )
              }
              autoComplete="nickname"
              disabled={status.kind === "connecting"}
            />

            <button
              type="submit"
              className="primary-button"
              disabled={status.kind === "connecting"}
            >
              {status.kind === "connecting" ? (
                <LoaderCircle
                  aria-hidden="true"
                  size={20}
                  className="online-entry-spinner"
                />
              ) : (
                <Wifi aria-hidden="true" size={20} />
              )}
              <span>
                {status.kind === "connecting" ? "Se conectează…" : "Conectează"}
              </span>
            </button>
          </form>

          {status.kind === "connecting" ? (
            <p className="online-entry-status" role="status">
              Se verifică conexiunea…
            </p>
          ) : null}

          {status.kind === "error" ? (
            <p
              className="online-entry-status online-entry-status--error"
              role="alert"
            >
              Online indisponibil: {status.message}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
