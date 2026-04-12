import { Color, FrontSide, ShaderMaterial, Texture, Vector3 } from 'three';
import { CFG, COLORS } from '@/config';
import { WATER_FRAG, WATER_VERT } from '@/shaders/water.glsl';

export interface WaterMaterialOptions {
  normalMap: Texture | null;
}

export function createWaterMaterial(opts: WaterMaterialOptions = { normalMap: null }): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: WATER_VERT,
    fragmentShader: WATER_FRAG,
    uniforms: {
      uTime:          { value: 0 },
      uFrequency:     { value: CFG.water.frequency },
      uAmplitude:     { value: CFG.water.amplitude },
      uFoamScroll:    { value: CFG.water.foamScroll },
      uFoamThreshold: { value: CFG.water.foamThreshold },
      uSpeed:         { value: 0 },
      uColorShallow:  { value: new Color(COLORS.water_shallow) },
      uColorMid:      { value: new Color(COLORS.water_mid) },
      uColorDeep:     { value: new Color(COLORS.water_deep) },
      uColorFoam:     { value: new Color(COLORS.water_foam) },
      uColorRim:      { value: new Color(COLORS.water_rim) },
      uSunDir:        { value: new Vector3(0.45, 0.7, 0.55).normalize() },
      uSunColor:      { value: new Color(COLORS.sun_warm) },
      uNormalMap:     { value: opts.normalMap },
      uNormalScale:   { value: 0.65 },
    },
    transparent: false,
    side: FrontSide,
    toneMapped: true,
    depthWrite: true,
  });
}

export function tickWaterMaterial(mat: ShaderMaterial, dt: number, speedNorm = 0): void {
  (mat.uniforms.uTime.value as number) += dt;
  (mat.uniforms.uSpeed.value as number) = speedNorm;
}
