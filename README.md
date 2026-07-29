# Space Board Demo

A local React + Three.js prototype with 10 modular space-station rooms, 3 selectable Cube Pets, animated dice, room-by-room movement, special forward/backward rooms, restart, and `localStorage` persistence.

The app opens to a game dashboard. Each game should live in its own folder under `src/games` and be added to `src/games/registry.tsx` so games stay separated as the library grows.

## Run

```bash
npm install
npm run dev
```

Open the Vite URL, usually `http://127.0.0.1:5173`.

## Verify

```bash
npm run build
npm run preview
$env:APP_URL="http://127.0.0.1:4173"; npm run browser-check
```

The browser check drives Chromium through pet selection, controlled dice rolls, both special rooms, reload persistence, restart, mobile layout, and a canvas pixel check.

## Assets

Runtime GLBs live in:

```text
public/models/space
public/models/pets
```

They were selected from Kenney's CC0 Modular Space Kit, Space Kit, and Cube Pets packs, then renamed to stable app-facing filenames.
