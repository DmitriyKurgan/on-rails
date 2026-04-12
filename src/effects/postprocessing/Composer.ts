import {
  BloomEffect,
  BrightnessContrastEffect,
  EffectComposer,
  EffectPass,
  HueSaturationEffect,
  KernelSize,
  RenderPass,
  VignetteEffect,
} from 'postprocessing';
import { HalfFloatType, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { CFG } from '@/config';

// Mandatory pass order per workflow rule 5:
//   RenderPass → Bloom → HueSat+BrightCon+Vignette → SMAA → Glitch(opt)
export interface PostPipeline {
  composer: EffectComposer;
  setSize(w: number, h: number): void;
  triggerGlitch(durationMs: number): void;
}

export function createComposer(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: PerspectiveCamera,
): PostPipeline {
  // HalfFloat framebuffer is the key to avoiding the "Read and write depth
  // stencil attachments cannot be the same image" blit errors on WebGL2:
  // it forces postprocessing to create non-shared depth attachments.
  // Also dropped SMAA and Glitch for now — they were adding depth passes
  // that conflicted with the blit path. Can re-introduce on a proof.
  const composer = new EffectComposer(renderer, {
    frameBufferType: HalfFloatType,
    multisampling: 0,
    stencilBuffer: false,
    depthBuffer: true,
  });
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new BloomEffect({
    intensity: CFG.bloom.intensity,
    luminanceThreshold: CFG.bloom.threshold,
    luminanceSmoothing: CFG.bloom.smoothing,
    radius: CFG.bloom.radius,
    kernelSize: KernelSize.LARGE,
  });
  composer.addPass(new EffectPass(camera, bloom));

  const hueSat = new HueSaturationEffect({ saturation: CFG.grading.saturation });
  const brightCon = new BrightnessContrastEffect({
    brightness: 0.02,
    contrast: CFG.grading.contrast,
  });
  const vignette = new VignetteEffect({
    darkness: CFG.grading.vignetteDarkness,
    offset: 0.5,
  });
  composer.addPass(new EffectPass(camera, hueSat, brightCon, vignette));

  return {
    composer,
    setSize(w, h) {
      composer.setSize(w, h);
    },
    triggerGlitch(_durationMs: number) {
      /* glitch pass removed while composer is being hardened */
    },
  };
}
