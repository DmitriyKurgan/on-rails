import type { WebGLRenderer } from 'three';

export interface GameLoopOptions {
  renderer: WebGLRenderer;
  update: (dt: number, elapsed: number) => void;
  render: (dt: number) => void;
  onResize?: (width: number, height: number) => void;
}

export interface GameLoopHandle {
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
  isPaused(): boolean;
  elapsed(): number;
}

// Fixed-dt-clamped animation loop driven by renderer.setAnimationLoop so WebXR
// and composer timing stays in sync.
export function createGameLoop(opts: GameLoopOptions): GameLoopHandle {
  const { renderer, update, render, onResize } = opts;
  let lastTime = 0;
  let elapsed = 0;
  let paused = false;
  let running = false;

  const handleResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    onResize?.(w, h);
  };

  const handleVisibility = () => {
    if (document.hidden) paused = true;
  };

  const handleBlur = () => {
    paused = true;
  };

  function tick(now: number) {
    if (!running) return;
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.1) dt = 0.1; // prevent death spirals after pause/tab switch

    if (!paused) {
      elapsed += dt;
      update(dt, elapsed);
    }
    render(paused ? 0 : dt);
  }

  return {
    start() {
      running = true;
      lastTime = performance.now();
      window.addEventListener('resize', handleResize);
      document.addEventListener('visibilitychange', handleVisibility);
      window.addEventListener('blur', handleBlur);
      handleResize();
      renderer.setAnimationLoop(tick);
    },
    stop() {
      running = false;
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
    },
    pause() { paused = true; },
    resume() {
      paused = false;
      lastTime = performance.now();
    },
    isPaused: () => paused,
    elapsed: () => elapsed,
  };
}
