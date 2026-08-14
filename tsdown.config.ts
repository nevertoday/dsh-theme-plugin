import { defineConfig } from 'tsdown'

// NOTE: the harness repo's shared preset (packages/client/tsdown.client.ts,
// `clientBundle(...)`) is repo-internal and NOT published to npm, so this
// config replicates its output shape verbatim (per research-integration.md §6):
// cjs/browser closure-factory whose id MUST equal the package name.
const id = 'dsh-theme-plugin'

export default defineConfig([
  { // host half
    entry: { index: 'src/index.ts' },
    outDir: 'lib', format: 'esm', platform: 'node', dts: false, clean: false,
  },
  { // browser half: closure-factory artifact for window.__ModuleLoader__
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib', format: 'cjs', platform: 'browser', dts: false, clean: false,
    sourcemap: true,
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])
