/*
 * 传统色主题选择页 · The theme picker settings page
 * ---------------------------------------------------------------
 * 渲染进 `settings.section` 的一个顶级设置页。组件只吃 props：色名清单、
 * 当前偏好的读取/订阅、切换与复位四件事都由 apply() 通过 inject 份额递进来
 * （presentation 层不许碰 ctx —— 这是 harness 客户端的分层纪律）。
 *
 * 样式分两处，都只引用 `--dsw-*` 令牌（第三方包没有仓库内的 CSS-modules 构建，
 * 而令牌是主题的公共契约，所以面板自身也随主题变色）：
 *   · 布局用内联 style —— 尺寸、栅格、间距，一次性的东西
 *   · 状态用下面这张 <style> 里的类 —— :hover / :active / :focus-visible 是
 *     内联样式表达不了的，而 96 个可点卡片没有悬停与聚焦反馈是不能接受的
 * 注意：有状态规则的元素**不要**再写内联 background/color，内联优先级更高会盖掉。
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { fill } from './locales.ts'

/** 一行色名需要呈现的全部信息（apply() 从生成数据里裁出来）。 */
export interface ThemeRow {
  id: string
  /** 去掉「·亮/·暗」后缀的中文色名。 */
  name: string
  pinyin: string
  anchorHex: string
  colorScheme: 'light' | 'dark'
  /** 纸家族：素绢 / 熟宣 / 赭纸 / 雪青。 */
  family: string
  familyNote: string
  sealName: string
  sealHex: string
  /** 印的出处：策展印 / 关系集印 / 同族深印。 */
  sealWhy: string
  /** 印取自哪个和声关系槽，如 `temperatureContrast[0]`。 */
  sealRel: string
  /** 是否属于 12 锚 / 24 套的精选（由生成器推导，见 §11.5）。 */
  curated: boolean
  /** 这套主题**实际交付**的三段：纸、帘、焦点。色卡画它们，不画锚色原值。 */
  paperHex: string
  veilHex: string
  focusHex: string
}

/** apply() 递进来的业务面。 */
export interface ThemeSectionInjected {
  rows: readonly ThemeRow[]
  /** 选择是否会被记住（决定页首那句话怎么写）。 */
  remember: boolean
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

/** 纸家族的固定顺序：与生成器的家族表同序，避免每次渲染顺序漂移。 */
const FAMILY_ORDER = ['素绢', '熟宣', '赭纸', '雪青']

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

const TOKEN = {
  fg: 'var(--dsw-alias-label-primary)',
  fg2: 'var(--dsw-alias-label-secondary)',
  fg3: 'var(--dsw-alias-label-tertiary)',
  line: 'var(--dsw-alias-border-l2)',
  lineSoft: 'var(--dsw-alias-border-l1)',
  surface: 'var(--dsw-alias-bg-layer-2)',
}

/* 状态样式。类名带 dshtz- 前缀，免得撞上宿主的样式表。 */
const CSS = `
.dshtz-row, .dshtz-seg-btn, .dshtz-ctl {
  color: var(--dsw-alias-label-primary);
  background: transparent;
  transition: background .12s ease, color .12s ease;
}
.dshtz-row:hover, .dshtz-seg-btn:hover, .dshtz-ctl:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
.dshtz-row:active, .dshtz-seg-btn:active, .dshtz-ctl:active {
  background: var(--dsw-alias-interactive-bg-active);
}
.dshtz-row[aria-pressed="true"], .dshtz-seg-btn[aria-pressed="true"] {
  background: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-label-primary-foreground);
  border-color: transparent;
}
.dshtz-row:focus-visible, .dshtz-seg-btn:focus-visible,
.dshtz-ctl:focus-visible, .dshtz-search:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 2px;
}
`

export function ThemeSection({
  rows, remember, initialScheme, getPreference, subscribe, select, reset, t,
}: Props): ReactNode {
  const [preference, setPreference] = useState(getPreference)
  const [scheme, setScheme] = useState<'light' | 'dark'>(initialScheme)
  const [query, setQuery] = useState('')

  // 主题可以从别处被改（内置 Appearance 行、#theme= 深链、settings 读回），
  // 所以选中态永远跟服务的快照走，不本地记账。
  useEffect(() => subscribe(() => { setPreference(getPreference()) }), [subscribe, getPreference])

  // 切到本插件的某套主题时，明暗分段跟随它所属的那一支。
  useEffect(() => {
    const row = rows.find(r => r.id === preference)
    if (row !== undefined) setScheme(row.colorScheme)
  }, [preference, rows])

  /* 分组：精选置顶，其后按纸家族排全部。
   * 不做「精选/全部」切换 —— 那是把一次浏览拆成两个模式，而且要在明暗分段旁边
   * 再摆一个分段控件。置顶一组就够了：先看见编辑过的 12 色，往下仍是完整名册，
   * 精选项在自己的家族里照常出现（重复是有意的，跟「本期推荐」一个道理）。 */
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const hit = (r: ThemeRow) => q === ''
      || r.name.includes(q) || r.pinyin.includes(q) || r.sealName.includes(q) || r.id.includes(q)
    const visible = rows.filter(r => r.colorScheme === scheme && hit(r))
    const byFamily = new Map<string, { note: string; items: ThemeRow[] }>()
    for (const r of visible) {
      const g = byFamily.get(r.family) ?? { note: r.familyNote, items: [] }
      g.items.push(r)
      byFamily.set(r.family, g)
    }
    const families = FAMILY_ORDER
      .filter(f => byFamily.has(f))
      .map(f => ({ key: f, family: f, ...byFamily.get(f)! }))
    const picks = visible.filter(r => r.curated)
    return picks.length > 0
      ? [{ key: '__curated', family: t('curated'), note: t('curatedNote'), items: picks }, ...families]
      : families
  }, [rows, scheme, query, t])

  // 精选组与家族组有重叠，逐组相加会把 12 套算两遍 —— 计数要按去重后的行数。
  const shown = new Set(groups.flatMap(g => g.items.map(r => r.id))).size
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, color: TOKEN.fg }}>
      <style>{CSS}</style>

      <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 13, color: TOKEN.fg2, lineHeight: 1.6 }}>{t('intro')}</div>
        <div style={{ fontSize: 12, color: TOKEN.fg3 }}>
          {remember ? t('remembered') : t('notPersisted')}
        </div>
      </header>

      {currentRow !== undefined && (
        <section
          aria-label={t('current')}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', background: TOKEN.surface, border: `1px solid ${TOKEN.lineSoft}`,
          }}
        >
          <ThemeChip row={currentRow} h={34} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '.04em' }}>
              {currentRow.name}
              <span style={{ fontSize: 11, color: TOKEN.fg3, marginLeft: 8, fontWeight: 400 }}>
                {currentRow.id}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: TOKEN.fg2, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{t('paper')} · {currentRow.family}</span>
              <span style={{ color: TOKEN.fg3 }} aria-hidden="true">|</span>
              <span>{t('seal')} · {currentRow.sealName}</span>
              <Swatch hex={currentRow.sealHex} size={11} />
              <span style={{ color: TOKEN.fg3 }}>
                {currentRow.sealWhy}
                {relKeyOf(currentRow.sealRel) !== undefined && ` · ${t(relKeyOf(currentRow.sealRel)!)}`}
              </span>
            </div>
          </div>
        </section>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div
          role="group"
          aria-label={t('scheme')}
          style={{ display: 'inline-flex', border: `1px solid ${TOKEN.line}` }}
        >
          {(['light', 'dark'] as const).map(s => (
            <button
              key={s}
              type="button"
              className="dshtz-seg-btn"
              aria-pressed={scheme === s}
              onClick={() => { switchScheme(s) }}
              style={{ border: 0, cursor: 'pointer', font: 'inherit', fontSize: 12.5, padding: '5px 16px' }}
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
          style={{
            flex: 1, minWidth: 160, font: 'inherit', fontSize: 12.5, padding: '5px 10px',
            color: TOKEN.fg, background: 'var(--dsw-specific-input-major)',
            border: `1px solid ${TOKEN.line}`,
          }}
        />
        {/* 显示"当前筛出的 / 全库"两个数：只写筛出的那个会被读成"这个包只有 48 套"。 */}
        <span aria-live="polite" style={{ fontSize: 11.5, color: TOKEN.fg3 }}>
          {fill(t('count'), { n: shown, total: rows.length })}
        </span>
        <button
          type="button"
          className="dshtz-ctl"
          onClick={reset}
          style={{
            border: `1px solid ${TOKEN.line}`, font: 'inherit', fontSize: 12.5,
            padding: '5px 14px', cursor: 'pointer', color: TOKEN.fg2,
          }}
        >
          {t('reset')}
        </button>
      </div>

      {shown === 0
        ? <div style={{ fontSize: 13, color: TOKEN.fg3, padding: '20px 0' }}>{t('empty')}</div>
        : groups.map(g => (
          <section key={g.key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 12.5, fontWeight: 700, letterSpacing: '.14em' }}>
                {g.family}
              </h3>
              <span style={{ fontSize: 11, color: TOKEN.fg3 }}>{g.note}</span>
              <span style={{ flex: 1, height: 1, background: TOKEN.lineSoft }} aria-hidden="true" />
              <span style={{ fontSize: 11, color: TOKEN.fg3 }}>{g.items.length}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(196px, 1fr))', gap: 6 }}>
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
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9, textAlign: 'left',
                    font: 'inherit', cursor: 'pointer', padding: '7px 9px',
                    border: `1px solid ${TOKEN.lineSoft}`,
                  }}
                >
                  <ThemeChip row={r} h={20} />
                  <span style={{
                    flex: 1, fontSize: 13.5, fontWeight: 600, letterSpacing: '.03em',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {r.name}
                  </span>
                  <Swatch hex={r.sealHex} size={9} />
                </button>
              ))}
            </div>
          </section>
        ))}
    </div>
  )
}

function Swatch({ hex, size }: { hex: string; size: number }): ReactNode {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size, height: size, flexShrink: 0, background: hex,
        boxShadow: `inset 0 0 0 1px ${TOKEN.line}`,
      }}
    />
  )
}

/*
 * 主题缩影：这套主题**实际交付**的三段，按面积纪律排布 ——
 * 纸铺满、帘占底部约三分之一、焦点是右上一枚小点。
 *
 * 为什么不画 anchorHex：色卡画满彩度的锚色，交付的却是一张淡色纸，
 * 点「朱红」期待朱砂、装上是白页配浅桃色。那个落差比任何单个色值都伤品相。
 * 边框走 --dsw-alias-border-l2，不用固定的黑色内阴影 —— 后者在暗色主题上看不见。
 */
function ThemeChip({ row, h }: { row: ThemeRow; h: number }): ReactNode {
  return (
    <span
      aria-hidden="true"
      style={{
        position: 'relative', display: 'block', overflow: 'hidden', flexShrink: 0,
        width: Math.round(h * 1.35), height: h,
        background: row.paperHex,
        boxShadow: `inset 0 0 0 1px ${TOKEN.line}`,
      }}
    >
      <span style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: '42%',
        background: row.veilHex,
      }} />
      {/* 焦点这一块要够大才认得出 —— 三段全是同色相的浓淡，只靠纸和帘的话，
       * 竹青/荷叶绿/粉绿在列表里是三枚几乎一样的淡绿方块，诚实但没法扫视。
       * 焦点如今就是锚色本人，放大它既不失真，又把辨识度还了回来。 */}
      <span style={{
        position: 'absolute', top: 0, right: 0,
        width: '42%', height: '58%',
        background: row.focusHex,
      }} />
    </span>
  )
}
