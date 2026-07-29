import { useEffect, useState } from "react";
import { useGameStore } from "../../game/store";
import type { ShopItemId } from "../../game/shop";
import { BoardViewport } from "./BoardViewport";
import { SpaceBoardPanel } from "./SpaceBoardPanel";
import { MysteryOverlay } from "./modals/MysteryOverlay";
import { PortalOverlay } from "./modals/PortalOverlay";
import { ShopOverlay } from "./modals/ShopOverlay";
import { TargetOverlay } from "./modals/TargetOverlay";
import { TriviaOverlay } from "./modals/TriviaOverlay";
import { useAiDiceRoll } from "./useAiDiceRoll";
import { useAiInventory } from "./useAiInventory";
import { useAiTriviaAnswer } from "./useAiTriviaAnswer";

type SpaceBoardGameProps = {
  onExit: () => void;
};

export function SpaceBoardGame({ onExit }: SpaceBoardGameProps) {
  const phase = useGameStore((state) => state.phase);
  const [targetItemId, setTargetItemId] = useState<ShopItemId | null>(null);

  const isSetup = phase === "setup";
  const finished = phase === "finished";

  useAiDiceRoll();
  useAiInventory();
  useAiTriviaAnswer();

  useEffect(() => {
    if (finished) {
      setTargetItemId(null);
    }
  }, [finished]);

  return (
    <main
      className={
        isSetup
          ? "app-shell app-shell-setup"
          : finished
            ? "app-shell-gameplay app-shell app-shell-finished"
            : "app-shell-gameplay app-shell"
      }
    >
      <SpaceBoardPanel
        onExit={onExit}
        onRequestTargetItem={setTargetItemId}
      />
      <BoardViewport onExit={onExit} />
      <TriviaOverlay />
      <PortalOverlay />
      <MysteryOverlay />
      <ShopOverlay />
      <TargetOverlay
        targetItemId={targetItemId}
        onClose={() => setTargetItemId(null)}
      />
    </main>
  );
}
