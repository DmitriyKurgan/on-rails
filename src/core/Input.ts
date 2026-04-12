import { CFG } from '@/config';

// Keyboard input — tracks `CFG.controls.keys` (LIT-GAME-006).
// Abstracts away key codes so gameplay reads `left`, `right`, `boost` intents.
export class Input {
  private readonly keys = new Set<string>();
  private readonly tracked = new Set<string>(CFG.controls.keys);

  get left(): boolean {
    return this.keys.has('KeyA') || this.keys.has('ArrowLeft');
  }
  get right(): boolean {
    return this.keys.has('KeyD') || this.keys.has('ArrowRight');
  }
  get boost(): boolean {
    return this.keys.has('Space');
  }

  attach(): void {
    window.addEventListener('keydown', this.handleDown);
    window.addEventListener('keyup', this.handleUp);
  }

  detach(): void {
    window.removeEventListener('keydown', this.handleDown);
    window.removeEventListener('keyup', this.handleUp);
  }

  private readonly handleDown = (e: KeyboardEvent): void => {
    if (this.tracked.has(e.code)) {
      this.keys.add(e.code);
      if (e.code === 'Space') e.preventDefault();
    }
  };

  private readonly handleUp = (e: KeyboardEvent): void => {
    if (this.tracked.has(e.code)) this.keys.delete(e.code);
  };
}
