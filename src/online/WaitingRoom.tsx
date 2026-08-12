import { ArrowLeft, Bot, LoaderCircle, Play, UserX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { HostPauseBanner } from "./HostPauseBanner";
import {
  HOST_RECLAIM_TIMEOUT_MS,
  applyHostLifecycleDecision,
  decideHostLifecycle,
  isHostInPresence,
  nextHostAbsentSinceMs,
} from "./hostLifecycle";
import {
  subscribeRoomPresence,
  type PresenceMember,
  type RoomPresenceHandle,
} from "./presence";
import {
  addAiSeat,
  closeRoom,
  fetchRoom,
  kickMember,
  listMembers,
  pauseRoom,
  resumeRoom,
  roomStatusLabel,
  startRoom,
  type Room,
  type RoomMember,
  type RoomStatus,
} from "./rooms";
import type { OnlinePlaySurface } from "./playSurface";
import { RoomChat } from "./RoomChat";

type WaitingRoomProps = {
  client: SupabaseClient;
  room: Room;
  member: RoomMember;
  deviceId: string;
  username: string;
  OnlinePlay?: OnlinePlaySurface;
  onLeave: () => void;
};

function isActivePlayStatus(status: RoomStatus): boolean {
  return status === "playing" || status === "paused";
}

export function WaitingRoom({
  client,
  room,
  member,
  deviceId,
  username,
  OnlinePlay,
  onLeave,
}: WaitingRoomProps) {
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [presence, setPresence] = useState<PresenceMember[]>([]);
  const [presenceSynced, setPresenceSynced] = useState(false);
  const [roomStatus, setRoomStatus] = useState<RoomStatus>(room.status);
  const [pausedAtMs, setPausedAtMs] = useState<number | null>(
    room.status === "paused" ? Date.now() : null,
  );
  const [hostAbsentSinceMs, setHostAbsentSinceMs] = useState<number | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isHost = room.hostDeviceId === deviceId;
  const presenceRef = useRef(presence);
  presenceRef.current = presence;
  const roomStatusRef = useRef(roomStatus);
  roomStatusRef.current = roomStatus;
  const pausedAtRef = useRef(pausedAtMs);
  pausedAtRef.current = pausedAtMs;
  const hostAbsentSinceRef = useRef(hostAbsentSinceMs);
  hostAbsentSinceRef.current = hostAbsentSinceMs;
  const lifecycleBusyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let handle: RoomPresenceHandle | null = null;

    void (async () => {
      try {
        const next = await listMembers(client, room.id);
        if (!cancelled) {
          setMembers(next);
          setMembersLoaded(true);
        }
        handle = await subscribeRoomPresence(client, {
          roomId: room.id,
          self: {
            deviceId,
            displayName: username,
            role: member.role,
          },
          onSync: (synced) => {
            if (!cancelled) {
              setPresence(synced);
              setPresenceSynced(true);
            }
          },
        });
        if (cancelled) {
          await handle.unsubscribe();
          handle = null;
        }
      } catch (err) {
        if (!cancelled) {
          setMembersLoaded(true);
          setError(err instanceof Error ? err.message : "Prezența a eșuat.");
        }
      }
    })();

    return () => {
      cancelled = true;
      void handle?.unsubscribe();
    };
  }, [client, room.id, deviceId, username, member.role]);

  useEffect(() => {
    if (roomStatus === "closed") {
      onLeave();
    }
  }, [roomStatus, onLeave]);

  useEffect(() => {
    if (roomStatus === "closed") {
      return;
    }
    let cancelled = false;
    const tick = async () => {
      try {
        const latest = await fetchRoom(client, room.id);
        if (cancelled) return;
        if (latest.status !== roomStatusRef.current) {
          setRoomStatus(latest.status);
          if (latest.status === "paused" && pausedAtRef.current === null) {
            setPausedAtMs(Date.now());
          }
          if (latest.status === "playing") {
            setPausedAtMs(null);
          }
          if (latest.status === "playing" || latest.status === "paused") {
            const next = await listMembers(client, room.id);
            if (!cancelled) {
              setMembers(next);
            }
          }
        }
      } catch {
        /* ignore transient poll errors */
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 1_500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [client, room.id, roomStatus]);

  const runLifecycle = async (hostPresent: boolean, nowMs = Date.now()) => {
    if (lifecycleBusyRef.current) return;
    const decision = decideHostLifecycle({
      roomStatus: roomStatusRef.current,
      hostDeviceId: room.hostDeviceId,
      hostPresent,
      pausedAtMs: pausedAtRef.current,
      hostAbsentSinceMs: hostAbsentSinceRef.current,
      nowMs,
    });
    if (decision.type === "none") return;

    lifecycleBusyRef.current = true;
    try {
      await applyHostLifecycleDecision(
        decision,
        {
          pause: async () => {
            await pauseRoom(client, { roomId: room.id });
            setPausedAtMs(Date.now());
            setRoomStatus("paused");
          },
          resume: async () => {
            await resumeRoom(client, {
              roomId: room.id,
              hostDeviceId: deviceId,
            });
            setPausedAtMs(null);
            setRoomStatus("playing");
          },
          close: async () => {
            await closeRoom(client, { roomId: room.id });
            setRoomStatus("closed");
          },
        },
        { isHost },
      );
    } catch {
      /* peer may have won the race; poll will sync */
    } finally {
      lifecycleBusyRef.current = false;
    }
  };

  useEffect(() => {
    if (!presenceSynced || roomStatus === "closed") {
      return;
    }
    const hostPresent = isHostInPresence(room.hostDeviceId, presence);
    const nextAbsent = nextHostAbsentSinceMs(
      hostPresent,
      hostAbsentSinceRef.current,
      Date.now(),
    );
    hostAbsentSinceRef.current = nextAbsent;
    setHostAbsentSinceMs(nextAbsent);
    void runLifecycle(hostPresent);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run on presence/status changes
  }, [
    presence,
    presenceSynced,
    roomStatus,
    room.hostDeviceId,
    isHost,
    client,
    room.id,
    deviceId,
  ]);

  useEffect(() => {
    if (roomStatus === "paused" && pausedAtMs !== null) {
      const remaining = HOST_RECLAIM_TIMEOUT_MS - (Date.now() - pausedAtMs);
      const id = window.setTimeout(() => {
        void runLifecycle(
          isHostInPresence(room.hostDeviceId, presenceRef.current),
          Date.now(),
        );
      }, Math.max(0, remaining));
      return () => {
        window.clearTimeout(id);
      };
    }
    if (roomStatus === "waiting" && hostAbsentSinceMs !== null) {
      const remaining =
        HOST_RECLAIM_TIMEOUT_MS - (Date.now() - hostAbsentSinceMs);
      const id = window.setTimeout(() => {
        void runLifecycle(
          isHostInPresence(room.hostDeviceId, presenceRef.current),
          Date.now(),
        );
      }, Math.max(0, remaining));
      return () => {
        window.clearTimeout(id);
      };
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomStatus, pausedAtMs, hostAbsentSinceMs, room.hostDeviceId]);

  const refreshMembers = async () => {
    const next = await listMembers(client, room.id);
    setMembers(next);
  };

  const runHost = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await refreshMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Acțiunea a eșuat.");
    } finally {
      setBusy(false);
    }
  };

  const seatedCount = members.filter((m) => m.seat !== null).length;
  // Wait for member list before OnlinePlay — mount-once session needs seats.
  const showPlay =
    isActivePlayStatus(roomStatus) && Boolean(OnlinePlay) && membersLoaded;

  return (
    <>
      {showPlay && OnlinePlay ? (
        <div className="online-play-with-chat">
          {roomStatus === "paused" ? <HostPauseBanner /> : null}
          <OnlinePlay
            client={client}
            room={{ ...room, status: roomStatus }}
            member={member}
            members={members}
            deviceId={deviceId}
            onLeave={onLeave}
          />
        </div>
      ) : (
        <main className="dashboard-shell online-mode-shell">
          <div className="dashboard-body online-mode-body">
            <button
              type="button"
              className="secondary-button online-mode-back"
              onClick={onLeave}
            >
              <ArrowLeft aria-hidden="true" size={18} />
              <span>Înapoi la lobby</span>
            </button>

            <section
              className="online-waiting-room"
              aria-labelledby="waiting-room-heading"
            >
              <h1 id="waiting-room-heading">{room.name}</h1>
              <p className="subtitle">
                Status: <strong>{roomStatusLabel(roomStatus)}</strong> ·{" "}
                {seatedCount}/{room.maxPlayers} jucători
              </p>

              <div className="online-waiting-columns">
                <section aria-labelledby="members-heading">
                  <h2 id="members-heading">Membri</h2>
                  <ul className="online-waiting-list" aria-label="Membri cameră">
                    {members.length === 0 ? (
                      <li className="online-lobby-empty">Se încarcă membrii…</li>
                    ) : (
                      members.map((m) => (
                        <li key={m.id} className="online-waiting-item">
                          <span className="online-waiting-item-label">
                            {m.displayName}
                            {m.isAi ? " (AI)" : ""}
                            {m.role === "host" ? " · gazdă" : ""}
                            {m.seat !== null
                              ? ` · loc ${m.seat + 1}`
                              : " · spectator"}
                          </span>
                          {isHost &&
                          m.id !== member.id &&
                          roomStatus === "waiting" ? (
                            <button
                              type="button"
                              className="secondary-button"
                              disabled={busy}
                              onClick={() =>
                                void runHost(async () => {
                                  await kickMember(client, {
                                    roomId: room.id,
                                    hostDeviceId: deviceId,
                                    memberId: m.id,
                                  });
                                })
                              }
                            >
                              <UserX aria-hidden="true" size={16} />
                              <span>Dă afară</span>
                            </button>
                          ) : null}
                        </li>
                      ))
                    )}
                  </ul>
                </section>

                <section aria-labelledby="presence-heading">
                  <h2 id="presence-heading">Conectați acum</h2>
                  <ul className="online-waiting-list" aria-label="Conectați acum">
                    {presence.length === 0 ? (
                      <li className="online-lobby-empty">Nimeni conectat încă.</li>
                    ) : (
                      presence.map((p) => (
                        <li key={p.deviceId} className="online-waiting-item">
                          <span className="online-waiting-item-label">
                            {p.displayName}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                </section>
              </div>

              {isHost && roomStatus === "waiting" ? (
                <div className="online-waiting-host-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={busy || seatedCount >= room.maxPlayers}
                    onClick={() =>
                      void runHost(async () => {
                        const index = members.filter((m) => m.isAi).length + 1;
                        await addAiSeat(client, {
                          roomId: room.id,
                          hostDeviceId: deviceId,
                          displayName: `AI-${index}`,
                        });
                      })
                    }
                  >
                    <Bot aria-hidden="true" size={18} />
                    <span>Adaugă AI</span>
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    disabled={busy || seatedCount < 2}
                    onClick={() =>
                      void runHost(async () => {
                        await startRoom(client, {
                          roomId: room.id,
                          hostDeviceId: deviceId,
                        });
                        setRoomStatus("playing");
                      })
                    }
                  >
                    {busy ? (
                      <LoaderCircle
                        aria-hidden="true"
                        size={18}
                        className="online-entry-spinner"
                      />
                    ) : (
                      <Play aria-hidden="true" size={18} />
                    )}
                    <span>Start</span>
                  </button>
                </div>
              ) : null}

              {roomStatus === "playing" ? (
                <p
                  className="online-entry-status online-entry-status--ok"
                  role="status"
                >
                  Jocul a început. Intrările noi sunt doar ca spectator.
                </p>
              ) : null}

              {error ? (
                <p
                  className="online-entry-status online-entry-status--error"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
            </section>
          </div>
        </main>
      )}

      <RoomChat
        client={client}
        roomId={room.id}
        deviceId={deviceId}
        username={username}
      />
    </>
  );
}
