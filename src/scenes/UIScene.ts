import * as Phaser from 'phaser';
import type { HitResult } from '../audio/AudioManager.ts';

const POINTS: Readonly<Record<HitResult, number>> = { PERFECT: 300, GOOD: 100, MISS: 0 };
const FEEDBACK_COLOR: Readonly<Record<HitResult, string>> = {
  PERFECT: '#00e5ff',
  GOOD: '#ffee00',
  MISS: '#ff3333',
};

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private maxComboText!: Phaser.GameObjects.Text;

  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private gameEmitter!: Phaser.Events.EventEmitter;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    this.gameEmitter = this.registry.get('gameEmitter') as Phaser.Events.EventEmitter;

    this.scoreText = this.add.text(16, 16, 'Score  0', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'monospace',
    });

    this.comboText = this.add.text(16, 44, '', {
      fontSize: '18px',
      color: '#ffee00',
      fontFamily: 'monospace',
    });

    this.maxComboText = this.add.text(784, 16, '', {
      fontSize: '14px',
      color: '#886699',
      fontFamily: 'monospace',
    }).setOrigin(1, 0);

    // Feedback text sits in the open area below the grid, above buttons
    this.feedbackText = this.add.text(400, 430, '', {
      fontSize: '42px',
      color: '#00e5ff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0);

    this.gameEmitter.on('hit', this.onHit, this);
    this.gameEmitter.on('miss', this.onMiss, this);
  }

  private onHit(result: HitResult): void {
    if (result === 'MISS') {
      this.onMiss();
      return;
    }

    this.score += POINTS[result];
    this.combo++;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
      this.maxComboText.setText(`best  ${this.maxCombo}x`);
    }

    this.scoreText.setText(`Score  ${this.score}`);
    this.comboText.setText(this.combo >= 2 ? `${this.combo}x combo` : '');

    this.showFeedback(result);
  }

  private onMiss(): void {
    this.combo = 0;
    this.comboText.setText('');
    this.showFeedback('MISS');
  }

  private showFeedback(result: HitResult): void {
    this.tweens.killTweensOf(this.feedbackText);
    this.feedbackText.setText(result);
    this.feedbackText.setColor(FEEDBACK_COLOR[result]);
    this.feedbackText.setAlpha(1).setY(430);

    this.tweens.add({
      targets: this.feedbackText,
      alpha: 0,
      y: 405,
      duration: 500,
      ease: 'Power2.Out',
    });
  }
}
