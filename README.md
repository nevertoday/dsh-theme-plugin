# dsh-theme-zhongguo

**Chinese traditional colors as a DeepSeek Harness theme pack.** 48 anchor colors × light/dark = **96 registered themes**, each writing the complete `--dsw-*` vocabulary (89 tokens: 78 alias + 11 specific), deterministically generated and gated on WCAG AA contrast per theme.

📖 **[中文文档 / Chinese README](./README.zh-CN.md)**

---

## At a glance

| | |
|---|---|
| Themes | 96 (48 light / 48 dark) |
| Tokens per theme | 89 / 89 — the full `--dsw-*` vocabulary |
| Color source | 742 traditional colors and their harmony relations |
| Generation | Deterministic — same input reproduces `src/themes.generated.js` byte for byte |
| Accessibility | Per-theme WCAG assertions; 2208/2208 contrast rows pass, 0 failing themes |
| Surfaces | A built-in settings page (**Settings → Traditional Colors**), `#theme=<id>` deep links, and a `defaultTheme` config |
| Persistence | Your pick is remembered per browser and restored on reload |
| Verified against | `dsh web` 0.1.0-rc.6, in a real browser, 2026-08-14 |

## Requirements

- Node.js 18+ and pnpm (or npm)
- A DeepSeek Harness install with a `web` profile (`dsh --profile web`)
- `@deepseek-ai/*` packages are **optional, type-only peer dependencies** — the build works without them

## Install

### 1. Build

```sh
cd dsh-theme-plugin
pnpm install          # @deepseek-ai/* are optional peers; failures do not block the build
pnpm build            # tsdown → lib/index.js (host half) + lib/client.js (browser bundle)
```

If `tsdown` is unavailable, use the esbuild fallback — it emits an artifact of the same shape and is the build that was verified on a live harness:

```sh
npm i -D esbuild
node scripts/build-esbuild.mjs      # or: pnpm build:esbuild
```

The browser artifact **must** begin with:

```js
window.__ModuleLoader__.load({ id: "dsh-theme-zhongguo", factory: (require) => {
```

The `id` must equal the package name — the harness validates it against the graph row id after loading.

### 2. Register with a profile (the official third-party channel)

The package declares both `dsh.bundle` (its `cordis.patch.yml`, which inserts its own row into the composed cordis tree) and `dsh.client` (a `platform: web` browser manifest):

```sh
# -w is required when the profile directory is a pnpm workspace root
# (otherwise pnpm reports ERR_PNPM_ADDING_TO_ROOT)
dsh plugin --profile web add -w /absolute/path/to/dsh-theme-plugin

dsh --profile web --dump-config     # expect a "# == dsh-theme-zhongguo" layer with a theme-zhongguo row
dsh --profile web                   # then open http://127.0.0.1:3080/
```

From a harness source checkout, prefix the same commands with `pnpm` (`pnpm dsh plugin …`) after running `pnpm run build` at the repo root.

Uninstall: `dsh plugin --profile web remove dsh-theme-zhongguo`

### 3. Pick a theme

The built-in Appearance row lists only Light / Dark / System — it reads its own `THEME_PREFERENCES` and does not enumerate the theme registry, so registered third-party themes have no entry point there. This plugin ships its own picker instead.

**① Settings page (recommended).** Open **Settings → Traditional Colors** (after "Agent presets" in the nav). The 48 anchors are grouped by paper family, each row showing the anchor swatch, its Chinese name, and a dot for the seal accent. The page has a light/dark segmented control, search (name / pinyin / seal), a summary of the active theme, and a "back to built-in theme" button. Selection applies immediately.

**② Deep link** (for sharing or bookmarking):

```
http://127.0.0.1:3080/#theme=zhuqing-light      # 竹青 light — green-tinted silk ground + 茜红 seal
http://127.0.0.1:3080/#theme=qunqing-dark       # 群青 dark — violet silk ground + 枫叶红 seal
http://127.0.0.1:3080/#theme=tenghuang-light    # 藤黄 light — ochre paper ground + 绀青 seal
```

Changing the hash switches themes live, without a reload.

> **Your pick is remembered, but not in `settings.yaml`.** Third-party theme ids are never written to the harness's durable preference — that is `ui-theme` behavior. Instead the plugin remembers your choice in this browser's `localStorage` and re-applies it on the next load; "Back to built-in theme" forgets it. Set `remember: false` to opt out. See [Configuration](#configuration).

## Configuration

Values go in the plugin's row in `cordis.yml` (or the profile's composed config) and are validated at load time by the exported Schemastery schema:

```yaml
- insert:
    - id: theme-zhongguo
      name: dsh-theme-zhongguo
      config:
        defaultTheme: zhuqing-light   # applied at boot; no default
        remember: true                # remember the user's pick in localStorage
        hashSelector: true            # honour #theme=<id> deep links
        settingsOrder: 40             # position of the settings page in the nav
```

| Field | Type | Default | Meaning |
|---|---|---|---|
| `defaultTheme` | string | — | Theme id applied at boot. Lowest precedence: `#theme=` deep link > remembered pick > this. |
| `remember` | boolean | `true` | Persist the user's selection in `localStorage` (per browser, per origin) and restore it on load. |
| `hashSelector` | boolean | `true` | Whether `#theme=<id>` selects a theme. |
| `settingsOrder` | number | `40` | Where the settings page sits in the nav. |

A `defaultTheme` is a deployment default, not a user choice, so it is deliberately **not** written to `localStorage` — otherwise changing it later could never reach a browser that had already stored the old value.

> Whether the client graph forwards `cordis.yml` config to a **browser** row is not verified yet (see [Limitations](#limitations)). Every field therefore defaults on the client side too, and `remember` works through `localStorage` regardless of how config is delivered.

## Preview without a harness

The preview page is a mock chat UI plus a 96-theme gallery with live contrast badges. It loads `themes.json` over `fetch()`, so it **must** be served over HTTP — under `file://` the browser blocks the request and the page reports that it cannot load `themes.json`.

> **`preview/` is a local development artifact, not part of this repository** (see `.gitignore`). A fresh clone has no `preview/` directory, so the commands below only apply where it already exists locally. `preview/themes.json` is regenerated by `pnpm generate` together with `src/themes.generated.js`; the gallery page and the screenshots are working files of the original checkout.

```sh
cd preview
python3 -m http.server 8000     # or: npx serve .
# open http://localhost:8000/
```

## Design: Paper · Veil · Seal

Chinese painting does not start with color. It starts with preparing the paper, then washes over it, and signs last. These themes are built in the same order, and the three characters map onto three implementation layers.

- **纸 Paper** (layer A, ~60% of surface area) — the ground is not "the traditional color, lightened". It is a different material: four families (*su juan* raw silk, *shu xuan* sized paper, *xue qing* violet silk, *zhe zhi* ochre paper) each with their own lightness and chroma gates. The anchor is left as a trace, chroma clamped hard, so the ground reads as "this particular white (or black) is a little unusual". No two of the 96 themes share a background.
- **帘 Veil** (layer B, ~25%) — the sidebar and message bubbles are the anchor color itself, undiluted by paper, on their own chroma gate. **You recognize which traditional color you are in by the bubbles, not by the background.**
- **印 Seal** (layer D, <0.5%) — the primary button is deliberately **not** the anchor. It is a curated relative of it: green-blue paired with a vermilion seal, gold ground with an azurite one. The most saturated patch on screen is this one and only this one, so a single focus point comes for free. The generator records `sealName` / `sealRel` / `sealWhy` per theme.
- **Ink and empty space** (layer C) — text, rules, and secondary surfaces run down one ink ramp (the paper color pushed darker). Every `nb-XX` reference from the base stylesheet becomes a tinted neutral `N(XX)` of the same lightness; hover offsets, elevation steps, borders, and interaction alphas are copied verbatim. Hue changes, relations do not.
- **Provenance** — the generator distinguishes a *named* color (a traditional hex used directly) from a *fallback* (a value derived along OKLab lightness by `ensure()`), and records each in `degraded`. Current roster: bubble-chroma fallback in 18 themes, seal fallback in 10, across 27 themes total. Anchors that fail the AA assertion matrix are dropped whole, with the reason logged.

Anchor distribution across paper families: 素绢 12 · 熟宣 14 · 雪青 15 · 赭纸 7.

## Quality gates

Every shipped theme passes these assertions. Re-run them independently with `node scripts/check-contrast.mjs`.

- `label-primary` ≥ 4.5:1 against `bg-base`, `bg-layer-1`, sidebar, bubble, input, and code block
- `label-secondary` ≥ 4.5:1 against `bg-base`; `label-tertiary` ≥ 3:1
- Primary button label ≥ 4.5:1 against `button-primary-fill`; link color ≥ 4.5:1 against `bg-base`
- Error / success / warning label colors ≥ 4.5:1 against `bg-base` (icon-class ≥ 3:1)
- Bubble is distinguishable from the ground (ratio ≥ 1.04)
- Four structural invariants: elevation direction, veil chroma gate, single focus (the most saturated patch must be the seal), and 89/89 token coverage
- No randomness: identical input reproduces `src/themes.generated.js` byte for byte; theme signatures are pairwise distinct (minimum signature ΔE 0.015 within a scheme)

Latest run:

```
themes: 96 (48 light / 48 dark)
contrast: 2208/2208 rows pass · 0 failing themes
invariants: 0 failures
duplicate token-graph SHA-1: 0
shipped ↔ preview parity: 0 failures
closest pair within a scheme: 0.0172 ΔE (xiangyehong-dark ↔ fentuanhuahong-dark)
```

Plugin behavior — theme selection, the boot race, config handling, and the built artifact itself — is covered separately by `pnpm test` (23 assertions, no browser needed).

## Theme roster

<details>
<summary><b>48 anchors × light/dark = 96 themes</b> — click to expand</summary>

Display names are `<name>·亮` / `<name>·暗` (e.g. `竹青·暗`). Paper families: 素绢 = raw silk, 熟宣 = sized xuan paper, 雪青 = violet-tinted silk, 赭纸 = ochre paper.

| Color | 中文 | Anchor | Paper | Seal | Theme ids (light / dark) |
|---|---|---|---|---|---|
| Zhu Qing | 竹青 | `#00A86B` | 素绢 | 茜红 | `zhuqing-light` / `zhuqing-dark` |
| Zhu Hong | 朱红 | `#ED5126` | 熟宣 | 赭石 | `zhuhong-light` / `zhuhong-dark` |
| Qun Qing | 群青 | `#1772B4` | 雪青 | 枫叶红 | `qunqing-light` / `qunqing-dark` |
| Teng Huang | 藤黄 | `#FFD111` | 赭纸 | 绀青 | `tenghuang-light` / `tenghuang-dark` |
| Jiang Zi | 绛紫 | `#8E354A` | 熟宣 | 洋葱紫 | `jiangzi-light` / `jiangzi-dark` |
| Zi Yun | 紫云 | `#A020F0` | 雪青 | 蜻蜓红 | `ziyun-light` / `ziyun-dark` |
| Mei Hong Se | 玫红色 | `#FF007F` | 熟宣 | 品红 | `meihongse-light` / `meihongse-dark` |
| Dan Shu Hong | 淡曙红 | `#EE2746` | 熟宣 | 殷红 | `danshuhong-light` / `danshuhong-dark` |
| Gan Qing | 绀青 | `#4F84FF` | 雪青 | 落霞 | `ganqing-light` / `ganqing-dark` |
| Mei Gui Zi | 玫瑰紫 | `#BA2F7B` | 熟宣 | 高粱红 | `meiguizi-light` / `meiguizi-dark` |
| Ying Wu Lü | 鹦鹉绿 | `#5BAE23` | 素绢 | 猩红 | `yingwulv-light` / `yingwulv-dark` |
| Bo Luo Hong | 菠萝红 | `#FC7930` | 熟宣 | 芙蓉红 | `boluohong-light` / `boluohong-dark` |
| Fu Pen Zi Hong | 覆盆子红 | `#AC1F18` | 熟宣 | 苋菜红 | `fupenzihong-light` / `fupenzihong-dark` |
| Cang Bi | 苍碧 | `#2A52BE` | 雪青 | 猩红 | `cangbi-light` / `cangbi-dark` |
| Xiong Huang | 雄黄 | `#FF9900` | 赭纸 | 绀青 | `xionghuang-light` / `xionghuang-dark` |
| Wei Zi | 魏紫 | `#7E1671` | 雪青 | 魏紫·深 | `weizi-light` / `weizi-dark` |
| Gan Lan Huang Lü | 橄榄黄绿 | `#BEC936` | 素绢 | 魏紫 | `ganlanhuanglv-light` / `ganlanhuanglv-dark` |
| Xin He Lü | 新禾绿 | `#D2B116` | 赭纸 | 釉蓝 | `xinhelv-light` / `xinhelv-dark` |
| Huo Zhuan Hong | 火砖红 | `#CD6227` | 熟宣 | 淡可可棕 | `huozhuanhong-light` / `huozhuanhong-dark` |
| Xiang Ye Hong | 香叶红 | `#F07C82` | 熟宣 | 鹅冠红 | `xiangyehong-light` / `xiangyehong-dark` |
| Yan Ying Zi | 烟萦紫 | `#8A4B9C` | 雪青 | 烟萦紫·深 | `yanyingzi-light` / `yanyingzi-dark` |
| Mei Ge | 韎韐 | `#A5441B` | 熟宣 | 蟹蝥红 | `meige-light` / `meige-dark` |
| Li Shou | 綟绶 | `#6B8E23` | 素绢 | 暗紫苑红 | `lishou-light` / `lishou-dark` |
| Zi Teng Luo | 紫藤萝 | `#9B8AE8` | 雪青 | 紫藤萝·深 | `zitengluo-light` / `zitengluo-dark` |
| Han Xiu Lü | 汉绣绿 | `#2E7D32` | 素绢 | 绛紫 | `hanxiulv-light` / `hanxiulv-dark` |
| Jin Zong | 金棕 | `#B8860B` | 赭纸 | 柏林蓝 | `jinzong-light` / `jinzong-dark` |
| An Zi Yuan Hong | 暗紫苑红 | `#82202B` | 熟宣 | 殷红 | `anziyuanhong-light` / `anziyuanhong-dark` |
| Xin Lü | 新绿 | `#6CC788` | 素绢 | 茜裙 | `xinlv-light` / `xinlv-dark` |
| Ling Meng Hong | 菱锰红 | `#D276A3` | 熟宣 | 苋菜紫 | `lingmenghong-light` / `lingmenghong-dark` |
| Man Tian Xing Zi | 满天星紫 | `#2E317C` | 雪青 | 栗紫 | `mantianxingzi-light` / `mantianxingzi-dark` |
| Kong Que Lan | 孔雀蓝 | `#0EB0C9` | 雪青 | 胭脂红 | `kongquelan-light` / `kongquelan-dark` |
| Mei Die Lü | 美蝶绿 | `#12AA9C` | 素绢 | 枫叶红 | `meidielv-light` / `meidielv-dark` |
| Bian Dou Zi | 扁豆紫 | `#A35C8F` | 雪青 | 扁豆紫·深 | `biandouzi-light` / `biandouzi-dark` |
| Qing Fan Lü | 青矾绿 | `#2C9678` | 素绢 | 汉绣红 | `qingfanlv-light` / `qingfanlv-dark` |
| Bi Luo Chun Lü | 碧螺春绿 | `#867018` | 赭纸 | 苍碧 | `biluochunlv-light` / `biluochunlv-dark` |
| Gan Lan Shi Lü | 橄榄石绿 | `#B2CF87` | 素绢 | 酢酱草红 | `ganlanshilv-light` / `ganlanshilv-dark` |
| Fen Tuan Hua Hong | 粉团花红 | `#EC9BAD` | 熟宣 | 锦葵红 | `fentuanhuahong-light` / `fentuanhuahong-dark` |
| He Ye Lü | 荷叶绿 | `#1A6840` | 素绢 | 栗紫 | `heyelv-light` / `heyelv-dark` |
| Shi Lü | 石绿 | `#57C3C2` | 素绢 | 银红 | `shilv-light` / `shilv-dark` |
| Zha Ye Zong | 柞叶棕 | `#692A1B` | 熟宣 | 栗棕 | `zhayezong-light` / `zhayezong-dark` |
| Chang Chun Hua Lan | 长春花蓝 | `#7EC0EE` | 雪青 | 香叶红 | `changchunhualan-light` / `changchunhualan-dark` |
| Shan Geng Zi | 山梗紫 | `#61649F` | 雪青 | 满江红 | `shangengzi-light` / `shangengzi-dark` |
| Yan Lan | 鷃蓝 | `#144A74` | 雪青 | 枣红 | `yanlan-light` / `yanlan-dark` |
| Fen Lü | 粉绿 | `#83CBAC` | 素绢 | 梅红 | `fenlv-light` / `fenlv-dark` |
| Yu Qin Lan | 玉鈫蓝 | `#126E82` | 雪青 | 赭石 | `yuqinlan-light` / `yuqinlan-dark` |
| Pi Bian | 皮弁 | `#8B5D33` | 赭纸 | 石青 | `pibian-light` / `pibian-dark` |
| Gan Lan Lü | 橄榄绿 | `#5E5314` | 赭纸 | 满天星紫 | `ganlanlv-light` / `ganlanlv-dark` |
| Dai Zi | 黛紫 | `#5D3A6F` | 雪青 | 黛紫·深 | `daizi-light` / `daizi-dark` |

The roster is whatever the generator emits — it is not maintained by hand. Re-export this table from the `node scripts/generate-themes.mjs` stdout summary.

</details>

## Development

```sh
pnpm generate         # regenerate src/themes.generated.js (output is committed; see the note below)
pnpm check            # node scripts/check-contrast.mjs — contrast + invariant + parity assertions
pnpm test             # node --test test/*.test.ts — plugin behavior (needs Node ≥ 23.6 for TS files)
pnpm build            # tsdown; or: node scripts/build-esbuild.mjs
```

Layout:

| Path | Role |
|---|---|
| `src/index.ts` | Host half — a graph-row anchor plus the config schema; no host-side behavior |
| `src/config.ts` | Config shape, defaults, and normalization — shared by both halves and the tests |
| `src/client/index.ts` | Browser plugin: registers 96 themes and wires the selector, config and settings page |
| `src/client/selector.ts` | Selection state machine — boot-race retries vs. user sovereignty. Pure, no `ctx`/DOM |
| `src/client/ThemeSection.tsx` | The picker UI. Props only — presentation never touches `ctx` |
| `src/client/locales.ts` | Settings-page copy (zh / en), keys type-checked against each other |
| `src/themes.generated.js` | Generated roster: 96 themes × 89 tokens plus provenance |
| `scripts/generate-themes.mjs` | Deterministic generator |
| `scripts/check-contrast.mjs` | Data gate: contrast, invariants, shipped ↔ preview parity |
| `test/` | Behavior gate: selector, config, and a load-time lock on the built bundle |
| `preview/` | Standalone gallery — local only, **not shipped** (`themes.json` is the same batch as the generated roster) |

`test/bundle.test.ts` loads `lib/client.js` through a stub `window.__ModuleLoader__`, so run `pnpm build` first — without it that file's cases skip (and say so) rather than silently passing.

Two notes for contributors:

- **`pnpm generate` is not self-contained.** The generator reads the color-harmony dataset (`assets/data/harmonies.js`, 742 colors) from **two directories above this one** — it only runs inside the parent `zhongguo-traditional-colors` checkout. `pnpm build` and `pnpm check` need no such thing, because the generated roster is committed.
- **`pnpm check` asserts over `src/themes.generated.js`** — the artifact the client bundle actually imports — and separately checks that `preview/themes.json` still matches it. Hand-edit either one and the parity assertions fail. The published tarball carries both the generated roster and this script, so `npm run check` inside an installed copy re-verifies all 2208 contrast rows on the exact data that shipped (the parity block is skipped there and says so).

## Limitations

- **Selection is per browser, not per account.** Third-party theme ids are not persisted to `settings.yaml` — that is `ui-theme` behavior, not something a plugin can change. The plugin works around it with `localStorage`, so the pick survives a reload on that browser but does not follow the user to another device or profile.
- **Config forwarding to the browser row is unverified.** The host half exports a Schemastery schema, so `cordis.yml` values are validated at load time; whether the client graph hands the same config to the browser row has not been measured. Every field defaults client-side, and `remember` does not depend on it.
- **No entry in the built-in Appearance row.** It renders only light/dark/system from its own schema, so third-party themes do not appear there at all. The settings page this plugin ships is the intended surface.
- **Third-party client plugins can only `require` packages already seeded in the page's module table** (`react`, `react/jsx-runtime`, `react-dom`, `@deepseek-ai/cordis`, `ui-slots`, `web-react`, `ui-primitives`). Consequently the settings page uses React's own `useState` plus a `subscribe` handle passed down from `apply()` instead of `dsh-client-runtime`'s `defineStore`, and its styles are inline `--dsw-*` token references rather than CSS modules (a third-party esbuild build has no CSS-modules loader). A side effect worth having: the panel is itself themed.
- **Boot is a race, and losing it must not turn into fighting the user.** `ui-layout`'s presenter mounts on its own schedule and the settings scope adopts the durable preference afterwards, either of which can overwrite a `setTheme` issued during `apply()`. The plugin verifies against the DOM the presenter actually writes and retries on a bounded backoff (≤8 attempts, ~5s, stopping on success), and re-asserts at most 5 times if something overwrites it inside a 5-second boot window. **After that window, any preference change is treated as the user's decision and the plugin yields** — picking Light in the built-in Appearance row stays picked. `src/client/selector.ts` holds this logic and `test/selector.test.ts` locks it.
- **Mask and skeleton tokens are shipped but only eyeballed in the preview page**, not in a real harness UI. Token coverage itself is complete (89/89).
- **No screenshots from a live harness yet.** On-device verification was done by reading computed styles (browser screenshots were unavailable in that environment); the `preview/` screenshots (a local, non-shipped artifact) are of the standalone preview page.

<details>
<summary>Verification status — what is confirmed, what was measured on device, what is not</summary>

**From harness source / docs (this package is built on these facts):**

- Theme API: `ThemeDefinition { id, colorScheme: 'light' | 'dark', tokens: Record<string, string> }`; `ctx.theme.register(definition): () => void`. Duplicate ids throw, `'system'` cannot be registered, and the returned disposer unregisters and falls back to the stored preference (`packages/client/ui-theme/src/client/index.ts`).
- The official channel for external plugins is bundle + profile (`docs/user/develop/basic/publish.md`): `dsh plugin --profile <name> add <path>`. The client graph scan does not distinguish in-tree from out-of-tree packages; it requires only that the package be resolvable from the profile directory and declare `dsh.client` plus `exports["./client"]`.
- The client bundle shape (cjs/browser closure factory, banner/footer/intro, id = package name) is replicated from `packages/client/tsdown.client.ts`. **That shared preset is repo-internal and unpublished**, which is why this package reproduces its output from its own `tsdown.config.ts`, with `scripts/build-esbuild.mjs` as an equivalent-shape fallback.
- Dynamic runtime features (self-modification, dynamic packages) do not exist on master — only as proposal notes. This package does not depend on them.

**Measured on device (2026-08-14, `npx @deepseek-ai/dsh@0.1.0-rc.6 web`, real browser):**

- The whole load chain works. `dsh plugin --profile web add -w <dir>` writes the package into the profile's `dependencies` and appends it to `dsh.profile.bundles`; `--dump-config` shows `- id: theme-zhongguo`; the server returns 200 for `/plugins/dsh-theme-zhongguo/client.js?rev=…`; the console logs `registered 96/96 themes (48 light / 48 dark)`.
- Themes reach the real UI. After `#theme=zhuqing-light`, `<body>` carries ~4.4KB of inline tokens with `--dsw-alias-bg-base: rgb(246,253,247)`, `--dsw-specific-bubble: rgb(179,233,201)`, `--dsw-alias-button-primary-fill: rgb(199,0,57)`. Dark verified too: 群青·暗 ground `rgb(14,19,26)` with a 枫叶红 seal `rgb(213,54,64)`, and `body[data-ds-dark-theme]` set.
- All four settings-page functions pass: click-to-switch, the light/dark segmented control, search (typing `daizi` filters to one), and the hand-back button (inline tokens cleared, built-in preference restored).
- Slot registration must go through `ctx.slots.inject('settings.section', () => ctx.slots.register(...))` — a bare `register` into a slot declared by another package throws.

**Not verified:**

- `@deepseek-ai/*` installation. They are declared as optional peer dependencies (npm's resolution of their `next` dist-tag crashed arborist, so they are kept out of devDependencies). All but one are type-only; `@deepseek-ai/schemastery` is a value import in the host half, kept external at build time and provided by the harness at runtime. The on-device run above predates the config schema.
- Whether `cordis.yml` config reaches the browser row (see Limitations).
- Mask / skeleton token appearance in a real harness UI (see Limitations).

</details>

## License

MIT — see [LICENSE](./LICENSE).
