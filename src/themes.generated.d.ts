/** Hand-written declaration for the generator output (scripts/generate-themes.mjs). */

/** Material family ("纸") a theme's neutral ground is mixed from. */
export type ThemeFamily = '素绢' | '熟宣' | '雪青' | '赭纸'

/** Named fallbacks the generator had to apply for a theme (empty when none). */
export type DegradedFlag = 'bubbleChroma' | 'seal'

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
  /** 印 (layer D): the curated seal color used for the single primary accent. */
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
  /** OKLab ΔL the anchor identity was shifted by to satisfy contrast. */
  identityShiftDL: number
  /** Fallbacks applied to this theme; empty array when fully by-the-book. */
  degraded: DegradedFlag[]
  /** The 89 `--dsw-alias-*` / `--dsw-specific-*` CSS variables (full vocabulary). */
  tokens: Record<string, string>
}
export declare const THEMES: GeneratedTheme[]
