/*
 * 宿主半 · Host loader entry
 * ---------------------------------------------------------------
 * 主题本身完全在浏览器里（见 src/client/index.ts），这一半只做两件事：
 *   1. 当组合树里的那一行 —— cordis.patch.yml 插入的 `theme-zhongguo`
 *   2. 声明配置 schema，让 cordis.yml 里的值在装载期就被校验
 * 所以 apply() 是空的，这是有意的，不是没写完。
 *
 * 只有这一处 import 了框架包（`@deepseek-ai/schemastery` 是 optional peer）：
 * 构建时它被 external 掉（tsdown 默认外置依赖，esbuild 侧靠
 * `packages: 'external'`），运行时由 harness 的 node 进程提供。
 */
import Schema from '@deepseek-ai/schemastery'
import { DEFAULT_CONFIG, type Config as ConfigShape } from './config.ts'

export const name = 'theme-zhongguo'

export interface Config extends ConfigShape {}

export const Config: Schema<Config> = Schema.object({
  /** 启动时套用的主题 id，如 `zhuqing-light`。优先级低于 `#theme=` 深链与记住的选择。 */
  defaultTheme: Schema.string(),
  /** 把用户在设置页/深链里的选择记进 localStorage，刷新后自动恢复。 */
  remember: Schema.boolean().default(DEFAULT_CONFIG.remember),
  /** 是否响应 `#theme=<id>` 深链。 */
  hashSelector: Schema.boolean().default(DEFAULT_CONFIG.hashSelector),
  /** 设置页在导航里的位置（内置各页之后 = 40）。 */
  settingsOrder: Schema.number().default(DEFAULT_CONFIG.settingsOrder),
})

/** Provides no host-side behavior — the roster and the picker are browser-side. */
export function apply(): void {}
