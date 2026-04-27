# GEMINI.md - Project Context: valecita-dane 💃

## Project Overview
**valecita-dane** is a 2-player isometric rhythm game built with **Phaser 4**, **TypeScript**, and **Vite**. The game features a 4x4 isometric grid where players must hit keys (D, F, J, K) or touch buttons in sync with the music. It uses the **Web Audio API** for precise rhythm synchronization, prioritizing audio clock time over system time.

### Core Stack
- **Engine:** Phaser 4
- **Language:** TypeScript
- **Bundler:** Vite
- **Audio:** Native Web Audio API (`AudioContext`)
- **Planned:** Socket.io for multiplayer, GCP Cloud Run for deployment.

---

## Architecture & Folder Structure
```
/src
  /audio        -> AudioManager.ts (Web Audio sync & hit evaluation)
  /config       -> songs.ts (Source of truth for song data/notes)
  /entities     -> Player.ts, FloorTile.ts
  /scenes       -> GameScene.ts (Gameplay), UIScene.ts (Overlay/HUD)
  /assets       -> audio/ and sprites/
```

### Key Technical Patterns
- **Isometric Rendering:** Uses a 2:1 ratio (64x32px tiles). Depth sorting is handled via `sprite.setDepth(sprite.y)`.
- **Rhythm Sync:** ALL gameplay timing MUST use `AudioManager.getSongTime()` or `audioContext.currentTime`. Never use `Date.now()` or `setTimeout` for beat-sensitive logic.
- **Input Mapping:** Lanes are mapped to keys `D`, `F`, `J`, `K`.
- **Note Lifecycle:** Notes transition from `pending` -> `hit` or `missed`. Visual feedback is provided by lighting up tiles in the respective lanes.

---

## Development Workflow

### Commands
- **Dev Server:** `pnpm dev`
- **Build:** `pnpm build` (runs `tsc` then `vite build`)
- **Preview:** `pnpm preview`

### Adding a New Song
1. Add the `.mp3` to `src/assets/audio/`.
2. Define the song metadata and notes in `src/config/songs.ts`.
3. Update `GameScene.ts` to load the new song configuration.

---

## Engineering Standards & Conventions

### Rhythm Integrity (CRITICAL)
- **Clock:** Always use the `AudioContext` clock for sync.
- **Hit Windows:**
  - **PERFECT:** ±50ms (300 pts)
  - **GOOD:** ±100ms (100 pts)
  - **MISS:** >150ms (0 pts, breaks combo)

### Visual Conventions
- **Isometric Grid:** 4x4 tiles.
- **Tile States:** `normal` (base), `warning` (approaching note), `lit` (exact hit/active beat).
- **UI:** Mobile-first design. Touch buttons are large tap targets (min 44px) at the bottom of the screen.

### Deployment & Environment
- The project is intended to be a lightweight web client.
- Multiplayer state should be handled by a relay server (Socket.io) without duplicating game logic on the backend.
