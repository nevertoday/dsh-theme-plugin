# dsh-theme-plugin

Chinese traditional colors as a **DeepSeek Harness theme pack** — 49 anchors × light/dark = **98 themes**, each writing the full `--dsw-*` token vocabulary (89 tokens) and passing WCAG AA contrast checks (2254/2254 rows, 0 failures). The picker opens on a curated shortlist of 12.

📖 [中文文档](./README.zh-CN.md)

## Install

```sh
npx -y @deepseek-ai/dsh plugin --profile web add dsh-theme-plugin@latest
npx -y @deepseek-ai/dsh --profile web          # boot → open http://127.0.0.1:3080/
```

That pulls the prebuilt bundle from npm — no clone, no build step. The `web` profile is created on first boot at `~/.dsh/profiles/web`.

- **Verify:** `dsh --profile web --dump-config` shows a `theme-zhongguo` row; the browser console logs `registered 98/98 themes`.
- **Update:** run the same `add` command again (`@latest`).
- **Uninstall:** `dsh plugin --profile web remove dsh-theme-plugin`

### From source (development)

Requirements: Node.js 20+ (`engines` in `package.json`; `pnpm test` runs `.ts` directly and needs 23.6+) and pnpm.

```sh
git clone https://github.com/nevertoday/dsh-theme-plugin
cd dsh-theme-plugin
pnpm install && pnpm build                                # ① build lib/client.js (browser bundle)
dsh plugin --profile web add -w .                         # ② register ('.' = this directory)
dsh --profile web                                         # ③ boot → open http://127.0.0.1:3080/
```

- **①** `pnpm install` already builds once through its `prepare` script; the explicit `pnpm build` is a safety net (and required if you install with `--ignore-scripts`). It needs `tsdown`; fallback `node scripts/build-esbuild.mjs` (esbuild is already a devDependency). The repo ships an `.npmrc` with `auto-install-peers=false` — **without it pnpm ≥ 9 cannot install**: it tries to fetch the `@deepseek-ai/*` peers (even though all are marked optional), and the `latest` of `dsh-client-runtime` depends on a package that was never published to npm, so the install dies with `ERR_PNPM_FETCH_404`.
- **②** `-w` is required because the profile directory is a pnpm workspace root. `add` anchors relative specs like `.` to the directory you run it from. It links the directory (`link:` dependency) and auto-appends the package to `dsh.profile.bundles`; the loader reads `lib/client.js` straight from your working copy — step ① creates that file, so committing `lib/` is **not** required (committing it is fine too; the cost is 553KB of output plus a 790KB sourcemap showing up as changes after every install).
- **Gates, no harness needed:** `pnpm check` (2254 contrast rows plus invariants) and `pnpm test` (46 behavioral assertions, including a load-time lock on `lib/client.js`).
- **Update:** `git pull && pnpm install && pnpm build`, then boot — no re-registration needed.

## Usage

Open **Settings → Traditional Colors** (after "Agent presets" in the nav) and pick a theme — applies immediately. Or share/bookmark a deep link:

```
http://127.0.0.1:3080/#theme=zhuqing-light      # 竹青 light
http://127.0.0.1:3080/#theme=qunqing-dark       # 群青 dark
```

Changing the hash switches themes live. Your pick is remembered per browser (`localStorage`), not in `settings.yaml` — it does not follow you across devices.

<p align="center">
  <img src="https://raw.githubusercontent.com/nevertoday/dsh-theme-plugin/main/docs/img/settings-light.png" alt="Settings → Traditional Colors on 竹青 light: the curated shortlist first, then every anchor grouped by paper family; each row shows the theme's actual paper / veil / focus" width="49%">
  <img src="https://raw.githubusercontent.com/nevertoday/dsh-theme-plugin/main/docs/img/settings-dark.png" alt="The same panel on 朱红 dark: it is themed by the pack itself, because its styles only reference --dsw-* tokens" width="49%">
</p>

The panel is themed by the pack itself — its styles reference nothing but `--dsw-*` tokens, so it doubles as a demo of the theme you are picking.

## Design: Paper · Veil · Seal

Chinese painting does not start with color. It starts with preparing the paper, then washes over it, and signs last. These themes are built in the same order, and the three characters map onto three implementation layers.

- **纸 Paper** (layer A, ~60% of surface area) — the ground is not "the traditional color, lightened". It is a different material: four families (*su juan* raw silk, *shu xuan* sized paper, *xue qing* violet silk, *zhe zhi* ochre paper), and their chroma is deliberately spread — roughly 0.010 / 0.015 / 0.019 / 0.024 in OKLab — so the four papers are told apart by eye, not only in the data. The ground sits at L ≈ 0.966–0.970, off-white rather than white, which is what leaves room for a raised surface above it. No two of the 98 themes share a background.
- **帘 Veil** (layer B, ~25%) — the sidebar and message bubbles are the anchor color itself, undiluted by paper, on their own chroma gate, held inside a **band** (1.25–1.45 against the paper) so the wash can neither vanish nor harden into a slab. **You recognize which traditional color you are in by the bubbles, not by the background.**
- **印 Seal** (layer D) — **the focus is the anchor itself.** The primary button and the send button are the anchor pressed darker; the curated relative retreats to the active-nav accent, i.e. a signature rather than a focus. This reverses the pack's original law (the seal used to fill the primary button, a median 109° away from the color you picked — so choosing 竹青 gave you a crimson CTA). The generator still records `sealName` / `sealRel` / `sealWhy` per theme, now for that signature mark.
- **Ink and empty space** (layer C) — text, rules, and secondary surfaces run down one ink ramp (the paper color pushed darker). Every `nb-XX` reference from the base stylesheet becomes a tinted neutral `N(XX)` of the same lightness; hover offsets, elevation steps, borders, and interaction alphas are copied verbatim. Hue changes, relations do not — with one deliberate exception: the ramp's **endpoints** are set here rather than inherited, because the base stylesheet's are the extremes. Light and dark now share one shape (body 16.9–17.5 / secondary ≈ 7.4–8.0 / tertiary ≈ 4.6–5.5), matching the colour studio's own `--ink` / `--ink-soft` / `--muted`.
- **Provenance** — the generator distinguishes a *named* color (a traditional hex used directly) from a *fallback* (a value derived along OKLab lightness by `ensure()`), and records each in `degraded`. Anchors that fail the AA assertion matrix are dropped whole, with the reason logged. Run `pnpm generate` for the current tally.
- **精选 Curated** — 12 of the 49 anchors are flagged `curated` and shown first in the picker. The list is derived, not hand-kept: the `CURATED` names that survive the gates, topped up by farthest-point sampling in OKLab so the shortlist spreads across the space instead of clustering.

Anchor distribution across paper families: 素绢 11 · 熟宣 14 · 雪青 18 · 赭纸 6.

## Theme roster

<details>
<summary><b>49 anchors × light/dark = 98 themes</b> — click to expand</summary>

⭐ marks the 12 curated anchors the picker shows first. Display names are `<name>·亮` / `<name>·暗` (e.g. `竹青·暗`). Paper families: 素绢 = raw silk, 熟宣 = sized xuan paper, 雪青 = violet-tinted silk, 赭纸 = ochre paper.

| Color | 中文 | Anchor | Paper | Seal | Theme ids (light / dark) |
|---|---|---|---|---|---|
| Zhu Qing | 竹青 ⭐ | `#00A86B` | 素绢 | 茜红 | `zhuqing-light` / `zhuqing-dark` |
| Zhu Hong | 朱红 ⭐ | `#ED5126` | 熟宣 | 赭石 | `zhuhong-light` / `zhuhong-dark` |
| Qun Qing | 群青 ⭐ | `#1772B4` | 雪青 | 枫叶红 | `qunqing-light` / `qunqing-dark` |
| Teng Huang | 藤黄 ⭐ | `#FFD111` | 赭纸 | 瑶碧 | `tenghuang-light` / `tenghuang-dark` |
| Jiang Zi | 绛紫 ⭐ | `#8E354A` | 熟宣 | 洋葱紫 | `jiangzi-light` / `jiangzi-dark` |
| Zi Yun | 紫云 ⭐ | `#A020F0` | 雪青 | 蜻蜓红 | `ziyun-light` / `ziyun-dark` |
| Mei Hong Se | 玫红色 ⭐ | `#FF007F` | 熟宣 | 品红 | `meihongse-light` / `meihongse-dark` |
| Dan Shu Hong | 淡曙红 | `#EE2746` | 熟宣 | 殷红 | `danshuhong-light` / `danshuhong-dark` |
| Gan Qing | 绀青 | `#4F84FF` | 雪青 | 落霞 | `ganqing-light` / `ganqing-dark` |
| Mei Gui Zi | 玫瑰紫 | `#BA2F7B` | 熟宣 | 高粱红 | `meiguizi-light` / `meiguizi-dark` |
| Ying Wu Lü | 鹦鹉绿 | `#5BAE23` | 素绢 | 猩红 | `yingwulv-light` / `yingwulv-dark` |
| Bo Luo Hong | 菠萝红 | `#FC7930` | 熟宣 | 芙蓉红 | `boluohong-light` / `boluohong-dark` |
| Fu Pen Zi Hong | 覆盆子红 | `#AC1F18` | 熟宣 | 苋菜红 | `fupenzihong-light` / `fupenzihong-dark` |
| Cang Bi | 苍碧 | `#2A52BE` | 雪青 | 猩红 | `cangbi-light` / `cangbi-dark` |
| Xiong Huang | 雄黄 | `#FF9900` | 赭纸 | 绀青 | `xionghuang-light` / `xionghuang-dark` |
| Hu Po Huang | 琥珀黄 | `#FEBA07` | 赭纸 | 绀青 | `hupohuang-light` / `hupohuang-dark` |
| Wei Zi | 魏紫 | `#7E1671` | 雪青 | 魏紫·深 | `weizi-light` / `weizi-dark` |
| Gan Lan Huang Lü | 橄榄黄绿 | `#BEC936` | 素绢 | 魏紫 | `ganlanhuanglv-light` / `ganlanhuanglv-dark` |
| Huo Zhuan Hong | 火砖红 | `#CD6227` | 熟宣 | 淡可可棕 | `huozhuanhong-light` / `huozhuanhong-dark` |
| Xiang Ye Hong | 香叶红 | `#F07C82` | 熟宣 | 鹅冠红 | `xiangyehong-light` / `xiangyehong-dark` |
| Yan Ying Zi | 烟萦紫 | `#8A4B9C` | 雪青 | 烟萦紫·深 | `yanyingzi-light` / `yanyingzi-dark` |
| Mei Ge | 韎韐 | `#A5441B` | 熟宣 | 蟹蝥红 | `meige-light` / `meige-dark` |
| Li Shou | 綟绶 | `#6B8E23` | 素绢 | 暗紫苑红 | `lishou-light` / `lishou-dark` |
| Zi Teng Luo | 紫藤萝 | `#9B8AE8` | 雪青 | 淡罂粟红 | `zitengluo-light` / `zitengluo-dark` |
| Han Xiu Lü | 汉绣绿 | `#2E7D32` | 素绢 | 绛紫 | `hanxiulv-light` / `hanxiulv-dark` |
| An Zi Yuan Hong | 暗紫苑红 | `#82202B` | 熟宣 | 殷红 | `anziyuanhong-light` / `anziyuanhong-dark` |
| Ling Meng Hong | 菱锰红 ⭐ | `#D276A3` | 熟宣 | 苋菜紫 | `lingmenghong-light` / `lingmenghong-dark` |
| Man Tian Xing Zi | 满天星紫 | `#2E317C` | 雪青 | 栗紫 | `mantianxingzi-light` / `mantianxingzi-dark` |
| Kong Que Lan | 孔雀蓝 | `#0EB0C9` | 雪青 | 胭脂红 | `kongquelan-light` / `kongquelan-dark` |
| Bao Shi Lan | 宝石蓝 | `#2486B9` | 雪青 | 朱墙 | `baoshilan-light` / `baoshilan-dark` |
| Mei Die Lü | 美蝶绿 | `#12AA9C` | 素绢 | 枫叶红 | `meidielv-light` / `meidielv-dark` |
| Bian Dou Zi | 扁豆紫 | `#A35C8F` | 雪青 | 扁豆紫·深 | `biandouzi-light` / `biandouzi-dark` |
| Qian Zi Teng Luo | 浅紫藤萝 ⭐ | `#D1B3FF` | 雪青 | 杏子 | `qianzitengluo-light` / `qianzitengluo-dark` |
| Qing Fan Lü | 青矾绿 | `#2C9678` | 素绢 | 汉绣红 | `qingfanlv-light` / `qingfanlv-dark` |
| Bi Luo Chun Lü | 碧螺春绿 | `#867018` | 赭纸 | 苍碧 | `biluochunlv-light` / `biluochunlv-dark` |
| Gan Lan Shi Lü | 橄榄石绿 | `#B2CF87` | 素绢 | 酢酱草红 | `ganlanshilv-light` / `ganlanshilv-dark` |
| Fen Tuan Hua Hong | 粉团花红 | `#EC9BAD` | 熟宣 | 锦葵红 | `fentuanhuahong-light` / `fentuanhuahong-dark` |
| He Ye Lü | 荷叶绿 ⭐ | `#1A6840` | 素绢 | 栗紫 | `heyelv-light` / `heyelv-dark` |
| Shi Lü | 石绿 | `#57C3C2` | 素绢 | 银红 | `shilv-light` / `shilv-dark` |
| Zha Ye Zong | 柞叶棕 | `#692A1B` | 熟宣 | 栗棕 | `zhayezong-light` / `zhayezong-dark` |
| Chang Chun Hua Lan | 长春花蓝 | `#7EC0EE` | 雪青 | 香叶红 | `changchunhualan-light` / `changchunhualan-dark` |
| Shan Geng Zi | 山梗紫 | `#61649F` | 雪青 | 满江红 | `shangengzi-light` / `shangengzi-dark` |
| Yan Lan | 鷃蓝 | `#144A74` | 雪青 | 枣红 | `yanlan-light` / `yanlan-dark` |
| Fen Lü | 粉绿 ⭐ | `#83CBAC` | 素绢 | 梅红 | `fenlv-light` / `fenlv-dark` |
| Yu Qin Lan | 玉鈫蓝 | `#126E82` | 雪青 | 赭石 | `yuqinlan-light` / `yuqinlan-dark` |
| Pi Bian | 皮弁 | `#8B5D33` | 赭纸 | 石青 | `pibian-light` / `pibian-dark` |
| Gan Lan Lü | 橄榄绿 | `#5E5314` | 赭纸 | 满天星紫 | `ganlanlv-light` / `ganlanlv-dark` |
| Luo Lan Zi | 萝兰紫 | `#C08EAF` | 雪青 | 萝兰紫·深 | `luolanzi-light` / `luolanzi-dark` |
| Dai Zi | 黛紫 ⭐ | `#5D3A6F` | 雪青 | 黛紫·深 | `daizi-light` / `daizi-dark` |

The roster is whatever the generator emits — it is not maintained by hand. Re-export this table from the `node scripts/generate-themes.mjs` stdout summary.

</details>

## Configuration

Under the plugin's row in `cordis.yml`:

```yaml
config:
  defaultTheme: zhuqing-light   # theme applied at boot (optional)
  remember: true                # remember the pick in localStorage
  hashSelector: true            # honour #theme=<id> deep links
  settingsOrder: 40             # settings page position in the nav
```

## License

MIT — see [LICENSE](./LICENSE).
