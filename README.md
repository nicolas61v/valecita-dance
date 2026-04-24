# valecita-dane 💃

Juego de ritmo isométrico para 2 jugadores. Hecho con Phaser 4 + TypeScript + Vite.

## Cómo jugar

Presioná **D F J K** (o los botones táctiles) al ritmo de los ticks de audio.

Las tiles de la grilla te dan la pista visual:

| Estado | Significado |
|--------|-------------|
| Morado tenue | Nota aproximándose |
| Cyan brillante | ¡Ahora! |

### Puntuación

| Resultado | Ventana | Puntos |
|-----------|---------|--------|
| PERFECT | ±50 ms | 300 |
| GOOD | ±100 ms | 100 |
| MISS | >150 ms | 0 · rompe combo |

## Setup local

```bash
pnpm install
pnpm dev
```

Abre `http://localhost:5173` en el navegador. Para mobile, usá la IP de red que muestra Vite.

## Agregar una canción

1. Copiá el archivo de audio a `src/assets/audio/`
2. Editá `src/config/songs.ts` y agregá tu canción:

```ts
misong: {
  bpm: 128,
  audioFile: 'assets/audio/misong.mp3',
  notes: [
    { time: 1.0, key: 'D' },
    { time: 1.5, key: 'F' },
    // ...
  ],
}
```

3. En `GameScene.ts`, cambiá `songs.demo` por `songs.misong`

Las notas usan tiempo en segundos desde el inicio. Nunca `Date.now()` — el timing usa `AudioContext.currentTime`.

## Stack

| Capa | Tecnología |
|------|-----------|
| Engine | Phaser 4 |
| Lenguaje | TypeScript |
| Bundler | Vite |
| Audio sync | Web Audio API |
| Multijugador (WIP) | Socket.io + Node.js |
| Deploy (WIP) | GCP Cloud Run |

## Estructura

```
src/
  scenes/      GameScene.ts · UIScene.ts
  entities/    Player.ts · FloorTile.ts
  audio/       AudioManager.ts
  config/      songs.ts
  assets/
    audio/     ← archivos .mp3 van acá
    sprites/   ← sprites van acá
```

## Roadmap

- [x] Escena isométrica 4×4
- [x] Sincronización de audio (Web Audio API)
- [x] Input teclado + táctil
- [x] Hit detection PERFECT / GOOD / MISS
- [x] Score + combo
- [ ] Servidor multijugador (Socket.io)
- [ ] Sincronización `startAt` entre clientes
- [ ] Pantalla de resultados
- [ ] Deploy en GCP Cloud Run
