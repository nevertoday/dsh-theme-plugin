import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildThemeGroups } from '../src/client/theme-groups.ts'

const rows = [
  { id: 'a-light', name: '竹青', nameEn: 'Zhu Qing', pinyin: 'zhuqing', sealName: '茜红', colorScheme: 'light', family: '素绢', familyNote: '清透', curated: true },
  { id: 'b-light', name: '朱红', nameEn: 'Zhu Hong', pinyin: 'zhuhong', sealName: '赭石', colorScheme: 'light', family: '熟宣', familyNote: '温润', curated: true },
  { id: 'c-light', name: '群青', nameEn: 'Qun Qing', pinyin: 'qunqing', sealName: '枫叶红', colorScheme: 'light', family: '雪青', familyNote: '冷静', curated: false },
  { id: 'a-dark', name: '竹青', nameEn: 'Zhu Qing', pinyin: 'zhuqing', sealName: '茜红', colorScheme: 'dark', family: '素绢', familyNote: '清透', curated: true },
] as const

const copy: Record<string, string> = {
  curated: '精选', curatedNote: '编辑推荐',
  familyRawSilk: '素绢', familyRawSilkNote: '清透',
  familyXuan: '熟宣', familyXuanNote: '温润',
  familyOchre: '赭纸', familyOchreNote: '秋色',
  familyViolet: '雪青', familyVioletNote: '冷静',
}
const t = (key: string): string => copy[key] ?? key

test('默认只展示当前明暗分支的精选，不与全库重复', () => {
  const groups = buildThemeGroups(rows, 'light', '', false, t)

  assert.deepEqual(groups.map(group => group.key), ['__curated'])
  assert.deepEqual(groups[0].items.map(row => row.id), ['a-light', 'b-light'])
})

test('主动展开后按纸家族展示当前分支的完整名册', () => {
  const groups = buildThemeGroups(rows, 'light', '', true, t)

  assert.deepEqual(groups.map(group => group.key), ['素绢', '熟宣', '雪青'])
  assert.deepEqual(groups.flatMap(group => group.items.map(row => row.id)), ['a-light', 'b-light', 'c-light'])
})

test('搜索始终覆盖完整名册，即使全库仍处于折叠状态', () => {
  const groups = buildThemeGroups(rows, 'light', 'qun', false, t)

  assert.deepEqual(groups.flatMap(group => group.items.map(row => row.id)), ['c-light'])
})

test('英文拼音副标也可被搜索', () => {
  const groups = buildThemeGroups(rows, 'light', 'Qun Qing', false, t)

  assert.deepEqual(groups.flatMap(group => group.items.map(row => row.id)), ['c-light'])
})
