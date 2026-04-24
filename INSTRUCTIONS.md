# Rhythm Game — Instructions for Claude Code

## Project
2-player isometric rhythm game for web. Phaser 3 + TypeScript + Vite.

---

## Stack
- **Engine**: Phaser 3 + TypeScript
- **Bundler**: Vite
- **Audio**: Web Audio API (native, never use Date.now() for sync)
- **Multiplayer**: Socket.io + Node.js
- **Deploy**: GCP Cloud Run

---

## Folder structure
```
/src
  /scenes       → GameScene.ts, UIScene.ts
  /entities     → Player.ts, FloorTile.ts
  /audio        → AudioManager.ts
  /config       → songs.ts
  /assets
    /audio
    /sprites
```

---

## Isometric scene
- Tile size: 64x32px (2:1 ratio, standard isometric)
- Grid: 4x4 tiles
- Camera: fixed, top-right corner perspective
- Render order: back wall → side walls → floor tiles (back to front) → player → effects
- Y-sorting: `sprite.setDepth(sprite.y)` for correct depth

### Tile states (3 textures)
- `tile_normal` → base state
- `tile_warning` → beat approaching (soft glow)
- `tile_lit` → exact beat moment (bright flash, 150ms then back to normal)

---

## AudioManager.ts
```ts
class AudioManager {
  private ctx: AudioContext
  private startTime: number
  readonly BPM: number  // defined per song in songs.ts

  getBeatTime(beat: number): number {
    return this.startTime + (beat * (60 / this.BPM))
  }

  evaluateHit(inputTime: number, beatTime: number): 'PERFECT' | 'GOOD' | 'MISS' {
    const delta = Math.abs(inputTime - beatTime) * 1000 // ms
    if (delta < 50)  return 'PERFECT'
    if (delta < 100) return 'GOOD'
    return 'MISS'
  }
}
```

---

## songs.ts (source of truth)
```ts
export const songs = {
  song1: {
    bpm: 120,            // replace with real BPM
    audioFile: 'assets/audio/song1.mp3',
    notes: [
      { time: 1.0, key: 'ArrowLeft' },
      { time: 1.5, key: 'ArrowRight' },
      // ...
    ]
  }
}
```

---

## Input (unified keyboard + touch)
- **Keyboard**: D / F / J / K keys
- **Touch**: 4 large buttons at the bottom third of screen (min 44px tap target)
- Same logic for both, different input method only

---

## Hit windows
| Result  | Window  | Points |
|---------|---------|--------|
| PERFECT | ±50ms   | 300    |
| GOOD    | ±100ms  | 100    |
| MISS    | >150ms  | 0 + breaks combo |

---

## Multiplayer
- Server is relay only — no game logic on server
- Server emits `{ startAt: serverTime + 3000 }` to both clients
- Both clients start audio at exact same timestamp
- Each client sends score events to server → relayed to partner
- Room code: 6 random letters

---

## Scenes
- **GameScene**: floor, player, audio, input, hit detection
- **UIScene**: score, combo, PERFECT/GOOD/MISS feedback text (overlay, separate from game logic)

---

## Player
- Sprite sheet: idle animation (3–4 frames, loop)
- Hit animation: 1 frame triggered on valid input
- Miss animation: 1 frame triggered on miss
- Position: center of isometric grid
- Depth: always above the tile it stands on

---

## Build order (do it in this order)
1. Boilerplate Phaser 3 + TypeScript + Vite running on localhost
2. AudioManager with BPM sync working
3. Isometric floor scene with placeholder assets
4. Input handler + tile lighting effect
5. Hit detection + PERFECT/GOOD/MISS feedback
6. Score + combo system
7. Multiplayer server (Socket.io + Node.js)
8. Multiplayer sync (startAt timestamp)
9. Results screen
10. GCP Cloud Run deploy

---

## Rules
- Never use `Date.now()` or `setTimeout` for beat sync. Always use `audioContext.currentTime`
- Audio must start with a user gesture (browser policy)
- All game logic reads from `songs.ts` — never hardcode beat times elsewhere
- Mobile first: design UI for phone, scale up to desktop
