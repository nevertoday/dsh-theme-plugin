import { defineConfig } from 'tsdown'
import { PLATFORM_EXTERNALS } from './scripts/platform-externals.mjs'

// NOTE: the harness repo's shared preset (packages/client/tsdown.client.ts,
// `clientBundle(...)`) is repo-internal and NOT published to npm, so this
// config replicates its output shape verbatim (per research-integration.md §6):
// cjs/browser closure-factory whose id MUST equal the package name.
const id = 'dsh-theme-plugin'

export default defineConfig([
  { // host half
    entry: { index: 'src/index.ts' },
    outDir: 'lib', format: 'esm', platform: 'node', dts: true, clean: false,
  },
  { // browser half: closure-factory artifact for window.__ModuleLoader__
    entry: { client: 'src/client/index.ts' },
    // Declaration is kept as lib/client.d.ts: tsdown's closure banner/footer mode
    // currently emits only a stray client.ts.map when dts is enabled.
    outDir: 'lib', format: 'cjs', platform: 'browser', dts: false, clean: false,
    sourcemap: true,
    // MUST be explicit. Relying on "unresolvable ⇒ external" silently inlines
    // React the moment it lands in node_modules, and a second React in the page
    // kills every hook in the settings panel. See scripts/platform-externals.mjs.
    external: PLATFORM_EXTERNALS,
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])
