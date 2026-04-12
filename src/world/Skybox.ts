import {
  BackSide,
  Color,
  Mesh,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import { COLORS } from '@/config';

// Gradient sky dome — art pack §3.9. Not a cubemap so color grading stays cheap.
// Uses a view-direction gradient (not world position) so the horizon line stays
// anchored regardless of where the camera is along the track.

const VERT = /* glsl */ `
  varying vec3 vViewDir;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vViewDir = normalize(world.xyz - cameraPosition);
    // Place sky vertices at max depth so the sphere always sits behind the scene.
    vec4 clip = projectionMatrix * viewMatrix * world;
    gl_Position = clip.xyww;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vViewDir;
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uHaze;
  uniform vec3 uSun;
  uniform vec3 uSunDir;
  uniform vec3 uCloud;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1,0)), u.x),
      mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x),
      u.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.02;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    float h = clamp(vViewDir.y * 0.5 + 0.5, 0.0, 1.0);
    // Three-stop vertical gradient: haze → mid → top
    vec3 col = mix(uHaze, uMid, smoothstep(0.4, 0.62, h));
    col = mix(col, uTop, smoothstep(0.6, 0.92, h));

    // Soft sun disc + halo
    vec3 sunDir = normalize(uSunDir);
    float sunDot = max(dot(normalize(vViewDir), sunDir), 0.0);
    col += uSun * pow(sunDot, 128.0) * 2.5;
    col += uSun * pow(sunDot, 6.0) * 0.25;

    // Cheap fbm clouds mapped on the upper hemisphere
    if (vViewDir.y > 0.02) {
      vec2 cloudUv = vec2(
        atan(vViewDir.z, vViewDir.x) * 1.2,
        vViewDir.y * 3.0
      );
      float c = fbm(cloudUv * 2.0);
      float cloudMask = smoothstep(0.55, 0.85, c) * smoothstep(0.0, 0.25, vViewDir.y);
      col = mix(col, uCloud, cloudMask * 0.8);
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function buildSkybox(scene: Scene): Mesh {
  const mat = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uTop:    { value: new Color(COLORS.sky_top) },
      uMid:    { value: new Color(COLORS.sky_mid) },
      uHaze:   { value: new Color(COLORS.sky_haze) },
      uSun:    { value: new Color(COLORS.sun_disc) },
      uCloud:  { value: new Color(COLORS.cloud_white) },
      uSunDir: { value: new Vector3(0.45, 0.6, -0.45) },
    },
    side: BackSide,
    depthWrite: false,
    depthTest: false,
    toneMapped: true,
  });
  const mesh = new Mesh(new SphereGeometry(2500, 32, 24), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;
  scene.add(mesh);
  return mesh;
}
