/*
 * 中国传统色 → DeepSeek Harness 主题生成器
 * Chinese traditional colors → DeepSeek Harness theme generator
 * ---------------------------------------------------------------
 * 纸 · 帘 · 印（SPEC-AESTHETIC §1）：中国画不是先画颜色，是先备纸、后罩染、
 * 最后落款。这套主题照这个顺序施工。
 *   · 纸（层A，60% 面积）＝ 中性池 + 锚色微染，彩度被 paperCap 硬闸钳死；
 *   · 帘（层B，25% 面积）＝ 锚色本人的罩染，走独立 veilCap + 彩度硬下限；
 *   · 墨与线（层C）＝ 墨梯、边框 alpha、锚色识别的线与字；
 *   · 印（层D，<1% 面积）＝ 该锚自己关系色里那枚策展过的印，不过任何闸门；
 *   · 状态（层E）＝ 族内就近取，逐锚不同。
 *
 * 互斥律（SPEC §2.4，全案最核心的解耦）：
 *   **锚色永不做 fill，印色永不做 label**（唯一例外 label-primary-foreground，
 *   那是压在印上的字）。印色绝不进任何 bg-* / bubble* / sidebar-fill / 其余 label-*。
 *   面积小是结构保证，不是自觉：印色只进 3 个 token，物理上无法占据大面积。
 *
 * 用法 / Usage:  node scripts/generate-themes.mjs
 * 产出 / Emits:
 *   · src/themes.generated.js  — ESM，export const THEMES = [...]
 *   · preview/themes.json      — 同一份数据的 JSON
 *
 * 确定性 / Determinism：无 Math.random、无 Date.now；统计量取法写死
 * （中位数 v[floor(n/2)]）；多来源候选池有显式去重（先出现者优先）与
 * 并列打破（rec.id 升序）。重跑必须字节一致。
 *
 * 数据与色彩数学来自色库仓库根目录（window 模块，Node 里用
 * globalThis.window 垫片 + 间接 eval 加载，见下）。色彩数学一律复用
 * window.ZH_COLOR_CORE，本文件不另写 OKLab/WCAG 实现。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { pinyin } from 'pinyin-pro';

/* ── 1. 加载 window 模块 ──
 * harmonies.js / color-core.js 是浏览器 IIFE，只写 window.*、不碰 DOM，
 * 所以裸 window = {} 即可；间接 eval `(0, eval)` 让脚本在全局作用域求值。
 *
 * 两份脚本会以生成器进程权限执行，因此只认审阅过的内容指纹。对应上游 revision：
 * zhongguo-traditional-colors@3f5fc62ada73f1933bc3dbfa682e102adeffada9。
 * 上游更新时先审 diff、更新下面的 SHA-256，再重生成并跑完整闸门。 */
globalThis.window = {};

const SOURCE_SHA256 = {
  'assets/data/harmonies.js': 'de6a94fcec80bd99bedd64cbff0d099e313365942c082498b3c94c5b7bf9950f',
  'assets/js/color-core.js': '8a31f3d8d6445dfb5a4477e7db5ba2ae1d36fc3b51a5818abada03c0446cc5d2',
};

/* 色库位置不再靠目录嵌套猜测（原先写死 `../..`，只有当本仓库正好躺在色库里时才成立；
 * 一旦独立 clone 出来就会去找一个不存在的 assets/，且报错完全不解释原因）。
 * 优先级：环境变量 → 历史的嵌套布局 → 与色库并列的同级目录。 */
const CANDIDATES = [
  process.env.ZH_COLORS_REPO,
  fileURLToPath(new URL('../..', import.meta.url)),
  fileURLToPath(new URL('../../zhongguo-traditional-colors', import.meta.url)),
].filter(Boolean).map(p => p.endsWith('/') ? p : p + '/');

const PROBE = 'assets/js/color-core.js';
const repoRoot = CANDIDATES.find(root => existsSync(root + PROBE));
if (!repoRoot) {
  throw new Error(
    '找不到中国传统色色库（需要 ' + PROBE + '）。已尝试：\n' +
    CANDIDATES.map(c => '  · ' + c).join('\n') +
    '\n请设置 ZH_COLORS_REPO 指向色库仓库根目录，例如：\n' +
    '  ZH_COLORS_REPO=/path/to/zhongguo-traditional-colors node scripts/generate-themes.mjs'
  );
}

const load = p => {
  const source = readFileSync(repoRoot + p, 'utf8');
  const actual = createHash('sha256').update(source).digest('hex');
  const expected = SOURCE_SHA256[p];
  if (actual !== expected) {
    throw new Error(
      `${p} 的 SHA-256 与已审阅输入不匹配：\n` +
      `  expected ${expected}\n` +
      `  actual   ${actual}\n` +
      '请先审阅上游变更，再显式更新 scripts/generate-themes.mjs 中的指纹。',
    );
  }
  return (0, eval)(source);
};
load('assets/data/harmonies.js');
load('assets/js/color-core.js');

const {
  hexRgb, hexOklab, oklabHex, hueOf, chromaOf, hueDist, contrast, ensure, boostChroma, REC, ALL,
} = window.ZH_COLOR_CORE;

/* ── 2. 生成器内的少量助手（DESIGN §2.1）── */
const rad = d => d * Math.PI / 180;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rgbStr  = hex => { const [r, g, b] = hexRgb(hex); return `rgb(${r},${g},${b})`; };
const rgbaStr = (hex, a) => { const [r, g, b] = hexRgb(hex); return `rgba(${r},${g},${b},${a})`; };
// 固定某 hex 的 OKLab 明度为 L，保持 a/b 方向，彩度乘 k（默认不变）。不过任何闸门。
function atL(hex, L, k = 1) { const o = hexOklab(hex); return oklabHex({ L, a: o.a * k, b: o.b * k }); }
const Lof = hex => hexOklab(hex).L;
// 以 0.5 为中心把明度偏移缩放 k 倍：k>1 拉开台阶，k<1 收拢（SPEC §3.8）。
const scaleL = (L, k) => clamp(0.5 + (L - 0.5) * k, 0.02, 0.998);
// 极亮/极暗处 tint 递减，让近白/近黑仍像 宣纸/墨，只留一缕锚色呼吸。
const taperOf = L => L > 0.85 ? Math.max(0.5, (1 - L) / 0.15)
                   : L < 0.25 ? Math.max(0.7, L / 0.25) : 1;

/* 多来源候选池的确定性去重：先出现者优先（SPEC R9）。 */
function dedupeFirstWins(list) {
  const seen = new Set(), out = [];
  for (const r of list) { if (r && !seen.has(r.id)) { seen.add(r.id); out.push(r); } }
  return out;
}
/* 最小值选取，并列时按 rec.id 升序（SPEC R9）。 */
function argminById(arr, score) {
  let best = null, bestScore = Infinity;
  for (const r of arr) {
    const s = score(r);
    if (s < bestScore - 1e-12) { best = r; bestScore = s; }
    else if (s <= bestScore + 1e-12 && best && r.id < best.id) { best = r; bestScore = s; }
  }
  return best;
}
/* 中位数取法写死（SPEC R9）：升序后取 v[floor(n/2)]。 */
const medianOf = nums => { const v = [...nums].sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };

/* ── 3. 基准中性梯的 OKLab 明度表 ──
 * 硬编码自 research-tokens.md 静态梯解析表（harness-ref/design-platform.css）：
 * neutral-bluish：00 #ffffff · 50 rgb(249,250,251) · 60 rgb(245,246,247) ·
 *   75 rgb(241,243,245) · 100 rgb(235,238,242) · 150 rgb(233,236,242) ·
 *   200 rgb(225,229,238) · 300 rgb(207,211,214) · 400 rgb(173,178,184) ·
 *   500 rgb(151,157,166) · 600 rgb(129,133,140) · 700 rgb(97,102,107) ·
 *   750 rgb(67,69,74) · 800 rgb(53,54,56) · 850 rgb(44,44,46) ·
 *   875 rgb(35,35,36) · 900 rgb(27,27,28) · 950 rgb(21,21,23) · 1000 rgb(15,17,21)
 * neutral（滚动条/多选用的纯灰梯）：200 rgb(229,229,229) · 300 rgb(212,212,212) ·
 *   550 rgb(101,103,107) · 600 rgb(84,85,87) · 700 rgb(60,60,61) · 850 rgb(33,33,35) */
const NB_HEX = {
  0: '#ffffff', 50: '#f9fafb', 60: '#f5f6f7', 75: '#f1f3f5', 100: '#ebeef2',
  150: '#e9ecf2', 200: '#e1e5ee', 300: '#cfd3d6', 400: '#adb2b8', 500: '#979da6',
  600: '#81858c', 700: '#61666b', 750: '#43454a', 800: '#353638', 850: '#2c2c2e',
  875: '#232324', 900: '#1b1b1c', 950: '#151517', 1000: '#0f1115',
};
const NG_HEX = { 200: '#e5e5e5', 300: '#d4d4d4', 550: '#65676b', 600: '#545557', 700: '#3c3c3d', 850: '#212123' };
/* 焦点必须是全场最艳的一块 —— 这条不变量保留，但比例按新律重定。
 * 1.6 是为「异色印」标定的：焦点与帘相距 109°，只能靠彩度差压场。
 * 一色到底后两者同色相，焦点靠的是「深而密」压「淡而薄」，分离主要来自明度；
 * 对灰调锚色，压深本身就丢彩度，1.6 在数学上不可达（石绿、橄榄绿等整锚出局）。
 * 1.35 仍保证焦点严格最艳，且不再因锚色偏灰就把它逐出名册。 */
const FOCUS_C_RATIO = 1.35;
const NB_L = Object.fromEntries(Object.entries(NB_HEX).map(([k, h]) => [k, hexOklab(h).L]));
const NG_L = Object.fromEntries(Object.entries(NG_HEX).map(([k, h]) => [k, hexOklab(h).L]));

/* ── 4. 性格家族：4 个「纸的材料」（SPEC §5）──
 * 家族**只决定纸的材料与闸门**，不承担区分性格的责任。
 * 性格的真正承重点 = 每套主题自己的那枚印（sealOf）+ 族内状态色（stateOf）。
 * 命名不用节气（SPEC D4）：「藤黄=立秋」印到界面上会立刻暴露「所有黄都是秋」
 * 的色相分区真相；材料是我们为这个锚色**选**的配伍，不是对颜色的物候断言。
 * 4 × 9 = 36 个数，替代原提案 8 × 7 = 56（省下的复杂度预算全投给逐锚级的印）。 */
const FAMILIES = {
  // key      色相区        baseTint(淡/浓)   paperHue/Alt/paperP    veil   paperCap veilCap step  bgL    sealHue/MaxD
  素绢: { hueLo: 110, hueHi: 200, baseTint: [0.015, 0.019], paperHue: 130, paperHueAlt: 250, paperP: 0.0055, veil: 0.052, paperCap: 0.036, veilCap: 0.086, step: 0.90, bgL: 0.970, sealHue: 28,  sealMaxD: 55, note: '青绿素绢' },
  雪青: { hueLo: 200, hueHi: 340, baseTint: [0.024, 0.029], paperHue: 262, paperHueAlt: 300, paperP: 0.0080, veil: 0.058, paperCap: 0.034, veilCap: 0.078, step: 1.18, bgL: 0.970, sealHue: 28,  sealMaxD: 55, note: '雪青绢' },
  赭纸: { hueLo:  60, hueHi: 110, baseTint: [0.038, 0.044], paperHue:  48, paperHueAlt:  20, paperP: 0.0095, veil: 0.056, paperCap: 0.040, veilCap: 0.092, step: 1.05, bgL: 0.966, sealHue: 240, sealMaxD: 70, note: '陈宣赭纸' },
  // 熟宣（朱赤，340–60°）是最大的一组：纸相定在 70°（与锚色拉开 ≥28°），
  // 否则底/帘/印全是同一个红 —— 这是「单色浸染」最大的复发路径（SPEC R7）。
  熟宣: { hueLo: 340, hueHi:  60, baseTint: [0.034, 0.039], paperHue:  70, paperHueAlt:  45, paperP: 0.0090, veil: 0.058, paperCap: 0.042, veilCap: 0.095, step: 1.00, bgL: 0.966, sealHue: 8,   sealMaxD: 40, note: '熟宣' },
};
Object.entries(FAMILIES).forEach(([k, f]) => { f.key = k; });

/* 4 族，按 OKLab 色相分区（SPEC §3.9）。 */
function materialOf(hex) {
  const h = hueOf(hex);
  if (h >= 110 && h < 200) return '素绢';   // 青绿 → 青绿素绢（竹青 158.8）
  if (h >= 200 && h < 340) return '雪青';   // 蓝紫 → 雪青绢（群青 246.6）
  if (h >= 60  && h < 110) return '赭纸';   // 金褐黄 → 陈宣赭纸（藤黄 92.4）
  return '熟宣';                             // 朱赤 340–360 ∪ 0–60（胭脂红 31.6）
}
/* 族内浓淡二档的判据。**只**用于族内 baseTint/step 各差一档，
 * 不对外命名、预览页不分组（SPEC R8）——单独看一套时不可辨的差别，
 * 写出来只会变成扣分项。 */
const ripeOf = hex => { const o = hexOklab(hex); return 0.55 * (1 - o.L) + 0.45 * Math.min(1, Math.hypot(o.a, o.b) / 0.30); };

/* 共线兜底（SPEC §3.3 / R6）。
 * 实测 paper↔veil 色相角差 min 0.4°/median 13.8°：当锚色色相 ≈ 纸色色相时向量共线，
 * 相加只改模长不改方向 ——「材料身份」在那时消失。原提案称此为「双重层次」，数学上错误。
 * 本实现的立场：层次的可靠来源 = 明度台阶 + 彩度模长差 + 气泡纯锚色 + 印；
 * 色相差是加分项，不是地基。共线时做确定性旋转，把加分项抢救回来。 */
function resolvePaperHue(aHue, fam) {
  if (hueDist(aHue, fam.paperHue) >= 12) return fam.paperHue;
  return fam.paperHueAlt;
}

/* ── 5. 印色白名单（SPEC §3.4 / D6 / R7）──
 * 白名单从「风险缓解」升级为**主路径**：纯算法取 temperatureContrast[0] 会产出
 * 「青绿→菜头紫」这类非文化命名，白名单封堵。名单里的每个名字都在 742 色库中实存。 */
const ZHU_SEALS = [ // 朱文印 / 丹章：青绿与蓝紫的纸配暖印
  '朱红', '朱砂红', '茜红', '茜色', '胭脂红', '银朱', '大红', '鹤顶红',
  '枫叶红', '高粱红', '朱墙', '苋菜红', '赭石', '殷红', '枣红',
  '丽春红', '樱桃红', '猩红', '枫丹', '唐菖蒲红',
];
const SEAL_WHITELIST = {
  素绢: new Set(ZHU_SEALS),
  雪青: new Set(ZHU_SEALS),
  // 熟宣：印指向**同族更深的朱/檀/绛**，靠深浅而非色相成立焦点（SPEC R7 封堵
  // 原提案「夏族 → 印=锚色本人」，那会让 46% 的锚根本没有第二个色相）。
  熟宣: new Set([
    '茜红', '猩红', '尖晶玉红', '朱墙', '枫叶红', '高粱红', '苋菜红', '覆盆子红',
    '殷红', '枣红', '绛紫', '玫瑰紫', '苋菜紫', '锦葵红', '霜叶红', '赭石',
    '绯红', '品红', '鹅冠红', '朱砂红',
  ]),
  // 赭纸：金地配石青章
  赭纸: new Set([
    '石青', '苍碧', '绀青', '群青', '靛青', '靛蓝', '景泰蓝', '宝蓝', '瑶碧',
    '花青', '柏林蓝', '霁蓝', '品蓝', '天蓝', '飞燕草蓝', '孔雀蓝', '钴蓝',
    '釉蓝', '海涛蓝', '满天星紫',
  ]),
};

/* ── 6. 全局状态色兜底池（SPEC §3.10）──
 * 保留但改名 GLOBAL_*：**仅当族内无候选时使用**。实测命中 0 次 —— 是死代码，
 * 日志必打它的命中次数，让「死」这件事可见（不许当保险用）。
 * score = hueDist(h, TARGET) + |L−0.58|·30 + (C<0.09 ? 50 : 0)，限 hueDist < 40。 */
function statePick(targetHue) {
  let best = null, bestScore = Infinity;
  for (const rec of ALL()) {
    const o = hexOklab(rec.hex), C = Math.hypot(o.a, o.b);
    const hd = hueDist(hueOf(rec.hex), targetHue);
    if (hd >= 40) continue;
    const score = hd + Math.abs(o.L - 0.58) * 30 + (C < 0.09 ? 50 : 0);
    if (score < bestScore) { bestScore = score; best = rec; }
  }
  return best;
}
const GLOBAL_ERR = statePick(27);   // 期望 朱红/殷红 一族
const GLOBAL_SUC = statePick(145);  // 期望 葱倩/竹青 一族
const GLOBAL_WRN = statePick(80);   // 期望 藤黄/雌黄 一族
const globalHits = { err: 0, suc: 0, wrn: 0 };

/* 族内就近取状态色（SPEC §3.5 / R2）。
 * 评分目标是「按模式的可读 L」而非「好看的 0.60」：否则实测 370/407 的族内绿
 * 达不到 4.5，九成主题的状态色会被 ensure 压回「深绿/深红」，立意在 WCAG 关卡后蒸发。 */
const READABLE_L = { light: 0.52, dark: 0.74 };
const STATE_KEYS = ['same', 'analogous', 'splitComplementary', 'triadic', 'tetradic',
                    'temperatureContrast', 'accent', 'darker', 'lighter'];
function stateOf(rec, targetHue, maxd, excludeIds, mode) {
  const pool = dedupeFirstWins(STATE_KEYS.flatMap(k => (rec[k] || []).map(REC).filter(Boolean)))
                 .filter(r => !excludeIds.has(r.id));      // 印色占用者不得复用
  const cands = pool.filter(r => hueDist(hueOf(r.hex), targetHue) <= maxd);
  return argminById(cands, r =>
      hueDist(hueOf(r.hex), targetHue)
    + Math.max(0, 0.15 - chromaOf(r.hex)) * 300
    + Math.abs(Lof(r.hex) - READABLE_L[mode]) * 25);
}

/* 印（SPEC §3.4）：白名单 ∩ 关系集 → 全关系集 → 同族深印。 */
/* 印的候选关系键分两套 —— 这是实测逼出来的修正（见报告的偏离说明）：
 * 其余三族的印是**色相对冲**，用冷暖/互补/三分键；
 * 熟宣族的印按 §3.4 是「同族更深的朱/檀/绛」、明说「靠深浅而非色相成立焦点」，
 * 而红锚的冷暖/互补/三分关系里**全是冷色**（实测 13 个候选无一落在 sealHue 8±40），
 * 所以它的池必须含同族键 darker/same，否则 ① ② 恒空、全族只能落到 ③ 同族深印。
 * darker 放最前：印要的就是同族里更深的那一枚。 */
const SEAL_REL_KEYS = ['temperatureContrast', 'accent', 'splitComplementary', 'complementary', 'triadic'];
const SEAL_REL_KEYS_WARM = ['darker', 'same', 'temperatureContrast', 'accent', 'splitComplementary'];
const sealKeysFor = fam => (fam.key === '熟宣' ? SEAL_REL_KEYS_WARM : SEAL_REL_KEYS);
/* minSealC 是「唯一焦点」锁 2 的可测形式（SPEC §4.3 / §7.2 不变量 2）：
 * 印色彩度必须 ≥ 最大面彩度 × 1.6。它是**加严**的候选门槛 —— 少了它，高彩锚
 * （藤黄 C=0.177 → 帘的彩度下限 0.084）会挑到一枚比自己的气泡还淡的印，
 * 「屏上最艳的一块是主按钮」就变成了修辞。③ 同族深印恒满足（0.76×C(锚)）。 */
function sealOf(rec, fam, minSealC) {
  const keys = sealKeysFor(fam);
  const pool = dedupeFirstWins(keys.flatMap(k => (rec[k] || []).map(REC).filter(Boolean)))
                 .filter(r => r.id !== rec.id);   // 印永不是锚色本人（互斥律）
  const wl = SEAL_WHITELIST[fam.key];
  // 低彩惩罚：印必须浓，不能是褐灰。
  const score = r => hueDist(hueOf(r.hex), fam.sealHue) + Math.max(0, 0.17 - chromaOf(r.hex)) * 260;
  const gate  = r => hueDist(hueOf(r.hex), fam.sealHue) <= fam.sealMaxD && chromaOf(r.hex) >= minSealC;

  let pick = argminById(pool.filter(r => wl.has(r.name) && gate(r)), score);   // ① 白名单 ∩ 关系集
  if (pick) return { rec: pick, hex: pick.hex, name: pick.name, why: '策展印', rel: relKeyOf(rec, pick.id, keys), degraded: false };
  pick = argminById(pool.filter(gate), score);                                  // ② 全关系集
  if (pick) return { rec: pick, hex: pick.hex, name: pick.name, why: '关系集印', rel: relKeyOf(rec, pick.id, keys), degraded: false };
  // ③ 同族深印：锚色本人压深，靠深浅而非色相成立焦点。
  return { rec, hex: atL(rec.hex, 0.42), name: rec.name + '·深', why: '同族深印', rel: 'self', degraded: true };
}
/* 印色来自哪个关系键（预览页 provenance 用，SPEC §8.5）。 */
function relKeyOf(rec, id, keys) {
  for (const k of keys) { const i = (rec[k] || []).indexOf(id); if (i >= 0) return `${k}[${i}]`; }
  return '?';
}

/* 链接梯基色（SPEC §3.6）。accent 现已归印色专用，链接改从 analogous 取，
 * 避免链接与印抢同一族。熟宣族例外：强制 temperatureContrast（冷点纪律，R7），
 * 保证屏上必有一个冷点。 */
function linkOf(rec, fam) {
  const order = fam.key === '熟宣'
    ? ['temperatureContrast', 'analogous', 'splitComplementary']
    : ['analogous', 'splitComplementary', 'temperatureContrast'];
  for (const k of order) for (const id of rec[k] || []) {
    if (id !== rec.id && REC(id)) return REC(id).hex;
  }
  return rec.hex;
}

/* ── 7. 锚色遴选（DESIGN §1.1 + SPEC §3.11）── */
const CURATED = ['竹青', '朱红', '群青', '藤黄', '黛蓝', '胭脂红', '天青', '茜色', '黛紫', '绛紫'];
const annotated = ALL().map(rec => {
  const o = hexOklab(rec.hex);
  return { rec, L: o.L, a: o.a, b: o.b, C: Math.hypot(o.a, o.b), h: hueOf(rec.hex), fam: materialOf(rec.hex) };
});
const eligible = annotated.filter(x => x.C >= 0.07 && x.L >= 0.35 && x.L <= 0.88);
const byName = new Map(eligible.map(x => [x.rec.name, x]));
const curatedPicks = CURATED.map(n => byName.get(n)).filter(Boolean); // 名字缺失则静默跳过
/* SPEC §3.11：把 CURATED 里因 C<0.07 被静默丢掉的名字打出来（实测 黛蓝 C=0.0607
 * 从未入选，README 若提到它是错的）——不藏。 */
const curatedRejected = CURATED.filter(n => !byName.has(n)).map(n => {
  const x = annotated.find(y => y.rec.name === n);
  return x ? `${n}(C=${x.C.toFixed(4)}, L=${x.L.toFixed(3)})` : `${n}(不在色库)`;
});
const curatedIds = new Set(curatedPicks.map(x => x.rec.id));
const rest = eligible.filter(x => !curatedIds.has(x.rec.id))
  .sort((p, q) => q.C - p.C || (p.rec.id < q.rec.id ? -1 : 1)); // C 降序，id 升序打破并列（确定性）
const queue = [...curatedPicks, ...rest];

/* 「雪青」（蓝紫）在色库里最多，若不设上限会占掉小半个 roster；「赭纸」（金褐黄）
 * 最少，需要保底席位。方向与原提案相反：**秋保底、冬设上限**（SPEC R3）。
 * 季配额（按季限 40%）**不实现**：实测入选锚分布无一族触线，是伪需求。 */
const CAP_FAM = '雪青', CAP_SHARE = 0.36, FLOOR_MIN = 6, FLOOR_SEATS = 2, FLOOR_RELAX = 0.92;

function distinctOK(cand, accepted, dEmin) {
  for (const acc of accepted) {
    const dE = Math.hypot(cand.L - acc.L, cand.a - acc.a, cand.b - acc.b);
    const hueOK = hueDist(cand.h, acc.h) >= 9 || Math.abs(cand.L - acc.L) >= 0.10;
    if (dE < dEmin || !hueOK) return false;
  }
  return true;
}
function selectAnchors(dEmin) {
  const accepted = [];
  const deferred = [];
  let capCount = 0;
  // 第一轮：上限族超额的候选**延后**到队列末尾（不丢弃）。
  for (const cand of queue) {
    if (accepted.length >= 100) break; // 上限 100 锚
    if (cand.fam === CAP_FAM && capCount + 1 > CAP_SHARE * (accepted.length + 1)) { deferred.push(cand); continue; }
    if (!distinctOK(cand, accepted, dEmin)) continue;
    accepted.push(cand);
    if (cand.fam === CAP_FAM) capCount++;
  }
  // 第二轮：延后队列按原顺序再试一次（此时 accepted 已够大，份额自然放开）。
  for (const cand of deferred) {
    if (accepted.length >= 100) break;
    if (capCount + 1 > CAP_SHARE * (accepted.length + 1)) continue;
    if (!distinctOK(cand, accepted, dEmin)) continue;
    accepted.push(cand); capCount++;
  }
  // 第三轮：族保底。某族入选 < FLOOR_MIN 时给该族 FLOOR_SEATS 个席位，
  // dE 门槛对该族放宽到 dEmin × 0.92（仍确定性、仍不放宽任何 WCAG 阈值）。
  for (const famKey of Object.keys(FAMILIES)) {
    if (famKey === CAP_FAM) continue;
    let have = accepted.filter(x => x.fam === famKey).length;
    if (have >= FLOOR_MIN) continue;
    let seats = FLOOR_SEATS;
    for (const cand of queue) {
      if (seats <= 0) break;
      if (cand.fam !== famKey || accepted.includes(cand)) continue;
      if (!distinctOK(cand, accepted, dEmin * FLOOR_RELAX)) continue;
      accepted.push(cand); seats--;
    }
  }
  return accepted;
}
let DE_MIN = 0.055;
let anchors = selectAnchors(DE_MIN);
if (anchors.length < 40) { DE_MIN = 0.045; anchors = selectAnchors(DE_MIN); console.log(`[fallback] dE 阈值降到 ${DE_MIN}`); }

/* 族内浓淡二档的阈值 = 该族入选锚 ripe 的中位数，取法写死 v[floor(n/2)]（R9）。 */
const RIPE_MED = {};
for (const famKey of Object.keys(FAMILIES)) {
  const rs = anchors.filter(x => x.fam === famKey).map(x => ripeOf(x.rec.hex));
  RIPE_MED[famKey] = rs.length ? medianOf(rs) : 0.5;
}
/* 取回该锚的家族参数（含浓淡档）。SPEC §5.1 要求 baseTint/step 各差一档；
 * §5.2 表只给了单个 step 值，浓档的 step 用 +0.04 一档（见报告的偏离说明）。 */
function famOf(hex) {
  const base = FAMILIES[materialOf(hex)];
  const ripeHi = ripeOf(hex) >= RIPE_MED[base.key];
  return { ...base, baseTint: base.baseTint[ripeHi ? 1 : 0], step: base.step + (ripeHi ? 0.04 : 0), ripeHi };
}

/* ── 8. 命名与 id（pinyin-pro 仅生成期使用，不进客户端包）── */
// ü → v（绿 lü → lv，惯用拉丁化），再剥掉其余非 ascii 字母
const toPinyin = name => pinyin(name, { toneType: 'none', separator: '' }).toLowerCase().replace(/ü/g, 'v').replace(/[^a-z]/g, '');
const seenPy = new Map();
function idBase(rec) {
  let py = toPinyin(rec.name);
  if (!py) return `se${rec.id}`;
  if (seenPy.has(py)) py = `${py}-${rec.id}`; // 同音碰撞：后来者插入记录 id
  else seenPy.set(py, rec.id);
  return py;
}

/* ── 9. 单主题 token 映射（SPEC §2 的 89/89 词表）── */
const P = k => `--dsw-alias-${k}`;
const S = k => `--dsw-specific-${k}`;

/* BASELINE_VEIL_C —— 冻结的现状基线彩度（SPEC §3.2）。
 * 旧 tinted()/atL() 公式在同一批 veil 调用点上的求值结果，在删除 tinted() 的
 * 同一 commit 里冻结成字面量，否则基线会随代码漂移。
 *   亮：sidebar tinted(0.958,.05)·taper .5 = .0250 / hover tinted(.930,.05)·.5 = .0250
 *       active tinted(.905,.055)·.633 = .0348 / bubble atL(anchor,.955,.5) = .5·C(anchor)
 *       highlight atL(anchor,.90,.55) = .55·C(anchor)
 *   暗：sidebar tinted(NB900,.05)·.864 = .0432 / hover tinted(NB850,.05)·1 = .0500
 *       active tinted(NB750,.055)·1 = .0550 / bubble = .0550 / highlight = .0550 */
const BASELINE_VEIL_C = {
  light: { sidebar: 0.0250, hover: 0.0250, active: 0.0348, bubble: null, highlight: null },
  dark:  { sidebar: 0.0432, hover: 0.0500, active: 0.0550, bubble: 0.0550, highlight: 0.0550 },
};
const BASELINE_ANCHOR_K = { bubble: 0.50, highlight: 0.55 }; // 亮模式基线正比于锚色彩度

function buildTheme(anchorRec, mode) {
  const aHue = hueOf(anchorRec.hex);
  const fam = famOf(anchorRec.hex);
  const paperHueResolved = resolvePaperHue(aHue, fam);
  const anchorC = chromaOf(anchorRec.hex);
  const nudged = [];    // 算法微调（ensure 推了一下，设计意图仍在）
  const degraded = [];  // **放弃了设计意图**
  const ens = (hex, bg, target, tag) => {
    const r = ensure(hex, bg, target);
    if (r.nudged) nudged.push(tag);
    return r.hex;
  };

  /* ── 层A 取色器：纸 ──
   * 锚色微染中性 + 纸色向量，彩度过 paperCap 硬闸。这是 60% 的面积，
   * 「不是把传统色调浅，是另换一种材料」。 */
  function paper(L, { tint = fam.baseTint, useP = 1 } = {}) {
    const taper = taperOf(L);
    const t = tint * taper, p = fam.paperP * useP * taper;
    let a = t * Math.cos(rad(aHue)) + p * Math.cos(rad(paperHueResolved));
    let b = t * Math.sin(rad(aHue)) + p * Math.sin(rad(paperHueResolved));
    const C = Math.hypot(a, b);
    if (C > fam.paperCap) { const k = fam.paperCap / C; a *= k; b *= k; }
    return oklabHex({ L, a, b });
  }
  /* ── 层B 取色器：帘 ──
   * 与 paper() 同构，唯一区别是闸门：veilCap（≈ paperCap 的 2.3–2.4×），
   * **不受 paperCap**（SPEC R1）。若 veil 走 paperCap，bubble 的彩度会被钳到
   * 比现状淡 37–55%——「为了修锚色身份不明显，把最抢眼的表面做得比今天淡一半」，
   * 方案自毁。floorC 是彩度硬下限：帘永不比现状基线更淡。 */
  function veil(L, { tint, useP = 0, floorC = 0 } = {}) {
    const taper = taperOf(L);
    let a = tint * taper * Math.cos(rad(aHue)) + fam.paperP * useP * taper * Math.cos(rad(paperHueResolved));
    let b = tint * taper * Math.sin(rad(aHue)) + fam.paperP * useP * taper * Math.sin(rad(paperHueResolved));
    let C = Math.hypot(a, b);
    if (C > fam.veilCap) { const k = fam.veilCap / C; a *= k; b *= k; C = fam.veilCap; }
    if (floorC > C) { const k = floorC / Math.max(C, 1e-6); a *= k; b *= k; }
    return oklabHex({ L, a, b });
  }
  /* 近白/近黑处 gamut 会把帘的彩度截掉。沿 L 朝能容纳更高彩度的方向确定性地走
   * （亮模式向下、暗模式向上），直到拿到下限或走完 12 步 —— 保彩度优先、明度让步
   * （SPEC §6#17②）。 */
  function veilAtFloor(L0, opts, floorC, dir) {
    let best = veil(L0, { ...opts, floorC });
    if (chromaOf(best) >= floorC - 1e-9) return best;
    for (let i = 1; i <= 12; i++) {
      const hex = veil(clamp(L0 + dir * 0.006 * i, 0.02, 0.998), { ...opts, floorC });
      if (chromaOf(hex) > chromaOf(best)) best = hex;
      if (chromaOf(hex) >= floorC - 1e-9) return hex;
    }
    return best;
  }
  const ink = L => paper(L, { tint: fam.baseTint * 0.6 });                 // 墨梯
  const N  = step => paper(scaleL(NB_L[step], fam.step));                  // 纸上的中性梯
  const NG = step => paper(NG_L[step], { tint: fam.baseTint * 0.25 });     // 纯灰梯（滚动条）
  const MD = step => paper(NB_L[step], { tint: fam.baseTint * 0.9 });      // markdown 面
  const B  = key => BASELINE_VEIL_C[mode][key] ?? (BASELINE_ANCHOR_K[key] * anchorC);
  const T = {};

  /* §6 总原则①「先动表面，后动文字」的通用形式：文字一旦定住就不再动，
   * 否则整套墨梯漂移。每步 0.008，最多 6 步（亮模式抬亮、暗模式压深）。 */
  const surfDir = mode === 'light' ? 1 : -1;
  function fitSurface(surf, fg, target) {
    for (let i = 0; i < 6 && contrast(fg, surf) < target; i++)
      surf = atL(surf, clamp(Lof(surf) + surfDir * 0.008, 0.02, 0.995));
    return surf;
  }
  /* fitSurface 的对偶：对比度**超过上限**时，把文字拉回背景一侧。
   *
   * 为什么需要它：ens() 只会把文字推离背景，永不拉近。于是暗模式从基准中性梯
   * 继承来的次级/三级会一路顶到 12.3 / 8.7，而亮模式是 6.6 / 4.9 —— 同一层级
   * 在两种模式下重量完全不同，用户切一次深浅就等于换了一套信息层级。
   * AA 是地板，不是天花板；两条墨阶要收敛成同一形状，就必须有天花板。
   * 方向自行判断，免得调用方传反。 */
  function fitBand(fg, bg, ceil) {
    const toward = Lof(fg) > Lof(bg) ? -0.004 : 0.004;
    for (let i = 0; i < 60 && contrast(fg, bg) > ceil; i++)
      fg = atL(fg, clamp(Lof(fg) + toward, 0.02, 0.995));
    return fg;
  }
  /* 印的彩度门槛取**两模式实测**的最大面彩度，而不是取彩度下限的名义值：
   * 亮模式的帘在近白处会被 gamut 截彩，用名义值会把门槛定得虚高，反而把大批
   * 主题推去 ③ 同族深印（实测 37.5% 降级，远超 §9 给的 15% 容限）。
   * 这段预演与亮模式分支同式 —— 输入全是 fam/aHue/anchorC，与 mode 无关，
   * 所以两支拿到的是同一枚印：印色的色名是这套主题的身份，不该随明暗换人。 */
  const bgLightRef = paper(fam.bgL);
  const fgLightRef = ensure(ink(NB_L[1000]), bgLightRef, 4.5).hex;
  let bubLightRef = veilAtFloor(0.955, { useP: 0, tint: fam.veil * 1.25 },
    Math.max(0.045, 0.95 * BASELINE_ANCHOR_K.bubble * anchorC), -1);
  for (let i = 0; i < 6 && contrast(fgLightRef, bubLightRef) < 4.5; i++)
    bubLightRef = atL(bubLightRef, Math.min(0.995, Lof(bubLightRef) + 0.008));
  const minSealC = FOCUS_C_RATIO * Math.max(fam.paperCap, chromaOf(bubLightRef),
    0.95 * BASELINE_VEIL_C.dark.bubble, 0.95 * BASELINE_VEIL_C.dark.sidebar);
  const SEAL = sealOf(anchorRec, fam, minSealC);
  if (SEAL.degraded) degraded.push('seal');
  const LINK = linkOf(anchorRec, fam);
  const excl = new Set([SEAL.rec.id]);   // CTA 与 error 不许同色，否则语义崩
  const ERRr = stateOf(anchorRec, 27,  55, excl, mode) || (globalHits.err++, GLOBAL_ERR);
  const SUCr = stateOf(anchorRec, 145, 55, excl, mode) || (globalHits.suc++, GLOBAL_SUC);
  const WRNr = stateOf(anchorRec, 80,  55, excl, mode) || (globalHits.wrn++, GLOBAL_WRN);

  /* 印上的字：白/墨择优 → 印色 L 每步位移、每步重择前景 → 放弃印色概念保住可读
   * （SPEC §6#5，工程评审评为「全案兜底写得最好的一处」，原样保留）。 */
  function sealFill(sealHex, WHITE, INK) {
    let L = mode === 'light' ? Math.min(Lof(sealHex), 0.56) : Math.max(Lof(sealHex), 0.58);
    for (let i = 0; i <= 12; i++) {
      const fill = atL(sealHex, L);                       // 保原彩度：印不过闸门
      const fg0  = contrast(WHITE, fill) >= contrast(INK, fill) ? WHITE : INK;
      if (contrast(fg0, fill) >= 4.5) return { fill, fg: fg0, degraded: false };
      L = clamp(L + (mode === 'light' ? -0.03 : 0.03), 0.02, 0.998);
    }
    const fb = atL(anchorRec.hex, 0.42);                  // 放弃印色概念，保住可读
    const fg = contrast(WHITE, fb) >= contrast(INK, fb) ? WHITE : INK;
    return { fill: fb, fg, degraded: true };
  }

  /* §4.3 锁 2 的落地：印是全主题**唯一**不受任何闸门钳制的实心面，所以
   * 「屏上最艳的一块只有主按钮」这条不变量该由**提印的彩度**来满足，
   * 而不是靠降帘的彩度 —— 后者会撞 R1 的硬下限（帘永不比现状更淡）。
   * gamut 在极端 L 上会把印的彩度截掉，这一步把截掉的补回来；
   * 若提彩反而破了印上的字，宁可放弃提彩、保住可读。 */
  function sealBoost(SF, cBig, WHITE, INK) {
    const need = FOCUS_C_RATIO * cBig;
    if (chromaOf(SF.fill) >= need) return SF;
    const fill = boostChroma(SF.fill, need).hex;
    const fg = contrast(WHITE, fill) >= contrast(INK, fill) ? WHITE : INK;
    if (contrast(fg, fill) < 4.5) return SF;
    return { fill, fg, degraded: SF.degraded };
  }

  /* 主按钮 hover：不换色相，只动明度 —— 但**方向必须背离按钮上的字**。
   *
   * 原实现两支各写死一个方向（亮 +0.06、暗 -0.06），破了 4.5 就减半、再破就
   * 取 0（等于没有 hover）。方向本身是反的：亮模式的按钮是深底白字，往浅里走
   * 正是在压垮白字，于是大量主题退化成「无反馈」—— 改造前已有 31/96 中招，
   * 换成锚色驱动后升到 52/98。按钮是主 CTA，没有 hover 是实打实的可用性缺陷。
   *
   * 现在先朝背离前景的方向试，再试反向，各留一个半步；全都不行才退回无变化。 */
  function hoverOf(SF) {
    const away = Lof(SF.fg) > Lof(SF.fill) ? -1 : 1;   // 字比底亮 → 底往更暗走
    for (const d of [0.06 * away, 0.03 * away, -0.06 * away, -0.03 * away]) {
      const cand = atL(SF.fill, clamp(Lof(SF.fill) + d, 0.02, 0.998));
      if (contrast(SF.fg, cand) >= 4.5 && cand !== SF.fill) return cand;
    }
    return SF.fill;   // 兜底：hover 改由边框表达
  }

  /* 书写顺序硬性为 BG → INK → FG → BRAND → SEAL → STATE
   * （harmony-usage `curated.rationale`：「先定底色和文字，再用印色承担行动入口」）。 */
  if (mode === 'light') {
    /* ═══ BG ── 层A · 纸（60% 面积，paperCap 钳死） ═══ */
    const BG = paper(fam.bgL);
    T[P('bg-base')] = rgbStr(BG);
    // 四层拆开是「层次的免费收益」；台阶相对纸基准向下沉，fam.step 缩放台阶幅度
    // （雪青 拉开 / 素绢 收拢）。不变量：L(layer-3) < L(layer-2) < L(layer-1) < L(bg-base)。
    const LAYER1 = paper(fam.bgL - 0.004 * fam.step);
    T[P('bg-layer-1')] = rgbStr(LAYER1);
    T[P('bg-layer-2')] = rgbStr(paper(fam.bgL - 0.010 * fam.step));
    T[P('bg-layer-3')] = rgbStr(paper(fam.bgL - 0.020 * fam.step));
    T[P('bg-overlay')] = rgbStr(N(150));
    T[P('bg-module-platform')] = rgbStr(N(60));
    T[P('bg-multi-select')] = rgbStr(N(60));
    T[S('input-major')] = rgbStr(N(0));
    T[S('login-input')] = rgbStr(N(50));
    T[S('selector')] = rgbStr(N(60));
    T[S('tip')] = rgbStr(N(60));
    T[S('menu')] = rgbStr(N(0)); // 显式复制 bg-layer-3 语义
    T[P('markdown-code-block')] = rgbStr(MD(50));
    T[P('markdown-code-block-banner')] = rgbStr(MD(50));
    T[P('markdown-inline-code')] = rgbStr(MD(100));
    T[P('markdown-citation')] = rgbStr(MD(100));
    T[P('markdown-tag')] = rgbStr(MD(75));
    T[P('markdown-placeholder')] = rgbStr(MD(60));
    T[P('markdown-code-segment-selected')] = rgbStr(MD(0));
    T[P('markdown-code-segment-unselected')] = rgbStr(MD(75));
    T[P('scrollbar-bg-l1')] = rgbStr(NG(200));
    T[P('scrollbar-bg-l2')] = rgbStr(NG(200));
    T[P('scrollbar-hover-l1')] = rgbStr(NG(300));
    T[P('scrollbar-hover-l2')] = rgbStr(NG(300));
    const TOAST = paper(NB_L[800], { tint: fam.baseTint * 0.7 });   // 反色浮层，染更淡
    const TIP   = paper(NB_L[850], { tint: fam.baseTint * 0.7 });
    T[P('toast-bg')] = rgbStr(TOAST);
    T[P('tooltip-bg')] = rgbStr(TIP);
    T[P('button-ghost-active-fill')] = rgbStr(N(100));
    T[P('button-ghost-active-hover')] = rgbStr(N(150));
    T[P('button-ghost-active-border')] = rgbStr(N(500));
    T[P('button-elevated-fill')] = rgbStr(N(0));
    T[P('button-floating-fill')] = rgbStr(N(0));
    T[P('button-floating-hover')] = rgbStr(N(75));
    T[P('interactive-bg-hover-solid')] = rgbStr(N(75));

    /* ═══ INK ── 层C · 墨与线（alpha 一律不进家族参数表：alpha 是可读性与
     * 深度的语义，与材质气质无关。参数化它们会导致「某个族的边框忽然看不见」） ═══ */
    const inkDark = ink(0.175);
    // border-l1 承担 bubble 与纸的可见边界：原 0.04 在 L0.99 的纸上近不可见（SPEC R5）。
    T[P('border-l1')] = rgbaStr(inkDark, 0.09);
    T[P('border-l2')] = rgbaStr(inkDark, 0.1);
    T[P('border-l2-darkmode-thin')] = rgbaStr(inkDark, 0.1);
    T[P('border-l3')] = rgbaStr(inkDark, 0.12);
    T[P('border-l4')] = rgbaStr(inkDark, 0.16);
    T[P('border-inverted')] = rgbaStr(inkDark, 0);      // 透明，对齐基准
    T[P('border-inverted2')] = rgbaStr(inkDark, 0);
    T[P('interactive-bg-hover')] = rgbaStr(inkDark, 0.06);
    T[P('interactive-bg-active')] = rgbaStr(inkDark, 0.1);
    T[P('interactive-bg-hover-accent')] = rgbaStr(inkDark, 0.14);
    T[P('bg-skeleton')] = rgbaStr(inkDark, 0.04);
    // 遮罩压在用户上传的照片上，染色 = 让照片偏色 → 纯黑，不染。
    // 「知道什么不该参数化，比知道什么该参数化更难。」
    T[P('bg-mask-1')] = 'rgba(0,0,0,0.24)';
    T[P('bg-mask-2')] = 'rgba(0,0,0,0.12)';
    T[P('bg-mask-3')] = 'rgba(0,0,0,0.48)';
    T[P('bg-mask-photo')] = 'rgba(0,0,0,0.88)';
    T[P('bg-mask-drop')] = rgbaStr(paper(0.99), 0.7);
    T[P('button-tool-bar-fill')] = rgbaStr(ink(0.34), 0.5);          // 浮在照片上，只染极微
    T[P('button-tool-bar-hover')] = rgbaStr(ink(0.34), 0.6);
    T[P('button-tool-bar-fill-invisible')] = rgbaStr(ink(0.2), 0.36);

    /* ═══ FG ① ── label-primary 先定住（§6#1）。一旦定住就不再动，
     * 否则整套墨梯漂移；后面所有表面都向它让步。 ═══ */
    // 亮模式正文封顶 17.6:1 —— 色库 --ink #111111 on --paper #f7f7f4 的实测值。
    // 近黑压纸是家法，保留；只是不该越过家法自己的端点。
    const FG = ens(fitBand(ink(NB_L[1000]), BG, 17.6), BG, 4.5, 'label-primary');
    T[P('label-primary')] = rgbStr(FG);

    /* ═══ 层B · 帘（25% 面积，独立 veilCap + 彩度硬下限） ═══
     * 层B 在写作顺序上归 BG（它是表面，不是字），但 §6#2 的兜底要读 FG
     * ——「动表面不动文字」这条纪律本身要求先有文字。故置于 FG ① 之后。 */
    /* 帘的明度一律写成**相对纸的偏移**，不再是绝对值。
     * 原先是硬编码的 0.958 / 0.930 / 0.905 / 0.955，全部以 bgL=0.988 为暗含前提；
     * 纸一降到 0.970，间距就从 0.030 塌到 0.012，侧栏在画布上直接消失（实测 1.03:1）。
     * 纸要可调，帘就必须跟着纸走。偏移量同时按目标区间放大：
     * 侧栏/纸 1.12–1.20，帘/纸 1.25–1.45。 */
    const DL = { sidebar: 0.052, hover: 0.082, active: 0.108, bubble: 0.090, bubHi: 0.125 };
    let sidebar = veil(fam.bgL - DL.sidebar, { useP: 0.25, tint: fam.veil, floorC: 0.95 * B('sidebar') });
    sidebar = fitSurface(sidebar, FG, 4.5);
    let navHover = veil(fam.bgL - DL.hover, { useP: 0.25, tint: fam.veil, floorC: 0.95 * B('hover') });
    let navActive = veil(fam.bgL - DL.active, { useP: 0.15, tint: fam.veil * 1.15, floorC: 0.95 * B('active') });
    navActive = fitSurface(navActive, FG, 4.5);
    // 气泡：全主题**唯一**一块纯锚色大面（useP = 0）。锚色身份靠气泡认，不靠背景认
    // —— 这是「克制」与「辨识度」的解耦。彩度硬下限保证它永不比现状更淡（R1）。
    /* 帘的彩度下限：尽可能厚，但**不厚过锚色所能支撑的限度**。
     * 0.045 的旧下限太淡（「靠气泡认出锚色」在实测里名存实亡）；但改成绝对的
     * 0.075 又会压垮灰调锚色 —— 焦点要稳压帘 1.6 倍，帘一旦到 0.075，
     * 彩度低于 0.12 的锚色就压不住自己的帘，整锚出局（传统色里灰调不在少数）。
     * 故取 min(0.075, anchorC / 1.75)：浓锚吃满 0.075，灰锚按自身比例收，两不相误。 */
    const bubFloor = Math.max(Math.min(0.075, anchorC / 1.75), 0.95 * B('bubble'));
    let bubble = veilAtFloor(fam.bgL - DL.bubble, { useP: 0, tint: fam.veil * 1.25 }, bubFloor, -1);
    bubble = fitSurface(bubble, FG, 4.5);       // §6#2：动表面不动文字
    // 与纸的可见边界：下限 1.25（原 1.04 等于「可以看不见」），上限 1.55。
    // 上限与 DL.bubble 是一对：参数扫描显示 (0.090, 1.55) 比原先的 (0.070, 1.45)
    // 三项全优 —— 名册 98→100、彩度触底 16→14、帘彩度中位微升。再往深走就亏了：
    // 帘一深，最大面彩度就涨，焦点的 FOCUS_C_RATIO 闸门会把大批锚色刷下去
    // （DL=0.150 时触底降到 2，但名册从 98 掉到 78 —— 拿 20 个锚换 4% 彩度，不划算）。
    for (let i = 0; i < 40 && contrast(bubble, BG) < 1.25; i++) bubble = atL(bubble, clamp(Lof(bubble) - 0.004, 0.02, 0.995));
    for (let i = 0; i < 40 && contrast(bubble, BG) > 1.55; i++) bubble = atL(bubble, clamp(Lof(bubble) + 0.004, 0.02, 0.995));
    if (chromaOf(bubble) < bubFloor - 1e-9) degraded.push('bubbleChroma');
    let bubHi = veilAtFloor(fam.bgL - DL.bubHi, { useP: 0, tint: fam.veil * 1.35 }, Math.max(Math.min(0.075, anchorC / 1.75), 0.95 * B('highlight')), -1);
    bubHi = fitSurface(bubHi, FG, 4.5);

    /* ═══ BRAND ── 层C 的 10%：锚色识别，**是线与字，不是面** ═══ */
    let PRIM = ens(anchorRec.hex, BG, 3.0, 'brand-primary');   // 组件级 3:1 下限
    // §6#8：brand-primary vs sidebar-fill 3.0 —— ① 先动表面（抬帘的 L），
    // ② 表面让到头才动 brand-primary 的 ens 目标。
    // 抬帘有个下界：侧栏一旦被抬到贴近纸，它在画布上就消失了（实测最低到 1.01:1，
    // 整个应用读起来是平的）。抬到 bgL-0.030 就停手，剩下的让 brand-primary 去让 ——
    // 「先动表面」的次序不变，只是表面让步现在有了尽头。
    const sidebarLCap = fam.bgL - 0.030;
    for (let i = 0; i < 6 && contrast(PRIM, sidebar) < 3.0 && Lof(sidebar) + 0.008 <= sidebarLCap; i++)
      sidebar = atL(sidebar, clamp(Lof(sidebar) + 0.008, 0.02, 0.995));
    if (contrast(PRIM, sidebar) < 3.0) PRIM = ens(PRIM, sidebar, 3.0, 'brand-primary(vs sidebar)');
    T[S('sidebar-fill')] = rgbStr(sidebar);
    /* 「新会话」是压在侧栏上的抬升面（button-elevated-fill）。它取中性、不取锚色是对的
     * —— 否则它会和发送键并列成两个抢焦点的彩色按钮。但它原先没有任何与侧栏的分离下限，
     * 实测最差只有 1.035:1，全靠 1px / 10% 的描边撑着，等于消失。抬升面必须真的抬起来。 */
    {
      let ev = parseRgb(T[P('button-elevated-fill')]);
      for (let i = 0; i < 14 && contrast(ev, sidebar) < 1.12; i++)
        ev = atL(ev, clamp(Lof(ev) + 0.006, 0.02, 0.998));
      T[P('button-elevated-fill')] = rgbStr(ev);
      T[P('button-floating-fill')] = rgbStr(ev);
    }
    T[S('sidebar-nav-item-hover')] = rgbStr(navHover);
    T[S('sidebar-nav-item-active')] = rgbStr(navActive);
    T[S('bubble')] = rgbStr(bubble);
    T[S('bubble-highlight')] = rgbStr(bubHi);

    /* ═══ FG ② ── 其余墨梯。§6#3：label-secondary 独立于 label-primary，
     * 可单独动 —— 对四个承载面里最难的那个逐一 ens（墨只会越推越深，单调收敛）。 ═══ */
    // 起点先压到 7.0（色库亮模式 --ink-soft 是 8.1，暗模式这一档收在 7.9–8.0）：
    // 次级要在两种模式里是同一个重量，否则「同形状」只是口号。
    let SEC = ens(ink(NB_L[700]), BG, 7.0, 'label-secondary');
    for (const s of [BG, LAYER1, bubble, sidebar]) SEC = ens(SEC, s, 4.5, 'label-secondary');
    T[P('label-secondary')] = rgbStr(SEC);
    // 三级承担代码注释（.ds-code .cm）与输入框占位（.ds-composer .ph）—— 都是要读的正文，
    // 非装饰、非禁用态，因此守 AA 4.5 而不是继承基准梯的 3.0。
    T[P('label-tertiary')] = rgbStr(ens(ink(NB_L[600]), BG, 4.5, 'label-tertiary'));
    T[P('label-caption')] = rgbStr(ink(NB_L[400]));   // 装饰性，无下限（对齐基准）
    T[P('label-dimmed')] = rgbStr(ink(NB_L[200]));
    T[P('label-primary-dimmed')] = rgbStr(ink(NB_L[950]));
    const INV0 = ens(N(0), TOAST, 4.5, 'label-primary-inverted');
    T[P('label-primary-inverted')] = rgbStr(ens(INV0, TIP, 4.5, 'label-primary-inverted(tooltip)'));

    T[P('brand-primary')] = T[P('brand-text')] = rgbStr(PRIM);
    // R4：原色由 brand-primary-invert 无损承载（不 ensure），保证原色至少露脸一次。
    T[P('brand-primary-invert')] = rgbStr(anchorRec.hex);
    T[P('label-primary-bluish')] = rgbStr(ens(atL(LINK, 0.34, 1.15), BG, 4.5, 'label-primary-bluish'));
    const LNK = ens(atL(LINK, 0.52), BG, 4.5, 'brand-new-color'); // 链接是文字 → 4.5
    T[P('brand-primary-new-colorprimary-new-color')] = rgbStr(LNK);
    /* 发送键走的是 button-info-fill，不是 button-primary-fill（实测：真实应用里
     * button-primary-fill 没有任何控件在用，preview/index.html 把发送键接到它上面
     * 是错的，「唯一焦点」这条不变量因此一直在校验一个看不见的按钮）。
     * 聊天应用里点得最多的就是发送 —— 它必须是锚色本人，否则粉色主题配一颗蓝键。
     * LINK 留给真正的链接文字与 business 状态，那里异色是对的。 */
    T[P('button-info-fill')] = rgbStr(ens(atL(anchorRec.hex, 0.55), BG, 3.0, 'button-info-fill'));
    T[P('button-info-hover')] = rgbStr(atL(anchorRec.hex, 0.45));
    /* state-business 跟锚色，不跟 LINK。
     *
     * 它画的是「预览版」这类徽章。判据是：颜色有没有在你读到文字之前就传递信息？
     * error/success/warn 有 —— 红色先报警，文字后确认，所以它们必须稳定，也确实
     * 稳定（族内就近取，色相锁在 27°/145°/80° 附近）。business 没有：徽章的意思
     * 全在那三个字里，颜色不承担语义，也没有跨产品约定可守。
     * 而它原先跟 LINK（冷暖对冲的关系色），实测三个主题三个颜色（橙/蓝/绿）——
     * 既不是稳定语义，也不跟主题，两头不靠。跟锚色至少是一致的。
     * 链接色（brand-primary-new-color…）保持 LNK 不动：蓝链接是真有约定的。 */
    T[P('state-business-primary')] = rgbStr(ens(atL(anchorRec.hex, 0.52), BG, 4.5, 'state-business-primary'));
    T[P('state-business-tertiary')] = rgbStr(atL(anchorRec.hex, 0.945, 0.35));
    T[P('button-primary-dimmed')] = rgbStr(N(100));
    T[P('button-contrast-fill')] = rgbStr(N(700));

    /* ═══ SEAL ── 层D · 印（<1% 面积，唯一满彩块，不过任何闸门） ═══ */
    const cBig = Math.max(...[BG, LAYER1, sidebar, bubble].map(chromaOf));
    // 一色到底：主按钮是**锚色本人**的加深版，不再是那枚配伍印。
    // 理由不是偏好，是色库 DESIGN.md 的原文：「The color content is the only
    // saturation on the page; chrome stays neutral.」主按钮属于 chrome，原先却
    // 顶着一块离锚色中位 109°（最大 179°）的饱和外来色 —— 于是用户选了竹青，
    // 全场最响的一笔是茜红。印退回 sidebar-nav-item-active-accent 那一抹余痕，
    // 那才是落款该有的尺度；sealName / sealWhy 的策展数据因此仍然有用。
    const SF = sealBoost(sealFill(anchorRec.hex, N(0), ink(NB_L[1000])), cBig, N(0), ink(NB_L[1000]));
    if (SF.degraded && !degraded.includes('seal')) degraded.push('seal');
    T[P('button-primary-fill')] = rgbStr(SF.fill);
    T[P('button-primary-hover')] = rgbStr(hoverOf(SF));
    T[P('label-primary-foreground')] = rgbStr(SF.fg);
    T[S('sidebar-nav-item-active-accent')] = rgbStr(atL(SEAL.hex, 0.93, 0.35)); // 一抹印泥的余痕

    /* ═══ STATE ── 层E · 状态（族内就近取，每锚不同） ═══ */
    const ERRp = ens(ERRr.hex, BG, 4.5, 'state-error-primary');
    T[P('state-error-primary')] = rgbStr(ERRp);
    T[P('state-error-secondary')] = rgbStr(atL(ERRp, Math.min(0.78, Lof(ERRp) + 0.10)));
    T[P('interactive-bg-hover-danger')] = rgbaStr(ERRp, 0.05);
    const SUCp = ens(SUCr.hex, BG, 4.5, 'state-success-primary');
    T[P('state-success-primary')] = rgbStr(SUCp);
    T[P('state-success-secondary')] = rgbStr(atL(SUCp, Math.min(0.78, Lof(SUCp) + 0.10)));
    T[P('state-success-tertiary')] = rgbStr(atL(SUCr.hex, 0.96, 0.30));
    const WRNp = ens(WRNr.hex, BG, 3.0, 'state-warn-primary'); // 图标级
    T[P('state-warn-primary')] = rgbStr(WRNp);
    T[P('state-warn-secondary')] = rgbStr(atL(WRNp, Math.min(0.78, Lof(WRNp) + 0.08)));
    T[P('state-warn-tertiary')] = rgbStr(atL(WRNr.hex, 0.96, 0.30));
    // 预压不许省：黄色天生亮（藤黄 L=0.875），族内取色后若直接 ens，
    // 整批 warn 会以 26 步全走满的方式掉。等价于基准把琥珀压到 amber-600。
    T[P('state-warn-label')] = rgbStr(ens(atL(WRNr.hex, 0.55), BG, 4.5, 'state-warn-label'));
  } else {
    /* ═══ BG ── 层A · 纸（暗模式） ═══ */
    const BG = paper(0.185, { tint: fam.baseTint * 0.85 });
    T[P('bg-base')] = rgbStr(BG);
    const LAYER1 = N(875);
    T[P('bg-layer-1')] = rgbStr(LAYER1);
    T[P('bg-layer-2')] = rgbStr(N(850));
    T[P('bg-layer-3')] = rgbStr(N(800));
    T[P('bg-overlay')] = rgbStr(N(700));
    T[P('bg-module-platform')] = rgbStr(N(800));
    T[P('bg-multi-select')] = rgbStr(NG(850)); // 显式走纯灰梯，不走 NB
    T[S('input-major')] = rgbStr(N(850));
    T[S('login-input')] = rgbStr(N(900));
    T[S('selector')] = rgbStr(N(800));
    T[S('tip')] = rgbStr(N(800));
    T[S('menu')] = rgbStr(N(800)); // 显式复制 bg-layer-3
    T[P('markdown-code-block')] = rgbStr(MD(900));
    T[P('markdown-code-block-banner')] = rgbStr(MD(850));
    T[P('markdown-inline-code')] = rgbStr(MD(850));
    T[P('markdown-citation')] = rgbStr(MD(800));
    T[P('markdown-tag')] = rgbStr(MD(850));
    T[P('markdown-placeholder')] = rgbStr(MD(850));
    T[P('markdown-code-segment-selected')] = rgbStr(MD(800));
    T[P('markdown-code-segment-unselected')] = rgbStr(MD(900));
    T[P('scrollbar-bg-l1')] = rgbStr(NG(700));
    T[P('scrollbar-bg-l2')] = rgbStr(NG(600));
    T[P('scrollbar-hover-l1')] = rgbStr(NG(600));
    T[P('scrollbar-hover-l2')] = rgbStr(NG(550));
    T[P('toast-bg')] = rgbStr(paper(NB_L[750], { tint: fam.baseTint * 0.7 }));
    T[P('tooltip-bg')] = rgbStr(paper(NB_L[750], { tint: fam.baseTint * 0.7 }));
    T[P('button-ghost-active-fill')] = rgbStr(N(750));
    T[P('button-ghost-active-hover')] = rgbStr(N(700));
    T[P('button-ghost-active-border')] = rgbStr(N(600));
    T[P('button-elevated-fill')] = rgbStr(N(750));
    T[P('button-floating-fill')] = rgbStr(N(850));
    T[P('button-floating-hover')] = rgbStr(N(800));
    T[P('interactive-bg-hover-solid')] = rgbStr(N(800));

    /* ═══ INK ── 层C · 墨与线（暗模式 alpha ≈ 亮模式 ×1.3–1.5） ═══ */
    const inkLight = paper(NB_L[0]);
    T[P('border-l1')] = rgbaStr(inkLight, 0.12);
    T[P('border-l2')] = rgbaStr(inkLight, 0.12);
    T[P('border-l2-darkmode-thin')] = rgbaStr(inkLight, 0.06);
    T[P('border-l3')] = rgbaStr(inkLight, 0.16);
    T[P('border-l4')] = rgbaStr(inkLight, 0.2);
    T[P('border-inverted')] = rgbaStr(inkLight, 0.06);
    T[P('border-inverted2')] = rgbaStr(inkLight, 0.08);
    T[P('interactive-bg-hover')] = rgbaStr(inkLight, 0.08);
    T[P('interactive-bg-active')] = rgbaStr(inkLight, 0.14);
    T[P('interactive-bg-hover-accent')] = rgbaStr(inkLight, 0.24);
    T[P('bg-skeleton')] = rgbaStr(inkLight, 0.08);
    T[P('bg-mask-1')] = 'rgba(0,0,0,0.24)';
    T[P('bg-mask-2')] = 'rgba(0,0,0,0.12)';
    T[P('bg-mask-3')] = 'rgba(0,0,0,0.48)';
    T[P('bg-mask-photo')] = 'rgba(0,0,0,0.88)';
    T[P('bg-mask-drop')] = rgbaStr(paper(0.22), 0.7);
    T[P('button-tool-bar-fill')] = rgbaStr(ink(0.34), 0.5);
    T[P('button-tool-bar-hover')] = rgbaStr(ink(0.34), 0.6);
    T[P('button-tool-bar-fill-invisible')] = rgbaStr(ink(0.2), 0.36);

    /* ═══ FG ① ── label-primary 先定住（§6#1） ═══ */
    /* 暗模式正文封顶 16.8:1。白字压深底会起光晕（散光人群尤甚），色库自己的
     * --ink 取 #f2f0ea（16.7:1）而非纯白，正是这个判断；插件原先冲到 17.8:1，
     * 比家法还亮。软化来自墨的色温（ink() 已带纸相），不是靠降对比度。 */
    const FG = ens(fitBand(ink(NB_L[50]), BG, 16.8), BG, 4.5, 'label-primary');
    T[P('label-primary')] = rgbStr(FG);

    /* ═══ 层B · 帘（暗模式的表面向 FG 让步的方向是压深） ═══ */
    const vt = fam.veil * 0.55;
    let sidebar = veil(NB_L[900], { useP: 0.30, tint: vt, floorC: 0.95 * B('sidebar') });
    sidebar = fitSurface(sidebar, FG, 4.5);
    const navHover = veil(NB_L[850], { useP: 0.25, tint: vt, floorC: 0.95 * B('hover') });
    let navActive = veil(NB_L[750], { useP: 0.15, tint: vt * 1.15, floorC: 0.95 * B('active') });
    navActive = fitSurface(navActive, FG, 4.5);
    // 同亮模式：帘尽可能厚，但不厚过锚色能支撑的限度。暗模式原先恒被 0.95×0.055
    // 钳在 0.05 —— 96 套里 18 套记为 bubbleChroma 兜底，等于放弃了暗色的识别色。
    const bubFloor = Math.max(Math.min(0.075, anchorC / 1.75), 0.95 * B('bubble'));
    let bubble = veilAtFloor(NB_L[850], { useP: 0, tint: vt * 1.25 }, bubFloor, 1);
    bubble = fitSurface(bubble, FG, 4.5);
    // 与亮模式同一条区间：下限 1.25（原 1.04 等于「可以看不见」），上限 1.45
    // （帘是罩染，不是色块 —— 藤黄·暗 实测到过 1.77，明显是一块贴上去的黄）。
    for (let i = 0; i < 40 && contrast(bubble, BG) < 1.25; i++) bubble = atL(bubble, clamp(Lof(bubble) + 0.004, 0.02, 0.995));
    for (let i = 0; i < 40 && contrast(bubble, BG) > 1.55; i++) bubble = atL(bubble, clamp(Lof(bubble) - 0.004, 0.02, 0.995));
    if (chromaOf(bubble) < bubFloor - 1e-9) degraded.push('bubbleChroma');
    let bubHi = veilAtFloor(NB_L[750], { useP: 0, tint: vt * 1.35 }, Math.max(Math.min(0.075, anchorC / 1.75), 0.95 * B('highlight')), 1);
    bubHi = fitSurface(bubHi, FG, 4.5);

    /* ═══ BRAND ═══ */
    // 暗底主色：lighter[0]（主色要在暗底上跳出来），再预压 L 0.72，最后 ens。
    const litRec = REC((anchorRec.lighter || [])[0]) || anchorRec;
    let primaryDark = litRec.hex;
    if (contrast(primaryDark, BG) < 3.0) { primaryDark = atL(primaryDark, 0.72); nudged.push('brand-primary(preL)'); }
    let PRIM = ens(primaryDark, BG, 3.0, 'brand-primary');
    // §6#8：① 先动表面（暗模式压深帘），② 才动 brand-primary 的 ens 目标。
    for (let i = 0; i < 6 && contrast(PRIM, sidebar) < 3.0; i++)
      sidebar = atL(sidebar, clamp(Lof(sidebar) - 0.008, 0.02, 0.995));
    if (contrast(PRIM, sidebar) < 3.0) PRIM = ens(PRIM, sidebar, 3.0, 'brand-primary(vs sidebar)');
    T[S('sidebar-fill')] = rgbStr(sidebar);
    /* 「新会话」是压在侧栏上的抬升面（button-elevated-fill）。它取中性、不取锚色是对的
     * —— 否则它会和发送键并列成两个抢焦点的彩色按钮。但它原先没有任何与侧栏的分离下限，
     * 实测最差只有 1.035:1，全靠 1px / 10% 的描边撑着，等于消失。抬升面必须真的抬起来。 */
    {
      let ev = parseRgb(T[P('button-elevated-fill')]);
      for (let i = 0; i < 14 && contrast(ev, sidebar) < 1.12; i++)
        ev = atL(ev, clamp(Lof(ev) + 0.006, 0.02, 0.998));
      T[P('button-elevated-fill')] = rgbStr(ev);
      T[P('button-floating-fill')] = rgbStr(ev);
    }
    T[S('sidebar-nav-item-hover')] = rgbStr(navHover);
    T[S('sidebar-nav-item-active')] = rgbStr(navActive);
    T[S('bubble')] = rgbStr(bubble);
    T[S('bubble-highlight')] = rgbStr(bubHi);

    /* ═══ FG ② ── 其余墨梯（§6#3 同亮模式，方向相反：墨只会越推越亮） ═══ */
    // 先落回区间上限，再守各面的下限；两条墨阶因此同形状（见 fitBand）。
    let SEC = fitBand(ink(NB_L[300]), BG, 8.0);
    for (const s of [BG, LAYER1, bubble, sidebar]) SEC = ens(SEC, s, 4.5, 'label-secondary');
    T[P('label-secondary')] = rgbStr(SEC);
    T[P('label-tertiary')] = rgbStr(ens(fitBand(ink(NB_L[400]), BG, 5.5), BG, 4.5, 'label-tertiary'));
    T[P('label-caption')] = rgbStr(ink(NB_L[600]));
    T[P('label-dimmed')] = rgbStr(ink(NB_L[750]));
    T[P('label-primary-dimmed')] = rgbStr(ink(NB_L[100]));
    T[P('label-primary-inverted')] = rgbStr(ink(NB_L[800])); // 对齐基准原样
    T[P('label-primary-bluish')] = rgbStr(FG);               // 基准在暗模式折叠为 nb-50

    T[P('brand-primary')] = T[P('brand-text')] = rgbStr(PRIM);
    T[P('brand-primary-invert')] = rgbStr(litRec.hex);   // 原色，不 ensure（R4）
    const LNK = ens(atL(LINK, 0.68), BG, 4.5, 'brand-new-color');
    T[P('brand-primary-new-colorprimary-new-color')] = rgbStr(LNK);
    // 同亮模式：发送键是锚色本人（见亮模式分支的说明）。
    T[P('button-info-fill')] = rgbStr(ens(atL(anchorRec.hex, 0.72), BG, 3.0, 'button-info-fill'));
    T[P('button-info-hover')] = rgbStr(atL(anchorRec.hex, 0.82));
    // 同亮模式：business 跟锚色，链接仍走 LNK。
    T[P('state-business-primary')] = rgbStr(ens(atL(anchorRec.hex, 0.72), BG, 4.5, 'state-business-primary'));
    T[P('state-business-tertiary')] = rgbStr(atL(anchorRec.hex, 0.38, 0.6));
    T[P('button-primary-dimmed')] = rgbStr(N(750));
    T[P('button-contrast-fill')] = rgbStr(N(50));

    /* ═══ SEAL ═══ */
    const cBig = Math.max(...[BG, LAYER1, sidebar, bubble].map(chromaOf));
    const WH = paper(NB_L[0]), IK = ink(NB_L[1000]);
    const SF = sealBoost(sealFill(anchorRec.hex, WH, IK), cBig, WH, IK); // 一色到底，同亮模式
    if (SF.degraded && !degraded.includes('seal')) degraded.push('seal');
    T[P('button-primary-fill')] = rgbStr(SF.fill);
    T[P('button-primary-hover')] = rgbStr(hoverOf(SF));
    T[P('label-primary-foreground')] = rgbStr(SF.fg);
    T[S('sidebar-nav-item-active-accent')] = rgbStr(atL(SEAL.hex, 0.34, 0.55));

    /* ═══ STATE ═══ */
    const errBase = (REC((ERRr.lighter || [])[0]) || null)?.hex || atL(ERRr.hex, 0.68);
    const ERRp = ens(errBase, BG, 4.5, 'state-error-primary');
    T[P('state-error-primary')] = rgbStr(ERRp);
    T[P('state-error-secondary')] = rgbStr(ERRp); // 基准暗模式重复 red-400
    T[P('interactive-bg-hover-danger')] = rgbaStr(ERRp, 0.15);
    const SUCp = ens(SUCr.hex, BG, 4.5, 'state-success-primary');
    T[P('state-success-primary')] = rgbStr(SUCp);
    T[P('state-success-secondary')] = rgbStr(atL(SUCp, Math.min(0.9, Lof(SUCp) + 0.08)));
    T[P('state-success-tertiary')] = rgbStr(atL(SUCr.hex, 0.32, 0.30));
    const WRNp = ens(WRNr.hex, BG, 3.0, 'state-warn-primary');
    T[P('state-warn-primary')] = rgbStr(WRNp);
    T[P('state-warn-secondary')] = rgbStr(atL(WRNp, Math.min(0.9, Lof(WRNp) + 0.06)));
    T[P('state-warn-tertiary')] = rgbStr(atL(WRNr.hex, 0.30, 0.25));
    T[P('state-warn-label')] = rgbStr(ens(atL(WRNr.hex, 0.70), BG, 4.5, 'state-warn-label'));
  }

  /* ── 面积纪律的编译期式断言（SPEC §4.2，「一色到底」后改写）──
   *
   * 旧律是「锚色永不做 fill，印色永不做 label」。前半句现已作废：焦点那一笔
   * 就该是锚色本人 —— 否则用户选了竹青，全场最响的是一块离它 109° 的茜红，
   * 这正是「不像我选的那个主题」的成因。
   *
   * 新律分两条，各自仍是结构保证而非自觉：
   *   ① 锚色**原色**不做任何 fill —— 焦点必须是 sealFill 压过明度、
   *      与其上的字配平过对比度的版本，不是色卡上那个原值直接铺开。
   *   ② 印色只进 1 个 token（那一抹余痕），物理上无法占据大面积。 */
  const SEAL_SLOTS = new Set([S('sidebar-nav-item-active-accent')]);
  const sealVals = new Set([...SEAL_SLOTS].map(k => T[k]));
  /* 焦点是四个槽，不是两个：button-info-* 是真实应用里的发送键，
   * 与 button-primary-* 同为「屏上最艳的那一块」，同受锚色原色的豁免。 */
  const FOCUS_SLOTS = new Set([
    P('button-primary-fill'), P('button-primary-hover'),
    P('button-info-fill'), P('button-info-hover'),
  ]);
  const rawAnchor = rgbStr(anchorRec.hex);
  for (const [k, v] of Object.entries(T)) {
    if (!SEAL_SLOTS.has(k) && !FOCUS_SLOTS.has(k) && sealVals.has(v)) throw new Error(`印色越界：${k} 与印色 token 同值 ${v}`);
    // ① 的可测形式：锚色原色只许落在焦点两槽，其余任何 fill 用到它就是面积失控。
    if (/-fill$/.test(k) && !FOCUS_SLOTS.has(k) && v === rawAnchor) throw new Error(`锚色原色越界做了 fill：${k}`);
  }
  const structural = {
    family: fam.key, familyNote: fam.note, ripeHi: fam.ripeHi,
    paperHue: paperHueResolved, paperHueRotated: paperHueResolved !== fam.paperHue,
    sealName: SEAL.name, sealHex: SEAL.hex, sealWhy: SEAL.why, sealRel: SEAL.rel,
    linkHex: LINK,
    errName: ERRr.name, sucName: SUCr.name, wrnName: WRNr.name,
  };
  return { tokens: T, nudged, degraded, structural };
}

/* ── 10. AA 终检矩阵（SPEC §6 / §7 同源）——任一行不达标 → 整锚剔除 ── */
const parseRgb = s => {
  const m = s.match(/rgba?\(([\d.]+),([\d.]+),([\d.]+)/);
  return '#' + [m[1], m[2], m[3]].map(v => (+v).toString(16).padStart(2, '0')).join('');
};
function checkMatrix(tokens, mode) {
  const g = k => parseRgb(tokens[k]);
  const rows = [
    ...['bg-base', 'bg-layer-1', 'bg-layer-2', 'bg-layer-3'].map(b => [P('label-primary'), P(b), 4.5]),
    [P('label-primary'), S('sidebar-fill'), 4.5],
    [P('label-primary'), S('sidebar-nav-item-active'), 4.5],
    [P('label-primary'), S('bubble'), 4.5],
    [P('label-primary'), S('bubble-highlight'), 4.5],
    [P('label-primary'), S('input-major'), 4.5],
    [P('label-primary'), P('markdown-code-block'), 4.5],
    [P('label-secondary'), P('bg-base'), 4.5],
    [P('label-secondary'), P('bg-layer-1'), 4.5],
    [P('label-secondary'), S('bubble'), 4.5],
    [P('label-secondary'), S('sidebar-fill'), 4.5],
    [P('label-tertiary'), P('bg-base'), 4.5],
    [P('label-primary-foreground'), P('button-primary-fill'), 4.5],
    [P('label-primary-foreground'), P('button-primary-hover'), 4.5],
    ...(mode === 'light' ? [
      [P('label-primary-inverted'), P('toast-bg'), 4.5],
      [P('label-primary-inverted'), P('tooltip-bg'), 4.5],
    ] : []),
    [P('brand-primary-new-colorprimary-new-color'), P('bg-base'), 4.5],
    [P('state-business-primary'), P('bg-base'), 4.5],
    [P('state-error-primary'), P('bg-base'), 4.5],
    [P('state-success-primary'), P('bg-base'), 4.5],
    [P('state-warn-label'), P('bg-base'), 4.5],
    [P('state-warn-primary'), P('bg-base'), 3.0],
    [P('brand-primary'), P('bg-base'), 3.0],
    [P('brand-primary'), S('sidebar-fill'), 3.0],
    [P('button-info-fill'), P('bg-base'), 3.0],
    [S('bubble'), P('bg-base'), 1.04], // 可见边界（自定，非 WCAG）
  ];
  const fails = [];
  for (const [fg, bg, floor] of rows) {
    const c = contrast(g(fg), g(bg));
    if (c < floor - 1e-9) fails.push(`${fg} vs ${bg} = ${c.toFixed(2)} < ${floor}`);
  }
  // 不变量：帘的彩度不得跌破 0.045（R1，「帘比现状更淡」是断言不是希望）
  const cb = window.ZH_COLOR_CORE.chromaOf(g(S('bubble')));
  if (cb < 0.045 - 1e-9) fails.push(`C(bubble) = ${cb.toFixed(4)} < 0.045`);
  /* 不变量：焦点彩度必须显著高于最大面（唯一焦点可测，非修辞）。
   * 两个槽都要查 —— button-info-fill 是真实应用里的发送键。只查 primary 的话，
   * 生成器会放行一批 check-contrast.mjs 随后要拒的锚，两边判据打架。 */
  const cBig = Math.max(...[P('bg-base'), P('bg-layer-1'), S('sidebar-fill'), S('bubble')]
    .map(k => window.ZH_COLOR_CORE.chromaOf(g(k))));
  for (const k of [P('button-primary-fill'), P('button-info-fill')]) {
    const cf = window.ZH_COLOR_CORE.chromaOf(g(k));
    if (cf < cBig * FOCUS_C_RATIO) fails.push(`${k} 彩度 ${cf.toFixed(4)} < 最大面 ${cBig.toFixed(4)} × ${FOCUS_C_RATIO}`);
  }
  // 不变量：亮模式层次方向（现状四同值白的回归护栏）
  if (mode === 'light') {
    const Ls = ['bg-base', 'bg-layer-1', 'bg-layer-2', 'bg-layer-3'].map(k => Lof(g(P(k))));
    if (!(Ls[3] < Ls[2] && Ls[2] < Ls[1] && Ls[1] < Ls[0])) fails.push('bg 四层的层次方向反了或未拆开');
    if (new Set(['bg-base', 'bg-layer-1', 'bg-layer-2', 'bg-layer-3'].map(k => tokens[P(k)])).size < 4)
      fails.push('bg 四层未拆开');
  }
  return fails;
}

/* ── 11. 组装 roster ── */
// 主题级近同门槛：签名色 4 维（R10：加 button-primary-fill —— 印色不同的两套主题
// 不该被判近同），同 scheme 内平均 dE < 0.015 视为近同，后来者剔除。
const THEME_DE_MIN = 0.015;
const SIG_KEYS = [P('bg-base'), P('brand-primary'), S('bubble'), P('button-primary-fill')];
const sigOf = tokens => SIG_KEYS.map(k => hexOklab(parseRgb(tokens[k])));
const sigDist = (s1, s2) => s1.reduce((sum, o, i) =>
  sum + Math.hypot(o.L - s2[i].L, o.a - s2[i].a, o.b - s2[i].b), 0) / s1.length;

/* token 覆盖完整性（SPEC §2：89/89，无遗漏、无新增）——
 * 逐字抄自 harness-ref/design-platform.css 的词表（alias 78 + specific 11）。
 * 缺一个 → 失败；出现词表外的名字 → 失败（防「编造 token」）。 */
const VOCAB_ALIAS = [
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
];
const VOCAB_SPECIFIC = [
  'bubble', 'bubble-highlight', 'input-major', 'login-input', 'menu', 'selector', 'sidebar-fill',
  'sidebar-nav-item-active', 'sidebar-nav-item-active-accent', 'sidebar-nav-item-hover', 'tip',
];
const VOCAB = new Set([...VOCAB_ALIAS.map(P), ...VOCAB_SPECIFIC.map(S)]);
if (VOCAB.size !== 89) throw new Error(`词表应为 89 个，实为 ${VOCAB.size}`);

const keptSigs = { light: [], dark: [] };
const themes = [];
const dropped = [];
const shaSeen = new Map();
const tally = { nudged: 0, degraded: 0, identityShift: 0, degradedSeal: 0, degradedBubble: 0, paperRotated: 0 };
const famCount = {}, sealWhy = {};
const enName = rec => { const py = pinyin(rec.name, { toneType: 'none', separator: ' ' }); return py.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '); };

for (const a of anchors) {
  const rec = a.rec;
  const base = idBase(rec);
  const pair = [];
  const pendingSigs = []; // 双模式都过关后才登记签名（避免半锚污染 keptSigs）
  let bad = null;
  for (const mode of ['light', 'dark']) {
    const { tokens, nudged, degraded, structural } = buildTheme(rec, mode);
    const names = Object.keys(tokens);
    const missing = [...VOCAB].filter(v => !tokens[v]);
    const extra = names.filter(n => !VOCAB.has(n));
    if (missing.length || extra.length) { bad = `${mode}: token 覆盖 缺${missing.length}(${missing[0] || ''}) 多${extra.length}(${extra[0] || ''})`; break; }
    const fails = checkMatrix(tokens, mode);
    if (fails.length) { bad = `${mode}: ${fails[0]}`; break; }
    const sha = createHash('sha1').update(JSON.stringify(Object.entries(tokens).sort())).digest('hex');
    if (shaSeen.has(sha)) { bad = `identity: token map 与 ${shaSeen.get(sha)} 重复`; break; }
    const sig = sigOf(tokens);
    const near = keptSigs[mode].find(k => sigDist(sig, k.sig) < THEME_DE_MIN);
    if (near) { bad = `distinctness: ${mode} 主题与 ${near.id} 近同 (dE ${sigDist(sig, near.sig).toFixed(4)} < ${THEME_DE_MIN})`; break; }
    pendingSigs.push({ mode, sig, sha, id: `${base}-${mode}` });
    // identityShift：brand-primary 的 ΔL > 0.10 =「屏幕上是一个明显更深的近亲」
    const dL = Math.abs(Lof(parseRgb(tokens[P('brand-primary')])) - Lof(parseRgb(tokens[P('brand-primary-invert')])));
    pair.push({
      id: `${base}-${mode}`,
      nameZh: `${rec.name}·${mode === 'light' ? '亮' : '暗'}`,
      nameEn: `${enName(rec)} ${mode === 'light' ? 'Light' : 'Dark'}`,
      anchorHex: rec.hex,
      colorScheme: mode,
      ...structural,
      identityShiftDL: +dL.toFixed(4),
      degraded,
      tokens,
      _nudged: nudged.length,
    });
  }
  if (bad) { dropped.push(`${rec.name} ${rec.id} — ${bad}`); continue; }
  for (const p of pendingSigs) { keptSigs[p.mode].push({ sig: p.sig, id: p.id }); shaSeen.set(p.sha, p.id); }
  for (const t of pair) {
    tally.nudged += t._nudged; delete t._nudged;
    if (t.degraded.includes('seal')) { tally.degraded++; tally.degradedSeal++; }
    if (t.degraded.includes('bubbleChroma')) { tally.degraded++; tally.degradedBubble++; }
    if (t.identityShiftDL > 0.10) tally.identityShift++;
    if (t.paperHueRotated) tally.paperRotated++;
    famCount[t.family] = (famCount[t.family] || 0) + 1;
    sealWhy[t.sealWhy] = (sealWhy[t.sealWhy] || 0) + 1;
    themes.push(t);
  }
}

/* 实际达成的最小锚间 dE（去除被剔除锚后重算） */
const keptIds = new Set(themes.map(t => t.anchorHex));
const kept = anchors.filter(a => keptIds.has(a.rec.hex));
let minDE = Infinity;
for (let i = 0; i < kept.length; i++) for (let j = i + 1; j < kept.length; j++) {
  const p = kept[i], q = kept[j];
  minDE = Math.min(minDE, Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b));
}

/* ── 11.5 精选（SPEC 新增）──
 * 98 个选择等于没有选择：一整面色块读起来像取色器，不像主题库，而「优雅是编辑
 * 的结果」。所以标出一份 12 锚 / 24 套的精选，其余折叠。精选比完整名册多一道
 * 质量闸：同一锚的亮暗两套都不得含 degraded；完整名册可以诚实保留这些兜底结果，
 * 但编辑推荐不能把「放弃设计意图」当代表作。
 *
 * 名单不手工维护，两段推导，全程确定性：
 *   ① CURATED 里活到最终名册的（黛蓝 C 不够、天青/胭脂红/茜色 因近同被剔，
 *      实际存活 6 个）—— 这是编辑意图，最高优先级；
 *   ② 不足 12 个的部分，用 OKLab 最远点采样从剩下的锚里补：每次挑「与已选集合
 *      最小距离最大」的那个，并列时按 rec.name 升序。补出来的是色彩空间里铺得最
 *      开的一组，不是最像的一组。 */
const CURATED_TARGET = 12;
const pairByAnchor = new Map();
for (const theme of themes) {
  const pair = pairByAnchor.get(theme.anchorHex) ?? [];
  pair.push(theme);
  pairByAnchor.set(theme.anchorHex, pair);
}
const curatedEligible = new Set(
  [...pairByAnchor]
    .filter(([, pair]) => pair.length === 2 && pair.every(theme => theme.degraded.length === 0))
    .map(([hex]) => hex),
);
const anchorOf = new Map();          // anchorHex → { L, a, b, name }
for (const a of kept) {
  if (curatedEligible.has(a.rec.hex)) {
    anchorOf.set(a.rec.hex, { L: a.L, a: a.a, b: a.b, name: a.rec.name });
  }
}

const curatedHex = [];
for (const n of CURATED) {
  const hit = [...anchorOf.entries()].find(([, v]) => v.name === n);
  if (hit && !curatedHex.includes(hit[0])) curatedHex.push(hit[0]);
}
const dist = (p, q) => Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b);
while (curatedHex.length < CURATED_TARGET && curatedHex.length < anchorOf.size) {
  let best = null, bestScore = -Infinity;
  for (const [hex, v] of anchorOf) {
    if (curatedHex.includes(hex)) continue;
    const near = Math.min(...curatedHex.map(h => dist(v, anchorOf.get(h))));
    if (near > bestScore + 1e-12
      || (near > bestScore - 1e-12 && best && v.name < anchorOf.get(best).name)) {
      best = hex; bestScore = near;
    }
  }
  if (!best) break;
  curatedHex.push(best);
}
const curatedSet = new Set(curatedHex);
for (const t of themes) t.curated = curatedSet.has(t.anchorHex);

/* ── 12. 产出 ── */
const outDir = fileURLToPath(new URL('..', import.meta.url));
const header = `/* Generated by scripts/generate-themes.mjs — do not edit. 由生成器产出，勿手改。 */\n`;
writeFileSync(outDir + 'src/themes.generated.js',
  `${header}export const THEMES = ${JSON.stringify(themes, null, 2)};\n`);
mkdirSync(outDir + 'preview', { recursive: true });
writeFileSync(outDir + 'preview/themes.json', JSON.stringify(themes, null, 2) + '\n');

console.log(`纸 · 帘 · 印 —— 家族分布（主题数）：${Object.entries(famCount).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
console.log(`印色来源：${Object.entries(sealWhy).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
console.log(`纸相共线旋转（paperHueAlt 兜底）：${tally.paperRotated} 套`);
console.log(`全局状态色兜底池命中（应为 0，非 0 说明族内取色失灵）：err ${globalHits.err} · suc ${globalHits.suc} · wrn ${globalHits.wrn}`);
console.log(`  兜底池常量：ERR=${GLOBAL_ERR.name}(${GLOBAL_ERR.hex}) SUC=${GLOBAL_SUC.name}(${GLOBAL_SUC.hex}) WRN=${GLOBAL_WRN.name}(${GLOBAL_WRN.hex})`);
if (curatedRejected.length) console.log(`CURATED 里因门槛被丢掉的名字（README 若提到它们是错的）：${curatedRejected.join(' · ')}`);
console.log(`候选 ${eligible.length}/742 · 入选锚 ${anchors.length} · 剔除 ${dropped.length} · 主题 ${themes.length}`);
if (dropped.length) console.log('剔除明细：\n  ' + dropped.join('\n  '));
/* 兜底的诚实记账：三类分开，不许合成一个数。不藏兜底。 */
console.log(`兜底记账 —— nudged（算法微调，设计意图仍在）：${tally.nudged}`);
console.log(`         —— degraded（**放弃了设计意图**）：${tally.degraded}（seal ${tally.degradedSeal} · bubbleChroma ${tally.degradedBubble}）`);
console.log(`         —— identityShift（brand-primary ΔL > 0.10）：${tally.identityShift} 套`);
console.log(`锚间最小 dE(OKLab)：${minDE.toFixed(4)}（阈值 ${DE_MIN}）`);
let minSig = Infinity;
for (const mode of ['light', 'dark']) {
  const list = keptSigs[mode];
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++)
    minSig = Math.min(minSig, sigDist(list[i].sig, list[j].sig));
}
console.log(`主题间最小签名 dE（同 scheme，bg/brand/bubble/印 四维）：${minSig.toFixed(4)}（门槛 ${THEME_DE_MIN}）`);
