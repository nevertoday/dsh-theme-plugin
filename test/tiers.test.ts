/*
 * 六档 · 展示层与生成数据的契约
 * ---------------------------------------------------------------
 * 「哪套属于哪档」由生成器算出、由 scripts/check-contrast.mjs 用七个哨兵复算，
 * 这里只守展示层的三件事：词表一致、每套都有档、文案键齐全。
 * 三者任一漏掉，面板上表现出来的都是「有的行有标签、有的没有」——
 * 正是这一层设计当初要消灭的那个观感。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { THEMES } from '../src/themes.generated.js'
import { TIERS, TIER_COPY, isTier } from '../src/client/tiers.ts'
import { zh, en } from '../src/client/locales.ts'

test('生成数据里每套主题都恰好属于词表内的一档', () => {
  for (const theme of THEMES) {
    assert.ok(isTier(theme.tier), `${theme.id} 的 tier「${theme.tier}」不在六档词表里`)
  }
})

test('六档没有空档 —— 空档说明判定树切坏了', () => {
  const light = THEMES.filter(theme => theme.colorScheme === 'light')
  for (const tier of TIERS) {
    const n = light.filter(theme => theme.tier === tier).length
    assert.ok(n >= 4, `档「${tier}」只有 ${n} 套锚色，不足以称为一类`)
  }
})

test('亮暗孪生同档 —— 档由锚色决定，与明暗无关', () => {
  const byAnchor = new Map<string, string>()
  for (const theme of THEMES) {
    const seen = byAnchor.get(theme.anchorHex)
    if (seen !== undefined) {
      assert.equal(theme.tier, seen, `${theme.anchorHex} 的亮暗两套档不一致`)
    }
    byAnchor.set(theme.anchorHex, theme.tier)
  }
})

test('每档的三个文案键在中英两份字典里都存在', () => {
  for (const tier of TIERS) {
    const copy = TIER_COPY[tier]
    for (const key of [copy.name, copy.basis, copy.hour]) {
      assert.ok(key in zh, `zh 缺 ${key}`)
      assert.ok(key in en, `en 缺 ${key}`)
      assert.notEqual(zh[key as keyof typeof zh], '', `zh 的 ${key} 是空串`)
      assert.notEqual(en[key as keyof typeof en], '', `en 的 ${key} 是空串`)
    }
  }
})

test('展示顺序是「程序员的一天」，不是套数或拼音序', () => {
  assert.deepEqual([...TIERS], ['心流', '禅定', '攻坚', '爆肝', '夜航', '收工'])
})

test('精选覆盖全部六档 —— 默认视图里看不见的档等于不存在', () => {
  const curated = THEMES.filter(theme => theme.colorScheme === 'light' && theme.curated)
  for (const tier of TIERS) {
    assert.ok(
      curated.some(theme => theme.tier === tier),
      `档「${tier}」在精选 12 里没有代表，用户在默认视图里看不到这个标签`,
    )
  }
})
