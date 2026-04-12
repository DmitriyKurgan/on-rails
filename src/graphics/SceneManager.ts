import { Color, Fog, Scene } from 'three';
import { CFG, COLORS } from '@/config';

// Sky-dome sphere is drawn separately (see Skybox.ts), but we still set a
// fallback solid background so any pixel missed by the sphere is tropical
// blue rather than black. Fog is pushed far out so foreground props stay
// crisp — close-range haze was crushing the scene readability.
export function configureScene(scene: Scene): void {
  scene.background = new Color(COLORS.sky_mid);
  scene.fog = new Fog(COLORS.sky_haze, CFG.fog.near * 2, CFG.fog.far * 1.4);
}
