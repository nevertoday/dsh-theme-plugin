import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/client/ThemeSection.tsx', import.meta.url), 'utf8')
const css = source.match(/const CSS = `([\s\S]*?)`/)?.[1] ?? ''

test('选中的主题行靠一圈墨色边标出，不铺底色，字留在已过闸门的弹层底上', () => {
  const selectedRule = css.match(/\.dshtz-row\[aria-pressed="true"\][\s\S]*?\n}/)?.[0] ?? ''
  assert.match(selectedRule, /border-color: var\(--dsw-alias-label-primary\)/)
  assert.doesNotMatch(selectedRule, /background/)
  assert.doesNotMatch(selectedRule, /label-primary-foreground/)
})

test('面板守小小东 UI Kit：直角、字重 400/500/600、不改字距、没有阴影', () => {
  assert.ok(css.length > 0, 'ThemeSection 里找不到样式表')
  for (const [, value] of css.matchAll(/border-radius:\s*([^;]+);/g)) assert.equal(value.trim(), '0')
  for (const [, value] of css.matchAll(/font-weight:\s*([^;]+);/g)) assert.match(value.trim(), /^(400|500|600)$/)
  assert.doesNotMatch(css, /letter-spacing|box-shadow/)
  // 样式只在这张表里：JSX 的内联 style 只许写数据颜色和尺寸。
  for (const [, inline] of source.matchAll(/style=\{\{([^}]*)\}\}/g)) {
    assert.doesNotMatch(inline, /radius|fontWeight|letterSpacing|boxShadow|border/)
  }
})
