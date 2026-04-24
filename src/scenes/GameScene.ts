import * as Phaser from 'phaser';
import { AudioManager, type HitResult } from '../audio/AudioManager.ts';
import { FloorTile } from '../entities/FloorTile.ts';
import { Player } from '../entities/Player.ts';
import { songs, type Song, type Note } from '../config/songs.ts';

const TILE_W = 64;
const TILE_H = 32;
const GRID = 4;
const APPROACH_BEATS = 4;
const LIT_SEC = 0.15;
const MISS_SEC = 0.15;
const WALL_H = 80;

const KEY_LANE: Readonly<Record<string, number>> = { D: 0, F: 1, J: 2, K: 3 };

type NoteState = 'pending' | 'hit' | 'missed';

export class GameScene extends Phaser.Scene {
  private tiles: FloorTile[][] = [];
  private player!: Player;
  private audio!: AudioManager;
  private song!: Song;
  private notes: Note[] = [];
  private noteStates: NoteState[] = [];
  private isStarted = false;
  private startPrompt!: Phaser.GameObjects.Text;
  private gameEmitter!: Phaser.Events.EventEmitter;

  // Per-lane timer: songTime until which row-3 tile stays lit after a hit
  private tileLitUntil: number[] = [0, 0, 0, 0];

  private readonly originX = 400;
  private readonly originY = 210; // shifted down to give wall space above

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.song = songs.demo;
    this.audio = new AudioManager(this.song.bpm);
    this.notes = [...this.song.notes].sort((a, b) => a.time - b.time);
    this.noteStates = this.notes.map(() => 'pending' as NoteState);

    this.gameEmitter = new Phaser.Events.EventEmitter();
    this.registry.set('gameEmitter', this.gameEmitter);
    this.registry.set('totalNotes', this.notes.length);

    this.createBackground();
    this.createWalls();
    this.createGrid();
    this.createPlayer();
    this.createLaneLabels();
    this.setupKeyboard();
    this.createTouchButtons();
    this.createStartPrompt();

    this.input.once('pointerdown', () => this.startGame());
    this.input.keyboard!.once('keydown', () => this.startGame());

    this.scene.launch('UIScene');
  }

  update(_time: number, _delta: number): void {
    if (!this.isStarted) return;

    const songTime = this.audio.getSongTime();
    const approachTime = APPROACH_BEATS * (60 / this.song.bpm);

    // 1. Reset all tiles to normal
    for (let col = 0; col < GRID; col++) {
      for (let row = 0; row < GRID; row++) {
        this.tiles[col][row].setState('normal');
      }
    }

    // 2. Set tile states based on pending notes
    for (let i = 0; i < this.notes.length; i++) {
      if (this.noteStates[i] !== 'pending') continue;

      const note = this.notes[i];
      const lane = KEY_LANE[note.key];
      const timeUntil = note.time - songTime;
      const timeSince = songTime - note.time;

      if (timeSince > MISS_SEC) {
        this.noteStates[i] = 'missed';
        this.player.playMiss();
        this.gameEmitter.emit('miss');
        continue;
      }

      if (timeUntil > approachTime) continue;

      if (timeSince >= 0 && timeSince < LIT_SEC) {
        // Exact beat moment → lit
        this.tiles[lane][3].setState('lit');
      } else if (timeUntil >= 0) {
        // Approaching → warning in the current row
        const progress = 1 - timeUntil / approachTime;
        const row = Math.min(GRID - 1, Math.floor(progress * GRID));
        this.tiles[lane][row].setState('warning');
      }
    }

    // 3. Override: keep row-3 lit for 150ms after a successful hit
    for (let lane = 0; lane < GRID; lane++) {
      if (songTime < this.tileLitUntil[lane]) {
        this.tiles[lane][3].setState('lit');
      }
    }
  }

  private isoToScreen(col: number, row: number): { x: number; y: number } {
    return {
      x: this.originX + (col - row) * (TILE_W / 2),
      y: this.originY + (col + row) * (TILE_H / 2),
    };
  }

  private createBackground(): void {
    const bg = this.add.graphics();
    bg.setDepth(-20);
    bg.fillStyle(0x080010, 1);
    bg.fillRect(0, 0, 800, 600);
  }

  private createWalls(): void {
    // Compute wall corners from the isometric grid
    const gridTop = this.isoToScreen(0, 0); // top vertex of tile (0,0)

    // Far-left of grid: left vertex of bottom-left tile (0, GRID-1)
    const tileBottomLeft = this.isoToScreen(0, GRID - 1);
    const leftBottom = { x: tileBottomLeft.x - TILE_W / 2, y: tileBottomLeft.y + TILE_H / 2 };

    // Far-right of grid: right vertex of top-right tile (GRID-1, 0)
    const tileTopRight = this.isoToScreen(GRID - 1, 0);
    const rightBottom = { x: tileTopRight.x + TILE_W / 2, y: tileTopRight.y + TILE_H / 2 };

    // Apex where both walls meet (above grid top)
    const apex = { x: gridTop.x, y: gridTop.y - WALL_H };

    const walls = this.add.graphics();
    walls.setDepth(-5);

    // Left wall (faces the viewer from the left)
    const leftWall = [
      new Phaser.Math.Vector2(gridTop.x, gridTop.y),
      new Phaser.Math.Vector2(leftBottom.x, leftBottom.y),
      new Phaser.Math.Vector2(leftBottom.x, leftBottom.y - WALL_H),
      new Phaser.Math.Vector2(apex.x, apex.y),
    ];
    walls.fillStyle(0x1e1040, 1);
    walls.fillPoints(leftWall, true);
    walls.lineStyle(1, 0x5a3d90, 0.6);
    walls.strokePoints(leftWall, true);

    // Right wall (partially in shadow)
    const rightWall = [
      new Phaser.Math.Vector2(gridTop.x, gridTop.y),
      new Phaser.Math.Vector2(rightBottom.x, rightBottom.y),
      new Phaser.Math.Vector2(rightBottom.x, rightBottom.y - WALL_H),
      new Phaser.Math.Vector2(apex.x, apex.y),
    ];
    walls.fillStyle(0x140b28, 1);
    walls.fillPoints(rightWall, true);
    walls.lineStyle(1, 0x3a2060, 0.6);
    walls.strokePoints(rightWall, true);

    // Decorative vertical edge line at the apex
    walls.lineStyle(2, 0x7744cc, 0.5);
    walls.lineBetween(apex.x, apex.y, gridTop.x, gridTop.y);
  }

  private createGrid(): void {
    for (let col = 0; col < GRID; col++) {
      this.tiles[col] = [];
    }
    // Back-to-front render order: iterate diagonals (smallest col+row first)
    for (let d = 0; d < GRID * 2 - 1; d++) {
      for (let col = 0; col < GRID; col++) {
        const row = d - col;
        if (row < 0 || row >= GRID) continue;
        const { x, y } = this.isoToScreen(col, row);
        this.tiles[col][row] = new FloorTile(this, x, y, col + row);
      }
    }
  }

  private createPlayer(): void {
    // Center of the isometric grid
    const { x, y } = this.isoToScreen(1.5, 1.5);
    this.player = new Player(this, x, y + TILE_H / 2);
  }

  private createLaneLabels(): void {
    const keys = ['D', 'F', 'J', 'K'];
    for (let col = 0; col < GRID; col++) {
      const { x, y } = this.isoToScreen(col, 3);
      this.add.text(x, y + TILE_H + 18, keys[col], {
        fontSize: '13px',
        color: '#664488',
        fontFamily: 'monospace',
      }).setOrigin(0.5, 0).setDepth(10);
    }
  }

  private setupKeyboard(): void {
    const kb = this.input.keyboard!;
    const kc = Phaser.Input.Keyboard.KeyCodes;
    const map: Array<[string, number]> = [
      ['D', kc.D], ['F', kc.F], ['J', kc.J], ['K', kc.K],
    ];
    for (const [label, code] of map) {
      kb.addKey(code).on('down', () => this.onKeyPress(label));
    }
  }

  private createTouchButtons(): void {
    const labels = ['D', 'F', 'J', 'K'];
    const btnW = 190;
    const btnH = 80;
    const startX = (800 - btnW * 4) / 2; // center the 4 buttons

    for (let i = 0; i < 4; i++) {
      const cx = startX + btnW * i + btnW / 2;
      const cy = 555;

      const btn = this.add.rectangle(cx, cy, btnW - 8, btnH - 8, 0x1a0f2e, 0.9);
      btn.setStrokeStyle(2, 0x5533aa, 0.8);
      btn.setInteractive({ useHandCursor: true });
      btn.setDepth(300);

      this.add.text(cx, cy, labels[i], {
        fontSize: '28px',
        color: '#cc99ff',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(301);

      const label = labels[i];
      btn.on('pointerdown', () => this.onKeyPress(label));
      btn.on('pointerover', () => btn.setFillStyle(0x3a1f70, 0.95));
      btn.on('pointerout', () => btn.setFillStyle(0x1a0f2e, 0.9));
    }
  }

  private createStartPrompt(): void {
    this.startPrompt = this.add.text(400, 490, 'tap or press D  F  J  K to start', {
      fontSize: '16px',
      color: '#aa88dd',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(500);

    this.tweens.add({
      targets: this.startPrompt,
      alpha: 0.2,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  private startGame(): void {
    if (this.isStarted) return;
    this.isStarted = true;
    this.startPrompt.destroy();
    this.audio.start();

    // Schedule metronome ticks at note times using Web Audio clock
    for (const note of this.notes) {
      const absTime = this.audio.absoluteStartTime + note.time;
      this.audio.scheduleTick(absTime, note.key === 'D' || note.key === 'K');
    }
  }

  private onKeyPress(key: string): void {
    if (!this.isStarted) {
      this.startGame();
      return;
    }

    const lane = KEY_LANE[key];
    if (lane === undefined) return;

    const inputTime = this.audio.currentTime;
    let bestIndex = -1;
    let bestDelta = Infinity;

    for (let i = 0; i < this.notes.length; i++) {
      if (this.noteStates[i] !== 'pending') continue;
      if (KEY_LANE[this.notes[i].key] !== lane) continue;

      const noteAbs = this.audio.absoluteStartTime + this.notes[i].time;
      const delta = Math.abs(inputTime - noteAbs);
      if (delta < MISS_SEC && delta < bestDelta) {
        bestDelta = delta;
        bestIndex = i;
      }
    }

    if (bestIndex === -1) {
      // Ghost hit (no note in window) — still animate player
      this.player.playHit();
      return;
    }

    const noteAbs = this.audio.absoluteStartTime + this.notes[bestIndex].time;
    const result: HitResult = this.audio.evaluateHit(inputTime, noteAbs);

    this.noteStates[bestIndex] = 'hit';
    this.tileLitUntil[lane] = this.audio.getSongTime() + LIT_SEC; // keep tile lit for 150ms
    this.player.playHit();
    this.gameEmitter.emit('hit', result);
  }
}
