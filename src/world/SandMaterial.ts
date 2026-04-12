import { Color, ShaderMaterial, Vector3 } from 'three';
import { COLORS } from '@/config';

// Procedural sand material for the side banks. Uses world-space value noise
// at several scales to create grain detail, ripples and darker wet-sand
// patches — so the flat bank surface doesn't look like painted cardboard.

const VERT = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  uniform vec3 uColorBase;
  uniform vec3 uColorWet;
  uniform vec3 uColorWarm;
  uniform vec3 uSunDir;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i),             hash(i + vec2(1,0)), u.x),
      mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x),
      u.y);
  }
  float fbm2(vec2 p) {
    float v = 0.0;
    float a = 0.55;
    for (int i = 0; i < 5; i++) {
      v += a * noise2(p);
      p = p * 2.03 + vec2(1.7, 3.1);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 wp = vWorldPos.xz;

    // Large dunes / wet-sand patches
    float dunes = fbm2(wp * 0.05);
    // Mid ripples — the finger-combed wave pattern in real wet sand
    float ripples = noise2(wp * 0.9 + vec2(dunes * 2.0, 0.0));
    // Fine grain sparkle
    float grain = hash(floor(wp * 12.0));

    vec3 col = uColorBase;
    col = mix(col, uColorWarm, smoothstep(0.35, 0.8, dunes));
    col = mix(col, uColorWet, smoothstep(0.55, 0.85, 1.0 - dunes) * 0.55);

    // Ripple darkening
    col *= 0.82 + smoothstep(0.2, 0.8, ripples) * 0.2;
    // Grain sparkle (very subtle)
    col += vec3(grain - 0.5) * 0.05;

    // Half-lambert lighting
    vec3 N = normalize(vWorldNormal);
    vec3 L = normalize(uSunDir);
    float ndl = dot(N, L) * 0.5 + 0.5;
    col *= 0.6 + ndl * 0.75;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createSandMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uColorBase: { value: new Color(COLORS.sand) },
      uColorWet:  { value: new Color(COLORS.sand_wet) },
      uColorWarm: { value: new Color(COLORS.sand_dune) },
      uSunDir:    { value: new Vector3(0.45, 0.7, 0.55).normalize() },
    },
    toneMapped: true,
  });
}
