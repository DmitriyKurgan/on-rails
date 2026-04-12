// Stylized arcade water with a real normal-map surface.
// Visual target: assets/on-rails-view.png — bright turquoise channel, curved
// white foam streaks, sparkle hotspots, specular highlights matching the sun.
// Verbatim UV-distortion formulas preserved per LIT-WATER-001/002:
//   uv.x += sin(time + uv.y * frequency) * amplitude;
//   uv.y += cos(time + uv.x * frequency) * amplitude;

export const WATER_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;
  varying float vWave;

  uniform float uTime;
  uniform float uSpeed;

  void main() {
    vUv = uv;

    // Gentle vertex-space Y displacement — damped near the walls.
    float centerMask = 1.0 - abs(uv.x - 0.5) * 2.0;
    centerMask = smoothstep(0.0, 1.0, centerMask);
    float wave =
        sin(uv.y * 60.0 - uTime * 5.0) * 0.09 +
        sin(uv.x * 18.0 + uTime * 3.5) * 0.05;
    wave *= centerMask * (0.6 + uSpeed * 0.8);

    vec3 p = position;
    p.y += wave;
    vWave = wave;

    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorldPos = world.xyz;
    vViewDir = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

export const WATER_FRAG = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;
  varying float vWave;

  uniform float uTime;
  uniform float uFrequency;
  uniform float uAmplitude;
  uniform float uFoamScroll;
  uniform float uFoamThreshold;
  uniform float uSpeed;
  uniform vec3  uColorShallow;
  uniform vec3  uColorMid;
  uniform vec3  uColorDeep;
  uniform vec3  uColorFoam;
  uniform vec3  uColorRim;
  uniform vec3  uSunDir;
  uniform vec3  uSunColor;
  uniform sampler2D uNormalMap;
  uniform float uNormalScale;

  // --- hash / value noise for foam pattern ---
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i),             hash(i + vec2(1,0)), u.x),
      mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x),
      u.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.55;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = p * 2.03 + vec2(1.7, 3.1);
      a *= 0.5;
    }
    return v;
  }

  // Sample the tiling water normal map twice with independent scroll vectors
  // and blend — this is what three.js's examples/Water uses under the hood.
  vec3 sampleWaterNormal() {
    vec2 p = vWorldPos.xz * 0.06;
    vec2 scroll1 = vec2( 0.02,  0.05) * uTime;
    vec2 scroll2 = vec2(-0.03,  0.02) * uTime;
    vec3 n1 = texture2D(uNormalMap, p + scroll1).xyz * 2.0 - 1.0;
    vec3 n2 = texture2D(uNormalMap, p * 2.3 + scroll2).xyz * 2.0 - 1.0;
    vec3 n = normalize(n1 + n2 * 0.6);
    // Lift back toward world-up and scale flatness via uNormalScale.
    n.xy *= uNormalScale;
    n.z = max(n.z, 0.1);
    return normalize(n);
  }

  void main() {
    // LIT-WATER-001 / 002 — verbatim UV distortion
    vec2 duv = vUv;
    duv.x += sin(uTime + vUv.y * uFrequency) * uAmplitude * 2.0;
    duv.y += cos(uTime + vUv.x * uFrequency) * uAmplitude * 2.0;

    // --- Base color: saturated turquoise centered, darker near walls ---
    float centerDist = abs(duv.x - 0.5) * 2.0;
    float depthMask = smoothstep(0.0, 1.0, centerDist);
    vec3 baseColor = mix(uColorShallow, uColorMid, smoothstep(0.0, 0.6, depthMask));
    baseColor      = mix(baseColor, uColorDeep, smoothstep(0.75, 1.0, depthMask));
    baseColor *= 1.12;

    // --- Slow flow coordinate: boost adds a SMALL bump, not 2× scroll ---
    float scrollRate = uFoamScroll * 0.35 + uSpeed * 0.2;
    float flowSlow = duv.y * 3.0 - uTime * scrollRate;

    // Gentle horizontal curl driven by slow-time fbm (input unaffected by
    // scrollRate so it cannot shimmer when boost kicks in).
    float curl = fbm(vec2(duv.x * 2.2, duv.y * 1.4 + uTime * 0.15)) - 0.5;
    float across = (duv.x - 0.5) + curl * 0.14;

    // One wide centre band with soft edges. No side bands, no spray layer.
    float centerBand = pow(max(cos(across * 4.2), 0.0), 5.0);

    // Density modulation from a SLOW fbm
    float densityMod = fbm(vec2(duv.y * 2.0 + uTime * 0.25, duv.x * 1.6 + flowSlow * 0.1));
    float foamCore = centerBand * smoothstep(0.42, 0.68, densityMod) * 0.55;

    // Restrict to the inner 70% of the channel so walls stay clean
    float laneMask = smoothstep(0.12, 0.28, duv.x) * smoothstep(0.12, 0.28, 1.0 - duv.x);
    float foamMask = clamp(foamCore * laneMask * 0.85, 0.0, 1.0);

    vec3 col = mix(baseColor, uColorFoam, foamMask);

    // === Normal-mapped lighting ===
    // Tangent space: the floor strip is roughly flat with +Y up, so we
    // treat normal-map XY as world XZ and Z as world Y.
    vec3 sampledN = sampleWaterNormal();
    vec3 N = normalize(vec3(sampledN.x, sampledN.z, sampledN.y));

    vec3 V = normalize(vViewDir);
    vec3 L = normalize(uSunDir);
    vec3 H = normalize(L + V);

    // --- Real fresnel (grazing angles brighten toward sky tint) ---
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    col += fresnel * uColorRim * 0.65;

    // --- Specular highlight (Blinn-Phong against the sun) ---
    float specDot = max(dot(N, H), 0.0);
    float spec = pow(specDot, 96.0);
    col += uSunColor * spec * 1.8;

    // Softer broader specular for the wet sheen
    float wideSpec = pow(specDot, 24.0) * 0.4;
    col += uSunColor * wideSpec;

    // --- Wave highlight from the vertex displacement ---
    col += clamp(vWave, 0.0, 1.0) * vec3(1.0) * 1.5;

    // --- Sparkle hotspots: discretized time step so sparkles don't strobe
    // every frame (previously caused visible shimmer at any speed). ---
    vec2 sparkleGrid = floor(vUv * 220.0) + vec2(floor(uTime * 6.0), floor(uTime * 4.0));
    float sp = step(0.992, hash(sparkleGrid));
    col += sp * vec3(1.1, 1.1, 0.95);

    gl_FragColor = vec4(col, 1.0);
  }
`;
