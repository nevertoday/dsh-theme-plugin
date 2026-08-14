/*
 * 注册时的令牌修补 · Token repairs applied at register/paint time
 * ---------------------------------------------------------------
 * 这里补两笔生成器欠下的账。都在**运行时**叠加而不是改生成数据：`pnpm generate`
 * 需要父仓库 zhongguo-traditional-colors 的和声数据集才跑得起来，本仓库单独
 * checkout 时跑不了；而这两处都能由主题自己已有的令牌确定性推出。
 *
 * 一 · 阴影：把中性灰换成这张纸自己的墨
 * ---------------------------------------------------------------
 * 为什么需要这个文件：`--dsw-shadow-lv1 / lv1-blur / lv2 / lv3` 也是主题令牌，
 * 但它们既不带 `alias-` 也不带 `specific-` 前缀，而且住在另一张样式表里
 * （ui-theme 的 gradient-shadow-text.css），所以当年清点「89 个词表」时整族漏掉了。
 * 结果：96 套主题全都沿用默认的**纯黑 alpha** 阴影 ——
 *   · 亮色暖纸上，中性黑影读起来是"脏灰"（粉纸 + 灰影最明显）
 *   · 暗色上，黑影压在近黑的地上几乎不可见，层次塌掉
 *
 * 做法沿用项目既有纪律「只换色相，不改关系」：偏移、模糊、扩散、alpha 全部
 * 逐字照抄 harness 的原值，只把 rgb(0,0,0) 换成该主题自己的墨：
 *   · 亮色 → `--dsw-alias-label-primary`（本来就是染过色的近黑墨）
 *   · 暗色 → `--dsw-alias-bg-base` 再压深（与地同色就等于没有阴影）
 * 两者都是已经过对比度闸门的既有令牌，不引入新的色彩推导，也不新增 AA 风险
 * （阴影不承载文字）。
 */

/** 一层阴影：几何串 + alpha。原值出自 ui-theme/lib/styles/gradient-shadow-text.css。 */
type Layer = readonly [geometry: string, alpha: number]

const GEOMETRY: Readonly<Record<string, readonly Layer[]>> = {
  '--dsw-shadow-lv1': [['0 2px 4px 0', 0.05]],
  '--dsw-shadow-lv1-blur': [['0 4px 12px 0', 0.02]],
  '--dsw-shadow-lv2': [['0 4px 12px 0', 0.02], ['0 2px 8px 0', 0.04]],
  '--dsw-shadow-lv3': [
    ['0 0 1px 0', 0.2],
    ['0 0 4px 0', 0.02],
    ['0 12px 32px 0', 0.08],
  ],
}

/** 暗色地压深到这个比例，让阴影比地更暗、仍带同一色相。 */
const DARK_SINK = 0.4

export type Rgb = readonly [number, number, number]

/** 从 `rgb(r,g,b)` / `rgba(...)` 里取三个通道；取不到返回 undefined（调用方落回黑）。 */
export function parseRgb(value: string | undefined): Rgb | undefined {
  const m = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(value ?? '')
  if (m === null) return undefined
  const rgb = [Number(m[1]), Number(m[2]), Number(m[3])] as const
  return rgb.every(n => Number.isFinite(n)) ? rgb : undefined
}

const clamp255 = (n: number): number => Math.max(0, Math.min(255, Math.round(n)))

/** 按比例压向黑，保持通道比例（也就保持色相）。 */
export function sink(rgb: Rgb, factor: number): Rgb {
  return [clamp255(rgb[0] * factor), clamp255(rgb[1] * factor), clamp255(rgb[2] * factor)]
}

/**
 * 这套主题的阴影墨色。
 * 亮色取墨（label-primary），暗色取地（bg-base）再压深；两者都取不到时落回纯黑
 * —— 与 harness 默认值一致，也就是"最坏情况不比现状差"。
 */
export function shadowInk(
  colorScheme: 'light' | 'dark',
  tokens: Readonly<Record<string, string>>,
): Rgb {
  if (colorScheme === 'light') {
    return parseRgb(tokens['--dsw-alias-label-primary']) ?? [0, 0, 0]
  }
  const ground = parseRgb(tokens['--dsw-alias-bg-base'])
  return ground === undefined ? [0, 0, 0] : sink(ground, DARK_SINK)
}

/**
 * 生成该主题的四个阴影令牌。返回的键与 harness 的默认定义同名，因此注册后
 * 直接覆盖掉那份中性灰的默认值 —— 不需要改宿主样式表，也不依赖选择器。
 */
export function shadowTokens(
  colorScheme: 'light' | 'dark',
  tokens: Readonly<Record<string, string>>,
): Record<string, string> {
  const [r, g, b] = shadowInk(colorScheme, tokens)
  const out: Record<string, string> = {}
  for (const [name, layers] of Object.entries(GEOMETRY)) {
    out[name] = layers.map(([geometry, alpha]) => `${geometry} rgba(${r}, ${g}, ${b}, ${alpha})`).join(', ')
  }
  return out
}

/** 词表：供 scripts/check-contrast.mjs 与测试引用，避免两处各写一份。 */
export const SHADOW_TOKEN_NAMES: readonly string[] = Object.keys(GEOMETRY)

/* ── 二 · 输入框表面：亮色下不许比纸更暗 ──
 *
 * harness 默认值里亮色的 `--dsw-specific-input-major` 与 `--dsw-alias-bg-base`
 * **完全同色**（都是 neutral-bluish-00 纯白），卡片感全靠边框 + 阴影；暗色是 950
 * 的地配 850 的输入框，也就是更亮。这个表面从不"下沉"。
 *
 * 生成器对它的极性却不稳定：香叶红·亮 是 rgb(255,252,249) 压在 rgb(255,247,245)
 * 的纸上（更亮，对的），素绢那族（竹青 / 汉绣绿 / 新绿）却落在比纸暗 0.05~0.11
 * 亮度的位置 —— 读起来是一块灰，很像"禁止输入"。
 *
 * 修法取两者中更亮的：好的原样保留，坏的落回纸色（正是 harness 的做法）。对比度
 * 不受影响 —— 结果要么是原值，要么等于 bg-base，而 label-primary vs bg-base 本来
 * 就是对比度矩阵的第 1 行。
 */

/** WCAG 相对亮度。只用来比明暗，不做对比度断言。 */
function luminance([r, g, b]: Rgb): number {
  const f = (c: number): number => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

/** 亮色下把「比纸还暗的输入框」抬回纸色；其余情况返回空对象（不动）。 */
export function repairInputSurface(
  colorScheme: 'light' | 'dark',
  tokens: Readonly<Record<string, string>>,
): Record<string, string> {
  if (colorScheme !== 'light') return {}
  const paper = tokens['--dsw-alias-bg-base']
  const paperRgb = parseRgb(paper)
  const inputRgb = parseRgb(tokens['--dsw-specific-input-major'])
  if (paper === undefined || paperRgb === undefined || inputRgb === undefined) return {}
  return luminance(inputRgb) < luminance(paperRgb) ? { '--dsw-specific-input-major': paper } : {}
}

/**
 * 该主题需要叠加的全部修补。**注册与直写 DOM 两条路都必须用它** ——
 * 只修其中一条，画出来的就是没修的那份（实机踩过：绘制层用原始 tokens，
 * 于是 body 上永远是 89 个令牌、阴影仍是中性灰）。
 */
export function repairTokens(
  colorScheme: 'light' | 'dark',
  tokens: Readonly<Record<string, string>>,
): Record<string, string> {
  return {
    ...shadowTokens(colorScheme, tokens),
    ...repairInputSurface(colorScheme, tokens),
    ...repairThinkGradients(colorScheme, tokens),
  }
}

/* ── 三 · 思考块的两个渐变 ──
 *
 * `--dsw-linear-gradient-think` 与 `--dsw-linear-think-select` 同样是主题令牌、
 * 同样不带 alias-/specific- 前缀、同样住在 gradient-shadow-text.css，于是同样被
 * 词表漏掉。它们的颜色是**硬编码中性色**：
 *   gradient-think： 亮 #fff（= bg-base）        暗 #151517（= bg-base，950）
 *   think-select  ： 亮 #f5f6f7（= selector）    暗 #232325（≈ bg-layer-1，875）
 * 也就是"从某个表面淡出到透明"。不修的话，绿纸上的思考块会淡出成一片白。
 *
 * 全仓库审计过：宿主定义了 277 个非 static 令牌，我们写 93 个，没写的 184 个里
 * **只有这两个带颜色**，其余全是 --dsw-font-* 字体族与 --dsw-mask-blur（blur(2px)，
 * 不含颜色）。所以补完这两个，颜色维度就没有漏网的了。
 *
 * think-select 的取色分亮暗两支 —— 不是我们想分，而是 harness 自己那两个值就分别
 * 落在 selector 和 bg-layer-1 上；照抄它，才叫"只换色相不改关系"。
 */

/** 停靠位（20.19% / 100%）与 alpha 段逐字照抄，只换颜色。 */
function fadeFrom([r, g, b]: Rgb): string {
  return `linear-gradient(180deg, rgb(${r}, ${g}, ${b}) 20.19%, rgba(${r}, ${g}, ${b}, 0) 100%)`
}

export function repairThinkGradients(
  colorScheme: 'light' | 'dark',
  tokens: Readonly<Record<string, string>>,
): Record<string, string> {
  const out: Record<string, string> = {}
  const base = parseRgb(tokens['--dsw-alias-bg-base'])
  if (base !== undefined) out['--dsw-linear-gradient-think'] = fadeFrom(base)
  // 亮色停在 selector（harness 用的是同一支灰），暗色停在 bg-layer-1。
  const selected = parseRgb(tokens[colorScheme === 'light' ? '--dsw-specific-selector' : '--dsw-alias-bg-layer-1'])
  if (selected !== undefined) out['--dsw-linear-think-select'] = fadeFrom(selected)
  return out
}
