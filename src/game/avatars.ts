import type { LucideIcon } from "lucide-react";
import { Cat, Dog, Rabbit } from "lucide-react";
import type { AvatarId } from "./store";

export type AvatarOption = {
  id: AvatarId;
  label: string;
  labelRo: string;
  Icon: LucideIcon;
};

export const avatarOptions: AvatarOption[] = [
  { id: "cat", label: "Cat", labelRo: "Pisică", Icon: Cat },
  { id: "dog", label: "Dog", labelRo: "Câine", Icon: Dog },
  { id: "bunny", label: "Bunny", labelRo: "Iepure", Icon: Rabbit },
];

export const avatarOptionById = Object.fromEntries(
  avatarOptions.map((option) => [option.id, option]),
) as Record<AvatarId, AvatarOption>;
