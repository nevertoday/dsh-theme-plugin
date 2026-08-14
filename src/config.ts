/*
 * 插件配置 · Plugin configuration
 * ---------------------------------------------------------------
 * 形状与默认值只在这里定义一次。宿主半（src/index.ts）用 Schemastery 把同一份
 * 声明成 schema（cordis.yml 里的值由框架校验），客户端半再过一遍
 * normalizeConfig() —— 客户端图是否把 cordis.yml 的 config 递给浏览器行**尚未
 * 实测**，所以两边都不假设对方一定校验过，缺了就落回默认值。
 *
 * 这个文件不 import 任何东西：宿主半、客户端半、node:test 三处都要用它。
 */

export interface Config {
  /**
   * 启动时套用的主题 id（如 `zhuqing-light`）。缺省则沿用内置偏好。
   * 优先级：`#theme=` 深链 > 记住的上次选择 > 这一项。
   */
  defaultTheme?: string
  /** 把用户的选择记进 localStorage，刷新后自动恢复。 */
  remember: boolean
  /** 是否响应 `#theme=<id>` 深链。 */
  hashSelector: boolean
  /** 设置页在导航里的位置（内置各页之后 = 40）。 */
  settingsOrder: number
}

export const DEFAULT_CONFIG: Readonly<Config> = Object.freeze({
  remember: true,
  hashSelector: true,
  settingsOrder: 40,
})

/** 主题 id 的形状（同时是 `#theme=` 深链的白名单字符集）。 */
export const THEME_ID = /^[a-z0-9-]+$/

/**
 * 把任意来源的 config 收敛成一个 Config。类型不对的项**丢弃并落回默认值**，
 * 不抛错：一个写错的偏好不该让整套主题装不上。
 */
export function normalizeConfig(raw: unknown): Config {
  const o: Record<string, unknown> = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {}
  const bool = (k: keyof Config): boolean =>
    typeof o[k] === 'boolean' ? o[k] as boolean : DEFAULT_CONFIG[k] as boolean
  const defaultTheme = typeof o.defaultTheme === 'string' && THEME_ID.test(o.defaultTheme)
    ? o.defaultTheme
    : undefined
  const order = typeof o.settingsOrder === 'number' && Number.isFinite(o.settingsOrder)
    ? o.settingsOrder
    : DEFAULT_CONFIG.settingsOrder
  return {
    ...(defaultTheme !== undefined ? { defaultTheme } : {}),
    remember: bool('remember'),
    hashSelector: bool('hashSelector'),
    settingsOrder: order,
  }
}
