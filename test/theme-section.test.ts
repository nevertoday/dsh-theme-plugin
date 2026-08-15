import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/client/ThemeSection.tsx', import.meta.url), 'utf8')

test('选择器选中态使用已经过对比度闸门的表面与文字组合', () => {
  const selectedRule = source.match(/\.dshtz-row\[aria-pressed="true"\][\s\S]*?\n}/)?.[0] ?? ''
  assert.match(selectedRule, /background: var\(--dsw-specific-sidebar-nav-item-active\)/)
  assert.match(selectedRule, /color: var\(--dsw-alias-label-primary\)/)
  assert.doesNotMatch(selectedRule, /label-primary-foreground/)
})
