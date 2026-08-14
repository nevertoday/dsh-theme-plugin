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

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const hit = (r: ThemeRow) => q === ''
      || r.name.includes(q) || r.pinyin.includes(q) || r.sealName.includes(q) || r.id.includes(q)
    const byFamily = new Map<string, { note: string; items: ThemeRow[] }>()
    for (const r of rows) {
      if (r.colorScheme !== scheme || !hit(r)) continue
      const g = byFamily.get(r.family) ?? { note: r.familyNote, items: [] }
      g.items.push(r)
      byFamily.set(r.family, g)
    }
    return FAMILY_ORDER
      .filter(f => byFamily.has(f))
      .map(f => ({ family: f, ...byFamily.get(f)! }))
  }, [rows, scheme, query])

  const shown = groups.reduce((n, g) => n + g.items.length, 0)
  const currentRow = rows.find(r => r.id === preference)

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
          <Swatch hex={currentRow.anchorHex} size={34} />
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
              onClick={() => { setScheme(s) }}
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
        <span aria-live="polite" style={{ fontSize: 11.5, color: TOKEN.fg3 }}>
          {fill(t('count'), { n: shown })}
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
          <section key={g.family} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                  <Swatch hex={r.anchorHex} size={20} />
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
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.16)',
      }}
    />
  )
}
