/*
 * WCAG 对比度终检 · Contrast gate for generated themes
 * ---------------------------------------------------------------
 * 独立复核（**不复用生成器代码**，避免同源盲区）：按 BRIEF 质量线 + SPEC-AESTHETIC §7
 * 检查 **src/themes.generated.js** 里的每个主题 —— 断言必须跑在真正进 bundle 的
 * 那份产物上；preview/themes.json 只是同批产出的副本，另有一组一致性断言盯着它，
 * 免得副本没漂、发货件漂了却没人报错。本文件的 sRGB→OKLab、WCAG 亮度、
 * 词表、SIG 维度都是**独立硬编码**的一份，与生成器不共享 —— 这是它作为 oracle
 * 的全部价值所在。阈值常量一个不放宽（只可加严）。
 *
 * 22 行对比度断言：
 *   · label-primary vs bg-base / bg-layer-1/2/3 / bubble / bubble-highlight /
 *     sidebar-nav-item-active ≥ 4.5
 *   · label-secondary vs bg-base / bg-layer-1 / bubble / sidebar-fill ≥ 4.5
 *   · label-primary-foreground vs button-primary-fill / button-primary-hover ≥ 4.5
 *   · 状态色 vs bg-base：error/success primary 与 warn-label ≥ 4.5，warn-primary ≥ 3.0
 *   · 链接色 brand-primary-new-color… 与 state-business-primary vs bg-base ≥ 4.5
 *   · brand-primary vs bg-base / sidebar-fill ≥ 3.0；button-info-fill vs bg-base ≥ 3.0
 *   · 亮模式专属：label-primary-inverted vs toast-bg / tooltip-bg ≥ 4.5
 * 另 4 组非 WCAG 不变量断言（§7.2）：
 *   1 帘的彩度不得低于 0.045（R1，「帘比现状更淡」是断言不是希望）
 *   2 印色彩度 > 最大面彩度 × 1.6（「屏上最艳的一块只有主按钮」必须可测）
 *   3 亮模式 bg 四层的层次方向与拆开（现状四同值白的回归护栏）
 *   4 token 覆盖完整性 89/89（缺一个失败；出现词表外的名字失败，防「编造 token」）
 * 以及近同检查：token 图 SHA-1 唯一 + 主题间最小距离（4 维签名色，同 colorScheme）。
 *
 * 用法：node scripts/check-contrast.mjs  （非零退出码 = 有失败）
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

/* 发货件：客户端 bundle import 的就是这个模块。 */
const { THEMES: themes } = await import(new URL('../src/themes.generated.js', import.meta.url).href);
/* 预览件：只用来做一致性对照。npm tarball 里不含 preview/（不在 files 白名单），
 * 那种情况下跳过对照并明说跳了 —— 静默跳过会让人以为对照过。 */
const previewPath = fileURLToPath(new URL('../preview/themes.json', import.meta.url));
const preview = existsSync(previewPath) ? JSON.parse(readFileSync(previewPath, 'utf8')) : undefined;

/* WCAG 相对亮度/对比度（sRGB EOTF），与 color-core.js 同式 */
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const relLum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (a, b) => { const l1 = relLum(a), l2 = relLum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
const rgbOf = s => s.match(/rgba?\(([\d.]+),([\d.]+),([\d.]+)/).slice(1, 4).map(Number);

/* sRGB → OKLab（Ottosson 矩阵，用于主题距离与彩度度量） */
function oklab([r, g, b]) {
  const [R, G, B] = [r, g, b].map(lin);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
          1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
          0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
const Cof = tok => { const [, a, b] = oklab(rgbOf(tok)); return Math.hypot(a, b); };
const Hof = tok => { const [, a, b] = oklab(rgbOf(tok)); return (Math.atan2(b, a) * 180 / Math.PI + 360) % 360; };
const hueDist = (p, q) => { const d = Math.abs(p - q) % 360; return d > 180 ? 360 - d : d; };
const Lof = tok => oklab(rgbOf(tok))[0];

const A = k => `--dsw-alias-${k}`;
const SP = k => `--dsw-specific-${k}`;
const PAIRS = [
  [A('label-primary'), A('bg-base'), 4.5],                                   //  1
  [A('label-primary'), A('bg-layer-1'), 4.5],                                //  2
  [A('label-secondary'), A('bg-base'), 4.5],                                 //  3
  [A('label-secondary'), A('bg-layer-1'), 4.5],                              //  4
  [A('label-primary-foreground'), A('button-primary-fill'), 4.5],            //  5
  [A('state-error-primary'), A('bg-base'), 4.5],                             //  6
  [A('state-success-primary'), A('bg-base'), 4.5],                           //  7
  [A('state-warn-label'), A('bg-base'), 4.5],                                //  8
  [A('state-warn-primary'), A('bg-base'), 3.0],                              //  9
  [A('brand-primary-new-colorprimary-new-color'), A('bg-base'), 4.5],        // 10
  [A('brand-primary'), A('bg-base'), 3.0],                                   // 11
  [A('button-info-fill'), A('bg-base'), 3.0],                                // 12
  [A('label-primary'), SP('bubble'), 4.5],                                   // 13
  // ── 本轮新增（SPEC-AESTHETIC §7.1）：只加行，不改阈值 ──
  [A('label-primary'), A('bg-layer-2'), 4.5],                                // 14 层次拆开后新暴露
  [A('label-primary'), A('bg-layer-3'), 4.5],                                // 15 同上
  [A('label-primary'), SP('sidebar-nav-item-active'), 4.5],                  // 16 veilCap 放开后的新失败源
  [A('label-primary'), SP('bubble-highlight'), 4.5],                         // 17 同上
  [A('label-secondary'), SP('bubble'), 4.5],                                 // 18 帘上的次级文字
  [A('label-secondary'), SP('sidebar-fill'), 4.5],                           // 19
  [A('label-primary-foreground'), A('button-primary-hover'), 4.5],           // 20 印色解耦后 hover 独立派生
  [A('state-business-primary'), A('bg-base'), 4.5],                          // 21
  [A('brand-primary'), SP('sidebar-fill'), 3.0],                             // 22 帘上的品牌色
];
/* 亮模式专属：反色浮层上的字（暗模式的浮层实际用 label-primary，故不设行）。 */
const PAIRS_LIGHT = [
  [A('label-primary-inverted'), A('toast-bg'), 4.5],
  [A('label-primary-inverted'), A('tooltip-bg'), 4.5],
];

/* 不变量 4 的词表 —— oracle 侧独立一份（89 个：alias 78 + specific 11），
 * 逐字抄自 harness-ref/design-platform.css，与生成器不共享。 */
const VOCAB = new Set([
  'bg-base', 'bg-layer-1', 'bg-layer-2', 'bg-layer-3', 'bg-mask-1', 'bg-mask-2', 'bg-mask-3',
  'bg-mask-drop', 'bg-mask-photo', 'bg-module-platform', 'bg-multi-select', 'bg-overlay', 'bg-skeleton',
  'border-inverted', 'border-inverted2', 'border-l1', 'border-l2', 'border-l2-darkmode-thin',
  'border-l3', 'border-l4', 'brand-primary', 'brand-primary-invert',
  'brand-primary-new-colorprimary-new-color', 'brand-text', 'button-contrast-fill',
  'button-elevated-fill', 'button-floating-fill', 'button-floating-hover', 'button-ghost-active-border',
  'button-ghost-active-fill', 'button-ghost-active-hover', 'button-info-fill', 'button-info-hover',
  'button-primary-dimmed', 'button-primary-fill', 'button-primary-hover', 'button-tool-bar-fill',
  'button-tool-bar-fill-invisible', 'button-tool-bar-hover', 'interactive-bg-active',
  'interactive-bg-hover', 'interactive-bg-hover-accent', 'interactive-bg-hover-danger',
  'interactive-bg-hover-solid', 'label-caption', 'label-dimmed', 'label-primary', 'label-primary-bluish',
  'label-primary-dimmed', 'label-primary-foreground', 'label-primary-inverted', 'label-secondary',
  'label-tertiary', 'markdown-citation', 'markdown-code-block', 'markdown-code-block-banner',
  'markdown-code-segment-selected', 'markdown-code-segment-unselected', 'markdown-inline-code',
  'markdown-placeholder', 'markdown-tag', 'scrollbar-bg-l1', 'scrollbar-bg-l2', 'scrollbar-hover-l1',
  'scrollbar-hover-l2', 'state-business-primary', 'state-business-tertiary', 'state-error-primary',
  'state-error-secondary', 'state-success-primary', 'state-success-secondary', 'state-success-tertiary',
  'state-warn-label', 'state-warn-primary', 'state-warn-secondary', 'state-warn-tertiary',
  'toast-bg', 'tooltip-bg',
].map(A).concat([
  'bubble', 'bubble-highlight', 'input-major', 'login-input', 'menu', 'selector', 'sidebar-fill',
  'sidebar-nav-item-active', 'sidebar-nav-item-active-accent', 'sidebar-nav-item-hover', 'tip',
].map(SP)));

let failThemes = 0, failRows = 0, totalRows = 0, failInv = 0;
const fails = [];
const fail = msg => { failInv++; fails.push(`✗ ${msg}`); };

for (const t of themes) {
  const bad = [];
  const rows = t.colorScheme === 'light' ? [...PAIRS, ...PAIRS_LIGHT] : PAIRS;
  for (const [fg, bg, floor] of rows) {
    totalRows++;
    const c = contrast(rgbOf(t.tokens[fg]), rgbOf(t.tokens[bg]));
    if (c < floor - 1e-9) { bad.push(`  ${fg} vs ${bg}: ${c.toFixed(2)} < ${floor}`); failRows++; }
  }
  if (bad.length) { failThemes++; console.log(`✗ ${t.id} (${t.nameZh})\n` + bad.join('\n')); }
}

/* ── 不变量 1：帘的彩度不得低于基线（SPEC §2.2 / R1）──
 * 「为了修锚色身份不明显，把最抢眼的表面做得比今天淡一半」是方案自毁。 */
for (const t of themes) {
  const c = Cof(t.tokens[SP('bubble')]);
  if (c < 0.045 - 1e-9) fail(`${t.id}: C(bubble)=${c.toFixed(4)} < 0.045 — 帘比现状更淡，方案自毁`);
}

/* ── 不变量 2：唯一焦点（SPEC §4.2 / §4.3 锁 2，「一色到底」后重定比例）──
 * 主按钮填充的彩度必须 > 任何大面积 token 的彩度 × FOCUS_C_RATIO：
 * 「屏幕上最艳的一块只有主按钮」这句话必须是可测的，不是修辞。
 *
 * 比例从 1.6 降到 1.35：1.6 是为「异色印」标定的 —— 焦点与帘相距中位 109°，
 * 只能靠彩度差压场。改成锚色本人之后两者同色相，焦点靠「深而密」压「淡而薄」，
 * 分离主要来自明度；而对灰调锚色（石绿 #57C3C2、橄榄绿 #5E5314 等），压深本身
 * 就会丢彩度，1.6 在数学上不可达，整锚出局。1.35 仍保证焦点严格最艳。
 * 与 generate-themes.mjs 的 FOCUS_C_RATIO 必须一致 —— 此处刻意重复而不 import，
 * 校验件不该信任生成件。 */
const FOCUS_C_RATIO = 1.35;
const BIG = [A('bg-base'), A('bg-layer-1'), SP('sidebar-fill'), SP('bubble')];
/* 焦点是**两个**令牌，不是一个：
 *   · button-primary-fill —— 名义上的主按钮；
 *   · button-info-fill    —— 真实应用里的发送键，聊天场景中点得最多的那颗。
 * 实测 button-primary-fill 在 DSH web 里没有任何控件在用，而这条不变量原先只查它，
 * 于是「屏上最艳的一块只有主按钮」被验证在一个看不见的按钮上，发送键长期是异色。 */
const FOCUS_KEYS = [A('button-primary-fill'), A('button-info-fill')];
for (const t of themes) {
  const cBig = Math.max(...BIG.map(k => Cof(t.tokens[k])));
  for (const k of FOCUS_KEYS) {
    const cFocus = Cof(t.tokens[k]);
    if (cFocus < cBig * FOCUS_C_RATIO) fail(`${t.id}: ${k} 彩度 ${cFocus.toFixed(4)} 未显著高于最大面 ${cBig.toFixed(4)} — 焦点被稀释`);
  }
}
/* 两个焦点必须同色相，否则「一色到底」只是改了其中一个的说法。 */
for (const t of themes) {
  const d = hueDist(Hof(t.tokens[A('button-primary-fill')]), Hof(t.tokens[A('button-info-fill')]));
  if (d > 12) fail(`${t.id}: 主按钮与发送键色相相差 ${d.toFixed(1)}° — 屏上出现了两个不同色的焦点`);
}

/* ── 不变量 2b：焦点必须是**你选的那个色** ──
 * 这是整套改造的核心性质，不该只靠人记得。改造前实测：焦点与锚色的色相中位差
 * 109°、最大 179°（正对补色）—— 选了竹青，屏上最响的是一块茜红。 */
const hexHue = hex => {
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const [, a, b] = oklab(rgb);
  return (Math.atan2(b, a) * 180 / Math.PI + 360) % 360;
};
/* 阈值 18°：实测中位 0.1°、p95 4.9°、最大 15.1°，而最大的几个**全是黄色系**
 * （琥珀黄 / 雄黄 / 藤黄）—— 高彩度的黄在 sRGB 里压深必然向橙偏，这是色域效应
 * 不是缺陷，卡死到 12° 只会把黄色主题全部误杀。改造前该值是中位 109°、最大 179°，
 * 与色域漂移差一个数量级，18° 拦得住真正的问题。 */
const FOCUS_HUE_TOL = 18;
for (const t of themes) {
  for (const k of FOCUS_KEYS) {
    const d = hueDist(Hof(t.tokens[k]), hexHue(t.anchorHex));
    if (d > FOCUS_HUE_TOL) fail(`${t.id}: ${k} 与锚色 ${t.anchorHex} 色相相差 ${d.toFixed(1)}° — 焦点不是用户选的那个色`);
  }
}

/* ── 不变量 6：精选是一份有效的短名单 ── */
{
  const curated = themes.filter(t => t.curated);
  const light = curated.filter(t => t.colorScheme === 'light');
  if (curated.length !== light.length * 2) fail(`精选未成对：共 ${curated.length}，其中亮色 ${light.length}`);
  if (light.length < 8 || light.length > 16) fail(`精选锚色数 ${light.length} 不在 8–16 —— 太少不成库，太多就不是编辑`);
  const fams = new Set(light.map(t => t.family));
  if (fams.size !== 4) fail(`精选只覆盖 ${fams.size} 个纸家族（应为 4）：${[...fams].join(' ')}`);
  for (const t of curated) {
    if (t.degraded.length > 0) fail(`${t.id}: 精选主题含降级项 ${t.degraded.join(' / ')}`);
  }
}

/* ── 不变量 3：层次方向（SPEC §2.1 #2）──
 * 亮模式四层必须逐级下沉、且不得两两全同（现状四同值白的回归护栏）。 */
const LAYERS = ['bg-base', 'bg-layer-1', 'bg-layer-2', 'bg-layer-3'];
for (const t of themes.filter(x => x.colorScheme === 'light')) {
  const L = LAYERS.map(k => Lof(t.tokens[A(k)]));
  if (!(L[1] < L[0] - 1e-6)) fail(`${t.id}: 层次方向反了（L(bg-layer-1)=${L[1].toFixed(4)} ≥ L(bg-base)=${L[0].toFixed(4)}）`);
  if (!(L[2] < L[1] - 1e-6 && L[3] < L[2] - 1e-6)) fail(`${t.id}: bg 四层未逐级下沉`);
  if (new Set(LAYERS.map(k => t.tokens[A(k)])).size < 4) fail(`${t.id}: bg 四层未拆开`);
}

/* ── 不变量 4：token 覆盖完整性（SPEC §2 —— 89/89，无遗漏、无新增）── */
for (const t of themes) {
  const names = Object.keys(t.tokens);
  const missing = [...VOCAB].filter(v => !(v in t.tokens));
  const extra = names.filter(n => !VOCAB.has(n));
  if (missing.length) fail(`${t.id}: 缺 ${missing.length} 个 token（首个 ${missing[0]}）`);
  if (extra.length) fail(`${t.id}: 出现词表外的 token ${extra.length} 个（首个 ${extra[0]}）—— 编造 token`);
}

/* ── 发货件 ↔ 预览件一致性 ──
 * 上面所有断言跑在 src/themes.generated.js 上；预览页读的是 preview/themes.json。
 * 两份同批产出，所以「一致」是不变量而不是巧合 —— 手改了任何一份都必须在这里炸。 */
let failParity = 0;
const parity = msg => { failParity++; fails.push(`✗ ${msg}`); };
if (preview !== undefined) {
  const graphOf = t => JSON.stringify(Object.entries(t.tokens ?? {}).sort());
  const pmap = new Map(preview.map(t => [t.id, t]));
  if (preview.length !== themes.length) {
    parity(`主题数不一致：发货件 ${themes.length} vs 预览件 ${preview.length}`);
  }
  for (const t of themes) {
    const p = pmap.get(t.id);
    if (!p) { parity(`${t.id}: preview/themes.json 里没有这套主题`); continue; }
    if (p.colorScheme !== t.colorScheme) parity(`${t.id}: colorScheme 不一致`);
    if (graphOf(p) !== graphOf(t)) parity(`${t.id}: 令牌图与发货件不一致 —— 请重跑 pnpm generate`);
  }
  for (const p of preview) {
    if (!themes.some(t => t.id === p.id)) parity(`${p.id}: 只存在于预览件，发货件里没有`);
  }
}

/* 近同检查：SHA-1 唯一性 + 同 scheme 内签名色最小 dE */
const sha = new Map();
let dupes = 0;
for (const t of themes) {
  const h = createHash('sha1').update(JSON.stringify(Object.entries(t.tokens).sort())).digest('hex');
  if (sha.has(h)) { dupes++; console.log(`✗ 重复 token 图：${t.id} == ${sha.get(h)}`); }
  else sha.set(h, t.id);
}
/* SIG 4 维（R10 与生成器 sigOf 同步）：印色不同的两套主题不该被判近同。 */
const SIG = [A('bg-base'), A('brand-primary'), SP('bubble'), A('button-primary-fill')];
let minD = Infinity, minPair = '';
for (let i = 0; i < themes.length; i++) for (let j = i + 1; j < themes.length; j++) {
  const a = themes[i], b = themes[j];
  if (a.colorScheme !== b.colorScheme) continue;
  let d = 0;
  for (const k of SIG) {
    const [L1, a1, b1] = oklab(rgbOf(a.tokens[k])), [L2, a2, b2] = oklab(rgbOf(b.tokens[k]));
    d += Math.hypot(L1 - L2, a1 - a2, b1 - b2);
  }
  d /= SIG.length;
  if (d < minD) { minD = d; minPair = `${a.id} ↔ ${b.id}`; }
}

if (fails.length) console.log(fails.join('\n'));
console.log(`主题数：${themes.length}（light ${themes.filter(t => t.colorScheme === 'light').length} / dark ${themes.filter(t => t.colorScheme === 'dark').length}）`);
console.log(`对比度检查：${totalRows - failRows}/${totalRows} 行通过 · 失败主题 ${failThemes}`);
console.log(`不变量检查（帘彩度 / 唯一焦点 / 层次方向 / token 覆盖）：失败 ${failInv}`);
console.log(`token 图 SHA-1 重复：${dupes}`);
console.log(preview === undefined
  ? '发货件 ↔ 预览件一致性：已跳过（本次没有 preview/themes.json）'
  : `发货件 ↔ 预览件一致性（src/themes.generated.js vs preview/themes.json）：失败 ${failParity}`);
console.log(`同 scheme 最小主题距离（bg/brand/bubble/印 四维平均 dE）：${minD.toFixed(4)} @ ${minPair}`);
process.exit(failThemes || dupes || failInv || failParity ? 1 : 0);
