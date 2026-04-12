import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  DoubleSide,
  Group,
  Material,
  Mesh,
  Vector3,
} from 'three';
import { CFG, TRACK_POSITIONS, TRACK_ROLLS_RAD } from '@/config';
import type { RoadFrame, RoadSampler } from '@/graphics/CameraController';

interface Frames {
  tangents?: Vector3[];
  normals: Vector3[];
  binormals: Vector3[];
}

export interface RoadOptions {
  wallMaterial: Material;
  floorMaterial: Material;
}

export class Road implements RoadSampler {
  readonly curve: CatmullRomCurve3;
  readonly group = new Group();
  readonly segments = CFG.track.segments;
  readonly width = CFG.track.width;
  readonly length: number;
  private readonly frames: Frames;
  private readonly tmpTangent = new Vector3();

  constructor(opts: RoadOptions) {
    this.curve = new CatmullRomCurve3(
      TRACK_POSITIONS.map((p) => p.clone()),
      false,
      'catmullrom',
      0.5,
    );
    this.length = this.curve.getLength();

    this.frames = this.buildRolledFrames();

    // Floor 2u wider than track (1u per side) so water runs under the wall
    // base — prevents hairline gaps on curves where interpolation differs.
    const floorGeom = buildFloorStrip(this.curve, this.frames, this.segments, this.width + 2, 6);
    const floor = new Mesh(floorGeom, opts.floorMaterial);
    floor.receiveShadow = true;

    // Shaped walls with a water-slide cross-section profile (flat inner face
    // rising to a pronounced lip, then outer slope). Replaces the old round
    // TubeGeometry so the rails read as real slide walls, not pipes.
    const wallMatSided = opts.wallMaterial.clone();
    (wallMatSided as unknown as { side: number }).side = DoubleSide;
    // Polygon offset pushes wall fragments slightly behind in depth buffer,
    // preventing z-fighting where the wall base overlaps the water floor.
    (wallMatSided as unknown as { polygonOffset: boolean }).polygonOffset = true;
    (wallMatSided as unknown as { polygonOffsetFactor: number }).polygonOffsetFactor = 1;
    (wallMatSided as unknown as { polygonOffsetUnits: number }).polygonOffsetUnits = 1;
    const leftWallGeom = buildWallStrip(this.curve, this.frames, this.segments, this.width / 2, -1);
    const rightWallGeom = buildWallStrip(this.curve, this.frames, this.segments, this.width / 2, +1);
    const leftWall = new Mesh(leftWallGeom, wallMatSided);
    const rightWall = new Mesh(rightWallGeom, wallMatSided);

    this.group.add(floor, leftWall, rightWall);
  }

  private buildRolledFrames(): Frames {
    // Three's computeFrenetFrames picks an arbitrary start normal on straight
    // sections which makes the world appear rotated 90° when the camera uses
    // that frame. We rebuild the frames from scratch using world-up as an
    // anchor: binormal = tangent × worldUp (the true horizontal side), normal
    // = binormal × tangent (the upward direction). Then apply per-point roll.
    const worldUp = new Vector3(0, 1, 0);
    const tangents: Vector3[] = [];
    const normals: Vector3[] = [];
    const binormals: Vector3[] = [];

    for (let i = 0; i <= this.segments; i++) {
      const t = i / this.segments;
      const tangent = new Vector3();
      this.curve.getTangentAt(t, tangent).normalize();

      // Handle near-vertical tangents (avoid cross-product degeneracy).
      let binormal = new Vector3().crossVectors(tangent, worldUp);
      if (binormal.lengthSq() < 1e-6) {
        binormal = new Vector3(1, 0, 0);
      }
      binormal.normalize();
      const normal = new Vector3().crossVectors(binormal, tangent).normalize();

      tangents.push(tangent);
      normals.push(normal);
      binormals.push(binormal);
    }

    // Apply per-control-point roll around the tangent axis.
    const n = TRACK_ROLLS_RAD.length - 1;
    for (let i = 0; i <= this.segments; i++) {
      const u = (i / this.segments) * n;
      const i0 = Math.floor(u);
      const i1 = Math.min(i0 + 1, n);
      const f = u - i0;
      const theta = TRACK_ROLLS_RAD[i0] * (1 - f) + TRACK_ROLLS_RAD[i1] * f;
      if (theta === 0) continue;
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      const nml = normals[i];
      const bnl = binormals[i];
      const nx = nml.x * c + bnl.x * s;
      const ny = nml.y * c + bnl.y * s;
      const nz = nml.z * c + bnl.z * s;
      const bx = -nml.x * s + bnl.x * c;
      const by = -nml.y * s + bnl.y * c;
      const bz = -nml.z * s + bnl.z * c;
      nml.set(nx, ny, nz);
      bnl.set(bx, by, bz);
    }

    return { tangents, normals, binormals };
  }

  getPointAt(t: number, out?: Vector3): Vector3 {
    const target = out ?? new Vector3();
    return this.curve.getPointAt(clamp01(t), target);
  }

  getTangentAt(t: number, out?: Vector3): Vector3 {
    const target = out ?? new Vector3();
    return this.curve.getTangentAt(clamp01(t), target).normalize();
  }

  getFrameAt(t: number): RoadFrame {
    const u = clamp01(t) * this.segments;
    const i = Math.min(Math.floor(u), this.segments - 1);
    const f = u - i;
    const n0 = this.frames.normals[i];
    const n1 = this.frames.normals[i + 1];
    const b0 = this.frames.binormals[i];
    const b1 = this.frames.binormals[i + 1];
    const normal = n0.clone().lerp(n1, f).normalize();
    const binormal = b0.clone().lerp(b1, f).normalize();
    this.curve.getTangentAt(clamp01(t), this.tmpTangent).normalize();
    return { tangent: this.tmpTangent.clone(), normal, binormal };
  }
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function buildFloorStrip(
  curve: CatmullRomCurve3,
  frames: Frames,
  segments: number,
  width: number,
  crossSubdivs: number,
): BufferGeometry {
  // Dense lattice: (segments+1) along flow × (crossSubdivs+1) across. The
  // extra cross-track vertices are what makes the water shader's vertex wave
  // displacement actually visible (previously we only had left/right edges).
  const geom = new BufferGeometry();
  const rowVerts = crossSubdivs + 1;
  const totalVerts = (segments + 1) * rowVerts;
  const positions = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  const indices: number[] = [];
  const tmp = new Vector3();
  const halfW = width / 2;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPointAt(t, tmp);
    const b = frames.binormals[i];
    for (let j = 0; j < rowVerts; j++) {
      const s = j / crossSubdivs; // 0 at left edge, 1 at right edge
      const offset = (s - 0.5) * width; // lateral offset in world units
      const vi = (i * rowVerts + j) * 3;
      // Use only the horizontal (XZ) part of binormal for lateral offset.
      // Y stays flat at curve height — water surface is always level across
      // the channel, even on banked turns. This matches the walls which also
      // use flat Y. Without this, roll causes one side to be higher than the
      // other and the water looks "angled".
      positions[vi + 0] = tmp.x + b.x * offset;
      positions[vi + 1] = tmp.y;
      positions[vi + 2] = tmp.z + b.z * offset;

      const ui = (i * rowVerts + j) * 2;
      uvs[ui + 0] = s;
      uvs[ui + 1] = t;
    }

    if (i < segments) {
      const baseA = i * rowVerts;
      const baseB = (i + 1) * rowVerts;
      for (let j = 0; j < crossSubdivs; j++) {
        const a0 = baseA + j;
        const a1 = baseA + j + 1;
        const b0 = baseB + j;
        const b1 = baseB + j + 1;
        // CCW winding when viewed from above so the front face (normal +Y)
        // survives back-face culling. The previous order produced triangles
        // with normal -Y, which made the floor invisible from the cockpit
        // camera and you could see the sky straight through it.
        indices.push(a0, a1, b0, a1, b1, b0);
      }
    }
  }

  geom.setAttribute('position', new BufferAttribute(positions, 3));
  geom.setAttribute('uv', new BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  // Hint: halfW is cached in the closure for clarity; not used outside.
  void halfW;
  return geom;
}

// Cross-section profile for a water-slide wall. Each entry:
//   dx — lateral distance outward from the track edge (positive = away from centre)
//   dy — height above the water floor level
// The shape: inner foot → vertical inner face → rounded top lip → outer slope → outer foot.
const WALL_PROFILE = [
  { dx: -0.4, dy: -2.0 },     // inner foot: deep below water — kills the gap
  { dx: -0.2, dy: -0.3 },     // inner base: just under water surface
  { dx: 0.0,  dy: 0.0 },      // waterline contact
  { dx: 0.0,  dy: 1.8 },      // inner face rises vertically
  { dx: 0.15, dy: 2.8 },      // top inner edge
  { dx: 0.5,  dy: 3.2 },      // lip peak
  { dx: 0.9,  dy: 2.9 },      // outer lip slope
  { dx: 1.3,  dy: 1.2 },      // outer face
  { dx: 1.5,  dy: -1.0 },     // outer foot: also below water
];

/**
 * Build a shaped wall strip along the spline curve for one side (left or right).
 * Instead of a TubeGeometry circle, uses the WALL_PROFILE cross-section.
 */
function buildWallStrip(
  curve: CatmullRomCurve3,
  frames: Frames,
  segments: number,
  halfWidth: number,
  side: 1 | -1,
): BufferGeometry {
  const h = CFG.track.wallHeight / 3.5; // normalise profile to configured height
  const profileLen = WALL_PROFILE.length;
  const totalVerts = (segments + 1) * profileLen;
  const positions = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  const indices: number[] = [];
  const tmp = new Vector3();

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPointAt(t, tmp);
    const b = frames.binormals[i];

    for (let j = 0; j < profileLen; j++) {
      const { dx, dy } = WALL_PROFILE[j];
      const vi = (i * profileLen + j) * 3;
      // Wall base at ±halfWidth. Profile extends outward via dx and up via dy.
      const lateralSign = side; // +1 right, -1 left
      positions[vi + 0] = tmp.x + b.x * (halfWidth * lateralSign + dx * lateralSign);
      positions[vi + 1] = tmp.y + dy * h;
      positions[vi + 2] = tmp.z + b.z * (halfWidth * lateralSign + dx * lateralSign);

      const ui = (i * profileLen + j) * 2;
      uvs[ui + 0] = j / (profileLen - 1);
      uvs[ui + 1] = t;
    }

    if (i < segments) {
      const baseA = i * profileLen;
      const baseB = (i + 1) * profileLen;
      for (let j = 0; j < profileLen - 1; j++) {
        const a0 = baseA + j;
        const a1 = baseA + j + 1;
        const b0 = baseB + j;
        const b1 = baseB + j + 1;
        // Both winding orders work because we render DoubleSide on the wall
        // material. CCW from outside-the-profile side; computeVertexNormals
        // handles the rest.
        indices.push(a0, a1, b0, a1, b1, b0);
      }
    }
  }

  const geom = new BufferGeometry();
  geom.setAttribute('position', new BufferAttribute(positions, 3));
  geom.setAttribute('uv', new BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}
