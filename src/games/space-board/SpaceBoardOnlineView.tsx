import { useEffect, useState } from "react";
import { useGameStore } from "../../game/store";
import type { ShopItemId } from "../../game/shop";
import { BoardViewport } from "./BoardViewport";
import { SpaceBoardPanel } from "./SpaceBoardPanel";
import { MysteryOverlay } from "./modals/MysteryOverlay";
import { PortalOverlay } from "./modals/PortalOverlay";
import { ShopOverlay } from "./modals/ShopOverlay";
import { TargetOverlay } from "./modals/TargetOverlay";
import { TrapOverlay } from "./modals/TrapOverlay";
import { TriviaOverlay } from "./modals/TriviaOverlay";
import {
  SpaceBoardOnlineActionsProvider,
  type SpaceBoardOnlineActions,
} from "./online/onlineActionsContext";

export type SpaceBoardOnlineControls = SpaceBoardOnlineActions;

type SpaceBoardOnlineViewProps = {
  onExit: () => void;
  onlineControls: SpaceBoardOnlineControls;
};

/** Online board UI — no local AI hooks (host AI runs via storeEngine). */
export function SpaceBoardOnlineView({
  onExit,
  onlineControls,
}: SpaceBoardOnlineViewProps) {
  const phase = useGameStore((state) => state.phase);
  const [targetItemId, setTargetItemId] = useState<ShopItemId | null>(null);
  const finished = phase === "finished";

  useEffect(() => {
    if (finished) {
      setTargetItemId(null);
    }
  }, [finished]);

  return (
    <SpaceBoardOnlineActionsProvider value={onlineControls}>
      <main
        className={
          finished
            ? "app-shell-gameplay app-shell app-shell-finished"
            : "app-shell-gameplay app-shell"
        }
      >
        <SpaceBoardPanel
          onExit={onExit}
          onRequestTargetItem={setTargetItemId}
          onlineControls={{
            canAct: onlineControls.canAct,
            onRoll: onlineControls.onRoll,
            onEndTurn: onlineControls.onEndTurn,
          }}
        />
        <BoardViewport onExit={onExit} />
        <TriviaOverlay />
        <PortalOverlay />
        <MysteryOverlay />
        <ShopOverlay />
        <TrapOverlay />
        <TargetOverlay
          targetItemId={targetItemId}
          onClose={() => setTargetItemId(null)}
        />
      </main>
    </SpaceBoardOnlineActionsProvider>
  );
}
