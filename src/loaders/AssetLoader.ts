import {
  Box3,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  NoColorSpace,
  Object3D,
  RepeatWrapping,
  Texture,
  TextureLoader,
  Vector3,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CFG, COLORS, type ColorToken } from '@/config';

// Lightweight GLB loader with a singleton cache. Loads once, clones on demand
// so players + rivals share the same GPU geometry but each get an independent
// scene graph.

const loader = new GLTFLoader();
const textureLoader = new TextureLoader();
const cache = new Map<string, Group>();
const textureCache = new Map<string, Texture>();

/**
 * Load the jet ski GLB (path from `CFG.models.jetski.url`).
 * Returns `null` on failure — callers fall back to the procedural mesh.
 *
 * The loaded scene is normalized once:
 *  - auto-aligned so its longest horizontal axis points to -Z (forward)
 *  - centered on origin, with the bottom of its bbox resting at y = 0
 *  - uniformly scaled so that forward length = `CFG.models.jetski.targetLength`
 *  - optional `rotationYOffset` / `yOffset` applied after normalization
 */
export async function loadJetski(): Promise<Group | null> {
  const cfg = CFG.models.jetski;
  const cached = cache.get(cfg.url);
  if (cached) return cloneDeepWithMaterials(cached);

  try {
    const gltf = await loader.loadAsync(cfg.url);
    const root = new Group();
    root.add(gltf.scene);
    normalizeJetskiMesh(root);
    cache.set(cfg.url, root);
    return cloneDeepWithMaterials(root);
  } catch (err) {
    console.warn('[AssetLoader] failed to load jetski GLB from', cfg.url, err);
    return null;
  }
}

/** Synchronous clone from the cache. Returns null if not yet loaded. */
export function cloneJetski(): Group | null {
  const cached = cache.get(CFG.models.jetski.url);
  if (!cached) return null;
  return cloneDeepWithMaterials(cached);
}

/**
 * Load the palm tree GLB. Auto-normalized so that the base of the trunk
 * sits at y = 0 and total height equals `CFG.models.palm.targetHeight`.
 */
export async function loadPalm(): Promise<Group | null> {
  const cfg = CFG.models.palm;
  const cached = cache.get(cfg.url);
  if (cached) return cloneDeepWithMaterials(cached);

  try {
    const gltf = await loader.loadAsync(cfg.url);
    const root = new Group();
    root.add(gltf.scene);
    normalizePalmMesh(root);
    cache.set(cfg.url, root);
    return cloneDeepWithMaterials(root);
  } catch (err) {
    console.warn('[AssetLoader] failed to load palm GLB from', cfg.url, err);
    return null;
  }
}

/** Synchronous clone of the cached palm tree. Returns null if not loaded. */
export function clonePalm(): Group | null {
  const cached = cache.get(CFG.models.palm.url);
  if (!cached) return null;
  return cloneDeepWithMaterials(cached);
}

/**
 * Load the mountain GLB. Normalized the same way as the palm: centered on
 * origin with its base at y = 0, uniformly scaled to `targetHeight`.
 */
export async function loadMountain(): Promise<Group | null> {
  const cfg = CFG.models.mountain;
  const cached = cache.get(cfg.url);
  if (cached) return cloneDeepWithMaterials(cached);

  try {
    const gltf = await loader.loadAsync(cfg.url);
    const root = new Group();
    root.add(gltf.scene);
    normalizeHeightCentered(root, cfg.targetHeight);
    cache.set(cfg.url, root);
    return cloneDeepWithMaterials(root);
  } catch (err) {
    console.warn('[AssetLoader] failed to load mountain GLB from', cfg.url, err);
    return null;
  }
}

/** Synchronous clone of the cached mountain. Returns null if not loaded. */
export function cloneMountain(): Group | null {
  const cached = cache.get(CFG.models.mountain.url);
  if (!cached) return null;
  return cloneDeepWithMaterials(cached);
}

/** Load the race driver GLB. Normalized to sit on the jetski. */
export async function loadDriver(): Promise<Group | null> {
  const cfg = CFG.models.driver;
  const cached = cache.get(cfg.url);
  if (cached) return cloneDeepWithMaterials(cached);
  try {
    const gltf = await loader.loadAsync(cfg.url);
    const root = new Group();
    root.add(gltf.scene);
    normalizeHeightCentered(root, cfg.targetHeight);
    root.position.y += cfg.yOffset;
    cache.set(cfg.url, root);
    return cloneDeepWithMaterials(root);
  } catch (err) {
    console.warn('[AssetLoader] failed to load driver GLB from', cfg.url, err);
    return null;
  }
}

/** Synchronous clone of the cached driver. */
export function cloneDriver(): Group | null {
  const cached = cache.get(CFG.models.driver.url);
  if (!cached) return null;
  return cloneDeepWithMaterials(cached);
}

/** Load the baobab/boab tree GLB. Same normalize as palm. */
export async function loadBoab(): Promise<Group | null> {
  const cfg = CFG.models.baobab;
  const cached = cache.get(cfg.url);
  if (cached) return cloneDeepWithMaterials(cached);
  try {
    const gltf = await loader.loadAsync(cfg.url);
    const root = new Group();
    root.add(gltf.scene);
    normalizeHeightCentered(root, cfg.targetHeight);
    cache.set(cfg.url, root);
    return cloneDeepWithMaterials(root);
  } catch (err) {
    console.warn('[AssetLoader] failed to load boab GLB from', cfg.url, err);
    return null;
  }
}

/** Synchronous clone of the cached baobab. */
export function cloneBoab(): Group | null {
  const cached = cache.get(CFG.models.baobab.url);
  if (!cached) return null;
  return cloneDeepWithMaterials(cached);
}

/**
 * Center a loaded GLB scene on origin (XZ centered, base at y=0) and scale
 * it so its total height equals `targetHeight`. Used for palm trees and
 * mountains — anything that wants to be anchored at ground level.
 */
function normalizeHeightCentered(root: Group, targetHeight: number): void {
  const bbox = new Box3().setFromObject(root);
  const size = new Vector3();
  const center = new Vector3();
  bbox.getSize(size);
  bbox.getCenter(center);

  const inner = root.children[0] as Object3D;
  inner.position.x -= center.x;
  inner.position.z -= center.z;
  inner.position.y -= center.y - size.y / 2;

  const scale = targetHeight / Math.max(size.y, 0.001);
  root.scale.setScalar(scale);
}

/**
 * Load a tiling normal map (or any texture), configured for wrap+repeat and
 * linear colour space. Used for the water surface normals.
 */
export async function loadNormalMap(url: string): Promise<Texture | null> {
  const cached = textureCache.get(url);
  if (cached) return cached;
  try {
    const tex = await textureLoader.loadAsync(url);
    tex.wrapS = RepeatWrapping;
    tex.wrapT = RepeatWrapping;
    tex.colorSpace = NoColorSpace;
    tex.needsUpdate = true;
    textureCache.set(url, tex);
    return tex;
  } catch (err) {
    console.warn('[AssetLoader] failed to load normal map from', url, err);
    return null;
  }
}

function normalizePalmMesh(root: Group): void {
  normalizeHeightCentered(root, CFG.models.palm.targetHeight);
}

/**
 * Tint every hull-like material on a cloned jet ski. Used by the rival
 * manager to repaint the same base mesh in each rival's palette color.
 */
export function tintJetski(root: Object3D, primary: ColorToken): void {
  const color = new Color(COLORS[primary]);
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!(mesh as unknown as { isMesh?: boolean }).isMesh) return;
    const mat = mesh.material;
    if (!mat) return;
    const apply = (m: unknown) => {
      const sm = m as MeshStandardMaterial;
      if (sm && 'color' in sm && sm.color instanceof Color) {
        sm.color.copy(color);
      }
      if (sm && 'emissive' in sm && sm.emissive instanceof Color) {
        sm.emissive.copy(color);
        sm.emissiveIntensity = 0.2;
      }
    };
    if (Array.isArray(mat)) mat.forEach(apply);
    else apply(mat);
  });
}

function normalizeJetskiMesh(root: Group): void {
  const cfg = CFG.models.jetski;

  // Measure the mesh in its original pose.
  const bbox = new Box3().setFromObject(root);
  const size = new Vector3();
  const center = new Vector3();
  bbox.getSize(size);
  bbox.getCenter(center);

  // Auto-detect the forward axis: whichever horizontal axis is longest.
  // (Most GLB vehicles are modelled long-side = forward.)
  // After rotation we want that axis to be -Z.
  let forwardAxis: 'x' | 'z' = size.x > size.z ? 'x' : 'z';

  // Assume the child scene holds the mesh; rotate it in place.
  const inner = root.children[0] as Object3D;

  // First center the mesh on origin (x, z centered; y lifted so base = 0).
  inner.position.x -= center.x;
  inner.position.z -= center.z;
  inner.position.y -= center.y - size.y / 2;

  // Rotate so forward axis points -Z.
  if (forwardAxis === 'x') {
    // Longest axis is X — rotate +π/2 around Y so +X → -Z.
    inner.rotation.y += Math.PI / 2;
  }
  // If forwardAxis === 'z', the model already lays along Z. But it could be
  // pointing +Z or -Z; we can't know from bbox alone. We assume +Z (common
  // GLB convention) and rotate π to flip. For Z-aligned models, test both.
  // Flip if the model came in facing +Z — most DCC exports do.
  if (forwardAxis === 'z') {
    inner.rotation.y += Math.PI;
  }

  // Recompute bbox post-rotation to get the true forward length.
  const bbox2 = new Box3().setFromObject(root);
  const size2 = new Vector3();
  bbox2.getSize(size2);
  const forwardLen = size2.z;
  const scale = cfg.targetLength / Math.max(forwardLen, 0.001);
  root.scale.setScalar(scale);

  // Apply post-normalization offsets
  root.rotation.y += cfg.rotationYOffset;
  root.position.y += cfg.yOffset;
}

/**
 * Deep-clone a scene graph with material clones per mesh (so tint operations
 * don't leak across instances).
 */
function cloneDeepWithMaterials(original: Group): Group {
  const cloned = original.clone(true);
  cloned.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!(mesh as unknown as { isMesh?: boolean }).isMesh) return;
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((m) => m.clone());
    } else if (mesh.material) {
      mesh.material = mesh.material.clone();
    }
  });
  return cloned;
}
