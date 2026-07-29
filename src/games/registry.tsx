import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import { Rocket } from "lucide-react";
import { SpaceBoardGame } from "./space-board/SpaceBoardGame";

export type GameComponentProps = {
  onExit: () => void;
};

export type GameDefinition = {
  id: string;
  title: string;
  summary: string;
  status: string;
  players: string;
  theme: string;
  Icon: LucideIcon;
  Component: ComponentType<GameComponentProps>;
};

export const games: GameDefinition[] = [
  {
    id: "space-board",
    title: "Space Board",
    summary:
      "Race through a modular station with animated dice, pets, and special rooms.",
    status: "Playable",
    players: "1-4 players",
    theme: "3D board",
    Icon: Rocket,
    Component: SpaceBoardGame,
  },
];
