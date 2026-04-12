import {
  ACESFilmicToneMapping,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { CFG } from '@/config';

export interface EngineHandles {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  canvas: HTMLCanvasElement;
}

export function createEngine(canvas: HTMLCanvasElement): EngineHandles {
  // NOTE: antialias is intentionally OFF on the renderer. With postprocessing's
  // EffectComposer, WebGL2 multisampled backbuffers break blitFramebuffer because
  // the read/write depth-stencil attachments end up sharing the same image. We let
  // the composer do MSAA (via its own multisampled render target) and keep SMAA
  // as the final edge pass.
  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: 'high-performance',
    alpha: false,
    stencil: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, CFG.render.dprCap));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = CFG.render.toneMappingExposure;

  if (CFG.render.shadowMapEnabled) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
  }

  const scene = new Scene();

  const camera = new PerspectiveCamera(
    CFG.camera.fov,
    window.innerWidth / window.innerHeight,
    CFG.camera.near,
    CFG.camera.far,
  );

  return { renderer, scene, camera, canvas };
}
