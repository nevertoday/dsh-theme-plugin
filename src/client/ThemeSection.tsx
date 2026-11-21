/*
 * 传统色主题选择页 · The theme picker settings page
 * ---------------------------------------------------------------
 * 渲染进 `settings.section` 的一个顶级设置页。组件只吃 props：色名清单、
 * 当前偏好的读取/订阅、切换与复位四件事都由 apply() 通过 inject 份额递进来
 * （presentation 层不许碰 ctx —— 这是 harness 客户端的分层纪律）。
 *
 * 样式全在下面这张 <style> 里，只引用 `--dsw-*` 令牌（第三方包没有仓库内的
 * CSS-modules 构建，而令牌是主题的公共契约，所以面板自身也随主题变色）。
 * 内联 style 只留给数据本身的颜色：色卡的纸 / 帘 / 焦点和印色。
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { fill } from './locales.ts'
import { buildThemeGroups } from './theme-groups.ts'
import { TIERS, TIER_COPY, isTier, type Tier } from './tiers.ts'

/** 一行色名需要呈现的全部信息（apply() 从生成数据里裁出来）。 */
export interface ThemeRow {
  id: string
  /** 去掉「·亮/·暗」后缀的中文色名。 */
  name: string
  /** 带空格的无声调拼音，作为可读副标而不是替换文化名。 */
  nameEn: string
  pinyin: string
  anchorHex: string
  colorScheme: 'light' | 'dark'
  /** 纸家族：素绢 / 熟宣 / 赭纸 / 雪青。 */
  family: string
  sealName: string
  sealHex: string
  /** 印的出处：策展印 / 关系集印 / 同族深印。 */
  sealWhy: string
  /** 印取自哪个和声关系槽，如 `temperatureContrast[0]`。 */
  sealRel: string
  /** 是否属于 12 锚 / 24 套的精选（由生成器推导，见 §11.5）。 */
  curated: boolean
  /** 六档之一：「今天想怎么工作」。由锚色算出，不是手工贴的。 */
  tier: string
  /** 这套主题**实际交付**的三段：纸、帘、焦点。色卡画它们，不画锚色原值。 */
  paperHex: string
  veilHex: string
  focusHex: string
}

/** apply() 递进来的业务面。 */
export interface ThemeSectionInjected {
  rows: readonly ThemeRow[]
  /** 打开面板时先展示哪一支 —— 页面已经是暗的就别从亮色列表开始。 */
  initialScheme: 'light' | 'dark'
  /** 当前生效的主题 id（可能是 light/dark/system 等内置偏好）。 */
  getPreference: () => string
  /** 订阅主题变化，返回取消订阅。 */
  subscribe: (listener: () => void) => () => void
  select: (id: string) => void
  reset: () => void
}

type Props = ThemeSectionInjected & { t: (key: string) => string }

/* 和声关系槽 → 可读的说法。`sealRel` 形如 `temperatureContrast[0]`，是代码标识，
 * 不该直接给人看；而这枚印「为什么是它」正是这套配色最见功夫的地方 ——
 * 印退出主按钮之后，这份策展就只剩这里能交代了，所以它必须说得清楚。 */
const REL_LABEL: Record<string, string> = {
  temperatureContrast: 'relTemp',
  complementary: 'relComp',
  splitComplementary: 'relSplit',
  triadic: 'relTriad',
  analogous: 'relAnalog',
  accent: 'relAccent',
  darker: 'relDarker',
  same: 'relSame',
  self: 'relSelf',
}
const relKeyOf = (rel: string): string | undefined => REL_LABEL[rel.replace(/\[\d+\]$/, '')]

/*
 * 面板的样子按小小东 UI Kit（xxd-ui-kit/docs/DESIGN-PRINCIPLES.md）：直角、
 * 字重只有 400/500/600、中文不改字距、选中改颜色不加粗、行和按钮没有阴影、
 * 能用空间分开的地方不画线、动效只动颜色且 hover 进入立即变。宿主的弹层自己的
 * 圆角不归这里管。
 *
 * Kit 的用途名在宿主里对应这些令牌（面板外面那层是设置弹层的 bg-layer-2）：
 *   墨 ink            label-primary
 *   灰字 muted        label-secondary      —— 在 bg-layer-2 上 98 套都 ≥ 5.4
 *   控件的边 ≥ 3:1     label-tertiary       —— 宿主没有更浅又够 3:1 的边线令牌
 *   线 line           border-l2
 *   色块的边           border-l3
 *   wash / 按下       interactive-bg-hover / -active
 *   输入框的纸         input-major
 *   抬起的纸           menu（亮色同纸，暗色比弹层亮一档，正是 Kit 的 paper-raised）
 * label-tertiary 只当线用，不当字：它在 bg-layer-2 上最低只有 3.7。
 *
 * 选中与按下只靠一圈墨色的边（≥ 3:1 的记号），不铺底色：宿主的选中底
 * sidebar-nav-item-active 上，灰字最低只剩 3.96。悬停的 wash 上灰字最低 4.23，
 * 所以悬停时行里的灰字换成墨。类名带 dshtz- 前缀，免得撞上宿主的样式表。
 */
const CSS = `
.dshtz {
  display: flex; flex-direction: column; gap: 16px;
  color: var(--dsw-alias-label-primary);
  font-size: 13px; line-height: 20px;
}
.dshtz :is(button, input) {
  font: inherit; color: inherit; margin: 0;
  border-radius: 0; -webkit-appearance: none; appearance: none;
  transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease;
}
.dshtz :is(button, input):is(:hover, :active, :focus-visible) { transition-duration: 0s; }
.dshtz button { cursor: pointer; white-space: nowrap; }
.dshtz button:focus-visible {
  outline: 2px solid var(--dsw-alias-label-primary);
  outline-offset: 2px;
}
.dshtz-muted { color: var(--dsw-alias-label-secondary); }
.dshtz-sep { color: var(--dsw-alias-label-tertiary); }
.dshtz-num { font-variant-numeric: tabular-nums; }

.dshtz-head { display: flex; align-items: flex-start; gap: 16px; }
.dshtz-head-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; padding-top: 6px; }
.dshtz-note { font-size: 12px; }

.dshtz-btn {
  flex-shrink: 0; height: 32px; padding: 0 12px;
  border: 1px solid var(--dsw-alias-label-tertiary);
  background: transparent; font-weight: 500;
}
.dshtz-btn:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshtz-btn:active { background: var(--dsw-alias-interactive-bg-active); }

.dshtz-current {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; border: 1px solid var(--dsw-alias-border-l2);
}
.dshtz-current-text { display: flex; flex-direction: column; min-width: 0; }
.dshtz-current-title { display: flex; align-items: baseline; flex-wrap: wrap; gap: 0 8px; }
.dshtz-current-name { font-size: 16px; line-height: 24px; font-weight: 500; }
.dshtz-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 0 8px; font-size: 12px; }

.dshtz-tiers { display: flex; flex-wrap: wrap; gap: 4px; }
.dshtz-chip {
  display: inline-flex; align-items: center; gap: 4px;
  height: 28px; padding: 0 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: transparent; font-size: 12px; line-height: 16px;
}
.dshtz-chip-name { font-weight: 500; }

.dshtz-controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dshtz-segmented {
  display: inline-flex; flex-shrink: 0; gap: 2px; padding: 2px;
  background: var(--dsw-alias-interactive-bg-hover);
}
.dshtz-seg-btn {
  height: 28px; padding: 0 16px;
  border: 1px solid transparent; background: transparent; font-weight: 500;
}
.dshtz-search {
  flex: 1; min-width: 160px; box-sizing: border-box; height: 32px; padding: 0 12px;
  border: 1px solid var(--dsw-alias-label-tertiary);
  background: var(--dsw-specific-input-major);
}
.dshtz-search::placeholder { color: var(--dsw-alias-label-secondary); opacity: 1; }
.dshtz-search::-webkit-search-cancel-button {
  -webkit-appearance: none; appearance: none;
  width: 16px; height: 16px; margin: 0; cursor: pointer;
  background: var(--dsw-alias-label-secondary);
  -webkit-mask: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M6.5 6.5l11 11M17.5 6.5l-11 11' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round'/></svg>") center / 16px no-repeat;
  mask: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M6.5 6.5l11 11M17.5 6.5l-11 11' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round'/></svg>") center / 16px no-repeat;
}
.dshtz-search::-webkit-search-cancel-button:hover { background: var(--dsw-alias-label-primary); }
.dshtz-search:focus { outline: none; }
.dshtz-search:focus-visible {
  border-color: var(--dsw-alias-label-primary);
  outline: 1px solid var(--dsw-alias-label-primary);
  outline-offset: -2px;
}
.dshtz-count { font-size: 12px; }

.dshtz-groups { display: flex; flex-direction: column; gap: 24px; }
.dshtz-group { display: flex; flex-direction: column; gap: 8px; }
.dshtz-group-head { display: flex; align-items: baseline; gap: 8px; }
.dshtz-group-head h3 { margin: 0; font-size: 13px; line-height: 20px; font-weight: 500; }
.dshtz-group-head .dshtz-num { margin-left: auto; }
.dshtz-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(196px, 1fr)); gap: 4px; }
.dshtz-row {
  display: flex; align-items: center; gap: 8px;
  box-sizing: border-box; min-height: 44px; padding: 0 8px;
  border: 1px solid transparent; background: transparent; text-align: left;
}
.dshtz-row-text { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 16px; }
.dshtz-row-text > span { overflow: hidden; text-overflow: ellipsis; }
.dshtz-row-name { font-weight: 500; }
.dshtz-small { font-size: 12px; }
.dshtz-empty { padding: 16px 0; }

.dshtz-chip:hover, .dshtz-seg-btn:hover, .dshtz-row:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
.dshtz-chip:active, .dshtz-seg-btn:active, .dshtz-row:active {
  background: var(--dsw-alias-interactive-bg-active);
}
.dshtz-chip:hover .dshtz-muted, .dshtz-row:hover .dshtz-muted { color: var(--dsw-alias-label-primary); }
.dshtz-row[aria-pressed="true"], .dshtz-chip[aria-pressed="true"] {
  border-color: var(--dsw-alias-label-primary);
  color: var(--dsw-alias-label-primary);
}
.dshtz-seg-btn[aria-pressed="true"] {
  background: var(--dsw-specific-menu);
  border-color: var(--dsw-alias-label-primary);
}

.dshtz-swatch, .dshtz-tile {
  display: block; flex-shrink: 0; box-sizing: border-box;
  border: 1px solid var(--dsw-alias-border-l3);
}
.dshtz-tile { position: relative; overflow: hidden; }
.dshtz-tile > span { position: absolute; }

@media (prefers-reduced-motion: reduce) {
  .dshtz :is(button, input) { transition: none; }
}
`

export function ThemeSection({
  rows, initialScheme, getPreference, subscribe, select, reset, t,
}: Props): ReactNode {
  const [preference, setPreference] = useState(getPreference)
  const [scheme, setScheme] = useState<'light' | 'dark'>(initialScheme)
  const [query, setQuery] = useState('')
  /* 默认给全库，不是精选。
   * 精选解决的是「49 个色名不构成选项」，但它同时也藏起了三分之二的东西 ——
   * 打开面板先看见 12 套、右上角写着「12 / 49」，第一反应是「怎么少了」而不是
   * 「这是挑过的」。全库摆开时纸家族的分组本身就在给结构，六档 chip 又随时能收窄，
   * 收敛的手段已经够多了，不必再拿默认视图去做。「仅精选」仍在一次点击之外。 */
  const [showAll, setShowAll] = useState(true)
  const [tier, setTier] = useState<Tier | undefined>(undefined)

  // 主题可以从别处被改（内置 Appearance 行、#theme= 深链、settings 读回），
  // 所以选中态永远跟服务的快照走，不本地记账。
  useEffect(() => subscribe(() => { setPreference(getPreference()) }), [subscribe, getPreference])

  // 切到本插件的某套主题时，明暗分段跟随它所属的那一支。
  useEffect(() => {
    const row = rows.find(r => r.id === preference)
    if (row !== undefined) setScheme(row.colorScheme)
  }, [preference, rows])

  const groups = useMemo(
    () => buildThemeGroups(rows, scheme, query, showAll, t, tier),
    [rows, scheme, query, showAll, t, tier],
  )
  // 每档在当前明暗分支下的套数。写死数字会在名册变动后骗人，所以现算。
  const tierCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const row of rows) {
      if (row.colorScheme !== scheme) continue
      counts.set(row.tier, (counts.get(row.tier) ?? 0) + 1)
    }
    return counts
  }, [rows, scheme])
  const shown = groups.reduce((total, group) => total + group.items.length, 0)
  const schemeTotal = rows.filter(row => row.colorScheme === scheme).length
  const currentRow = rows.find(r => r.id === preference)

  /**
   * 明暗分段不只是筛列表 —— 当前正用着某套主题时，点「暗」就该立刻变暗。
   * 只筛不切的话，用户看到的是"点了没反应"（而且选中行还会从列表里消失）。
   * 当前用的是内置主题时没有可对应的孪生 id，那就只筛。
   */
  const switchScheme = (next: 'light' | 'dark'): void => {
    setScheme(next)
    if (currentRow === undefined || currentRow.colorScheme === next) return
    const twin = rows.find(r => r.pinyin === currentRow.pinyin && r.colorScheme === next)
    if (twin !== undefined) select(twin.id)
  }

  return (
    <div className="dshtz">
      <style>{CSS}</style>

      <header className="dshtz-head">
        <div className="dshtz-head-text">
          <div className="dshtz-muted">{t('intro')}</div>
          <div className="dshtz-muted dshtz-note">{t('remembered')}</div>
        </div>
        <button type="button" className="dshtz-btn" onClick={reset}>
          {t('reset')}
        </button>
      </header>

      {currentRow !== undefined && (
        <section aria-label={t('current')} className="dshtz-current">
          <ThemeChip row={currentRow} h={32} />
          <div className="dshtz-current-text">
            <div className="dshtz-current-title">
              <span className="dshtz-current-name">{currentRow.name}</span>
              {isTier(currentRow.tier) && (
                <span className="dshtz-muted dshtz-small">{t(TIER_COPY[currentRow.tier].name)}</span>
              )}
              <span className="dshtz-muted dshtz-small">{currentRow.nameEn} · {currentRow.id}</span>
            </div>
            <div className="dshtz-muted dshtz-meta">
              <span>{t('paper')} · {currentRow.family}</span>
              <span className="dshtz-sep" aria-hidden="true">|</span>
              <span>{t('seal')} · {currentRow.sealName}</span>
              <Swatch hex={currentRow.sealHex} size={12} />
              <span>
                {currentRow.sealWhy}
                {relKeyOf(currentRow.sealRel) !== undefined && ` · ${t(relKeyOf(currentRow.sealRel)!)}`}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* 六档筛选条 —— 与明暗分段同一层的控件，不另起区块。
        * 顺序照「程序员的一天」：心流(晨起) → 禅定(午后) → 攻坚(傍晚) →
        * 爆肝(深夜) → 夜航(凌晨) → 收工(天亮)，再回到心流。
        *
        * 这里**没有**「全部」chip，是有意的。它曾经在，制造了两个问题：
        *   · 词撞车 —— 右边还有一个「全部主题」，两个「全部」谁都说不清；
        *     而且点这枚只是清掉档筛选、落回精选视图，于是写着「全部」给的是 12 套。
        *   · 换行 —— 六枚档 chip 要排进一行，多一枚就折成两排。
        * 取消筛选改为再点一次当前档（aria-pressed 有按下态，title 里也写了）。 */}
      <div role="group" aria-label={t('tierLabel')} className="dshtz-tiers">
        {TIERS.map(key => {
          const copy = TIER_COPY[key]
          const n = tierCounts.get(key) ?? 0
          return (
            <button
              key={key}
              type="button"
              className="dshtz-chip"
              aria-pressed={tier === key}
              // 无障碍名与 title 都带上判据 —— 视觉上省掉的那一段不能连语义一起省掉。
              aria-label={`${t(copy.hour)} ${t(copy.name)} · ${t(copy.basis)} · ${n}`}
              title={`${t(copy.hour)} · ${t(copy.name)} · ${t(copy.basis)}${tier === key ? `\n${t('tierClearHint')}` : ''}`}
              onClick={() => { setTier(current => (current === key ? undefined : key)) }}
            >
              {/* 时段排在最前：六枚 chip 从左到右读下来就是一天
                * （晨起 → 午后 → 傍晚 → 深夜 → 凌晨 → 天亮），
                * 于是这一排本身就在解释档与档的关系，不必另写说明。
                * 判据（冷而浓…）退到 aria-label 与 title：把它也摆出来会让这一排
                * 折成两行，而控件区已经有明暗分段和搜索占着行数了。 */}
              <span className="dshtz-muted">{t(copy.hour)}</span>
              <span className="dshtz-chip-name">{t(copy.name)}</span>
              <span className="dshtz-muted dshtz-num">{n}</span>
            </button>
          )
        })}
      </div>

      <div className="dshtz-controls">
        <div role="group" aria-label={t('scheme')} className="dshtz-segmented">
          {(['light', 'dark'] as const).map(s => (
            <button
              key={s}
              type="button"
              className="dshtz-seg-btn"
              aria-pressed={scheme === s}
              onClick={() => { switchScheme(s) }}
            >
              {t(s)}
            </button>
          ))}
        </div>
        <input
          type="search"
          className="dshtz-search"
          value={query}
          aria-label={t('searchLabel')}
          placeholder={t('search')}
          onChange={e => { setQuery(e.target.value) }}
        />
        {/* 分母只算当前明暗分支；面板一次只能选择这一支，写 98 会把另一支算成缺失。 */}
        <span aria-live="polite" className="dshtz-muted dshtz-count dshtz-num">
          {fill(t('count'), { n: shown, total: schemeTotal })}
        </span>
        {query.trim() === '' && (
          <button
            type="button"
            className="dshtz-btn"
            aria-expanded={showAll}
            onClick={() => { setShowAll(value => !value) }}
          >
            {showAll ? t('showCurated') : t('browseAll')}
          </button>
        )}
      </div>

      {shown === 0
        ? <div className="dshtz-muted dshtz-empty">{t('empty')}</div>
        : (
          <div className="dshtz-groups">
            {groups.map(g => (
              <section key={g.key} className="dshtz-group">
                <div className="dshtz-group-head">
                  <h3>{g.family}</h3>
                  <span className="dshtz-muted dshtz-small">{g.note}</span>
                  <span className="dshtz-muted dshtz-small dshtz-num">{g.items.length}</span>
                </div>
                <div className="dshtz-grid">
                  {g.items.map(r => (
                    <button
                      key={r.id}
                      type="button"
                      className="dshtz-row"
                      aria-pressed={r.id === preference}
                      // 印色名与锚色 hex 只存在于 title 里的话，键盘和读屏都拿不到。
                      aria-label={fill(t('rowLabel'), { name: r.name, family: r.family, seal: r.sealName })}
                      title={`${r.name} · ${t('seal')} ${r.sealName} · ${r.anchorHex}`}
                      onClick={() => { select(r.id) }}
                    >
                      <ThemeChip row={r} h={20} />
                      <span className="dshtz-row-text">
                        <span className="dshtz-row-name">{r.name}</span>
                        <span className="dshtz-muted dshtz-small">{r.nameEn}</span>
                      </span>
                      {/* 档名。每套主题都有一个，所以这一列不会出现空洞 ——
                        * 早先「五个模式各挑一套代表」的做法会让多数行空着，读起来像漏填。 */}
                      {isTier(r.tier) && (
                        <span className="dshtz-muted dshtz-small">{t(TIER_COPY[r.tier].name)}</span>
                      )}
                      <Swatch hex={r.sealHex} size={10} />
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
    </div>
  )
}

function Swatch({ hex, size }: { hex: string; size: number }): ReactNode {
  return <span aria-hidden="true" className="dshtz-swatch" style={{ width: size, height: size, background: hex }} />
}

/*
 * 主题缩影：这套主题**实际交付**的三段，按面积纪律排布 ——
 * 纸铺满、帘占底部约三分之一、焦点是右上一块。
 *
 * 为什么不画 anchorHex：色卡画满彩度的锚色，交付的却是一张淡色纸，
 * 点「朱红」期待朱砂、装上是白页配浅桃色。那个落差比任何单个色值都伤品相。
 * 边框走 --dsw-alias-border-l3，不用固定的黑色 —— 后者在暗色主题上看不见；
 * 边框画在三段外面，帘和焦点不会盖住它。
 */
function ThemeChip({ row, h }: { row: ThemeRow; h: number }): ReactNode {
  return (
    <span
      aria-hidden="true"
      className="dshtz-tile"
      style={{ width: Math.round(h * 1.35), height: h, background: row.paperHex }}
    >
      <span style={{ left: 0, right: 0, bottom: 0, height: '42%', background: row.veilHex }} />
      {/* 焦点这一块要够大才认得出 —— 三段全是同色相的浓淡，只靠纸和帘的话，
       * 竹青/荷叶绿/粉绿在列表里是三枚几乎一样的淡绿方块，诚实但没法扫视。
       * 焦点如今就是锚色本人，放大它既不失真，又把辨识度还了回来。 */}
      <span style={{ top: 0, right: 0, width: '42%', height: '58%', background: row.focusHex }} />
    </span>
  )
}
