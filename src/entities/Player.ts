import * as Phaser from 'phaser';

type PlayerAnim = 'idle' | 'hit' | 'miss';

export class Player {
  private gfx: Phaser.GameObjects.Graphics;
  private scene: Phaser.Scene;
  private cx: number;
  private cy: number;
  private anim: PlayerAnim = 'idle';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.cx = x;
    this.cy = y;
    this.gfx = scene.add.graphics();
    this.gfx.setDepth(999);
    this.redraw();
  }

  playHit(): void {
    this.anim = 'hit';
    this.redraw();
    this.scene.time.delayedCall(120, () => {
      this.anim = 'idle';
      this.redraw();
    });
  }

  playMiss(): void {
    this.anim = 'miss';
    this.redraw();
    this.scene.time.delayedCall(220, () => {
      this.anim = 'idle';
      this.redraw();
    });
  }

  private redraw(): void {
    this.gfx.clear();
    this.gfx.setPosition(this.cx, this.cy);

    const bodyColor = this.anim === 'hit' ? 0xffee00 : this.anim === 'miss' ? 0xff3333 : 0xff69b4;
    const accentColor = this.anim === 'hit' ? 0xffffff : this.anim === 'miss' ? 0xff8888 : 0xffaadd;

    // Floor shadow
    this.gfx.fillStyle(0x000000, 0.3);
    this.gfx.fillEllipse(0, 2, 26, 8);

    // Body (isometric rectangle)
    this.gfx.fillStyle(bodyColor, 1);
    this.gfx.fillRect(-6, -26, 12, 18);

    // Head
    this.gfx.fillStyle(accentColor, 1);
    this.gfx.fillCircle(0, -33, 9);

    // Hit sparkle
    if (this.anim === 'hit') {
      this.gfx.fillStyle(0xffffff, 0.8);
      this.gfx.fillCircle(-10, -40, 3);
      this.gfx.fillCircle(10, -38, 2);
      this.gfx.fillCircle(0, -46, 4);
    }

    // Miss shake indicator
    if (this.anim === 'miss') {
      this.gfx.lineStyle(2, 0xff3333, 0.9);
      this.gfx.strokeCircle(0, -33, 13);
    }
  }
}
