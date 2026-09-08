/*
 * setTheme 拦截器的行为锁 · Behavioural lock for the setTheme tap
 * ---------------------------------------------------------------
 * 跑法：pnpm test（tsx --test test/*.test.ts）
 *
 * 这一组守的是 issue #1 修复的那块地基：「这次 theme/change 是谁发的」必须**看**
 * 得出来，而不是靠时间窗猜。所以每条用例对应一种会让这个判据失真的情形 ——
 * 嵌套调用、this 丢失、卸载没还原、宿主被冻结。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tapSetTheme, type SetThemeHost } from '../src/client/intercept.ts'

/** 原方法挂在**原型**上 —— 真实的 ThemeRuntime 就是这样。 */
class FakeRuntime implements SetThemeHost {
  readonly calls: string[] = []
  readonly selfIsInstance: boolean[] = []
  setTheme(id: string): void {
    this.calls.push(id)
    this.selfIsInstance.push(this instanceof FakeRuntime)
  }
}

const collect = () => {
  const warnings: string[] = []
  return { warnings, warn: (m: string) => { warnings.push(m) } }
}

test('别人调 setTheme：调用期间 foreign 就是那个 id，返回后清空', () => {
  const host = new FakeRuntime()
  const { warn } = collect()
  const tap = tapSetTheme(host, warn)

  assert.equal(tap.active, true)
  assert.equal(tap.foreign, undefined)
  host.setTheme('light')
  assert.deepEqual(host.calls, ['light'])
  assert.equal(tap.foreign, undefined, '调用结束后 foreign 没清 —— 下一次 adopt 会被误判成显式切换')
})

test('theme/change 是同步发的：监听器里读到的 foreign 就是本次的 id', () => {
  // 真实宿主在 setTheme 内部同步 emit，这是整个判据成立的前提。
  const seen: (string | undefined)[] = []
  let tap: ReturnType<typeof tapSetTheme>
  const host: SetThemeHost = {
    setTheme(id: string) { seen.push(tap.foreign); void id },
  }
  const { warn } = collect()
  tap = tapSetTheme(host, warn)

  host.setTheme('dark')
  assert.deepEqual(seen, ['dark'], '同步监听器没能看到 foreign —— 显式切换会被当成 adopt')
  assert.equal(tap.foreign, undefined)
})

test('own() 里的调用不算别人的', () => {
  const host = new FakeRuntime()
  const { warn } = collect()
  const tap = tapSetTheme(host, warn)
  const seen: (string | undefined)[] = []

  tap.own(() => {
    host.setTheme('zhuqing-light')
    seen.push(tap.foreign)
  })

  assert.deepEqual(seen, [undefined], '我们自己发的 setTheme 被当成了用户显式切换 —— 会立刻自我让位')
  assert.deepEqual(host.calls, ['zhuqing-light'])
})

test('own() 的返回值原样透传，异常也能正确出栈', () => {
  const host = new FakeRuntime()
  const { warn } = collect()
  const tap = tapSetTheme(host, warn)

  assert.equal(tap.own(() => 42), 42)
  assert.throws(() => tap.own(() => { throw new Error('boom') }), /boom/)

  // 出栈没做干净的话，之后别人的调用会被永久当成"我们自己的"。
  const seen: (string | undefined)[] = []
  const probe: SetThemeHost = { setTheme() { seen.push(tap2.foreign) } }
  const tap2 = tapSetTheme(probe, warn)
  probe.setTheme('light')
  assert.deepEqual(seen, ['light'])
  tap.dispose(); tap2.dispose()
})

test('可重入：原方法内部再触发一次调用，外层的 foreign 不被内层清掉', () => {
  const seen: string[] = []
  let depth = 0
  let tap: ReturnType<typeof tapSetTheme>
  const host: SetThemeHost = {
    setTheme(id: string) {
      depth++
      if (depth === 1) host.setTheme('nested')            // 宿主内部的连锁调用
      seen.push(`${id}:${String(tap.foreign)}`)
      depth--
    },
  }
  const { warn } = collect()
  tap = tapSetTheme(host, warn)

  host.setTheme('outer')
  // 内层先返回；此刻外层那次仍在执行中，foreign 必须还是 'outer'。
  assert.deepEqual(seen, ['nested:nested', 'outer:outer'])
  assert.equal(tap.foreign, undefined)
})

test('this 绑定保住：实例方法与裸调都能拿到宿主', () => {
  const host = new FakeRuntime()
  const { warn } = collect()
  const tap = tapSetTheme(host, warn)

  host.setTheme('a')                                      // this = 实例
  const bare = host.setTheme
  bare('b')                                               // this = undefined，应回落到 host
  assert.deepEqual(host.calls, ['a', 'b'])
  assert.deepEqual(host.selfIsInstance, [true, true], 'this 丢了 —— 宿主内部会对着 undefined 取字段')
  tap.dispose()
})

test('dispose 还原原型方法：实例上不再留自有属性', () => {
  const host = new FakeRuntime()
  const { warn } = collect()
  const tap = tapSetTheme(host, warn)
  assert.equal(Object.hasOwn(host, 'setTheme'), true)

  tap.dispose()
  assert.equal(Object.hasOwn(host, 'setTheme'), false, '卸载后实例上还挂着我们的包装层')
  assert.equal(host.setTheme, FakeRuntime.prototype.setTheme)

  host.setTheme('light')
  assert.deepEqual(host.calls, ['light'])
  assert.equal(tap.foreign, undefined)
  assert.equal(tap.active, false)
})

test('dispose 还原自有属性形态的原方法（对象字面量宿主）', () => {
  const calls: string[] = []
  const original = (id: string): void => { calls.push(id) }
  const host: SetThemeHost = { setTheme: original }
  const { warn } = collect()
  const tap = tapSetTheme(host, warn)
  assert.notEqual(host.setTheme, original)

  tap.dispose()
  assert.equal(host.setTheme, original, '自有属性被删掉了 —— 宿主的 setTheme 直接消失')
  host.setTheme('dark')
  assert.deepEqual(calls, ['dark'])
})

test('别人在我们之上又包了一层时，dispose 不去拆它', () => {
  const host = new FakeRuntime()
  const { warn } = collect()
  const tap = tapSetTheme(host, warn)
  const ours = host.setTheme
  const outer = (id: string): void => { ours.call(host, id) }
  ;(host as { setTheme: unknown }).setTheme = outer

  tap.dispose()
  assert.equal(host.setTheme, outer, '把别人的补丁一起拆掉了')
})

test('宿主被冻结：active=false、只告警一次，调用照旧能走通', () => {
  const host = Object.freeze(new FakeRuntime())
  const { warnings, warn } = collect()
  const tap = tapSetTheme(host, warn)

  assert.equal(tap.active, false)
  assert.equal(warnings.length, 1, '冻结宿主应当恰好告警一次')
  assert.equal(tap.foreign, undefined)

  host.setTheme('light')                                  // 原方法必须还在工作
  assert.deepEqual(host.calls, ['light'])

  assert.doesNotThrow(() => { tap.dispose() })
  assert.equal(tap.own(() => 7), 7)
})
