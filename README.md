# Space Board Demo

A local React + Three.js prototype with 10 modular space-station rooms, **33** selectable avatars (Kenney Cube Pets + Blocky Characters), animated dice, room-by-room movement, special forward/backward rooms, restart, and `localStorage` persistence.

The app opens to a game dashboard. Each game should live in its own folder under `src/games` and be added to `src/games/registry.tsx` so games stay separated as the library grows.

## Run

```bash
npm install
npm run dev
```

Open the Vite URL, usually `http://127.0.0.1:5174`.

### Online multiplayer (optional)

Offline play needs no env keys. For Online mode, copy `.env.example` → `.env.local` (gitignored via `*.local`):

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_anon_key
```

Apply `supabase/migrations/20260806000000_online_platform.sql` in the Supabase SQL editor (generic platform tables only).

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
public/models/blocky
public/models/blocky/Textures
public/avatars/previews
```

3D models are from Kenney's CC0 **Cube Pets** (15 animals) and **Blocky Characters** (18 skins), plus the Modular Space Kit / Space Kit for rooms. UI previews use Kenney's pack preview PNGs.


version 2.0.0