import {
  AmbientLight,
  DirectionalLight,
  HemisphereLight,
  Object3D,
  Scene,
} from 'three';
import { CFG, COLORS, type ColorToken } from '@/config';

export interface SceneLights {
  sun: DirectionalLight;
  hemi: HemisphereLight;
  ambient: AmbientLight;
  sunTarget: Object3D;
}

// Mandatory trio per LIT-LIGHT-005 and instruction.md §LIGHTING.
// No other lights are added to the gameplay scene (art pack §4 explicitly forbids them).
export function buildLights(scene: Scene): SceneLights {
  const sun = new DirectionalLight(
    COLORS[CFG.lighting.directionalColor as ColorToken],
    CFG.lighting.directionalIntensity,
  );
  sun.position.set(60, 120, 40);
  sun.castShadow = CFG.render.shadowMapEnabled;
  sun.shadow.mapSize.set(CFG.lighting.shadowMapSize, CFG.lighting.shadowMapSize);
  sun.shadow.bias = CFG.lighting.shadowBias;
  sun.shadow.camera.near = 5;
  sun.shadow.camera.far = 260;
  sun.shadow.camera.left = -80;
  sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80;
  sun.shadow.camera.bottom = -80;

  const sunTarget = new Object3D();
  sun.target = sunTarget;

  const hemi = new HemisphereLight(
    COLORS[CFG.lighting.hemisphereSkyColor as ColorToken],
    COLORS[CFG.lighting.hemisphereGroundColor as ColorToken],
    CFG.lighting.hemisphereIntensity,
  );

  const ambient = new AmbientLight(
    COLORS[CFG.lighting.ambientColor as ColorToken],
    CFG.lighting.ambientIntensity,
  );

  scene.add(sun, sunTarget, hemi, ambient);
  return { sun, hemi, ambient, sunTarget };
}
