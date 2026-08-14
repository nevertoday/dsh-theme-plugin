import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the ctx.theme Context merge + ThemeDefinition.
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import { THEMES } from '../themes.generated.js'
import { normalizeConfig, THEME_ID, type Config } from '../config.ts'
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

const log = (message: string): void => { console.info(`[dsh-theme-plugin] ${message}`) }
const warn = (message: string): void => { console.warn(`[dsh-theme-plugin] ${message}`) }

export function apply(ctx: ClientContext, rawConfig?: unknown): void {
  // The client graph may or may not forward the cordis.yml config to a browser
  // row (unverified — see README limitations), so every field is defaulted here
  // rather than assumed present.
  const config: Config = normalizeConfig(rawConfig)

  // Defensive: inject ['theme'] should guarantee the service, but if the
  // plugin is ever composed without ui-theme, degrade to a logged no-op
  // instead of throwing during boot.
  const theme = (ctx as { theme?: { register?: unknown } }).theme
  if (!theme || typeof theme.register !== 'function') {
    warn('ctx.theme unavailable — no themes registered')
    return
  }
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
      ctx.effect(
        () => ctx.theme.register({ id: t.id, colorScheme: t.colorScheme, tokens: t.tokens }),
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
   * THEME_PREFERENCES），所以注册过的第三方 id 在那里没有产品入口。替代入口有三个：
   * 本函数末尾注册的设置页、`#theme=` 深链、以及配置里的 defaultTheme。三条都走
   * selector，于是 DOM 自验证重试与「用户改了就让位」对三者一致生效。 */
  const ids = new Set(THEMES.map(t => t.id))
  const grounds = new Map(THEMES.map(t => [t.id, t.tokens['--dsw-alias-bg-base']]))

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
      if (!config.remember) return undefined
      try {
        const v = localStorage.getItem(STORE_KEY)
        return v !== null && THEME_ID.test(v) ? v : undefined
      } catch { return undefined }
    },
    write(id: string): void {
      if (!config.remember) return
      try { localStorage.setItem(STORE_KEY, id) } catch { /* 记不住就算了，不是错误 */ }
    },
    clear(): void {
      try { localStorage.removeItem(STORE_KEY) } catch { /* 同上 */ }
    },
  }

  const selector = createThemeSelector({
    isKnown: id => ids.has(id),
    expectedGround: id => grounds.get(id),
    // presenter 真正写入的地方就是这里 —— 服务快照会说谎（它记的是我们请求的值），
    // body 上的内联令牌不会。
    appliedGround: () => document.body.style.getPropertyValue('--dsw-alias-bg-base').trim(),
    setTheme: (id) => {
      try { ctx.theme.setTheme(id) } catch (err) { warn(`setTheme(${id}) failed: ${String(err)}`) }
    },
    now: () => Date.now(),
    setTimer: (fn, ms) => setTimeout(fn, ms),
    clearTimer: (handle) => { clearTimeout(handle as ReturnType<typeof setTimeout>) },
    warn,
  }, { initialPreference: readPreference() })

  /** 用户的一次明确选择：记住它，这样刷新后还在。 */
  const select = (id: string): void => {
    if (selector.choose(id)) store.write(id)
  }
  /** 交还内置偏好，并忘掉记住的选择（否则刷新又把它拉回来）。 */
  const reset = (): void => {
    selector.reset()
    store.clear()
  }

  const applyFromHash = (): void => {
    const id = /(?:^|[#&])theme=([a-z0-9-]+)/.exec(location.hash)?.[1]
    if (id !== undefined) select(id)
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
    if (config.hashSelector) addEventListener('hashchange', applyFromHash)
    return () => {
      if (config.hashSelector) removeEventListener('hashchange', applyFromHash)
      selector.dispose()
    }
  }, 'theme-zhongguo: #theme= hash selector')

  // 启动优先级：深链 > 记住的上次选择 > 配置的 defaultTheme。
  // 前两者是用户动作，最后一个是部署者的默认值，所以顺序是这个顺序 ——
  // 也因此只有前者会被记住：把 defaultTheme 写进 localStorage 的话，部署方
  // 以后改了配置也再也送不到这个浏览器（storage 会把旧默认值钉死）。
  const hashId = config.hashSelector
    ? /(?:^|[#&])theme=([a-z0-9-]+)/.exec(location.hash)?.[1]
    : undefined
  if (hashId !== undefined) {
    select(hashId)                                   // 点进一条深链也是一次选择
  } else {
    const bootId = store.read() ?? config.defaultTheme
    if (bootId !== undefined && !selector.choose(bootId) && bootId === config.defaultTheme) {
      warn(`config.defaultTheme "${bootId}" is not a theme this plugin registers`)
    }
  }

  /* ── 设置页 ──
   * 一个顶级 settings.section。行数据在这里一次裁好（presentation 层只吃 props，
   * 不碰 ctx，也不该看见 89 个令牌那一大坨）。 */
  const rows: ThemeRow[] = THEMES.map(row => ({
    id: row.id,
    name: row.nameZh.replace(/·[亮暗]$/, ''),
    pinyin: row.id.replace(/-(light|dark)$/, ''),
    anchorHex: row.anchorHex,
    colorScheme: row.colorScheme,
    family: row.family,
    familyNote: row.familyNote,
    sealName: row.sealName,
    sealHex: row.sealHex,
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
    order: config.settingsOrder,
    label: () => tr('nav'),
    locale: NS,
    inject: () => ({
      rows,
      remember: config.remember,
      // 面板打开时页面已经是暗的，就先给暗色那一支 —— 而不是恒从 light 开始。
      initialScheme: (document.body.hasAttribute('data-ds-dark-theme') ? 'dark' : 'light') as 'light' | 'dark',
      getPreference: readPreference,
      subscribe: (listener: () => void) => ctx.on('theme/change', listener),
      select,
      reset,
    }),
  }, Section))
}
