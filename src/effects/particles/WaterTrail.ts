import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  ShaderMaterial,
  Vector3,
} from 'three';
import { CFG, COLORS } from '@/config';

// Pre-allocated GPU-friendly particle pool. Zero allocations during update.
// Lifetimes from LIT-FX-001/002 (300–600 ms).
export class WaterTrail {
  readonly points: Points;
  private readonly geom: BufferGeometry;
  private readonly positions: Float32Array;
  private readonly velocities: Float32Array;
  private readonly lives: Float32Array;
  private readonly maxLives: Float32Array;
  private readonly alphas: Float32Array;
  private readonly sizes: Float32Array;
  private readonly active: Uint8Array;
  private readonly capacity: number;
  private nextIdx = 0;
  private readonly tmpDir = new Vector3();

  constructor() {
    this.capacity = CFG.particles.waterTrailPoolSize;
    this.geom = new BufferGeometry();
    this.positions = new Float32Array(this.capacity * 3);
    this.velocities = new Float32Array(this.capacity * 3);
    this.lives = new Float32Array(this.capacity);
    this.maxLives = new Float32Array(this.capacity);
    this.alphas = new Float32Array(this.capacity);
    this.sizes = new Float32Array(this.capacity);
    this.active = new Uint8Array(this.capacity);

    this.geom.setAttribute('position', new BufferAttribute(this.positions, 3).setUsage(35048));
    this.geom.setAttribute('aSize', new BufferAttribute(this.sizes, 1).setUsage(35048));
    this.geom.setAttribute('aAlpha', new BufferAttribute(this.alphas, 1).setUsage(35048));

    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uColor: { value: new Color(COLORS.water_foam) },
      },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aAlpha;
        varying float vAlpha;
        void main() {
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (220.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          float a = smoothstep(0.5, 0.0, d) * vAlpha;
          gl_FragColor = vec4(uColor, a);
        }
      `,
    });

    this.points = new Points(this.geom, mat);
    this.points.frustumCulled = false;
  }

  emit(pos: Vector3, count: number): void {
    for (let n = 0; n < count; n++) {
      const i = this.findSlot();
      if (i === -1) return;
      this.active[i] = 1;
      this.positions[i * 3 + 0] = pos.x + (Math.random() - 0.5) * 0.6;
      this.positions[i * 3 + 1] = pos.y + 0.1;
      this.positions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.6;

      this.tmpDir.set(
        (Math.random() - 0.5) * 1.4,
        Math.random() * 0.8 + 0.4,
        (Math.random() - 0.5) * 1.4,
      );
      this.velocities[i * 3 + 0] = this.tmpDir.x;
      this.velocities[i * 3 + 1] = this.tmpDir.y;
      this.velocities[i * 3 + 2] = this.tmpDir.z;

      const lifeS =
        (CFG.particles.waterTrailLifetimeMinMs +
          Math.random() *
            (CFG.particles.waterTrailLifetimeMaxMs - CFG.particles.waterTrailLifetimeMinMs)) /
        1000;
      this.lives[i] = lifeS;
      this.maxLives[i] = lifeS;
      this.alphas[i] = 1;
      this.sizes[i] = 0.6 + Math.random() * 0.8;
    }
  }

  update(dt: number): void {
    for (let i = 0; i < this.capacity; i++) {
      if (!this.active[i]) continue;
      this.lives[i] -= dt;
      if (this.lives[i] <= 0) {
        this.active[i] = 0;
        this.alphas[i] = 0;
        this.sizes[i] = 0;
        continue;
      }
      this.velocities[i * 3 + 0] *= 0.92;
      this.velocities[i * 3 + 1] += -3 * dt;
      this.velocities[i * 3 + 2] *= 0.92;

      this.positions[i * 3 + 0] += this.velocities[i * 3 + 0] * dt;
      this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;

      this.alphas[i] = this.lives[i] / this.maxLives[i];
    }
    this.geom.attributes.position.needsUpdate = true;
    (this.geom.attributes.aSize as BufferAttribute).needsUpdate = true;
    (this.geom.attributes.aAlpha as BufferAttribute).needsUpdate = true;
  }

  private findSlot(): number {
    for (let i = 0; i < this.capacity; i++) {
      const idx = (this.nextIdx + i) % this.capacity;
      if (!this.active[idx]) {
        this.nextIdx = (idx + 1) % this.capacity;
        return idx;
      }
    }
    return -1;
  }
}
