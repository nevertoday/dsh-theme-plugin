/** 选择页分组的最小数据面；完整 ThemeRow 可以直接传入。 */
export interface ThemeGroupRow {
  id: string
  name: string
  nameEn: string
  pinyin: string
  sealName: string
  colorScheme: 'light' | 'dark'
  family: string
  curated: boolean
}

export interface ThemeGroup<T extends ThemeGroupRow> {
  key: string
  family: string
  note: string
  items: T[]
}

/** 与生成器家族表同序，避免数据源的遍历顺序改变视觉叙事。 */
const FAMILY_ORDER = ['素绢', '熟宣', '赭纸', '雪青']
const FAMILY_COPY: Record<string, { name: string; note: string }> = {
  素绢: { name: 'familyRawSilk', note: 'familyRawSilkNote' },
  熟宣: { name: 'familyXuan', note: 'familyXuanNote' },
  赭纸: { name: 'familyOchre', note: 'familyOchreNote' },
  雪青: { name: 'familyViolet', note: 'familyVioletNote' },
}

/**
 * 默认只给编辑推荐；展开后才给全库。搜索属于查找而不是浏览，因此总是穿透折叠，
 * 但仍按纸家族交代材质关系，不另造一个会重复结果的“精选”组。
 */
export function buildThemeGroups<T extends ThemeGroupRow>(
  rows: readonly T[],
  scheme: 'light' | 'dark',
  query: string,
  showAll: boolean,
  t: (key: string) => string,
): ThemeGroup<T>[] {
  const q = query.trim().toLowerCase()
  const hit = (row: T): boolean => q === ''
    || row.name.toLowerCase().includes(q)
    || row.nameEn.toLowerCase().includes(q)
    || row.pinyin.toLowerCase().includes(q)
    || row.sealName.toLowerCase().includes(q)
    || row.id.toLowerCase().includes(q)
  const visible = rows.filter(row => row.colorScheme === scheme && hit(row))

  if (q === '' && !showAll) {
    const picks = visible.filter(row => row.curated)
    if (picks.length > 0) {
      return [{ key: '__curated', family: t('curated'), note: t('curatedNote'), items: picks }]
    }
  }

  const byFamily = new Map<string, T[]>()
  for (const row of visible) {
    const group = byFamily.get(row.family) ?? []
    group.push(row)
    byFamily.set(row.family, group)
  }
  return FAMILY_ORDER
    .filter(family => byFamily.has(family))
    .map(family => ({
      key: family,
      family: t(FAMILY_COPY[family].name),
      note: t(FAMILY_COPY[family].note),
      items: byFamily.get(family)!,
    }))
}
