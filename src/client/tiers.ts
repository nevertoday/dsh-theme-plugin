/*
 * 六档 · The six working-mood tiers
 * ---------------------------------------------------------------
 * 「今天想怎么工作」的入口。49 个传统色名对不懂传统色的人不构成选项，
 * 六个档名构成 —— 而且每套主题恰好属于一档，所以标签既没有空洞，
 * 又能反过来当筛选维度用。
 *
 * 哪套属于哪档是**生成器算出来的**（`tier` 字段，判据是锚色的 OKLab
 * 明度/彩度/色相，见 scripts/generate-themes.mjs §6c，并被 check-contrast.mjs
 * 用七个哨兵独立复算）。这个文件只管**怎么显示**：顺序、译名、时段提示。
 *
 * 顺序照「程序员的一天」排，而不是按套数或拼音 ——
 *   晨起心流 → 午后禅定 → 傍晚攻坚 → 深夜爆肝 → 凌晨夜航 → 天亮收工 → 又是心流
 * 这条循环读一遍就能记住，档名之间的关系也就不用另作说明了。
 */

/** 与生成器 `tier` 字段同一套词。顺序即面板里的展示顺序。 */
export const TIERS = ['心流', '禅定', '攻坚', '爆肝', '夜航', '收工'] as const

export type Tier = (typeof TIERS)[number]

/** 档名 → locale 键。判据串（冷而浓…）是事实，时段（晨起…）是叙事，分两个键。 */
export const TIER_COPY: Record<Tier, { name: string; basis: string; hour: string }> = {
  心流: { name: 'tierFlow', basis: 'tierFlowBasis', hour: 'tierFlowHour' },
  禅定: { name: 'tierZen', basis: 'tierZenBasis', hour: 'tierZenHour' },
  攻坚: { name: 'tierPush', basis: 'tierPushBasis', hour: 'tierPushHour' },
  爆肝: { name: 'tierCrunch', basis: 'tierCrunchBasis', hour: 'tierCrunchHour' },
  夜航: { name: 'tierNight', basis: 'tierNightBasis', hour: 'tierNightHour' },
  收工: { name: 'tierShip', basis: 'tierShipBasis', hour: 'tierShipHour' },
}

/** 运行期守卫：生成数据若冒出词表外的档名，宁可不显示标签，也不要渲染出一个空壳。 */
export function isTier(value: string): value is Tier {
  return (TIERS as readonly string[]).includes(value)
}
