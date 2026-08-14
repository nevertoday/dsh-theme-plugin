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
 *   读回持久化偏好并 adopt()，两者都可能覆盖 apply() 期间发出的 setTheme。所以要么
 *   对 presenter 真正写入的 DOM 自验证、未生效则有界退避重试，要么干脆不依赖它的
 *   重绘 —— forceSet 会把令牌**直接**写进 body（paint），同一任务内页面就是对的，
 *   再用任务末尾的 microtask 补画一次（repaint）赢过晚到的 presenter 监听器。
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
  /**
   * 把 id 的令牌**直接**写进 DOM（本插件自己的主题才认识；别的 id 是 no-op）。
   * 不再等 presenter 的重绘：写进 body 的那一刻页面就是对的，竞态里的中间态
   * 就再也画不出来。
   */
  paint(id: string): void
  /**
   * 当前任务结束后、浏览器绘制前，再补画一次 id。
   * 用途：adopt() 那次 emit 里，presenter 的监听器可能注册在我们后面，同步画
   * 完又被它盖掉；microtask 排在所有同步监听器之后、绘制之前，能稳定赢回来。
   */
  repaint(id: string): void
  /** 撤掉本插件直接写进 DOM 的令牌，把 DOM 完全交还给 presenter（复位/让位时）。 */
  retract(): void
  /**
   * 最近 ms 毫秒内用户有没有真的动过手（点击/按键）。
   * 这是区分「用户在内置 Appearance 行点了 Light」和「框架又 adopt 了一次持久化
   * 偏好」的唯一可靠信号 —— 两者在事件层面长得一模一样，但前者必然紧跟一次点击。
   */
  userActiveWithin(ms: number): boolean
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
  /** 偏好被改走前多久算「用户刚动过手」。 */
  userIntentMs?: number
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
  const userIntentMs = options.userIntentMs ?? 2_000
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

  /**
   * 把 id 同时送到服务与 DOM。
   *
   * 过去这里要先切到 fallback 再切回来：ui-theme 的 setTheme 对同一个 id 会去重，
   * 不发 theme/change、presenter 也不重绘。现在不依赖 presenter 的重绘了 ——
   * paint() 在同一任务里就把令牌写进 body，页面瞬间就是对的；repaint() 在任务
   * 末尾（浏览器绘制前）再补一次，专门赢过"监听器注册在我们后面、把刚画好的
   * 内容又盖掉"的 presenter（实机刷新时 5 次闪动就来自它每次 adopt 后盖掉我们）。
   * 中间不再经过 fallback，也就没有那一次可见的"跳回内置"。
   */
  function forceSet(id: string): void {
    deps.setTheme(id)
    deps.paint(id)
    deps.repaint(id)
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
    if (deps.appliedGround() === want) {                // 已经是我们的了
      if (!settled) { settled = true; settledAt = deps.now() }
      // 赢了一次就把额度还回来：长会话里 adopt 可能来很多轮（重连、设置同步），
      // 全局只给 5 次会被耗尽。settle 意味着 DOM 里就是我们的，不可能形成循环。
      reasserts = 0
      gaveUp = false
      return
    }
    if (attempt >= maxAttempts) {
      deps.warn(`${desired} did not reach the DOM after ${attempt} tries`)
      return
    }
    forceSet(desired)
    timer = deps.setTimer(() => { ensureApplied(attempt + 1) }, retryStepMs * (attempt + 1))
  }

  /**
   * 偏好刚被别人改走时用这个，而不是 ensureApplied。
   *
   * 理由：presenter 的重绘是**异步**的。事件到达的那一刻，body 上往往还是我们的
   * 底色，ensureApplied 会据此判定"已经生效"并直接返回（还会把 settled 置上），
   * 等重绘落地就再没人来纠正了 —— 实机现象就是"刷新后主题不恢复，而且一条告警
   * 都没有"。服务偏好是"接下来会画什么"的权威，所以这里不看 DOM，直接重发。
   */
  function reassert(): void {
    cancel()
    if (desired === undefined) return
    forceSet(desired)
    timer = deps.setTimer(() => { ensureApplied(1) }, retryStepMs)
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
      deps.retract()                                   // 撤掉我们直写的令牌，DOM 交还 presenter
      deps.setTheme(fallback)
    },

    onPreference(preference: string): void {
      // 别人的偏好值就是我们的回退目标 —— 我们要对抗的那次 adopt()，
      // 恰好也是我们唯一能学到「持久化偏好到底是什么」的机会。
      if (!deps.isKnown(preference)) fallback = preference
      if (desired === undefined) return
      if (preference === desired) return
      if (!withinGrace(deps.now()) && deps.userActiveWithin(userIntentMs)) {
        desired = undefined                            // 用户主权：让位，不再抢
        yieldedToUser = true
        cancel()
        deps.retract()
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
      reassert()
    },

    dispose(): void {
      cancel()
      desired = undefined
      deps.retract()
    },
  }
}
