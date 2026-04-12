import {
  BoxGeometry,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three';
import { COLORS, type ColorToken } from '@/config';

// Jet ski mesh adapted from a user-provided procedural sketch.
// Original sketch orientation: forward = +X. Our project convention (used by
// Player, Rivals, CameraController) is forward = -Z because that's what
// Matrix4.lookAt produces. We wrap the sketch in an outer group rotated so
// local +X maps to world -Z.
export interface JetskiOptions {
  primary: ColorToken;
  secondary: ColorToken;
  includeRider: boolean;
}

export function buildJetskiMesh(opts: JetskiOptions): Group {
  const outer = new Group();

  // --- Shared materials (palette-driven so rivals reuse the same mesh) ---
  const bodyMat = new MeshStandardMaterial({
    color: new Color(COLORS[opts.primary]),
    emissive: new Color(COLORS[opts.primary]),
    emissiveIntensity: 0.18,
    roughness: 0.22,
    metalness: 0.0,
  });
  const accentMat = new MeshStandardMaterial({
    color: new Color(COLORS[opts.secondary]),
    emissive: new Color(COLORS[opts.secondary]),
    emissiveIntensity: 0.22,
    roughness: 0.28,
    metalness: 0.0,
  });
  const darkMat = new MeshStandardMaterial({
    color: new Color(COLORS.player_black),
    roughness: 0.5,
    metalness: 0.1,
  });

  // --- Inner group: user sketch, forward = +X ---
  const ski = new Group();

  // Hull (основа)
  const hull = new Mesh(new BoxGeometry(2, 0.4, 0.8), bodyMat);
  hull.position.y = 0.2;
  hull.castShadow = true;
  hull.receiveShadow = true;
  ski.add(hull);

  // Nose (перед) — cone laid horizontally. Original sketch used +π/2 which
  // points the flat base forward (chunky round bow). -π/2 puts the pointy
  // tip at +X instead, which reads much more like a jet ski prow.
  const nose = new Mesh(new ConeGeometry(0.4, 1, 12), bodyMat);
  nose.rotation.z = -Math.PI / 2;
  nose.position.set(1.4, 0.3, 0);
  nose.castShadow = true;
  ski.add(nose);

  // Yellow deck strip on top of the hull (our addition — gives the player
  // the green+yellow livery required by the reference screenshot).
  const deck = new Mesh(new BoxGeometry(1.4, 0.08, 0.6), accentMat);
  deck.position.set(-0.1, 0.46, 0);
  ski.add(deck);

  // Side accent stripes
  for (const side of [-1, 1]) {
    const stripe = new Mesh(new BoxGeometry(1.6, 0.08, 0.04), accentMat);
    stripe.position.set(-0.05, 0.28, side * 0.42);
    ski.add(stripe);
  }

  // Seat
  const seat = new Mesh(new BoxGeometry(0.8, 0.2, 0.5), darkMat);
  seat.position.set(0, 0.6, 0);
  ski.add(seat);

  // Back rest for the rider
  const back = new Mesh(new BoxGeometry(0.1, 0.35, 0.45), darkMat);
  back.position.set(-0.45, 0.78, 0);
  ski.add(back);

  // Handlebar column
  const col = new Mesh(new CylinderGeometry(0.06, 0.06, 0.4, 8), darkMat);
  col.position.set(0.6, 0.55, 0);
  ski.add(col);

  // Handlebar (original sketch)
  const handle = new Mesh(new CylinderGeometry(0.05, 0.05, 0.9, 8), darkMat);
  handle.rotation.z = Math.PI / 2;
  handle.position.set(0.6, 0.82, 0);
  ski.add(handle);

  // Jets (сзади)
  const jet = new Mesh(new CylinderGeometry(0.16, 0.16, 0.45, 10), darkMat);
  jet.rotation.z = Math.PI / 2;
  jet.position.set(-1.2, 0.3, 0);
  ski.add(jet);

  // Small rear fins for silhouette
  for (const side of [-1, 1]) {
    const fin = new Mesh(new BoxGeometry(0.35, 0.28, 0.08), bodyMat);
    fin.position.set(-0.95, 0.62, side * 0.32);
    fin.rotation.z = 0.25;
    ski.add(fin);
  }

  // Map +X forward → -Z forward (rotation around Y by +π/2), then apply a
  // uniform world scale so the mesh reads well against the 14-unit track.
  const SCALE = 1.9;
  ski.rotation.y = Math.PI / 2;
  ski.scale.setScalar(SCALE);
  outer.add(ski);

  if (opts.includeRider) {
    // Rider is authored directly in the outer group (forward = -Z).
    // Seat top in world space lands at y ≈ 0.6 * SCALE ≈ 1.14.
    const vestMat = new MeshStandardMaterial({
      color: new Color(COLORS.rider_vest_orange),
      emissive: new Color(COLORS.rider_vest_orange),
      emissiveIntensity: 0.18,
      roughness: 0.5,
      metalness: 0.0,
    });
    const helmMat = new MeshStandardMaterial({
      color: new Color(COLORS.rider_helmet_black),
      roughness: 0.3,
      metalness: 0.3,
    });
    const skinMat = new MeshStandardMaterial({
      color: new Color(COLORS.rider_skin),
      roughness: 0.65,
      metalness: 0.0,
    });
    const visorMat = new MeshStandardMaterial({
      color: new Color(COLORS.player_black),
      roughness: 0.2,
      metalness: 0.85,
    });

    // Torso leans forward toward the handlebars
    const torso = new Mesh(new CapsuleGeometry(0.34, 0.65, 6, 12), vestMat);
    torso.position.set(0, 1.75, 0.1);
    torso.rotation.x = 0.45;
    torso.castShadow = true;
    outer.add(torso);

    // Hips below the torso
    const hips = new Mesh(new BoxGeometry(0.6, 0.28, 0.6), vestMat);
    hips.position.set(0, 1.35, 0.25);
    outer.add(hips);

    // Head with helmet + visor strip
    const head = new Mesh(new SphereGeometry(0.27, 16, 12), helmMat);
    head.position.set(0, 2.1, -0.25);
    head.castShadow = true;
    outer.add(head);

    const visor = new Mesh(new BoxGeometry(0.44, 0.12, 0.04), visorMat);
    visor.position.set(0, 2.1, -0.48);
    outer.add(visor);

    // Arms reaching forward to the handlebars (handlebar is at z ≈ -1.14 in
    // outer space after ski rotation+scale; arms angle down toward it).
    for (const side of [-1, 1]) {
      const arm = new Mesh(new CapsuleGeometry(0.1, 0.7, 4, 8), skinMat);
      arm.position.set(side * 0.3, 1.5, -0.55);
      arm.rotation.x = 1.05;
      arm.rotation.z = side * 0.18;
      outer.add(arm);
    }
  }

  return outer;
}
