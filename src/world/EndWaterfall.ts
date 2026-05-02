import {
  Color,
  DoubleSide,
  Mesh,
  PlaneGeometry,
  RingGeometry,
  Scene,
  ShaderMaterial,
  TorusGeometry,
  Vector3,
} from 'three';
import { COLORS, TRACK_POINTS } from '@/config';
import { clonePalm } from '@/loaders/AssetLoader';
import { createSandMaterial } from './SandMaterial';
import { createWallMaterial } from './WallMaterial';
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

export const FALL_HEIGHT = 90;       // shorter drop so the waterfall fits in frame

export function buildEndWaterfall(
  scene: Scene,
  waterNormalMap: Texture | null,
): EndWaterfallHandle {
  const finishPoint = TRACK_POINTS[TRACK_POINTS.length - 1].pos;

  // === Waterfall plane: very wide, modest height — iconic shape ===
  const fallW = 200;
  const fallH = FALL_HEIGHT;
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
  // Plane at track end. Top edge = track finish Y. Plane faces the camera
  // approaching along -Z direction (player comes from +Z looking -Z).
  fall.position.set(finishPoint.x, finishPoint.y - fallH / 2, finishPoint.z - 40);
  scene.add(fall);

  // === Lake (turquoise water plane) ===
  const lakeMat = createWaterMaterial({ normalMap: waterNormalMap });
  const lakeRadius = 250;          // playable inner area where boundary sits
  const lakeCenter = new Vector3(finishPoint.x, finishPoint.y - FALL_HEIGHT, finishPoint.z - 200);
  const lake = new Mesh(new PlaneGeometry(lakeRadius * 2 + 4, lakeRadius * 2 + 4, 64, 64), lakeMat);
  lake.rotation.x = -Math.PI / 2;
  lake.position.copy(lakeCenter);
  scene.add(lake);

  // === Lake boundary: orange tube wall ring around the playable lake area ===
  const wallMat = createWallMaterial();
  // Torus: major radius = lakeRadius, minor radius = wall thickness.
  const ringWall = new Mesh(
    new TorusGeometry(lakeRadius, 1.4, 12, 96),
    wallMat,
  );
  ringWall.rotation.x = Math.PI / 2; // lay flat
  ringWall.position.copy(lakeCenter);
  ringWall.position.y += 0.6;        // sit just above the water surface
  scene.add(ringWall);

  // === Beach: sand donut around the wall ring ===
  const sandMat = createSandMaterial();
  const beach = new Mesh(
    new RingGeometry(lakeRadius + 1.8, lakeRadius + 90, 96, 6),
    sandMat,
  );
  beach.rotation.x = -Math.PI / 2;
  beach.position.copy(lakeCenter);
  beach.position.y -= 0.05; // just below water plane
  scene.add(beach);

  // === Palms scattered around the beach ring ===
  const beachPalmCount = 30;
  for (let i = 0; i < beachPalmCount; i++) {
    const palm = clonePalm();
    if (!palm) break;
    const angle = (i / beachPalmCount) * Math.PI * 2;
    const r = lakeRadius + 8 + (i % 3) * 18;
    palm.position.set(
      lakeCenter.x + Math.cos(angle) * r,
      lakeCenter.y - 0.05,
      lakeCenter.z + Math.sin(angle) * r,
    );
    palm.rotation.y = Math.random() * Math.PI * 2;
    palm.scale.setScalar(0.7 + Math.random() * 0.5);
    scene.add(palm);
  }

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

/** Y coordinate of the lake surface. Player transitions to lake mode
 * when its Y drops to this value. */
export function endLakeY(): number {
  const finishPoint = TRACK_POINTS[TRACK_POINTS.length - 1].pos;
  return finishPoint.y - FALL_HEIGHT;
}

/** Center of the playable lake area in world space. */
export function endLakeCenter(): Vector3 {
  const finishPoint = TRACK_POINTS[TRACK_POINTS.length - 1].pos;
  return new Vector3(finishPoint.x, finishPoint.y - FALL_HEIGHT, finishPoint.z - 200);
}

/** Inner radius — player should stay inside this circle. */
export const LAKE_RADIUS = 250;

export { Vector3 };
