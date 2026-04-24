import * as Phaser from 'phaser';

export type TileState = 'normal' | 'warning' | 'lit';

const W = 64;
const H = 32;
const D = 14; // tile depth (3D side thickness)

const TOP_FACE = [
  new Phaser.Math.Vector2(0, 0),
  new Phaser.Math.Vector2(W / 2, H / 2),
  new Phaser.Math.Vector2(0, H),
  new Phaser.Math.Vector2(-W / 2, H / 2),
];

const LEFT_FACE = [
  new Phaser.Math.Vector2(0, H),
  new Phaser.Math.Vector2(-W / 2, H / 2),
  new Phaser.Math.Vector2(-W / 2, H / 2 + D),
  new Phaser.Math.Vector2(0, H + D),
];

const RIGHT_FACE = [
  new Phaser.Math.Vector2(0, H),
  new Phaser.Math.Vector2(W / 2, H / 2),
  new Phaser.Math.Vector2(W / 2, H / 2 + D),
  new Phaser.Math.Vector2(0, H + D),
];

const COLORS = {
  normal:  { top: 0x2e1f4a, left: 0x1c1232, right: 0x130b24, edge: 0x4a3370 },
  warning: { top: 0x7a4fbf, left: 0x4d3278, right: 0x381f5c, edge: 0xc87eff },
  lit:     { top: 0x00e5ff, left: 0x009fb3, right: 0x006680, edge: 0xffffff },
} as const;

export class FloorTile {
  private gfx: Phaser.GameObjects.Graphics;
  private state: TileState = 'normal';

  constructor(scene: Phaser.Scene, x: number, y: number, depth: number) {
    this.gfx = scene.add.graphics();
    this.gfx.setPosition(x, y);
    this.gfx.setDepth(depth);
    this.draw();
  }

  setState(state: TileState): void {
    if (this.state === state) return;
    this.state = state;
    this.draw();
  }

  private draw(): void {
    this.gfx.clear();
    const c = COLORS[this.state];

    // Glow halo for lit state
    if (this.state === 'lit') {
      this.gfx.fillStyle(0x00e5ff, 0.18);
      this.gfx.fillEllipse(0, H / 2, W + 24, H + 14);
    }
    if (this.state === 'warning') {
      this.gfx.fillStyle(0x9966ff, 0.1);
      this.gfx.fillEllipse(0, H / 2, W + 12, H + 8);
    }

    // Right side face (rendered before left so left occludes it correctly)
    this.gfx.fillStyle(c.right, 1);
    this.gfx.fillPoints(RIGHT_FACE, true);

    // Left side face
    this.gfx.fillStyle(c.left, 1);
    this.gfx.fillPoints(LEFT_FACE, true);

    // Top face
    this.gfx.fillStyle(c.top, 1);
    this.gfx.fillPoints(TOP_FACE, true);

    // Edge lines
    const edgeAlpha = this.state === 'normal' ? 0.35 : 0.9;
    this.gfx.lineStyle(1, c.edge, edgeAlpha);
    this.gfx.strokePoints(TOP_FACE, true);

    if (this.state === 'lit') {
      // Double-stroke for bright glow
      this.gfx.lineStyle(3, 0x00e5ff, 0.4);
      this.gfx.strokePoints(TOP_FACE, true);
      this.gfx.lineStyle(1.5, 0xffffff, 0.9);
      this.gfx.strokePoints(TOP_FACE, true);
    }
  }
}
