import { Color, ShaderMaterial, Vector3 } from 'three';
import { COLORS } from '@/config';

// Textured rock material for cliffs and boulders. Procedural shader — no
// external texture needed. Uses triplanar world-position noise to colour
// the surface with rock/moss variation, a top-down grass tint, and cheap
// directional lighting against the sun direction.

const VERT = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;

  uniform vec3 uColorBase;
  uniform vec3 uColorDark;
  uniform vec3 uColorWarm;
  uniform vec3 uColorMoss;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;

  // 3D hash + value noise
  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
  }
  float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i),                     hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)),       hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)),       hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)),       hash(i + vec3(1,1,1)), f.x), f.y),
      f.z);
  }
  float fbm3(vec3 p) {
    float v = 0.0;
    float a = 0.55;
    for (int i = 0; i < 5; i++) {
      v += a * noise3(p);
      p = p * 2.07 + vec3(1.7, 3.1, 0.9);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(vViewDir);
    vec3 L = normalize(uSunDir);

    // --- Triplanar-ish rock noise ---
    // Two noise layers at different scales produce crevices and facets.
    float big = fbm3(vWorldPos * 0.18);
    float mid = fbm3(vWorldPos * 0.65 + vec3(3.1));
    float detail = noise3(vWorldPos * 2.2);
    float rockPattern = big * 0.6 + mid * 0.3 + detail * 0.1;

    // Base rock colour varies along the pattern
    vec3 col = mix(uColorDark, uColorBase, smoothstep(0.35, 0.75, rockPattern));
    col = mix(col, uColorWarm, smoothstep(0.7, 0.95, rockPattern));

    // --- Moss / grass on top-facing surfaces ---
    float upFacing = clamp(N.y, 0.0, 1.0);
    float mossMask = smoothstep(0.55, 0.9, upFacing) * smoothstep(0.4, 0.75, big);
    col = mix(col, uColorMoss, mossMask * 0.7);

    // --- Lighting: half-lambert diffuse + soft broad spec ---
    float ndl = dot(N, L) * 0.5 + 0.5;
    col *= 0.5 + ndl * 0.85;

    vec3 H = normalize(L + V);
    float ndh = max(dot(N, H), 0.0);
    col += uSunColor * pow(ndh, 12.0) * 0.25;

    // --- Ambient occlusion fake: darken crevices ---
    float ao = smoothstep(0.1, 0.45, big);
    col *= 0.78 + ao * 0.32;

    // --- Subtle fresnel so silhouettes pop ---
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.5);
    col += fres * uColorWarm * 0.25;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createCliffMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uColorBase: { value: new Color(COLORS.rock_grey) },
      uColorDark: { value: new Color(COLORS.rock_grey_dark) },
      uColorWarm: { value: new Color(COLORS.rock_warm) },
      uColorMoss: { value: new Color(COLORS.palm_green) },
      uSunDir:    { value: new Vector3(0.45, 0.7, 0.55).normalize() },
      uSunColor:  { value: new Color(COLORS.sun_warm) },
    },
    toneMapped: true,
  });
}
