function shadowsFromEnv(): boolean {
  const raw = import.meta.env.VITE_SCENE_SHADOWS;

  if (raw === "0" || raw === "false") {
    return false;
  }

  return true;
}

export const sceneQuality = {
  shadows: shadowsFromEnv(),
  dpr: [1, 1.75] as [number, number],
  antialias: true,
} satisfies {
  shadows: boolean;
  dpr: [number, number];
  antialias: boolean;
};
