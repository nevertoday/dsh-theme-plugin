/** Hand-written declaration for the generator output (scripts/generate-themes.mjs). */

/** Material family ("纸") a theme's neutral ground is mixed from. */
export type ThemeFamily = '素绢' | '熟宣' | '雪青' | '赭纸'

/** Named fallbacks the generator had to apply for a theme (empty when none). */
export type DegradedFlag = 'bubbleChroma' | 'seal' | 'syntax'

/** The five chromatic syntax slots of the host's shiki css-variables theme. */
export type SyntaxSlot = 'keyword' | 'string' | 'constant' | 'function' | 'parameter'

/**
 * 六档: the working-mood tier an anchor falls into, derived from its OKLab
 * lightness / chroma / hue by a fixed decision tree (see the generator's §6c).
 * Display order follows a programmer's day: 心流 → 禅定 → 攻坚 → 爆肝 → 夜航 → 收工.
 */
export type ThemeTier = '心流' | '禅定' | '攻坚' | '爆肝' | '夜航' | '收工'

export interface GeneratedTheme {
  /** `<pinyin>-light` | `<pinyin>-dark`; the id passed to ctx.theme.register. */
  id: string
  /** Display name, e.g. 竹青·亮. Provenance only — ThemeDefinition has no name field. */
  nameZh: string
  nameEn: string
  /** The traditional color this theme is anchored on. */
  anchorHex: string
  colorScheme: 'light' | 'dark'
  /** 纸 (layer A) material family; see README 设计哲学. */
  family: ThemeFamily
  /** Human-readable family label, e.g. 青绿素绢. */
  familyNote: string
  /** True when the 熟宣-style ripe-paper highlight treatment is applied. */
  ripeHi: boolean
  /** OKLab hue (degrees) the paper ground is tinted toward. */
  paperHue: number
  /** True when paperHue was rotated off the anchor hue to keep the ground legible. */
  paperHueRotated: boolean
  /**
   * True for the 12-anchor / 24-theme shortlist the picker shows by default.
   * Derived by the generator (§11.5), never hand-maintained: the CURATED names
   * that survive the gates, topped up by farthest-point sampling in OKLab.
   */
  curated: boolean
  /**
   * 印 (layer D): the curated seal color. Since 「一色到底」 the seal no longer
   * fills the primary button — that is the anchor itself — and is kept to the
   * active nav accent, i.e. a signature rather than a focus.
   */
  sealName: string
  sealHex: string
  /** Why this seal was picked (curation note). */
  sealWhy: string
  /** Which harmony slot the seal came from, e.g. `temperatureContrast[0]`. */
  sealRel: string
  /** Link ramp base color. */
  linkHex: string
  /** Traditional-color names chosen for error / success / warning states. */
  errName: string
  sucName: string
  wrnName: string
  /**
   * 语法 (layer E): roster names picked for the five chromatic `--shiki-token-*`
   * slots (provenance only). `null` for a slot the generator had to synthesize.
   */
  synNames: Record<SyntaxSlot, string | null>
  /** The slot the anchor itself plays (锚色露脸), or null when its hue fits none. */
  synAnchorSlot: SyntaxSlot | null
  /** Which of the six working-mood tiers this anchor falls into (derived, never hand-set). */
  tier: ThemeTier
  /** OKLab ΔL the anchor identity was shifted by to satisfy contrast. */
  identityShiftDL: number
  /** Fallbacks applied to this theme; empty array when fully by-the-book. */
  degraded: DegradedFlag[]
  /**
   * The full 98-token vocabulary: 89 `--dsw-alias-*` / `--dsw-specific-*`
   * variables plus the 9 `--shiki-token-*` syntax slots the host's shiki
   * css-variables theme consumes.
   */
  tokens: Record<string, string>
}
export declare const THEMES: GeneratedTheme[]
