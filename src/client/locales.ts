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
  reset: '内置主题',
  current: '当前主题',
  seal: '印',
  paper: '纸',
  empty: '没有匹配的色名。',
  count: '{n} / {total} 套主题',
  rowLabel: '{name}，{family}纸，{seal}印',
  curated: '精选',
  curatedNote: '四种纸各有代表',
  browseAll: '全部主题',
  showCurated: '仅精选',
  familyRawSilk: '素绢',
  familyRawSilkNote: '清透冷白，锚色轻染',
  familyXuan: '熟宣',
  familyXuanNote: '温润暖白，墨色沉着',
  familyOchre: '赭纸',
  familyOchreNote: '金褐纸底，秋色最深',
  familyViolet: '雪青',
  familyVioletNote: '蓝紫绢底，冷色含光',
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
  remembered: '选择保存在本浏览器并随刷新恢复；「内置主题」把页面交还给应用偏好。',
  /* 六档。name 是档名，basis 是判据（事实，由锚色算出），hour 是时段（叙事，
   * 把六个档串成程序员的一天，读一遍就记得住）。 */
  tierLabel: '按状态筛选',
  tierClearHint: '再点一次取消筛选',
  tierFlow: '心流', tierFlowBasis: '冷而浓', tierFlowHour: '晨起',
  tierZen: '禅定', tierZenBasis: '淡而静', tierZenHour: '午后',
  tierPush: '攻坚', tierPushBasis: '暖而烈', tierPushHour: '傍晚',
  tierCrunch: '爆肝', tierCrunchBasis: '暗而烈', tierCrunchHour: '深夜',
  tierNight: '夜航', tierNightBasis: '暗而静', tierNightHour: '凌晨',
  tierShip: '收工', tierShipBasis: '暖而明', tierShipHour: '天亮',
} as const

export const en: Record<keyof typeof zh, string> = {
  nav: 'Color Themes',
  intro: 'Paper · Veil · Seal — a restrained ground, bubbles that name the color, the seal kept to a signature.',
  scheme: 'Color scheme',
  light: 'Light',
  dark: 'Dark',
  search: 'Search name / pinyin / seal',
  searchLabel: 'Search themes',
  reset: 'Use built-in',
  current: 'Current theme',
  seal: 'Seal',
  paper: 'Paper',
  empty: 'No color name matches.',
  count: '{n} / {total} themes',
  rowLabel: '{name}, {family} paper, {seal} seal',
  curated: 'Curated',
  curatedNote: 'across all four papers',
  browseAll: 'All themes',
  showCurated: 'Curated only',
  familyRawSilk: 'Raw silk',
  familyRawSilkNote: 'clear cool silk with a light anchor tint',
  familyXuan: 'Sized xuan',
  familyXuanNote: 'warm paper with settled ink',
  familyOchre: 'Ochre paper',
  familyOchreNote: 'golden-brown ground, deepest autumn material',
  familyViolet: 'Violet silk',
  familyVioletNote: 'blue-violet ground carrying cool light',
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
  remembered: 'Selections persist in this browser and return after reload. Use built-in returns control to the app.',
  tierLabel: 'Filter by working mood',
  tierClearHint: 'Click again to clear the filter',
  tierFlow: 'Flow', tierFlowBasis: 'cool and saturated', tierFlowHour: 'morning',
  tierZen: 'Zen', tierZenBasis: 'pale and quiet', tierZenHour: 'afternoon',
  tierPush: 'Push', tierPushBasis: 'warm and fierce', tierPushHour: 'evening',
  tierCrunch: 'Crunch', tierCrunchBasis: 'dark and fierce', tierCrunchHour: 'late night',
  tierNight: 'Night', tierNightBasis: 'dark and quiet', tierNightHour: 'small hours',
  tierShip: 'Ship', tierShipBasis: 'warm and bright', tierShipHour: 'daybreak',
}

export type ThemeSectionKey = keyof typeof zh

/** 把 `{name}` 这类占位符替换掉。缺的键留在原位，方便一眼看出漏了什么。 */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole)
}
