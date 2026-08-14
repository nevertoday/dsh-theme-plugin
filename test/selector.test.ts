/*
 * 主题选择状态机的行为锁 · Behavioural lock for the theme selector
 * ---------------------------------------------------------------
 * 跑法：node --test test/   （Node ≥ 23.6 直接跑 .ts，无需构建）
 *
 * 这些用例存在的理由，是数据闸门（scripts/check-contrast.mjs）管不到的那一半：
 * 96 套主题的颜色有 2208 行断言看着，而"选中之后到底会不会生效、会不会跟用户
 * 抢、卸载之后还有没有定时器活着"过去只有一次浏览器实测撑着。下面每个 test
 * 名字对应一条曾经真实存在或差点存在的缺陷。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createThemeSelector, type SelectorDeps, type SelectorOptions } from '../src/client/selector.ts'

const GROUNDS: Record<string, string> = {
  'zhuqing-light': 'rgb(246,253,247)',
  'qunqing-dark': 'rgb(14,19,26)',
}
/** 内置偏好写在页面上的底色 —— 谁都没生效时 appliedGround() 就是它。 */
const BUILTIN_GROUND = 'rgb(255,255,255)'

function makeWorld() {
  let applied = BUILTIN_GROUND
  let clock = 1_000
  let nextTimer = 1
  const timers = new Map<number, { at: number; fn: () => void }>()
  const calls: string[] = []
  const warnings: string[] = []

  const deps: SelectorDeps = {
    isKnown: id => id in GROUNDS,
    expectedGround: id => GROUNDS[id],
    appliedGround: () => applied,
    // 关键：setTheme 默认**不**改 applied —— 模拟 presenter 还没把它写进 DOM。
    setTheme: id => { calls.push(id) },
    now: () => clock,
    setTimer: (fn, ms) => { const id = nextTimer++; timers.set(id, { at: clock + ms, fn }); return id },
    clearTimer: handle => { timers.delete(handle as number) },
    warn: message => { warnings.push(message) },
  }

  return {
    deps, calls, warnings,
    /** 还挂着的定时器数量 —— 重叠重试链与卸载泄漏都靠它取证。 */
    get pending(): number { return timers.size },
    /** presenter 终于把某套主题写进了 DOM。 */
    present(id: string): void { applied = GROUNDS[id] },
    /**
     * 时间前进 ms。逐个定时器推进（clock 停在每个到期时刻再跑它），否则
     * 回调里新排的退避会因为 clock 已经跳到终点而永远轮不到 —— 那样测出来的
     * 重试次数会假性偏低。
     */
    advance(ms: number): void {
      const target = clock + ms
      for (;;) {
        const next = [...timers.entries()]
          .filter(([, t]) => t.at <= target)
          .sort((a, b) => a[1].at - b[1].at)[0]
        if (next === undefined) { clock = target; return }
        clock = next[1].at
        timers.delete(next[0])
        next[1].fn()
      }
    },
  }
}

const selectorFor = (world: ReturnType<typeof makeWorld>, options?: SelectorOptions) =>
  createThemeSelector(world.deps, { initialPreference: 'system', ...options })

test('认不出的 id 被拒绝并告警，而不是静默吞掉', () => {
  const world = makeWorld()
  const selector = selectorFor(world)

  assert.equal(selector.choose('no-such-theme'), false)
  assert.deepEqual(world.calls, [])
  assert.equal(world.warnings.length, 1)
  assert.match(world.warnings[0], /unknown theme id/)
})

test('选中后持续断言，直到 presenter 真的把它写进 DOM', () => {
  const world = makeWorld()
  const selector = selectorFor(world)

  assert.equal(selector.choose('zhuqing-light'), true)
  assert.deepEqual(world.calls, ['zhuqing-light'])      // 立即写一次

  world.advance(150)
  assert.equal(world.calls.length, 2)                    // DOM 里还没有 → 再写

  world.present('zhuqing-light')                         // presenter 落地
  world.advance(1_000)
  assert.equal(world.calls.length, 2)                    // 不再多写
  assert.equal(world.pending, 0)                         // 也不再挂定时器
})

test('presenter 一直不落地时，重试有上限且会告警收场', () => {
  const world = makeWorld()
  selectorFor(world).choose('zhuqing-light')

  world.advance(60_000)
  assert.equal(world.calls.length, 8)                    // maxAttempts 默认 8
  assert.equal(world.pending, 0)
  assert.equal(world.warnings.filter(w => /did not reach the DOM/.test(w)).length, 1)
})

test('连点两套主题不会留下两条并行的重试链（单飞）', () => {
  const world = makeWorld()
  const selector = selectorFor(world)

  selector.choose('zhuqing-light')
  assert.equal(world.pending, 1)

  selector.choose('qunqing-dark')                        // 第一条链的定时器必须被掐掉
  assert.equal(world.pending, 1, '重叠的重试链：旧定时器没被清理')

  world.advance(150)
  assert.equal(selector.desired, 'qunqing-dark')
  assert.equal(world.calls.filter(c => c === 'zhuqing-light').length, 1, '旧链还在把旧主题写回去')
})

test('dispose 之后没有定时器活着，也不会再调 setTheme', () => {
  const world = makeWorld()
  const selector = selectorFor(world)

  selector.choose('zhuqing-light')
  selector.choose('qunqing-dark')                        // 制造过去会泄漏的那个场景
  selector.dispose()

  assert.equal(world.pending, 0, '卸载后仍有定时器挂着 —— 它会对着已 dispose 的 ctx 调 setTheme')
  const after = world.calls.length
  world.advance(60_000)
  assert.equal(world.calls.length, after)
})

test('启动窗口内被覆盖：重新断言（这才是竞态防护该做的）', () => {
  const world = makeWorld()
  const selector = selectorFor(world, { maxAttempts: 1 })

  selector.choose('zhuqing-light')
  assert.equal(world.calls.length, 1)

  selector.onPreference('dark')                          // settings 读回持久化偏好，盖掉我们
  assert.equal(selector.desired, 'zhuqing-light')
  assert.equal(world.calls.length, 2, '启动窗口内没有重新断言')
})

test('启动窗口过后用户改偏好：让位，不再抢', () => {
  const world = makeWorld()
  const selector = selectorFor(world, { bootRaceMs: 5_000 })

  selector.choose('zhuqing-light')
  world.present('zhuqing-light')
  world.advance(30_000)                                  // 启动窗口早过了
  const before = world.calls.length

  selector.onPreference('light')                         // 用户在内置 Appearance 行点了 Light
  assert.equal(selector.desired, undefined, '插件仍想抢回自己的主题')
  assert.equal(world.pending, 0)

  world.advance(10_000)
  assert.equal(world.calls.length, before, '让位之后又把用户的选择顶回去了')
})

test('重新断言的额度不会随时间补满（抢夺不能长期驻留）', () => {
  const world = makeWorld()
  const selector = selectorFor(world, { maxAttempts: 1, maxReasserts: 5 })

  selector.choose('zhuqing-light')                       // 1 次
  for (let i = 0; i < 10; i++) selector.onPreference('dark')

  assert.equal(world.calls.length, 6, '额度被补满了：1 次选择 + 最多 5 次重新断言')
  assert.equal(world.warnings.filter(w => /gave up re-asserting/.test(w)).length, 1)
})

test('reset 交还我们接手之前那个偏好，而不是硬写 system', () => {
  const world = makeWorld()
  const selector = selectorFor(world, { initialPreference: 'system' })

  selector.choose('zhuqing-light')
  selector.onPreference('dark')                          // 从这次 adopt() 学到持久化偏好是 dark
  assert.equal(selector.fallback, 'dark')

  selector.reset()
  assert.equal(world.calls.at(-1), 'dark')
  assert.equal(selector.desired, undefined)
  assert.equal(world.pending, 0)
})

test('回退目标不会变成本插件自己的 id', () => {
  const world = makeWorld()
  const selector = selectorFor(world)

  selector.choose('zhuqing-light')
  selector.onPreference('qunqing-dark')                  // 另一套我们自己的主题
  assert.equal(selector.fallback, 'system')
})
