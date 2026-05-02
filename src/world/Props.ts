import {
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Scene,
  SphereGeometry,
  Vector3,
} from 'three';
import { COLORS } from '@/config';
import { cloneBoab, cloneMountain, clonePalm } from '@/loaders/AssetLoader';
import { createCliffMaterial } from './CliffMaterial';
import { createSandMaterial } from './SandMaterial';
import type { Road } from './Road';

// Deterministic PRNG so prop placement is stable across reloads.
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

// Sand starts INSIDE the wall outer profile so it slips UNDER the wall —
// no thin empty seam between wall outer foot and sand inner edge.
// Wall outer foot at halfWidth + 1.5; we start sand at halfWidth - 1.
const GROUND_DROP = 0.0;
const BANK_INNER = 14;
const BANK_OUTER = 65;     // wide visible bank
const BANK_SEGMENTS = 320;
const BANK_T_RANGE = 1.0;
// Minimum lateral distance from center for tree placement — must be outside
// the wall outer foot so no tree sits in the water channel.
const TREE_MIN_DIST = 22;

export class Props {
  readonly group = new Group();

  constructor(scene: Scene, road: Road) {
    const trunkMat = new MeshStandardMaterial({
      color: new Color(COLORS.palm_trunk),
      roughness: 0.85,
    });
    const frondMat = new MeshStandardMaterial({
      color: new Color(COLORS.palm_green),
      emissive: new Color(COLORS.palm_green),
      emissiveIntensity: 0.18,
      roughness: 0.6,
    });
    // Textured sand shader — replaces the plain MeshStandardMaterial so the
    // banks show dunes, ripples and wet-sand variation.
    const sandMat = createSandMaterial();
    const woodMat = new MeshStandardMaterial({
      color: new Color(COLORS.hut_wood),
      roughness: 0.85,
    });
    const thatchMat = new MeshStandardMaterial({
      color: new Color(COLORS.hut_thatch),
      emissive: new Color(COLORS.hut_thatch),
      emissiveIntensity: 0.1,
      roughness: 0.9,
    });
    const flowerRedMat = new MeshStandardMaterial({
      color: new Color(COLORS.flower_red),
      emissive: new Color(COLORS.flower_red),
      emissiveIntensity: 0.28,
      roughness: 0.5,
    });

    // Shared textured cliff material for rocks and mountain backdrop.
    const cliffMat = createCliffMaterial();

    // === Side ground banks (sand) along the opening ===
    // A wide flat strip on each side so palms have something to stand on.
    const leftBank = buildSideBank(road, -1);
    const rightBank = buildSideBank(road, +1);
    const leftBankMesh = new Mesh(leftBank, sandMat);
    const rightBankMesh = new Mesh(rightBank, sandMat);
    this.group.add(leftBankMesh, rightBankMesh);

    // === Palm trees (GLB clones, grounded to the bank) ===
    const placements = collectPalmPlacements(road);
    const palmsGroup = new Group();
    let usedGlb = false;
    for (const p of placements) {
      const glbClone = clonePalm();
      if (glbClone) {
        usedGlb = true;
        glbClone.position.copy(p.base);
        glbClone.rotation.y = p.rot;
        glbClone.rotation.z = p.tilt;
        glbClone.scale.setScalar(p.scaleMul);
        palmsGroup.add(glbClone);
      } else {
        const trunkH = p.scaleMul * 5.5;
        const trunk = new Mesh(new CylinderGeometry(0.4, 0.55, trunkH, 10), trunkMat);
        trunk.position.set(p.base.x, p.base.y + trunkH / 2, p.base.z);
        trunk.rotation.z = p.tilt;
        palmsGroup.add(trunk);

        const crown = new Mesh(new ConeGeometry(2.3 * p.scaleMul, 2.6 * p.scaleMul, 10), frondMat);
        crown.position.set(p.base.x, p.base.y + trunkH, p.base.z);
        crown.rotation.y = p.rot;
        palmsGroup.add(crown);
      }
    }
    // === Baobabs: placed every ~3rd palm slot, slightly further from the track ===
    const baobabGroup = new Group();
    let baobabCount = 0;
    const baobabRandom = rng(42424);
    for (let i = 0; i < placements.length; i += 3) {
      const boab = cloneBoab();
      if (!boab) continue;
      const p = placements[i];
      // Offset the baobab a few units further from the track than the palm.
      const sideDir = sideVector(road, Math.min(i / placements.length, 0.99));
      const furtherOut = 6 + baobabRandom() * 5;
      boab.position.set(
        p.base.x + sideDir.x * (i % 2 === 0 ? -furtherOut : furtherOut),
        p.base.y,
        p.base.z + sideDir.z * (i % 2 === 0 ? -furtherOut : furtherOut),
      );
      boab.rotation.y = baobabRandom() * Math.PI * 2;
      boab.scale.setScalar(0.8 + baobabRandom() * 0.6);
      baobabGroup.add(boab);
      baobabCount++;
    }
    this.group.add(baobabGroup);

    console.log(
      `%c[Props] palms: ${placements.length}  baobabs: ${baobabCount}  using ${usedGlb ? 'GLBs' : 'procedural fallback'}`,
      'color:#B4FF2E',
    );
    this.group.add(palmsGroup);

    // === Rocks (instanced, textured via the cliff shader) ===
    const rockCount = 64;
    const rocks = new InstancedMesh(new SphereGeometry(1.3, 10, 8), cliffMat, rockCount);
    const mat = new Matrix4();
    const pos = new Vector3();
    const quat = new Quaternion();
    const scale = new Vector3();
    const random = rng(91237);
    for (let i = 0; i < rockCount; i++) {
      const t = i / rockCount;
      const base = new Vector3();
      road.getPointAt(t, base);
      const side = sideVector(road, t);
      const left = i % 2 === 0 ? -1 : 1;
      const dist = TREE_MIN_DIST + random() * 14;
      pos.set(
        base.x + side.x * left * dist,
        base.y - GROUND_DROP + random() * 2,
        base.z + side.z * left * dist,
      );
      scale.set(0.9 + random() * 2.0, 0.7 + random() * 1.4, 0.9 + random() * 2.0);
      quat.setFromEuler(new Euler(random(), random() * 3, random()));
      mat.compose(pos, quat, scale);
      rocks.setMatrixAt(i, mat);
    }
    rocks.instanceMatrix.needsUpdate = true;

    // === Red hibiscus flowers ===
    const flowerCount = 48;
    const flowers = new InstancedMesh(new SphereGeometry(0.55, 8, 6), flowerRedMat, flowerCount);
    for (let i = 0; i < flowerCount; i++) {
      const t = i / flowerCount;
      const base = new Vector3();
      road.getPointAt(t, base);
      const side = sideVector(road, t);
      const left = i % 2 === 0 ? -1 : 1;
      const dist = TREE_MIN_DIST + random() * 8;
      pos.set(
        base.x + side.x * left * dist,
        base.y - GROUND_DROP + 1 + random() * 1,
        base.z + side.z * left * dist,
      );
      scale.setScalar(0.8 + random() * 0.8);
      mat.compose(pos, new Quaternion(), scale);
      flowers.setMatrixAt(i, mat);
    }
    flowers.instanceMatrix.needsUpdate = true;

    this.group.add(rocks, flowers);

    // === Hero set pieces ===
    const hutNear = buildStiltedHut(woodMat, thatchMat);
    hutNear.position.set(-22, 20 - GROUND_DROP, -40);
    this.group.add(hutNear);

    const hutMid = buildStiltedHut(woodMat, thatchMat);
    hutMid.position.set(54, 17 - GROUND_DROP, -180);
    this.group.add(hutMid);

    const hutCliff = buildStiltedHut(woodMat, thatchMat);
    hutCliff.position.set(-40, -8 - GROUND_DROP, -720);
    hutCliff.scale.setScalar(0.85);
    this.group.add(hutCliff);

    // Mid-ground sandy island
    const island = new Mesh(new SphereGeometry(11, 22, 14), sandMat);
    island.position.set(-65, 11, -250);
    island.scale.set(1.3, 0.5, 1.3);
    this.group.add(island);

    // === Mountain backdrops (GLB instances, pushed far from the track) ===
    // Every mountain is positioned at least 65u laterally from the track
    // centerline so its silhouette stays BEHIND the side banks and never
    // overlaps the slide itself. Heights come from CFG.models.mountain.
    const mountainSlots: Array<{ t: number; side: 1 | -1; lateral: number; yDrop: number; scale: number }> = [
      { t: 0.02, side: +1, lateral: 85, yDrop: 6,  scale: 1.1 },
      { t: 0.05, side: -1, lateral: 95, yDrop: 7,  scale: 1.4 },
      { t: 0.12, side: +1, lateral: 75, yDrop: 5,  scale: 1.0 },
      { t: 0.22, side: -1, lateral: 90, yDrop: 8,  scale: 1.3 },
      { t: 0.40, side: +1, lateral: 100, yDrop: 10, scale: 1.5 },
      { t: 0.60, side: -1, lateral: 85, yDrop: 9,  scale: 1.2 },
      { t: 0.80, side: +1, lateral: 90, yDrop: 8,  scale: 1.3 },
    ];
    let mountainsPlaced = 0;
    for (const slot of mountainSlots) {
      const mnt = cloneMountain();
      if (!mnt) continue;
      const base = new Vector3();
      road.getPointAt(slot.t, base);
      const side = sideVector(road, slot.t);
      mnt.position.set(
        base.x + side.x * slot.side * slot.lateral,
        base.y - slot.yDrop,
        base.z + side.z * slot.side * slot.lateral,
      );
      mnt.rotation.y = Math.random() * Math.PI * 2;
      mnt.scale.multiplyScalar(slot.scale);
      this.group.add(mnt);
      mountainsPlaced++;
    }
    console.log(
      `%c[Props] mountains: ${mountainsPlaced} placed${mountainsPlaced === 0 ? ' (GLB missing?)' : ''}`,
      'color:#B4FF2E',
    );

    scene.add(this.group);
  }
}

interface PalmPlacement {
  base: Vector3;
  scaleMul: number;
  rot: number;
  tilt: number;
}

function collectPalmPlacements(road: Road): PalmPlacement[] {
  const random = rng(8675309);
  const placements: PalmPlacement[] = [];
  const addPalm = (t: number, left: number, dist: number) => {
    const base = new Vector3();
    road.getPointAt(t, base);
    const side = sideVector(road, t);
    base.x += side.x * left * dist;
    base.z += side.z * left * dist;
    // Drop to the bank surface — palms are rooted, not floating.
    base.y -= GROUND_DROP;
    placements.push({
      base,
      scaleMul: 0.95 + random() * 0.6,
      rot: random() * Math.PI * 2,
      tilt: (random() - 0.5) * 0.14,
    });
  };

  // Dense opening: 36 palms across the first 15% of the track, both sides.
  for (let i = 0; i < 36; i++) {
    const t = (i / 36) * 0.15;
    const left = i % 2 === 0 ? -1 : 1;
    addPalm(t, left, TREE_MIN_DIST + random() * 14);
  }
  // Midground cluster on the sand island
  for (let i = 0; i < 8; i++) {
    const base = new Vector3(
      -65 + (random() - 0.5) * 10,
      12 + random() * 0.5,
      -250 + (random() - 0.5) * 10,
    );
    placements.push({
      base,
      scaleMul: 0.9 + random() * 0.5,
      rot: random() * Math.PI * 2,
      tilt: (random() - 0.5) * 0.14,
    });
  }
  // Sparser scatter across the rest of the track
  for (let i = 0; i < 60; i++) {
    const t = 0.15 + (i / 60) * 0.85;
    const left = i % 2 === 0 ? -1 : 1;
    addPalm(t, left, TREE_MIN_DIST + random() * 18);
  }
  return placements;
}

function sideVector(road: Road, t: number): Vector3 {
  const tangent = new Vector3();
  road.getTangentAt(t, tangent);
  const up = new Vector3(0, 1, 0);
  return tangent.cross(up).normalize();
}

/**
 * Build a horizontal sand bank stripping alongside the track.
 * `side` is -1 (left of track) or +1 (right).
 * The strip extends from `BANK_INNER` to `BANK_OUTER` laterally, stays at
 * `track.y - GROUND_DROP`, and only covers the first `BANK_T_RANGE` of the
 * track (where most visible palms and hero set pieces live).
 */
function buildSideBank(road: Road, side: 1 | -1): BufferGeometry {
  const geom = new BufferGeometry();
  const rowCount = BANK_SEGMENTS + 1;
  const positions = new Float32Array(rowCount * 2 * 3);
  const uvs = new Float32Array(rowCount * 2 * 2);
  const indices: number[] = [];

  const tmp = new Vector3();
  const sideV = new Vector3();
  const up = new Vector3(0, 1, 0);
  const tan = new Vector3();

  for (let i = 0; i < rowCount; i++) {
    const t = (i / BANK_SEGMENTS) * BANK_T_RANGE;
    road.getPointAt(t, tmp);
    road.getTangentAt(t, tan);
    sideV.copy(tan).cross(up).normalize();

    const innerX = tmp.x + sideV.x * side * BANK_INNER;
    const innerZ = tmp.z + sideV.z * side * BANK_INNER;
    const outerX = tmp.x + sideV.x * side * BANK_OUTER;
    const outerZ = tmp.z + sideV.z * side * BANK_OUTER;
    // Inner edge slightly below water level — matches the wall outer foot
    // (dy=-1 in WALL_PROFILE) so sand slides under the wall with no seam.
    // Outer edge rises gently for beach slope feel.
    const innerY = tmp.y - GROUND_DROP - 0.8;
    const outerY = tmp.y - GROUND_DROP + 3.0;

    positions[i * 6 + 0] = innerX;
    positions[i * 6 + 1] = innerY;
    positions[i * 6 + 2] = innerZ;
    positions[i * 6 + 3] = outerX;
    positions[i * 6 + 4] = outerY;
    positions[i * 6 + 5] = outerZ;

    uvs[i * 4 + 0] = 0;
    uvs[i * 4 + 1] = t;
    uvs[i * 4 + 2] = 1;
    uvs[i * 4 + 3] = t;

    if (i < BANK_SEGMENTS) {
      const a0 = i * 2;
      const a1 = i * 2 + 1;
      const b0 = (i + 1) * 2;
      const b1 = (i + 1) * 2 + 1;
      // CCW from above so front face is +Y — same fix as the water floor.
      if (side > 0) {
        indices.push(a0, a1, b0, a1, b1, b0);
      } else {
        indices.push(a1, a0, b1, b1, a0, b0);
      }
    }
  }

  geom.setAttribute('position', new BufferAttribute(positions, 3));
  geom.setAttribute('uv', new BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

function buildStiltedHut(wood: MeshStandardMaterial, thatch: MeshStandardMaterial): Object3D {
  const group = new Group();
  for (let sx = -1; sx <= 1; sx += 2) {
    for (let sz = -1; sz <= 1; sz += 2) {
      const leg = new Mesh(new CylinderGeometry(0.22, 0.22, 4.2, 6), wood);
      leg.position.set(sx * 1.3, 0, sz * 1.3);
      group.add(leg);
    }
  }
  const deck = new Mesh(new CylinderGeometry(2.1, 2.1, 0.35, 10), wood);
  deck.position.y = 2.3;
  group.add(deck);
  const roof = new Mesh(new ConeGeometry(2.8, 2.4, 10), thatch);
  roof.position.y = 3.8;
  group.add(roof);
  return group;
}
