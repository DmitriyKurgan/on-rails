import { REVISION, WebGLRenderer } from 'three';
import type { EffectComposer } from 'postprocessing';

// Advanced runtime diagnostics. Logs grouped, readable bundles so a console
// dump can be shared with one screenshot. Called once at startup and every
// `periodMs` thereafter while gl errors are accumulated.

const GL_ERROR_NAMES: Record<number, string> = {
  0:      'NO_ERROR',
  0x0500: 'INVALID_ENUM',
  0x0501: 'INVALID_VALUE',
  0x0502: 'INVALID_OPERATION',
  0x0503: 'STACK_OVERFLOW',
  0x0504: 'STACK_UNDERFLOW',
  0x0505: 'OUT_OF_MEMORY',
  0x0506: 'INVALID_FRAMEBUFFER_OPERATION',
  0x0507: 'CONTEXT_LOST_WEBGL',
};

export interface DiagnosticsOptions {
  renderer: WebGLRenderer;
  composer: EffectComposer;
  canvas: HTMLCanvasElement;
}

export class Diagnostics {
  private readonly renderer: WebGLRenderer;
  private readonly composer: EffectComposer;
  private readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGLRenderingContext | WebGL2RenderingContext;
  private readonly glErrorCounts = new Map<number, number>();
  private lastReportAt = 0;
  private readonly reportEveryMs = 1500;
  private frameCount = 0;

  constructor(opts: DiagnosticsOptions) {
    this.renderer = opts.renderer;
    this.composer = opts.composer;
    this.canvas = opts.canvas;
    this.gl = this.renderer.getContext();
  }

  logStartup(): void {
    const r = this.renderer;
    const gl = this.gl;
    const caps = r.capabilities;

    console.groupCollapsed('%c[diag] startup', 'color:#5EF0FF;font-weight:bold');

    console.log('three REVISION:', REVISION);
    console.log('canvas CSS size:', this.canvas.clientWidth, 'x', this.canvas.clientHeight);
    console.log('canvas attr size:', this.canvas.width, 'x', this.canvas.height);
    console.log('device pixel ratio:', window.devicePixelRatio, 'renderer DPR:', r.getPixelRatio());

    console.log('renderer info:', {
      outputColorSpace: r.outputColorSpace,
      toneMapping: r.toneMapping,
      toneMappingExposure: r.toneMappingExposure,
      autoClear: r.autoClear,
      shadowMapEnabled: r.shadowMap.enabled,
      shadowMapType: r.shadowMap.type,
    });

    console.log('capabilities:', {
      isWebGL2: caps.isWebGL2,
      maxSamples: (caps as unknown as { maxSamples?: number }).maxSamples ?? 'n/a',
      maxTextures: caps.maxTextures,
      maxTextureSize: caps.maxTextureSize,
      maxAttributes: caps.maxAttributes,
      maxVertexUniforms: caps.maxVertexUniforms,
      maxFragmentUniforms: caps.maxFragmentUniforms,
      vertexTextures: caps.vertexTextures,
      precision: caps.precision,
    });

    // GL-level info
    const glInfo = {
      VERSION: gl.getParameter(gl.VERSION),
      VENDOR: gl.getParameter(gl.VENDOR),
      RENDERER: gl.getParameter(gl.RENDERER),
      SHADING_LANGUAGE_VERSION: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      MAX_COLOR_ATTACHMENTS:
        'MAX_COLOR_ATTACHMENTS' in gl ? gl.getParameter((gl as WebGL2RenderingContext).MAX_COLOR_ATTACHMENTS) : 'n/a',
      MAX_DRAW_BUFFERS:
        'MAX_DRAW_BUFFERS' in gl ? gl.getParameter((gl as WebGL2RenderingContext).MAX_DRAW_BUFFERS) : 'n/a',
      MAX_SAMPLES:
        'MAX_SAMPLES' in gl ? gl.getParameter((gl as WebGL2RenderingContext).MAX_SAMPLES) : 'n/a',
    };
    console.log('gl context info:', glInfo);

    // Try to read WEBGL_debug_renderer_info for unmasked vendor/renderer
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      console.log('unmasked vendor:', gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL));
      console.log('unmasked renderer:', gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL));
    }

    // Composer passes dump
    const passes = (this.composer as unknown as { passes?: unknown[] }).passes ?? [];
    console.log('composer pass count:', passes.length);
    passes.forEach((p, i) => {
      const pp = p as { name?: string; enabled?: boolean; needsSwap?: boolean };
      console.log(` pass #${i}:`, {
        name: pp.name,
        enabled: pp.enabled,
        needsSwap: pp.needsSwap,
        ctor: (p as { constructor: { name: string } }).constructor.name,
      });
    });

    // Composer render targets
    const anyComposer = this.composer as unknown as {
      inputBuffer?: { depthBuffer?: boolean; stencilBuffer?: boolean; width?: number; height?: number };
      outputBuffer?: { depthBuffer?: boolean; stencilBuffer?: boolean };
    };
    if (anyComposer.inputBuffer) {
      console.log('composer.inputBuffer:', {
        depthBuffer: anyComposer.inputBuffer.depthBuffer,
        stencilBuffer: anyComposer.inputBuffer.stencilBuffer,
        width: anyComposer.inputBuffer.width,
        height: anyComposer.inputBuffer.height,
      });
    }
    if (anyComposer.outputBuffer) {
      console.log('composer.outputBuffer:', {
        depthBuffer: anyComposer.outputBuffer.depthBuffer,
        stencilBuffer: anyComposer.outputBuffer.stencilBuffer,
      });
    }

    console.log('URL flags:', {
      post: new URL(location.href).searchParams.has('post'),
    });

    console.groupEnd();
  }

  // Poll gl errors after each frame render. WebGL validation errors do NOT
  // throw JS exceptions — they only surface here.
  afterFrame(): void {
    this.frameCount++;
    const err = this.gl.getError();
    if (err !== 0) {
      this.glErrorCounts.set(err, (this.glErrorCounts.get(err) ?? 0) + 1);
    }
    const now = performance.now();
    if (now - this.lastReportAt > this.reportEveryMs && this.glErrorCounts.size > 0) {
      this.lastReportAt = now;
      const summary: Record<string, number> = {};
      for (const [code, count] of this.glErrorCounts) {
        summary[GL_ERROR_NAMES[code] ?? `0x${code.toString(16)}`] = count;
      }
      console.warn(
        `%c[diag] GL errors in last ${(this.reportEveryMs / 1000).toFixed(1)}s (frame ${this.frameCount}):`,
        'color:#FF4A4A',
        summary,
      );
      this.glErrorCounts.clear();
    }
  }
}
