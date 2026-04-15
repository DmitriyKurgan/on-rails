import {
  Color,
  DoubleSide,
  Mesh,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector3,
} from 'three';
import { COLORS, TRACK_POINTS } from '@/config';
import { createWaterMaterial, tickWaterMaterial } from './WaterMaterial';
import type { Texture } from 'three';

// Big waterfall + lake at the end of the track. Visual set piece — the
// finish_arch position drops off into nothing, this fills that void with a
// dramatic plunge into a turquoise lagoon.

const WATERFALL_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vViewDir = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const WATERFALL_FRAG = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vViewDir;
  uniform float uTime;
  uniform vec3 uColorTop;
  uniform vec3 uColorBottom;
  uniform vec3 uColorFoam;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i),             hash(i + vec2(1,0)), u.x),
      mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x),
      u.y);
  }

  void main() {
    // uv.y goes 0 (bottom) → 1 (top of plane). Waterfall flows DOWN, so
    // foam streaks scroll from high uv.y to low uv.y over time.
    float flow = vUv.y * 8.0 + uTime * 3.0;

    // Vertical streaks
    float bandX = sin(vUv.x * 32.0 + noise(vec2(vUv.x * 8.0, flow * 0.4)) * 4.0) * 0.5 + 0.5;
    float streak = pow(bandX, 4.0);

    // Animated noise overlay for "rushing water" feel
    float n = noise(vec2(vUv.x * 18.0, flow));
    float foam = smoothstep(0.4, 0.85, streak * (0.5 + n * 0.6));

    // Color: top deeper turquoise, bottom whiter where it crashes
    vec3 baseColor = mix(uColorBottom, uColorTop, vUv.y);
    vec3 col = mix(baseColor, uColorFoam, foam);

    // Brighten the very bottom edge — splash zone
    float bottomGlow = smoothstep(0.0, 0.15, vUv.y);
    col = mix(uColorFoam, col, bottomGlow);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export interface EndWaterfallHandle {
  tick(dt: number): void;
}

export function buildEndWaterfall(
  scene: Scene,
  waterNormalMap: Texture | null,
): EndWaterfallHandle {
  const finishPoint = TRACK_POINTS[TRACK_POINTS.length - 1].pos;

  // === Waterfall plane ===
  // 80u wide, 220u tall, positioned at the end of the track and falling down.
  const fallW = 80;
  const fallH = 220;
  const fallMat = new ShaderMaterial({
    vertexShader: WATERFALL_VERT,
    fragmentShader: WATERFALL_FRAG,
    uniforms: {
      uTime:        { value: 0 },
      uColorTop:    { value: new Color(COLORS.water_shallow) },
      uColorBottom: { value: new Color(COLORS.water_foam) },
      uColorFoam:   { value: new Color(COLORS.water_foam) },
    },
    side: DoubleSide,
    transparent: false,
  });
  const fall = new Mesh(new PlaneGeometry(fallW, fallH, 4, 32), fallMat);
  // Place plane vertically: top edge aligned with finish point, falling down
  fall.position.set(finishPoint.x, finishPoint.y - fallH / 2 + 5, finishPoint.z - 30);
  // PlaneGeometry default: in XY plane facing +Z. We need it vertical and
  // facing back toward the camera (which approaches from +Z).
  // Default plane already faces +Z, no rotation needed.
  scene.add(fall);

  // === Lake (large turquoise water plane below the waterfall) ===
  const lakeMat = createWaterMaterial({ normalMap: waterNormalMap });
  const lake = new Mesh(new PlaneGeometry(400, 400, 64, 64), lakeMat);
  lake.rotation.x = -Math.PI / 2; // horizontal
  lake.position.set(finishPoint.x, finishPoint.y - fallH + 8, finishPoint.z - 60);
  scene.add(lake);

  // === Distant haze sphere — gives a far-shore impression ===
  // (Optional ambient set piece — distant land silhouette)
  // Skipped for simplicity; lake fades into fog.

  return {
    tick(dt: number) {
      (fallMat.uniforms.uTime.value as number) += dt;
      tickWaterMaterial(lakeMat, dt, 0);
    },
  };
}

// Small helper to keep types tidy if external code needs the falling lake plane
// position as a "world out of bounds" marker.
export function endLakeY(): number {
  const finishPoint = TRACK_POINTS[TRACK_POINTS.length - 1].pos;
  return finishPoint.y - 220 + 8;
}

// Re-export for App.ts — no need but keeps imports clean
export { Vector3 };
