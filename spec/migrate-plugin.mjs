#!/usr/bin/env node
// One-shot migration: strip Canvas2D language from every agent file in the
// game-factory-plugin-threejs plugin and inject a Three.js project-context header.
// Idempotent — safe to run multiple times.

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PLUGIN = 'd:/Work/AI/game-factory-plugin-threejs';
const AGENTS_DIR = join(PLUGIN, 'agents');

const HEADER_MARK = '<!-- THREEJS-CONTEXT-OVERRIDE -->';
const HEADER_BLOCK = `${HEADER_MARK}

> **STACK OVERRIDE**: This plugin targets **3D Three.js + GLSL + GLB + TypeScript + Vite**, NOT 2D Canvas2D. Before producing any output, read \`agents/_PROJECT_CONTEXT.md\` for the hard override rules. Any leftover Canvas2D / sprite / pixel-art / single-HTML language in the body below is legacy — replace it mentally with the Three.js equivalent:
>
> - \`ctx.drawImage\` → \`THREE.Mesh\` / \`Sprite\` / \`InstancedMesh\`
> - \`ctx.fillRect\` → geometry + \`MeshStandardMaterial\`
> - \`ctx.fillText\` / HUD text → DOM overlay (\`<div id="hud">\`) with web fonts
> - Sprite sheets → GLB models via \`GLTFLoader\` + \`TextureLoader\` for PBR maps
> - Parallax layers → environment depth rings A–E (see \`spec/art_direction_pack.md\`)
> - Single-HTML output → modular TypeScript tree under \`src/core/graphics/world/entities/effects/shaders/loaders/config/utils/\`
> - Hardcoded literals → \`CFG.*\` / \`UI_STRINGS.*\` / \`COLORS.*\` from \`src/config/\`
> - \`STORAGE_KEYS\` → empty by default; only use keys listed in \`literal_values_registry.json\` \`storageKeys\`
>
> Read the spec pack (\`spec/project_normalized_spec.md\`, \`spec/literal_values_registry.json\`, \`spec/art_direction_pack.md\`, \`spec/gameplay_blueprint.md\`, \`spec/level_design_pack.md\`) and the reference screenshot \`assets/on-rails-view.png\` before writing any code or spec output.

<!-- /THREEJS-CONTEXT-OVERRIDE -->
`;

// Word-level replacements that are safe across contexts.
const REPLACEMENTS = [
  // Hard stack identifiers
  [/\bCanvas2D\b/g, 'Three.js'],
  [/\bcanvas2d\b/g, 'threejs'],
  [/\bcanvas 2d\b/gi, 'Three.js'],
  [/\b2D Canvas\b/g, '3D Three.js'],
  [/\b2D browser games\b/gi, '3D Three.js browser games'],
  [/\b2D game\b/gi, '3D Three.js game'],
  [/single self-contained HTML file/gi, 'modular TypeScript project under src/'],
  [/single HTML file/gi, 'modular TypeScript project'],
  [/single-file game/gi, 'modular TypeScript project'],
  [/self-contained HTML/gi, 'modular TypeScript project'],
  [/works via `file:\/\/`/gi, 'runs through Vite dev server'],
  [/via `file:\/\/`/gi, 'via Vite dev server'],
  [/zero dependencies/gi, 'npm-managed dependencies (three, postprocessing)'],
  [/\bCFG\/UI_STRINGS\/STORAGE_KEYS\b/g, 'CFG.ts/UI_STRINGS.ts/COLORS.ts/TRACK_POINTS.ts'],
  [/config_code_block\.js/g, 'src/config/*.ts (CFG + UI_STRINGS + COLORS + TRACK_POINTS)'],
  // Canvas2D API leaks in prose
  [/\bctx\.drawImage\b/g, 'mesh rendering'],
  [/\bctx\.fillRect\b/g, 'geometry material'],
  [/\bctx\.fillText\b/g, 'DOM HUD text'],
  [/\bctx\.strokeRect\b/g, 'line geometry'],
  [/\bputImageData\b/g, 'DataTexture update'],
  [/`ctx\.`/g, '`three.js APIs`'],
  [/getContext\('2d'\)/g, "WebGLRenderer (three.js)"],
  // Genre / art cleanup
  [/\bpixel-art\b/gi, 'low-poly stylized'],
  [/\bpixel art\b/gi, 'low-poly stylized'],
  [/\bsprite sheet(s)?\b/gi, 'GLB model$1'],
  [/\bsprite(s)?\b/gi, 'mesh$1'],
  [/\bparallax layer(s)?\b/gi, 'environment depth ring$1'],
  [/\boutline (\d+)px\b/gi, 'fresnel rim (intensity from art pack)'],
  // Output clauses
  [/\{game_title\}\.html/g, 'src/ module tree'],
  [/HTML-файл/gi, 'TypeScript-проект под src/'],
  [/HTML file/gi, 'TypeScript project under src/'],
];

// Directives for specific agents to keep correctness after the mass rewrite.
// Each entry: filename → array of [search, replace] pairs that override REPLACEMENTS.
const SPECIFIC = {
  // none for this pass — universal rules are enough
};

function stripExistingHeader(content) {
  const start = content.indexOf(HEADER_MARK);
  if (start === -1) return content;
  const end = content.indexOf('<!-- /THREEJS-CONTEXT-OVERRIDE -->');
  if (end === -1) return content;
  return content.slice(0, start) + content.slice(end + '<!-- /THREEJS-CONTEXT-OVERRIDE -->'.length).replace(/^\n+/, '\n');
}

function injectHeader(content) {
  // Find end of YAML frontmatter (--- ... ---)
  if (content.startsWith('---')) {
    const second = content.indexOf('\n---', 3);
    if (second !== -1) {
      const after = second + '\n---'.length;
      return content.slice(0, after) + '\n\n' + HEADER_BLOCK + '\n' + content.slice(after).replace(/^\n+/, '');
    }
  }
  return HEADER_BLOCK + '\n' + content;
}

function applyReplacements(content, extra = []) {
  let out = content;
  for (const [from, to] of REPLACEMENTS) out = out.replace(from, to);
  for (const [from, to] of extra) out = out.replace(from, to);
  return out;
}

const files = readdirSync(AGENTS_DIR)
  .filter(f => f.endsWith('.md') && !f.startsWith('_'))
  .sort();

let touched = 0;
let skipped = 0;
const report = [];

for (const f of files) {
  const path = join(AGENTS_DIR, f);
  const before = readFileSync(path, 'utf8');
  const cleaned = stripExistingHeader(before);
  const replaced = applyReplacements(cleaned, SPECIFIC[f] || []);
  const final = injectHeader(replaced);
  if (final === before) {
    skipped++;
    report.push(`SKIP  ${f}`);
    continue;
  }
  writeFileSync(path, final, 'utf8');
  touched++;
  const diffCount = (before.match(/Canvas2D|canvas2d|ctx\.drawImage|ctx\.fillRect|sprite sheet|pixel[- ]art|single HTML|file:\/\//gi) || []).length;
  report.push(`EDIT  ${f}  (${diffCount} legacy hits)`);
}

console.log(`Agents processed: ${files.length}`);
console.log(`  edited: ${touched}`);
console.log(`  skipped: ${skipped}`);
console.log('');
console.log(report.join('\n'));
