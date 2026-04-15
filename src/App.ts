import { Vector3 } from 'three';
import { CFG } from '@/config';
import { createEngine } from '@/core/Engine';
import { createGameLoop } from '@/core/GameLoop';
import { EventBus } from '@/core/EventBus';
import { Input } from '@/core/Input';
import { configureScene } from '@/graphics/SceneManager';
import { buildLights } from '@/graphics/Lights';
import { CameraController } from '@/graphics/CameraController';
import { Road } from '@/world/Road';
import { createWallMaterial } from '@/world/WallMaterial';
import { createWaterMaterial, tickWaterMaterial } from '@/world/WaterMaterial';
import { buildSkybox } from '@/world/Skybox';
import { Props } from '@/world/Props';
import { Player } from '@/entities/Player/Player';
import { RivalManager } from '@/entities/Rivals/RivalManager';
import { buildEndWaterfall } from '@/world/EndWaterfall';
import { createComposer } from '@/effects/postprocessing/Composer';
import { WaterTrail } from '@/effects/particles/WaterTrail';
import { Hud } from '@/hud/Hud';
import { Diagnostics } from '@/core/Diagnostics';
import { cloneDriver, cloneJetski, loadBoab, loadDriver, loadJetski, loadMountain, loadNormalMap, loadPalm } from '@/loaders/AssetLoader';

export class App {
  async start(): Promise<void> {
    const canvas = document.getElementById('game') as HTMLCanvasElement | null;
    const hudRoot = document.getElementById('hud') as HTMLElement | null;
    if (!canvas || !hudRoot) throw new Error('Missing #game canvas or #hud root');

    const { renderer, scene, camera } = createEngine(canvas);
    configureScene(scene);
    buildSkybox(scene);
    buildLights(scene);

    // Load all async assets in parallel before building the scene.
    const [playerMesh, driverMesh, palmPrimed, boabPrimed, mountainPrimed, waterNormalMap] = await Promise.all([
      loadJetski(),
      loadDriver(),
      loadPalm(),
      loadBoab(),
      loadMountain(),
      loadNormalMap(CFG.textures.waterNormals),
    ]);
    console.log(
      `%c[App] assets: jetski=${playerMesh ? 'ok' : 'fallback'}  driver=${driverMesh ? 'ok' : 'fallback'}  palm=${palmPrimed ? 'ok' : 'fallback'}  boab=${boabPrimed ? 'ok' : 'fallback'}  mountain=${mountainPrimed ? 'ok' : 'fallback'}  waterNormals=${waterNormalMap ? 'ok' : 'fallback'}`,
      'color:#B4FF2E',
    );

    // Attach driver to the player jetski mesh
    if (playerMesh && driverMesh) {
      playerMesh.add(driverMesh);
    }

    const wallMat = createWallMaterial();
    const waterMat = createWaterMaterial({ normalMap: waterNormalMap });
    const road = new Road({ wallMaterial: wallMat, floorMaterial: waterMat });
    scene.add(road.group);

    // Props consumes the primed palm via clonePalm() inside AssetLoader cache.
    new Props(scene, road);

    // End-of-track waterfall + lake
    const endFall = buildEndWaterfall(scene, waterNormalMap);

    const player = new Player(road, playerMesh ?? undefined);
    scene.add(player.group);

    const rivals = new RivalManager(road, () => {
      const ski = cloneJetski();
      if (ski) {
        const drv = cloneDriver();
        if (drv) ski.add(drv);
      }
      return ski;
    });
    scene.add(rivals.group);

    const trail = new WaterTrail();
    scene.add(trail.points);
    let trailAccum = 0;

    const follow = new CameraController(camera);
    const post = createComposer(renderer, scene, camera);

    // Diagnostics — logs renderer caps, composer passes, and gl.getError() polls.
    const diag = new Diagnostics({ renderer, composer: post.composer, canvas });
    diag.logStartup();

    // Post-processing (bloom + color grading + vignette) enabled by default.
    // Auto-fallback: if GL errors pile up in the first 60 frames, we silently
    // switch to direct render so the game never goes dark.
    let usePost = !new URL(location.href).searchParams.has('nopost');
    let postGlErrors = 0;
    const gl = renderer.getContext();
    console.log(`%c[App] render mode: ${usePost ? 'composer (bloom+grading)' : 'direct renderer'}`, 'color:#B4FF2E');

    const bus = new EventBus();
    const hud = new Hud(hudRoot, bus, road);
    void hud;

    const input = new Input();
    input.attach();

    let raceSeconds = 0;
    let lastPos = CFG.player.seedPosition;
    let lastBoost = -1;
    let finished = false;

    // R-key restart — minimal polish per Stage 13.
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR') {
        player.t = CFG.rivals.playerStartT;
        player.lateralOffset = 0;
        player.lateralTarget = 0;
        player.boostCharge = 0.5;
        player.airTimeLast = 0;
        player.state = 'riding';
        for (let i = 0; i < rivals.rivals.length; i++) {
          rivals.rivals[i].t = CFG.rivals.starts[i].t;
          rivals.rivals[i].lateral = CFG.rivals.starts[i].lateral;
        }
        raceSeconds = 0;
        finished = false;
      }
    });

    // Seed HUD with hero-moment anchors so POS 2/6 shows from frame 0
    bus.emit('hud:pos', { current: CFG.player.seedPosition, total: CFG.race.totalRacers });
    bus.emit('hud:time', { seconds: 0 });
    bus.emit('hud:boost', { charge: player.boostCharge });
    bus.emit('hud:minimap', { playerT: player.t, rivalsT: rivals.rivalTs() });

    const loop = createGameLoop({
      renderer,
      update: (dt, _elapsed) => {
        if (!finished) raceSeconds += dt;
        if (player.t >= 0.999 && !finished) {
          finished = true;
          bus.emit('race:finish', { position: rivals.playerPosition(player), seconds: raceSeconds });
        }

        player.update(dt, input);
        rivals.update(dt, raceSeconds, player);

        // Spawn water trail particles — more and bigger on boost for speed feel
        trailAccum += dt * (player.boostActive ? 80 : 35);
        while (trailAccum >= 1) {
          trailAccum -= 1;
          trail.emit(player.position, player.boostActive ? 3 : 1);
        }
        trail.update(dt);

        // Normalize player speed into 0..1 so the water shader can intensify
        // waves + foam flow when the player is boosting. Cruise speed is the
        // zero point, cruise * boostMultiplier is the one point.
        const cruiseSpeed = CFG.track.baseSpeed * CFG.player.baseSpeedMul;
        const speedNorm = Math.min(
          1,
          Math.max(0, (player.speed / cruiseSpeed - 1) / (CFG.player.boostMultiplier - 1)),
        );
        tickWaterMaterial(waterMat, dt, speedNorm);
        endFall.tick(dt);
        // In lake mode, synthesize a road-like sampler from the player's own
        // heading so the camera follows the direction the jetski is pointing
        // rather than the fixed finish-line tangent.
        if (player.state === 'lake' || player.state === 'falling') {
          const h = (player as unknown as { lakeHeading: number }).lakeHeading ?? Math.PI;
          const tangent = new Vector3(Math.sin(h), 0, -Math.cos(h));
          const normal = new Vector3(0, 1, 0);
          const binormal = new Vector3().crossVectors(tangent, normal).normalize();
          const syntheticRoad = {
            getPointAt: (_t: number, out?: Vector3) => {
              const v = out ?? new Vector3();
              return v.copy(player.position).addScaledVector(tangent, 6);
            },
            getFrameAt: () => ({ tangent, normal, binormal }),
          };
          follow.update(dt, 1, player.position, syntheticRoad);
        } else {
          follow.update(dt, player.t, player.position, road);
        }

        follow.setFov(player.boostActive ? CFG.camera.boostFov : CFG.camera.fov);
        follow.setRoll(-player.steerYaw * CFG.camera.steerRollDeg);

        // HUD updates — throttled to one per frame via event bus
        bus.emit('hud:time', { seconds: raceSeconds });
        const pos = rivals.playerPosition(player);
        if (pos !== lastPos) {
          bus.emit('hud:pos', { current: pos, total: CFG.race.totalRacers });
          lastPos = pos;
        }
        const boostRounded = Math.round(player.boostCharge * 50);
        if (boostRounded !== lastBoost) {
          bus.emit('hud:boost', { charge: player.boostCharge });
          lastBoost = boostRounded;
        }
        bus.emit('hud:minimap', { playerT: player.t, rivalsT: rivals.rivalTs() });

        const airVisible = player.state === 'airborne' && player.airTime >= CFG.physics.airMinForHudS;
        bus.emit('hud:airtime', {
          seconds: player.state === 'airborne' ? player.airTime : player.airTimeLast,
          visible: airVisible,
        });
      },
      render: (dt) => {
        if (usePost) {
          post.composer.render(dt);
          // Auto-fallback: check for GL errors in first 60 frames.
          if (postGlErrors < 100) {
            const err = gl.getError();
            if (err !== 0) {
              postGlErrors++;
              if (postGlErrors >= 8) {
                console.warn('%c[App] composer producing GL errors — falling back to direct render', 'color:#FF4A4A');
                usePost = false;
              }
            }
          }
        } else {
          renderer.render(scene, camera);
        }
        diag.afterFrame();
      },
      onResize: (w, h) => {
        post.setSize(w, h);
        follow.onResize(w, h);
      },
    });

    loop.start();
  }
}
