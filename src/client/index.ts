import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the ctx.theme Context merge + ThemeDefinition.
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import { THEMES } from '../themes.generated.js'
import { repairTokens } from '../repairs.ts'
import { createThemeSelector } from './selector.ts'
import { ThemeSection, type ThemeRow } from './ThemeSection.tsx'
import { en, zh } from './locales.ts'

export const name = 'theme-zhongguo'
// Client-side inject uses SERVICE names (the package-name form lives in
// package.json's dsh.client.inject manifest field). `slots` + `locale` are
// what the settings page needs; the target slot itself is waited on through
// slots.inject(), not through this list.
export const inject = ['theme', 'slots', 'locale']

/** Locale namespace owning this plugin's settings-page copy. */
const NS = 'settings.theme-zhongguo'
/**
 * Where a remembered selection lives. Per-browser, per-origin.
 *
 * Keyed on the *plugin* name (`theme-zhongguo`), not the npm package name:
 * renaming the package must not orphan everyone's remembered pick. The `dsh:`
 * prefix keeps it out of the way of the harness's own origin-wide keys.
 */
const STORE_KEY = 'dsh:theme-zhongguo:theme'
const THEME_ID = /^[a-z0-9-]+$/

const log = (message: string): void => { console.info(`[dsh-theme-plugin] ${message}`) }
const warn = (message: string): void => { console.warn(`[dsh-theme-plugin] ${message}`) }

export function apply(ctx: ClientContext): void {
  // Defensive: inject ['theme'] should guarantee the service, but if the
  // plugin is ever composed without ui-theme, degrade to a logged no-op
  // instead of throwing during boot.
  const theme = (ctx as { theme?: { register?: unknown } }).theme
  if (!theme || typeof theme.register !== 'function') {
    warn('ctx.theme unavailable — no themes registered')
    return
  }
  // 修补后的令牌，每套主题算一次。**注册与直写 DOM 的绘制路径共用这一份** ——
  // 只修其中一条，画出来的就是没修的那份（实机踩过：绘制层用原始 tokens，于是
  // body 上永远是 89 个令牌、阴影仍是中性灰）。见 src/repairs.ts。
  const painted = new Map(
    THEMES.map(t => [t.id, { ...t.tokens, ...repairTokens(t.colorScheme, t.tokens) }] as const),
  )

  let failed = 0
  for (const t of THEMES) {
    try {
      // ctx.effect ties the disposer returned by register() to plugin
      // unload / HMR, so every theme unregisters cleanly.
      //
      // Only the three ThemeDefinition fields are forwarded. Every other
      // key on the generated row (nameZh/nameEn, family/familyNote, paperHue,
      // seal*/link/err|suc|wrn names, identityShiftDL, degraded) is
      // provenance for the generator, README and preview page — it is
      // deliberately NOT passed to register(), which has no such fields.
      const tokens = painted.get(t.id)!
      ctx.effect(
        () => ctx.theme.register({ id: t.id, colorScheme: t.colorScheme, tokens }),
        `theme-zhongguo: ${t.id}`,
      )
    } catch (err) {
      // One bad row (e.g. duplicate id) must not kill the whole roster.
      warn(`failed to register ${t.id}: ${String(err)}`)
      failed++
    }
  }
  // One boot line, no per-theme noise: the built-in Appearance row only lists
  // light/dark/system, so this is the only place a user can see whether the
  // roster actually arrived in the page.
  const lights = THEMES.filter(t => t.colorScheme === 'light').length
  log(`registered ${THEMES.length - failed}/${THEMES.length} themes`
    + ` (${lights} light / ${THEMES.length - lights} dark)`)

  /* ── 选择 ──
   * 内置 Appearance 行只渲染 light/dark/system（它自己 schema 里的
   * THEME_PREFERENCES），所以注册过的第三方 id 在那里没有产品入口。替代入口有两个：
   * 本函数末尾注册的设置页与 `#theme=` 深链。两条都走 selector，于是 DOM
   * 自验证重试与「用户改了就让位」对二者一致生效。 */
  const ids = new Set(THEMES.map(t => t.id))
  const grounds = new Map(THEMES.map(t => [t.id, t.tokens['--dsw-alias-bg-base']]))

  const themeFromHash = (): string | undefined => {
    const id = new URLSearchParams(location.hash.slice(1)).get('theme') ?? undefined
    return id !== undefined && THEME_ID.test(id) ? id : undefined
  }

  /** A picker action supersedes an old deep link; keep unrelated hash params. */
  const clearThemeFromHash = (): void => {
    const params = new URLSearchParams(location.hash.slice(1))
    if (!params.has('theme')) return
    params.delete('theme')
    const hash = params.toString()
    try {
      history.replaceState(history.state, '', `${location.pathname}${location.search}${hash ? `#${hash}` : ''}`)
    } catch {
      // A restricted history implementation should not prevent theme selection.
    }
  }

  const readPreference = (): string => {
    try {
      return ctx.theme.getTheme().preference
    } catch {
      return 'system'
    }
  }

  // localStorage 可能被隐私模式/配额拒绝，读写都不许把 boot 弄挂。
  const store = {
    read(): string | undefined {
      try {
        const v = localStorage.getItem(STORE_KEY)
        return v !== null && THEME_ID.test(v) ? v : undefined
      } catch { return undefined }
    },
    write(id: string): void {
      try { localStorage.setItem(STORE_KEY, id) } catch { /* 记不住就算了，不是错误 */ }
    },
    clear(): void {
      try { localStorage.removeItem(STORE_KEY) } catch { /* 同上 */ }
    },
  }

  // 用户最近一次真实交互的时刻。区分"用户在内置 Appearance 行点了 Light"和
  // "框架又 adopt 了一次持久化偏好"只能靠这个 —— 两者的 theme/change 一模一样。
  let lastInputAt = 0
  const noteInput = (): void => { lastInputAt = Date.now() }
  ctx.effect(() => {
    const opts = { capture: true, passive: true } as const
    addEventListener('pointerdown', noteInput, opts)
    addEventListener('keydown', noteInput, opts)
    return () => {
      removeEventListener('pointerdown', noteInput, opts)
      removeEventListener('keydown', noteInput, opts)
    }
  }, 'theme-zhongguo: user-activity probe')

  // 直接写 DOM 的令牌绘制 —— 不依赖 presenter 的重绘往返。
  //
  // 为什么需要它：settings scope 启动时会多次 adopt() 内置偏好，每次 emit
  // theme/change、presenter 同步把 body 重画成内置主题；插件再重新断言又画回来。
  // 中间态如果在任务边界上落了一帧，就是可见的闪动（实机刷新实测来回 5 次）。
  // 这里在**同一个任务里**就把我们的令牌写进 body，任务末尾（浏览器绘制前）再
  // 补一次，于是无论监听器顺序如何，画出来的始终是我们的主题。
  //
  // paintedTokens 记我们写过的名字：换主题/复位/让位时先撤掉，免得 presenter 只
  // 撤它自己写的那份、把我们残留的令牌留在 body 上（内置主题不写 --dsw-alias-*，
  // 残留的会盖住内置底色）。
  let paintedTokens: string[] = []
  const rootStyle = document.documentElement.style
  const originalColorScheme = rootStyle.getPropertyValue('color-scheme')
  const originalDarkMarker = document.body?.hasAttribute('data-ds-dark-theme') ?? false
  const restoreGlobalAppearance = (): void => {
    if (originalColorScheme === '') rootStyle.removeProperty('color-scheme')
    else rootStyle.setProperty('color-scheme', originalColorScheme)
    const body = document.body
    if (!body) return
    if (originalDarkMarker) body.setAttribute('data-ds-dark-theme', '')
    else body.removeAttribute('data-ds-dark-theme')
  }
  const paintTheme = (id: string | undefined): void => {
    const body = document.body
    if (!body) return
    for (const name of paintedTokens) body.style.removeProperty(name)
    paintedTokens = []
    if (id === undefined) return
    const theme = THEMES.find(t => t.id === id)
    if (!theme) return
    document.documentElement.style.colorScheme = theme.colorScheme
    if (theme.colorScheme === 'dark') body.setAttribute('data-ds-dark-theme', '')
    else body.removeAttribute('data-ds-dark-theme')
    // 画修补后的那份，与 register 完全一致（painted，而不是 theme.tokens）。
    for (const [name, value] of Object.entries(painted.get(id) ?? theme.tokens)) {
      body.style.setProperty(name, value)
      paintedTokens.push(name)
    }
  }
  // 任务结束、浏览器绘制前再补一次。同一次 theme/change 里 presenter 的监听器
  // 若注册在我们后面，它同步画完会盖掉我们的同步绘制；microtask 排在所有同步
  // 监听器之后、浏览器绘制之前，能稳定赢回来。desired 变了就不画（防过期）。
  const repaintTheme = (id: string): void => {
    queueMicrotask(() => { if (selector.desired === id) paintTheme(id) })
  }

  let selector: ReturnType<typeof createThemeSelector>
  selector = createThemeSelector({
    isKnown: id => ids.has(id),
    expectedGround: id => grounds.get(id),
    // presenter 真正写入的地方就是这里 —— 服务快照会说谎（它记的是我们请求的值），
    // body 上的内联令牌不会。
    appliedGround: () => document.body.style.getPropertyValue('--dsw-alias-bg-base').trim(),
    setTheme: (id) => {
      try { ctx.theme.setTheme(id) } catch (err) { warn(`setTheme(${id}) failed: ${String(err)}`) }
    },
    paint: paintTheme,
    repaint: repaintTheme,
    retract: () => { paintTheme() },
    userActiveWithin: ms => Date.now() - lastInputAt <= ms,
    now: () => Date.now(),
    setTimer: (fn, ms) => setTimeout(fn, ms),
    clearTimer: (handle) => { clearTimeout(handle as ReturnType<typeof setTimeout>) },
    warn,
  }, { initialPreference: readPreference() })

  /** 用户的一次明确选择：记住它，这样刷新后还在。 */
  const chooseAndRemember = (id: string): void => {
    if (selector.choose(id)) store.write(id)
  }
  const select = (id: string): void => {
    clearThemeFromHash()
    chooseAndRemember(id)
  }
  /** 交还内置偏好，并忘掉记住的选择（否则刷新又把它拉回来）。 */
  const reset = (): void => {
    clearThemeFromHash()
    restoreGlobalAppearance()
    selector.reset()
    store.clear()
  }

  const applyFromHash = (): void => {
    const id = themeFromHash()
    if (id !== undefined) chooseAndRemember(id)
  }

  ctx.on('theme/change', (snapshot: { preference: string }) => {
    const before = selector.desired
    selector.onPreference(snapshot.preference)
    // 只有"判定了用户意图"的让位才清记忆。启动竞态里放弃**绝不能清** ——
    // 一次迟到的 adopt() 会顺手销毁用户记住的选择，表现就是"选完刷新永久复原"。
    if (before !== undefined && selector.desired === undefined && selector.yieldedToUser) {
      store.clear()
    }
  })

  ctx.effect(() => {
    addEventListener('hashchange', applyFromHash)
    return () => {
      removeEventListener('hashchange', applyFromHash)
      restoreGlobalAppearance()
      selector.dispose()
    }
  }, 'theme-zhongguo: #theme= hash selector')

  // 启动优先级：深链 > 记住的上次选择。两者都来自用户动作。
  const hashId = themeFromHash()
  if (hashId !== undefined) {
    chooseAndRemember(hashId)                        // 点进一条深链也是一次选择
  } else {
    const bootId = store.read()
    if (bootId !== undefined) selector.choose(bootId)
  }

  /* ── 设置页 ──
   * 一个顶级 settings.section。行数据在这里一次裁好（presentation 层只吃 props，
   * 不碰 ctx，也不该看见 89 个令牌那一大坨）。 */
  const rows: ThemeRow[] = THEMES.map(row => ({
    id: row.id,
    name: row.nameZh.replace(/·[亮暗]$/, ''),
    nameEn: row.nameEn.replace(/ (Light|Dark)$/, ''),
    pinyin: row.id.replace(/-(light|dark)$/, ''),
    anchorHex: row.anchorHex,
    colorScheme: row.colorScheme,
    family: row.family,
    sealName: row.sealName,
    sealHex: row.sealHex,
    sealWhy: row.sealWhy,
    sealRel: row.sealRel,
    curated: row.curated,
    // 色卡画的是**这套主题实际交付的三段**，不是满彩度的锚色原值。
    // 原先每行画 anchorHex：点「朱红」看见的是朱砂，装上却是一张淡色纸 ——
    // 那个预期落差比任何单个色值都伤品相。所见即所得。
    paperHex: row.tokens['--dsw-alias-bg-base'],
    veilHex: row.tokens['--dsw-specific-bubble'],
    focusHex: row.tokens['--dsw-alias-button-info-fill'],
  }))

  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'theme-zhongguo: settings copy')
  const tr = ctx.locale.bind(NS)
  // 自带一层报错面：宿主的 SlotErrorBoundary 只在 componentDidCatch 里 console.error
  // 一次，而它的 crash face 是粘住的 —— 等我们发现面板空白再去挂监听已经太晚。
  // 这一层把渲染失败变成一条带栈的、认得出是谁的日志。
  const Section = (props: Parameters<typeof ThemeSection>[0]): ReturnType<typeof ThemeSection> => {
    try {
      return ThemeSection(props)
    } catch (err) {
      console.error('[dsh-theme-plugin] settings section render failed:', err)
      throw err
    }
  }
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'theme-zhongguo',
    // Default 40: after 通用设置 / 模型 / 插件 / Agent 预设 — a palette is a
    // preference, not something to meet before the model is configured.
    order: 40,
    label: () => tr('nav'),
    locale: NS,
    inject: () => ({
      rows,
      // 面板打开时页面已经是暗的，就先给暗色那一支 —— 而不是恒从 light 开始。
      initialScheme: (document.body.hasAttribute('data-ds-dark-theme') ? 'dark' : 'light') as 'light' | 'dark',
      getPreference: readPreference,
      subscribe: (listener: () => void) => ctx.on('theme/change', listener),
      select,
      reset,
    }),
  }, Section))
}
