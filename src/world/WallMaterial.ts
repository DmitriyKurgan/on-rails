import { Color, ShaderMaterial, Vector3 } from 'three';
import { COLORS } from '@/config';

// Custom shader material for the orange tube walls. Replaces the plain
// MeshStandardMaterial so we can bake the reference screenshot look:
//   - vertical gradient (bright top highlight → darker shadow underside)
//   - sharp specular streak along the upper lip (the "glossy sheen")
//   - fresnel rim that catches the camera at grazing angles
//   - subtle hash-noise texture so the surface doesn't look plastic-flat
// Responds to a single sun direction uniform driven from scene lighting.

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
  uniform vec3 uColorHi;
  uniform vec3 uColorShadow;
  uniform vec3 uColorRim;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;

  // 3D hash noise for micro-variation
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

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(vViewDir);
    vec3 L = normalize(uSunDir);

    // --- Vertical gradient from shadow (down-facing) to highlight (up-facing)
    // Use the world-up dot product on the surface normal.
    float upFacing = N.y;                         // -1 = underside, +1 = top
    float topBlend = smoothstep(-0.1, 0.7, upFacing);  // shadow → base
    float hiBlend  = smoothstep(0.55, 0.95, upFacing); // base → highlight
    vec3 col = mix(uColorShadow, uColorBase, topBlend);
    col = mix(col, uColorHi, hiBlend * 0.85);

    // --- Lambertian diffuse ---
    float ndl = max(dot(N, L), 0.0);
    col *= 0.55 + ndl * 0.75;

    // --- Specular streak: sharp Blinn-Phong pop on the upper rim where
    // the sun rakes the curved surface. This produces the bright "sheen
    // line" running along the top of each wall in the reference screenshot.
    vec3 H = normalize(L + V);
    float ndh = max(dot(N, H), 0.0);
    float streak = pow(ndh, 64.0) * smoothstep(0.35, 0.9, upFacing);
    col += uSunColor * streak * 2.2;

    // --- Broader wet sheen ---
    col += uSunColor * pow(ndh, 16.0) * 0.3;

    // --- Fresnel rim ---
    float fres = pow(1.0 - max(dot(N, V), 0.0), 2.4);
    col += fres * uColorRim * 0.5;

    // --- Multi-scale surface relief: three noise layers combine to produce
    // visible bands, scratches and crease variation on the tube surface.
    float n1 = noise3(vWorldPos * 1.1);
    float n2 = noise3(vWorldPos * 3.6 + vec3(5.0));
    float n3 = noise3(vWorldPos * 9.0 + vec3(12.0));
    float surface = n1 * 0.55 + n2 * 0.3 + n3 * 0.15;
    // Darker creases at minima, warm highlights at maxima
    col *= 0.82 + surface * 0.35;
    // Fake normal perturbation: bias color toward sun-lit hi where surface
    // peaks point "upward" (higher n values).
    col += uColorHi * smoothstep(0.62, 0.88, surface) * 0.22;
    // Crease shadows: darker bands along the stripes
    col *= 1.0 - smoothstep(0.12, 0.0, surface) * 0.2;

    // --- Small dark band near the waterline for depth read
    float waterline = smoothstep(-0.2, -0.6, upFacing);
    col = mix(col, uColorShadow * 0.6, waterline * 0.35);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createWallMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uColorBase:   { value: new Color(COLORS.wall_orange) },
      uColorHi:     { value: new Color(COLORS.wall_orange_hi) },
      uColorShadow: { value: new Color(COLORS.wall_orange_shadow) },
      uColorRim:    { value: new Color(COLORS.wall_rim) },
      uSunDir:      { value: new Vector3(0.45, 0.7, 0.55).normalize() },
      uSunColor:    { value: new Color(COLORS.sun_warm) },
    },
    toneMapped: true,
  });
}
