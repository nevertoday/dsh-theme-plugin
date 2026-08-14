/*
 * 设置页文案 · Settings-page copy
 * ---------------------------------------------------------------
 * 两份字典的键必须完全一致（ctx.locale.register 按键查表，缺键会渲染出空串）——
 * `en` 的类型就是这条约束本身，加键漏翻译会在编译期报错。
 *
 * 带 `{…}` 的是模板：调用点用 fill() 代入，不做字符串拼接（拼接会把语序和
 * 单复数写死在代码里）。
 */

export const zh = {
  nav: '传统色主题',
  // 「一枚印点睛」是旧律的说法：焦点原本是一枚与锚色相距中位 109° 的配伍印。
  // 改为一色到底后，点睛的是锚色本人，印退成导航条上那一抹余痕。
  intro: '纸 · 帘 · 印 —— 底色克制，帘上认色，落款收锋。',
  scheme: '明暗切换',
  light: '亮',
  dark: '暗',
  search: '搜索色名 / 拼音 / 印色',
  searchLabel: '搜索主题',
  reset: '恢复内置主题',
  current: '当前主题',
  seal: '印',
  paper: '纸',
  empty: '没有匹配的色名。',
  count: '{n} / {total} 套主题',
  rowLabel: '{name}，{family}纸，{seal}印',
  curated: '精选',
  curatedNote: '四种纸各有代表',
  chipLabel: '纸 / 帘 / 焦点的实际颜色',
  relTemp: '冷暖对冲',
  relComp: '补色',
  relSplit: '分裂补色',
  relTriad: '三等分',
  relAnalog: '邻近色',
  relAccent: '强调色',
  relDarker: '同色加深',
  relSame: '同名色系',
  relSelf: '自身深色',
  remembered: '选择记在本浏览器里，刷新后自动恢复；「恢复内置主题」交还给内置偏好。',
  notPersisted: '第三方主题只在当前页面生效，刷新后回到内置偏好。',
} as const

export const en: Record<keyof typeof zh, string> = {
  nav: 'Traditional Colors',
  intro: 'Paper · Veil · Seal — a restrained ground, bubbles that name the color, the seal kept to a signature.',
  scheme: 'Color scheme',
  light: 'Light',
  dark: 'Dark',
  search: 'Search name / pinyin / seal',
  searchLabel: 'Search themes',
  reset: 'Back to built-in theme',
  current: 'Current theme',
  seal: 'Seal',
  paper: 'Paper',
  empty: 'No color name matches.',
  count: '{n} / {total} themes',
  rowLabel: '{name}, {family} paper, {seal} seal',
  curated: 'Curated',
  curatedNote: 'one from each paper',
  chipLabel: 'Actual paper / veil / focus colors',
  relTemp: 'temperature contrast',
  relComp: 'complementary',
  relSplit: 'split complementary',
  relTriad: 'triadic',
  relAnalog: 'analogous',
  relAccent: 'accent',
  relDarker: 'darker shade',
  relSame: 'same family',
  relSelf: 'own deep shade',
  remembered: 'Your choice is remembered in this browser and restored on reload; "back to built-in theme" hands the page back.',
  notPersisted: 'Third-party themes apply to this page only; a reload returns to the built-in preference.',
}

export type ThemeSectionKey = keyof typeof zh

/** 把 `{name}` 这类占位符替换掉。缺的键留在原位，方便一眼看出漏了什么。 */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole)
}
