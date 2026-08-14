/*
 * 客户端产物的装载锁 · Load-time lock for the built client bundle
 * ---------------------------------------------------------------
 * 跑法：pnpm build && node --test test/bundle.test.ts
 * 没有 lib/client.js 时整组跳过（并明说跳了）—— 它测的是**产物**，不是源码。
 *
 * 这一组盯的是只有真正装载一次才会暴露的东西：闭包工厂的 id 校验、96 套主题的
 * 注册载荷形状、disposer 是否真的成对、设置页有没有挂进槽、以及深链启动路径。
 * 过去这些靠一次浏览器实测撑着，现在每次 build 之后都能跑。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { runInThisContext } from 'node:vm'

const BUNDLE = new URL('../lib/client.js', import.meta.url)
const built = existsSync(BUNDLE)

interface Registered { id: string; colorScheme: string; tokens: Record<string, string> }

/** 装一次 bundle，返回它注册了什么。 */
function loadBundle(hash = '', seedStorage: Record<string, string> = {}) {
  const registered: Registered[] = []
  const payloadKeys: string[][] = []
  const setThemeCalls: string[] = []
  const slots: { def: Record<string, unknown>; component: unknown }[] = []
  const disposers: (() => void)[] = []
  const listeners = new Map<string, ((...args: unknown[]) => void)[]>()
  const stored = new Map<string, string>(Object.entries(seedStorage))
  let loadedId: string | undefined
  let preference = 'system'
  let ground = 'rgb(255,255,255)'

  const react = {
    useEffect() {}, useMemo(fn: () => unknown) { return fn() }, useState(v: unknown) { return [v, () => {}] },
  }
  const requireShim = (id: string): unknown => {
    if (id === 'react') return react
    if (id === 'react/jsx-runtime' || id === 'react-dom' || id === 'react-dom/client') return { jsx: () => null, jsxs: () => null }
    return {}
  }

  const ctx = {
    effect(callback: () => (() => void) | void, _label?: string) {
      const dispose = callback()
      if (typeof dispose === 'function') disposers.push(dispose)
      return () => {}
    },
    on(event: string, listener: (...args: unknown[]) => void) {
      const list = listeners.get(event) ?? []
      list.push(listener)
      listeners.set(event, list)
      return () => {}
    },
    theme: {
      register(definition: Registered) {
        payloadKeys.push(Object.keys(definition))
        registered.push(definition)
        return () => { registered.splice(registered.indexOf(definition), 1) }
      },
      setTheme(id: string) { setThemeCalls.push(id); preference = id },
      getTheme() { return { preference } },
    },
    locale: {
      register(_ns: string, _dicts: unknown) { return () => {} },
      bind(_ns: string) { return (key: string) => key },
    },
    slots: {
      inject(_name: string, callback: () => void) { callback(); return () => {} },
      register(def: Record<string, unknown>, component: unknown) { slots.push({ def, component }); return () => {} },
    },
  }

  const g = globalThis as Record<string, unknown>
  g.window = globalThis
  g.location = { hash }
  g.addEventListener = () => {}
  g.removeEventListener = () => {}
  g.localStorage = {
    getItem: (k: string) => stored.get(k) ?? null,
    setItem: (k: string, v: string) => { stored.set(k, v) },
    removeItem: (k: string) => { stored.delete(k) },
  }
  g.document = {
    body: {
      style: { getPropertyValue: (name: string) => (name === '--dsw-alias-bg-base' ? ground : '') },
      hasAttribute: () => false,
    },
  }

  let plugin: { name?: string; inject?: string[]; apply?: (ctx: unknown, config?: unknown) => void } = {}
  g.__ModuleLoader__ = {
    load({ id, factory }: { id: string; factory: (require: (id: string) => unknown) => unknown }) {
      loadedId = id
      plugin = factory(requireShim) as typeof plugin
    },
  }

  runInThisContext(readFileSync(BUNDLE, 'utf8'), { filename: 'lib/client.js' })

  return {
    get id() { return loadedId },
    plugin, ctx, registered, payloadKeys, setThemeCalls, slots, disposers, stored,
    emit(event: string, payload: unknown) { for (const l of listeners.get(event) ?? []) l(payload) },
    setGround(value: string) { ground = value },
    /**
     * 跑掉所有 disposer。必须调 —— stub 的 DOM 永远不会「落地」，重试链会一直
     * 挂着定时器把测试进程拖住 5 秒；顺带这也在断言 dispose 真的把定时器清了。
     */
    teardown() { for (const dispose of [...disposers].reverse()) dispose() },
  }
}

test('产物的闭包工厂 id 等于包名（harness 装载后要校验这一行）', { skip: !built && 'lib/client.js 未构建' }, () => {
  const world = loadBundle()
  assert.equal(world.id, 'dsh-theme-plugin')
  assert.equal(world.plugin.name, 'theme-zhongguo')
  assert.deepEqual(world.plugin.inject, ['theme', 'slots', 'locale'])
})

test('注册 96 套主题，每套只传 ThemeDefinition 的三个字段 × 89 个令牌', { skip: !built && 'lib/client.js 未构建' }, () => {
  const world = loadBundle()
  world.plugin.apply!(world.ctx)

  assert.equal(world.registered.length, 96)
  assert.equal(new Set(world.registered.map(t => t.id)).size, 96, '有重复 id')
  assert.equal(world.registered.filter(t => t.colorScheme === 'light').length, 48)

  for (const keys of world.payloadKeys) {
    assert.deepEqual([...keys].sort(), ['colorScheme', 'id', 'tokens'], '注册载荷混进了 provenance 字段')
  }
  for (const t of world.registered) {
    assert.equal(Object.keys(t.tokens).length, 89, `${t.id} 的令牌数不是 89`)
    assert.ok(Object.keys(t.tokens).every(k => k.startsWith('--dsw-')), `${t.id} 有非 --dsw-* 令牌`)
  }
  world.teardown()
})

test('disposer 成对：全部释放后注册表清空', { skip: !built && 'lib/client.js 未构建' }, () => {
  const world = loadBundle()
  world.plugin.apply!(world.ctx)
  assert.equal(world.registered.length, 96)

  for (const dispose of [...world.disposers].reverse()) dispose()
  assert.equal(world.registered.length, 0, '卸载后仍有主题挂在注册表里')
})

test('设置页挂进 settings.section，位置可由配置改', { skip: !built && 'lib/client.js 未构建' }, () => {
  const world = loadBundle()
  world.plugin.apply!(world.ctx, { settingsOrder: 7 })

  assert.equal(world.slots.length, 1)
  assert.equal(world.slots[0].def.name, 'settings.section')
  assert.equal(world.slots[0].def.id, 'theme-zhongguo')
  assert.equal(world.slots[0].def.order, 7)
  assert.equal(typeof world.slots[0].component, 'function')
  world.teardown()
})

test('#theme= 深链在启动时生效，并被记住', { skip: !built && 'lib/client.js 未构建' }, () => {
  const world = loadBundle('#theme=zhuqing-light')
  world.plugin.apply!(world.ctx)

  assert.ok(world.setThemeCalls.includes('zhuqing-light'), '深链没有在启动时套用')
  assert.equal(world.stored.get('dsh:theme-zhongguo:theme'), 'zhuqing-light')
  world.teardown()
})

test('启动时从 localStorage 恢复上次选择（"选完刷新就复原"的回归锁）', { skip: !built && 'lib/client.js 未构建' }, () => {
  const world = loadBundle('', { 'dsh:theme-zhongguo:theme': 'daizi-dark' })
  world.plugin.apply!(world.ctx)

  assert.ok(world.setThemeCalls.includes('daizi-dark'), '刷新后没有恢复记住的主题')
  assert.equal(world.stored.get('dsh:theme-zhongguo:theme'), 'daizi-dark', '恢复过程把记忆改掉了')
  world.teardown()
})

test('启动恢复期间迟到的 adopt() 不会清掉记忆', { skip: !built && 'lib/client.js 未构建' }, () => {
  const world = loadBundle('', { 'dsh:theme-zhongguo:theme': 'daizi-dark' })
  world.plugin.apply!(world.ctx)
  // settings 作用域读回持久化偏好，盖掉我们 —— 这一刻我们的主题还没在 DOM 里出现过
  world.emit('theme/change', { preference: 'dark' })

  assert.equal(world.stored.get('dsh:theme-zhongguo:theme'), 'daizi-dark',
    '启动竞态里的 adopt 被当成了用户意图，记忆被销毁 —— 用户会看到"刷新一次永久复原"')
  world.teardown()
})

test('remember: false 时不写 localStorage', { skip: !built && 'lib/client.js 未构建' }, () => {
  const world = loadBundle('#theme=zhuqing-light')
  world.plugin.apply!(world.ctx, { remember: false })

  assert.ok(world.setThemeCalls.includes('zhuqing-light'))
  assert.equal(world.stored.size, 0)
  world.teardown()
})

test('hashSelector: false 时深链被忽略', { skip: !built && 'lib/client.js 未构建' }, () => {
  const world = loadBundle('#theme=zhuqing-light')
  world.plugin.apply!(world.ctx, { hashSelector: false })

  assert.deepEqual(world.setThemeCalls, [])
  world.teardown()
})

test('平台模块留在外部：页面里只能有一份 React', { skip: !built && 'lib/client.js 未构建' }, () => {
  const src = readFileSync(BUNDLE, 'utf8')

  // 这两条 require 是"我们没有自带 React"的正面证据。
  assert.match(src, /require\("react"\)/, 'react 没有被 require —— 它被打进产物了')
  assert.match(src, /require\("react\/jsx-runtime"\)/, 'jsx-runtime 没有被 require')

  // 反面证据：React 自己的错误文案只会出现在 React 源码里。第二份 React 进了页面，
  // 槽里组件的每个 hook 都会炸（Cannot read properties of null (reading 'useState')），
  // 而产物只大 60KB —— 肉眼几乎看不出来，所以这条断言是唯一的防线。
  for (const marker of ['Invalid hook call', 'ReactCurrentDispatcher', '__SECRET_INTERNALS']) {
    assert.ok(!src.includes(marker), `产物里含 React 源码标记 ${JSON.stringify(marker)}`)
  }
})

test('ctx.theme 缺席时降级为 no-op，而不是 boot 期抛错', { skip: !built && 'lib/client.js 未构建' }, () => {
  const world = loadBundle()
  const ctx = { ...world.ctx, theme: undefined }
  assert.doesNotThrow(() => { world.plugin.apply!(ctx) })
  assert.equal(world.registered.length, 0)
})
