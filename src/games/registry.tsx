import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import { Rocket } from "lucide-react";
import type { AvatarId } from "../game/store";
import { SpaceBoardGame } from "./space-board/SpaceBoardGame";

export type GameComponentProps = {
  onExit: () => void;
};

export type GameDefinition = {
  id: string;
  title: string;
  cardHighlight: string;
  cardBody: string;
  featuredAvatarIds: AvatarId[];
  status: string;
  players: string;
  theme: string;
  creatorName: string;
  Icon: LucideIcon;
  Component: ComponentType<GameComponentProps>;
};

export const games: GameDefinition[] = [
  {
    id: "space-board",
    title: "Cursa spațială",
    cardHighlight: "O lume spațială creată de Alex",
    cardBody:
      "Aleargă prin stație cu zar animat, prietenii tăi blănoși și camere speciale — fiecare rundă e o aventură nouă!",
    featuredAvatarIds: ["cat", "dog", "bunny"],
    status: "Joc nou",
    players: "1–4 jucători",
    theme: "Tablă 3D",
    creatorName: "Alex",
    Icon: Rocket,
    Component: SpaceBoardGame,
  },
];
