/*
 * 主题选择状态机 · Theme selection state machine
 * ---------------------------------------------------------------
 * 从 apply() 里抽出来的纯逻辑：不碰 ctx、不碰 DOM、不碰全局定时器，外部世界
 * 一律由 deps 递进来（因此 test/selector.test.ts 能在 node 里跑它）。
 *
 * 抽出来的理由是它要同时处理两件很容易被混成一件的事，而混起来的那一版会
 * 抢用户的操作：
 *
 *   **启动竞态** —— ui-layout 的 presenter 按自己的时机挂载，settings 作用域随后
 *   读回持久化偏好并 adopt()，两者都可能覆盖 apply() 期间发出的 setTheme。所以要
 *   对着 presenter 真正写入的 DOM 自验证，未生效则有界退避重试。
 *
 *   **用户主权** —— 启动窗口过去之后，偏好被改成别的值就是用户的明确意图（内置
 *   Appearance 行、另一个主题插件），必须让位；再抢回去就是插件在跟用户较劲。
 *
 * 判据是**时间窗**，不是「我们的主题曾经生效过」：adopt() 恰恰发生在我们生效
 * 之后，两者在事件层面无法区分，只能靠「距 apply() 多久」来分。
 */

/** 定时器句柄由宿主环境决定形状，这里只负责原样传回 clearTimer。 */
export type TimerHandle = unknown

export interface SelectorDeps {
  /** 这个 id 是不是本插件注册过的主题。 */
  isKnown(id: string): boolean
  /** 该主题最终应写入页面的 `--dsw-alias-bg-base`（用来判断到底生效没有）。 */
  expectedGround(id: string): string | undefined
  /** 页面此刻真的写着的 `--dsw-alias-bg-base`。 */
  appliedGround(): string
  setTheme(id: string): void
  now(): number
  setTimer(fn: () => void, ms: number): TimerHandle
  clearTimer(handle: TimerHandle): void
  warn(message: string): void
}

export interface SelectorOptions {
  /** 接手之前页面的偏好 —— reset() 要交还的就是它。 */
  initialPreference?: string
  /**
   * 启动阶段的硬上限：我们的主题**一次都还没生效过**之前，偏好被改一律算竞态。
   * 实机上 adopt() 可能晚到 5 秒以外，所以这个值要宽 —— 反正它只在"从没生效过"
   * 的前提下有效，用户不可能在这个阶段放弃一个他没见过的主题。
   */
  bootRaceMs?: number
  /** 刚生效 / 刚被选中之后的宽限期：这段时间内被覆盖仍算迟到的 adopt()。 */
  settleGraceMs?: number
  /** 单次选择的 DOM 自验证重试上限。 */
  maxAttempts?: number
  /** 被覆盖后重新断言的次数上限（只有明确选择才补额度）。 */
  maxReasserts?: number
  /** 退避基数：第 n 次重试等待 retryStepMs × n。 */
  retryStepMs?: number
}

export interface ThemeSelector {
  /** 选一套主题；id 不认识时返回 false 并告警（不静默吞掉）。 */
  choose(id: string): boolean
  /** 交还给我们接手之前的那个偏好，并停止一切重新断言。 */
  reset(): void
  /** 喂给它 ui-theme 的 `theme/change` 偏好值。 */
  onPreference(preference: string): void
  /** 当前想要的主题 id；让位或复位后为 undefined。 */
  readonly desired: string | undefined
  /** 回退目标：最近一次观察到的、不属于本插件的偏好。 */
  readonly fallback: string
  /**
   * 最近一次 desired 归零，是不是因为**判定了用户意图**（而不是启动竞态里放弃）。
   * 调用方靠它决定要不要把"记住的选择"也清掉 —— 启动阶段的让位绝不能清，
   * 否则一次迟到的 adopt() 会顺手销毁用户的记忆（刷新一次就永久复原）。
   */
  readonly yieldedToUser: boolean
  dispose(): void
}

export function createThemeSelector(deps: SelectorDeps, options: SelectorOptions = {}): ThemeSelector {
  const bootRaceMs = options.bootRaceMs ?? 15_000
  const settleGraceMs = options.settleGraceMs ?? 3_000
  const maxAttempts = options.maxAttempts ?? 8
  const maxReasserts = options.maxReasserts ?? 5
  const retryStepMs = options.retryStepMs ?? 150
  const startedAt = deps.now()

  let desired: string | undefined
  let fallback = options.initialPreference ?? 'system'
  let timer: TimerHandle | undefined
  let reasserts = 0
  let gaveUp = false
  let yieldedToUser = false
  /** 我们的主题是否曾经真的出现在 DOM 里（不是"我们请求过"）。 */
  let settled = false
  let settledAt = 0
  let chosenAt = startedAt

  /**
   * 现在被别人改掉偏好，还算不算"不是用户干的"。
   * 三种情形都算：还没生效过且在启动上限内 / 刚刚被选中 / 刚刚生效。
   */
  function withinGrace(t: number): boolean {
    if (!settled && t - startedAt <= bootRaceMs) return true
    if (t - chosenAt <= settleGraceMs) return true
    if (settled && t - settledAt <= settleGraceMs) return true
    return false
  }

  /** 单飞：任何入口先掐掉挂起的那条链，否则两条链会并行且句柄互相覆盖。 */
  function cancel(): void {
    if (timer !== undefined) {
      deps.clearTimer(timer)
      timer = undefined
    }
  }

  function ensureApplied(attempt: number): void {
    cancel()
    if (desired === undefined) return
    const want = deps.expectedGround(desired)
    if (want === undefined) return
    if (deps.appliedGround() === want) {                // presenter 已经写进去了
      if (!settled) { settled = true; settledAt = deps.now() }
      return
    }
    if (attempt >= maxAttempts) {
      deps.warn(`${desired} did not reach the DOM after ${attempt} tries`)
      return
    }
    deps.setTheme(desired)
    timer = deps.setTimer(() => { ensureApplied(attempt + 1) }, retryStepMs * (attempt + 1))
  }

  return {
    get desired(): string | undefined { return desired },
    get fallback(): string { return fallback },
    get yieldedToUser(): boolean { return yieldedToUser },

    choose(id: string): boolean {
      if (!deps.isKnown(id)) {
        deps.warn(`unknown theme id ${JSON.stringify(id)} — ignored`)
        return false
      }
      desired = id
      // 只有明确的一次选择才补重新断言的额度。放在 onPreference 的匹配分支里补，
      // 就等于额度永远用不完，抢夺会长期驻留 —— 那是这个文件存在的原因之一。
      reasserts = 0
      gaveUp = false
      yieldedToUser = false
      settled = false                                   // 新主题还没生效过
      chosenAt = deps.now()
      ensureApplied(0)
      return true
    },

    reset(): void {
      desired = undefined
      yieldedToUser = true                             // 用户主动交还，记忆也该忘掉
      settled = false
      cancel()
      deps.setTheme(fallback)
    },

    onPreference(preference: string): void {
      // 别人的偏好值就是我们的回退目标 —— 我们要对抗的那次 adopt()，
      // 恰好也是我们唯一能学到「持久化偏好到底是什么」的机会。
      if (!deps.isKnown(preference)) fallback = preference
      if (desired === undefined) return
      if (preference === desired) return
      if (!withinGrace(deps.now())) {
        desired = undefined                            // 用户主权：让位，不再抢
        yieldedToUser = true
        cancel()
        return
      }
      if (reasserts >= maxReasserts) {
        if (!gaveUp) {
          gaveUp = true
          deps.warn(`gave up re-asserting ${desired} after ${reasserts} attempts`)
        }
        return
      }
      reasserts++
      ensureApplied(0)
    },

    dispose(): void {
      cancel()
      desired = undefined
    },
  }
}
