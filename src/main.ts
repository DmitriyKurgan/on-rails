import { App } from '@/App';
import '@/hud/hud.css';

new App().start().catch((err) => {
  console.error('[main] App.start() failed', err);
});
