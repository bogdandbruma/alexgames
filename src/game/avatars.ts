import type { LucideIcon } from "lucide-react";
import { PawPrint, UserRound } from "lucide-react";

export type AvatarCategoryId = "cube-pets" | "blocky";

export type AvatarCategory = {
  id: AvatarCategoryId;
  label: string;
  labelRo: string;
  Icon: LucideIcon;
};

export const avatarCategories: AvatarCategory[] = [
  {
    id: "cube-pets",
    label: "Cube pets",
    labelRo: "Animale cub",
    Icon: PawPrint,
  },
  {
    id: "blocky",
    label: "Blocky characters",
    labelRo: "Personaje",
    Icon: UserRound,
  },
];

export type AvatarOption = {
  id: string;
  categoryId: AvatarCategoryId;
  label: string;
  labelRo: string;
  modelUrl: string;
  previewUrl: string;
  modelScale: number;
  Icon: LucideIcon;
};

const pet = (
  id: string,
  label: string,
  labelRo: string,
  file: string,
  previewFile: string,
): AvatarOption => ({
  id,
  categoryId: "cube-pets",
  label,
  labelRo,
  modelUrl: `/models/pets/${file}`,
  previewUrl: `/avatars/previews/${previewFile}`,
  modelScale: 0.55,
  Icon: PawPrint,
});

const blocky = (letter: string): AvatarOption => {
  const id = `blocky-${letter}`;
  const label = `Character ${letter.toUpperCase()}`;

  return {
    id,
    categoryId: "blocky",
    label,
    labelRo: `Personaj ${letter.toUpperCase()}`,
    modelUrl: `/models/blocky/character-${letter}.glb`,
    previewUrl: `/avatars/previews/character-${letter}.png`,
    modelScale: 0.42,
    Icon: UserRound,
  };
};

export const avatarOptions: AvatarOption[] = [
  pet("bunny", "Bunny", "Iepure", "bunny.glb", "animal-bunny.png"),
  pet("cat", "Cat", "Pisică", "cat.glb", "animal-cat.png"),
  pet("dog", "Dog", "Câine", "dog.glb", "animal-dog.png"),
  pet("caterpillar", "Caterpillar", "Omida", "caterpillar.glb", "animal-caterpillar.png"),
  pet("chick", "Chick", "Pui", "chick.glb", "animal-chick.png"),
  pet("cow", "Cow", "Vacă", "cow.glb", "animal-cow.png"),
  pet("elephant", "Elephant", "Elefant", "elephant.glb", "animal-elephant.png"),
  pet("fish", "Fish", "Pește", "fish.glb", "animal-fish.png"),
  pet("giraffe", "Giraffe", "Girafă", "giraffe.glb", "animal-giraffe.png"),
  pet("hog", "Hog", "Mistreț", "hog.glb", "animal-hog.png"),
  pet("lion", "Lion", "Leu", "lion.glb", "animal-lion.png"),
  pet("monkey", "Monkey", "Maimuță", "monkey.glb", "animal-monkey.png"),
  pet("parrot", "Parrot", "Papagal", "parrot.glb", "animal-parrot.png"),
  pet("pig", "Pig", "Porc", "pig.glb", "animal-pig.png"),
  pet("tiger", "Tiger", "Tigru", "tiger.glb", "animal-tiger.png"),
  ...(
    [
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
      "g",
      "h",
      "i",
      "j",
      "k",
      "l",
      "m",
      "n",
      "o",
      "p",
      "q",
      "r",
    ] as const
  ).map((letter) => blocky(letter)),
];

export type AvatarId = (typeof avatarOptions)[number]["id"];

const avatarIds = new Set(avatarOptions.map((option) => option.id));

export function isAvatarId(value: string): value is AvatarId {
  return avatarIds.has(value);
}

export const avatarOptionById = Object.fromEntries(
  avatarOptions.map((option) => [option.id, option]),
) as Record<AvatarId, AvatarOption>;

export const avatarsByCategory = Object.fromEntries(
  avatarCategories.map((category) => [
    category.id,
    avatarOptions.filter((option) => option.categoryId === category.id),
  ]),
) as Record<AvatarCategoryId, AvatarOption[]>;

export const defaultAvatarId: AvatarId = "cat";

export function normalizeAvatarId(value: unknown): AvatarId {
  if (typeof value === "string" && isAvatarId(value)) {
    return value;
  }

  return defaultAvatarId;
}

export function hashNameToAvatarId(name: string): AvatarId {
  const trimmed = name.trim();

  if (!trimmed) {
    return defaultAvatarId;
  }

  let hash = 0;

  for (let index = 0; index < trimmed.length; index += 1) {
    hash = (hash * 31 + trimmed.charCodeAt(index)) >>> 0;
  }

  return avatarOptions[hash % avatarOptions.length].id;
}

export function pickRandomAvatarId(): AvatarId {
  if (globalThis.crypto?.getRandomValues) {
    const randomValues = new Uint32Array(1);
    globalThis.crypto.getRandomValues(randomValues);

    return avatarOptions[randomValues[0] % avatarOptions.length].id;
  }

  return avatarOptions[Math.floor(Math.random() * avatarOptions.length)].id;
}

export const avatarModelUrls = [
  ...new Set(avatarOptions.map((option) => option.modelUrl)),
];
