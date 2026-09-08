/*
 * setTheme 拦截器 · The setTheme tap
 * ---------------------------------------------------------------
 * 这个模块只做一件事：把「谁改的主题」这个问题从**猜**变成**看**。
 *
 * 宿主 `ThemeRuntime` 上只有一个显式切换入口 —— `setTheme(id)`。内置 Appearance
 * 行的 Light / Dark / System 三个方块点下去，走的就是我们拿到的这同一个实例上的
 * `setTheme`。而 `adopt()`（每次 settings 作用域快照变化都会跑，任何插件写任何
 * 设置都能触发它）**不经过** `setTheme`，却同样会 emit `theme/change`。
 *
 * 于是：把 `setTheme` 包一层，就能在 `theme/change` 到达时精确回答「这次是显式
 * 切换，还是一次 adopt()」—— 因为 `theme/change` 是在 `setTheme` 里**同步**发出
 * 来的，监听器执行时 `foreign` 还没被清掉。
 *
 * 这替掉了过去的时间窗启发式（「偏好被改走前 2 秒内用户点过任何地方」）。那个
 * 判据把「用户点了另一个插件的按钮 → 该插件写设置 → adopt()」误判成「用户放弃
 * 了我们的主题」，于是我们让位、撤令牌、连记住的选择一起清掉 —— 这就是 issue #1
 * 里「换个字号，主题就没了」的全部成因。
 *
 * 纯逻辑，不碰 DOM，因此 test/intercept.test.ts 能在 node 里跑它。
 */

/** 我们只需要宿主实例上的这一个方法。 */
export interface SetThemeHost {
  setTheme(id: string): void
}

export interface SetThemeTap {
  /**
   * 别人（非本插件）正在调用的那次 setTheme 的 id。
   * 只在那次调用**同步执行期间**非 undefined —— `theme/change` 正是在里面同步
   * 发出的，所以监听器读到它就是权威答案。
   */
  readonly foreign: string | undefined
  /** 在 fn 执行期间把 setTheme 调用标记成「我们自己的」（不算 foreign）。 */
  own<T>(fn: () => T): T
  /** 补丁有没有真的挂上（实例被冻结 / 被 Proxy 拦住时为 false）。 */
  readonly active: boolean
  /** 还原：原方法在原型上就删掉自有属性，原本是自有属性就写回去。 */
  dispose(): void
}

export function tapSetTheme(host: SetThemeHost, warn: (message: string) => void): SetThemeTap {
  const original = host.setTheme
  // 原方法是挂在实例上还是原型上，决定 dispose 该删还是该写回。
  const wasOwn = Object.hasOwn(host, 'setTheme')
  let foreign: string | undefined
  let insideOwn = 0
  let active = false

  function wrapper(this: unknown, id: string): unknown {
    // `this ?? host`：宿主内部可能以 `theme.setTheme(...)` 调用（this 是实例），
    // 也可能被解构后裸调（this 是 undefined）。原语义要保住。
    const self = (this ?? host) as SetThemeHost
    if (insideOwn > 0) return (original as (this: unknown, id: string) => unknown).call(self, id)
    // 保存/还原前值而不是简单清空：原方法内部可能再触发一次嵌套调用，
    // 嵌套返回后外层那次仍在执行中，foreign 必须还是外层的 id。
    const previous = foreign
    foreign = id
    try {
      return (original as (this: unknown, id: string) => unknown).call(self, id)
    } finally {
      foreign = previous
    }
  }

  try {
    ;(host as { setTheme: unknown }).setTheme = wrapper
    // 冻结对象上的赋值在非严格模式里静默失败，Proxy 也可能把它吃掉。
    // 唯一可靠的确认方式是读回来比一下。
    active = host.setTheme === (wrapper as unknown as SetThemeHost['setTheme'])
  } catch {
    active = false
  }
  if (!active) warn('could not observe host setTheme — falling back to preference comparison')

  return {
    get foreign(): string | undefined { return foreign },
    get active(): boolean { return active },

    own<T>(fn: () => T): T {
      insideOwn++
      try { return fn() } finally { insideOwn-- }
    },

    dispose(): void {
      if (!active) return
      // 别人又包了一层就别动 —— 拆掉会把他们的补丁一起拆了。
      if (host.setTheme !== (wrapper as unknown as SetThemeHost['setTheme'])) return
      try {
        if (wasOwn) (host as { setTheme: unknown }).setTheme = original
        else delete (host as { setTheme?: unknown }).setTheme
      } catch {
        // 还原失败也不该让卸载抛错；包装层本身是幂等的。
      }
      active = false
    },
  }
}
