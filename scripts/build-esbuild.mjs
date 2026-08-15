// Fallback build (no tsdown needed): `npm i -D esbuild && node scripts/build-esbuild.mjs`.
// Emits lib/index.js (esm host half) and lib/client.js (+.map) in the exact
// window.__ModuleLoader__ closure-factory shape the harness expects.
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const id = 'dsh-theme-plugin'

// Platform externals live in one place now — tsdown uses the same list.
import { PLATFORM_EXTERNALS as external } from './platform-externals.mjs'

// Host half: esm, node. `packages: 'external'` keeps any future framework
// imports unresolved at build time; optional peers may not be installed here,
// while the harness process provides them at runtime.
await build({
  entryPoints: { index: path.join(root, 'src/index.ts') },
  outdir: path.join(root, 'lib'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  packages: 'external',
})

// Browser half: cjs closure-factory. The banner also carries the preset's
// `intro` line (var module/exports) — esbuild has no separate intro option,
// and banner text lands inside the factory body before the bundled code.
await build({
  entryPoints: { client: path.join(root, 'src/client/index.ts') },
  outdir: path.join(root, 'lib'),
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  sourcemap: true,
  external,
  // The harness's own client packages carry no `import React` — they compile
  // with the automatic JSX runtime, and `react/jsx-runtime` is seeded in the
  // page's module table, so requiring it costs nothing extra here.
  jsx: 'automatic',
  banner: {
    js: `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {\n` +
      'var module = { exports: {} }; var exports = module.exports;',
  },
  footer: { js: 'return module.exports; } });' },
})

console.log('built lib/index.js + lib/client.js (esbuild fallback)')
