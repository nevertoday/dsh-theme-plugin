/*
 * 阴影染色的行为锁 · Behavioural lock for shadow tinting
 * ---------------------------------------------------------------
 * 这一族令牌当年被漏掉的原因是它们不带 alias-/specific- 前缀、又住在另一张样式表里。
 * 所以这里除了断言"颜色换了"，也断言**几何与 alpha 一个字都没动** —— 那是项目的
 * 既有纪律（只换色相，不改关系），也是这次修改唯一允许触碰的范围。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shadowTokens, shadowInk, parseRgb, sink, repairInputSurface, repairThinkGradients, repairTokens, SHADOW_TOKEN_NAMES } from '../src/repairs.ts'

/** harness 的原始定义，逐字抄自 ui-theme/lib/styles/gradient-shadow-text.css。 */
const HARNESS_DEFAULTS: Record<string, string> = {
  '--dsw-shadow-lv1': '0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  '--dsw-shadow-lv1-blur': '0 4px 12px 0 rgba(0, 0, 0, 0.02)',
  '--dsw-shadow-lv2': '0 4px 12px 0 rgba(0, 0, 0, 0.02), 0 2px 8px 0 rgba(0, 0, 0, 0.04)',
  '--dsw-shadow-lv3': '0 0 1px 0 rgba(0, 0, 0, 0.2), 0 0 4px 0 rgba(0, 0, 0, 0.02), 0 12px 32px 0 rgba(0, 0, 0, 0.08)',
}

const LIGHT = { '--dsw-alias-label-primary': 'rgb(21,16,11)', '--dsw-alias-bg-base': 'rgb(255,249,241)' }
const DARK = { '--dsw-alias-label-primary': 'rgb(255,249,244)', '--dsw-alias-bg-base': 'rgb(25,17,12)' }

test('四个令牌名与 harness 默认定义同名（否则盖不掉那份中性黑）', () => {
  assert.deepEqual([...SHADOW_TOKEN_NAMES].sort(), Object.keys(HARNESS_DEFAULTS).sort())
  assert.deepEqual(Object.keys(shadowTokens('light', LIGHT)).sort(), Object.keys(HARNESS_DEFAULTS).sort())
})

test('几何与 alpha 逐字不变，只有颜色被替换', () => {
  for (const scheme of ['light', 'dark'] as const) {
    const out = shadowTokens(scheme, scheme === 'light' ? LIGHT : DARK)
    for (const [name, original] of Object.entries(HARNESS_DEFAULTS)) {
      // 把两边的颜色都抹成 X，剩下的部分必须完全一致。
      const strip = (s: string) => s.replace(/rgba?\([^)]*\)/g, 'X').replace(/\s+/g, ' ').trim()
      assert.equal(strip(out[name]), strip(original), `${scheme} 的 ${name} 改动了几何或 alpha`)
      // alpha 逐个核对（抹色会把 alpha 一起抹掉，所以单独再验一遍）。
      const alphas = (s: string) => [...s.matchAll(/rgba?\([^)]*?([\d.]+)\)/g)].map(m => m[1])
      assert.deepEqual(alphas(out[name]), alphas(original), `${scheme} 的 ${name} alpha 变了`)
    }
  }
})

test('亮色用墨（label-primary），不是中性黑', () => {
  assert.deepEqual(shadowInk('light', LIGHT), [21, 16, 11])
  const lv3 = shadowTokens('light', LIGHT)['--dsw-shadow-lv3']
  assert.match(lv3, /rgba\(21, 16, 11, 0\.2\)/)
  assert.ok(!lv3.includes('rgba(0, 0, 0'), '还是纯黑 —— 暖纸上会读成脏灰')
})

test('暗色用地压深：比地更暗，且保持色相', () => {
  const ink = shadowInk('dark', DARK)
  const ground = parseRgb(DARK['--dsw-alias-bg-base'])!
  for (let i = 0; i < 3; i++) {
    assert.ok(ink[i] < ground[i], `第 ${i} 个通道没有比地更暗 —— 与地同色等于没有阴影`)
  }
  // 色相靠通道比例体现：地是暖褐（r > g > b），压深后仍须如此。
  assert.ok(ink[0] > ink[1] && ink[1] > ink[2], '压深后色相跑了')
})

test('令牌缺失时落回纯黑 —— 最坏情况不比现状差', () => {
  assert.deepEqual(shadowInk('light', {}), [0, 0, 0])
  assert.deepEqual(shadowInk('dark', {}), [0, 0, 0])
  assert.equal(shadowTokens('light', {})['--dsw-shadow-lv1'], HARNESS_DEFAULTS['--dsw-shadow-lv1'].replace(/rgba\(0, 0, 0, /, 'rgba(0, 0, 0, '))
})

test('parseRgb / sink 的边界', () => {
  assert.equal(parseRgb(undefined), undefined)
  assert.equal(parseRgb('中国传统色'), undefined)
  assert.deepEqual(parseRgb('rgba(1, 2, 3, 0.5)'), [1, 2, 3])
  assert.deepEqual(sink([10, 20, 30], 0), [0, 0, 0])
  assert.deepEqual(sink([255, 255, 255], 2), [255, 255, 255])   // 不越界
})

/* ── 输入框表面 ── */

const GREEN_PAPER = {           // 竹青·亮：生成器把输入框推到了比纸更暗
  '--dsw-alias-bg-base': 'rgb(246,253,247)',
  '--dsw-specific-input-major': 'rgb(240,247,241)',
  '--dsw-alias-label-primary': 'rgb(14,18,14)',
  '--dsw-specific-selector': 'rgb(231,239,233)',
  '--dsw-alias-bg-layer-1': 'rgb(244,252,246)',
}
const WARM_PAPER = {            // 香叶红·亮：本来就比纸更亮，不该动
  '--dsw-alias-bg-base': 'rgb(255,247,245)',
  '--dsw-specific-input-major': 'rgb(255,252,249)',
  '--dsw-alias-label-primary': 'rgb(22,15,13)',
}

test('亮色下比纸更暗的输入框被抬回纸色（不再像 disabled）', () => {
  const fix = repairInputSurface('light', GREEN_PAPER)
  assert.equal(fix['--dsw-specific-input-major'], GREEN_PAPER['--dsw-alias-bg-base'])
})

test('本来就更亮的输入框不动 —— 那一档细微抬起是好的', () => {
  assert.deepEqual(repairInputSurface('light', WARM_PAPER), {})
})

test('暗色不参与：那边的极性本来就和 harness 一致（地 950 / 输入 850）', () => {
  assert.deepEqual(repairInputSurface('dark', {
    '--dsw-alias-bg-base': 'rgb(14,19,26)',
    '--dsw-specific-input-major': 'rgb(25,34,44)',
  }), {})
})

test('repairTokens 把三笔修补合在一起，且不改其它令牌', () => {
  const out = repairTokens('light', GREEN_PAPER)
  assert.deepEqual(Object.keys(out).sort(), [
    ...SHADOW_TOKEN_NAMES,
    '--dsw-specific-input-major',
    '--dsw-linear-gradient-think',
    '--dsw-linear-think-select',
  ].sort())
  assert.ok(!('--dsw-alias-bg-base' in out), '动了纸色')
  assert.ok(!('--dsw-alias-label-primary' in out), '动了墨色')
})

/* ── 思考块渐变 ── */

test('渐变从主题自己的表面淡出，不再是硬编码的白/近黑', () => {
  const light = repairThinkGradients('light', {
    '--dsw-alias-bg-base': 'rgb(246,253,247)',
    '--dsw-specific-selector': 'rgb(231,239,233)',
  })
  assert.equal(light['--dsw-linear-gradient-think'],
    'linear-gradient(180deg, rgb(246, 253, 247) 20.19%, rgba(246, 253, 247, 0) 100%)')
  assert.equal(light['--dsw-linear-think-select'],
    'linear-gradient(180deg, rgb(231, 239, 233) 20.19%, rgba(231, 239, 233, 0) 100%)')
  assert.ok(!JSON.stringify(light).includes('#fff'))
})

test('停靠位与 alpha 段一个字没动（20.19% / 透明到 100%）', () => {
  for (const scheme of ['light', 'dark'] as const) {
    const out = repairThinkGradients(scheme, {
      '--dsw-alias-bg-base': 'rgb(14,19,26)',
      '--dsw-alias-bg-layer-1': 'rgb(16,23,31)',
      '--dsw-specific-selector': 'rgb(36,46,57)',
    })
    for (const v of Object.values(out)) {
      assert.match(v, /^linear-gradient\(180deg, rgb\([^)]+\) 20\.19%, rgba\([^)]+, 0\) 100%\)$/, scheme)
    }
  }
})

test('暗色的 select 渐变停在 bg-layer-1（harness 那一支就是它）', () => {
  const dark = repairThinkGradients('dark', {
    '--dsw-alias-bg-base': 'rgb(14,19,26)',
    '--dsw-alias-bg-layer-1': 'rgb(16,23,31)',
    '--dsw-specific-selector': 'rgb(36,46,57)',
  })
  assert.match(dark['--dsw-linear-think-select'], /rgb\(16, 23, 31\)/)
})

test('缺令牌时不生造：对应那一项直接不输出', () => {
  assert.deepEqual(repairThinkGradients('light', {}), {})
  const partial = repairThinkGradients('light', { '--dsw-alias-bg-base': 'rgb(1,2,3)' })
  assert.deepEqual(Object.keys(partial), ['--dsw-linear-gradient-think'])
})
