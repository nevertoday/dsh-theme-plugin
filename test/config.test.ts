/*
 * 配置收敛的行为锁 · Behavioural lock for config normalization
 * ---------------------------------------------------------------
 * 宿主半用 Schemastery 校验 cordis.yml；客户端半是否也拿到 config 尚未实测，
 * 所以 normalizeConfig() 必须在完全没有校验的前提下也给出可用的值 ——
 * 一个写错的偏好不该让 96 套主题装不上。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeConfig, DEFAULT_CONFIG } from '../src/config.ts'

test('什么都没给时用默认值', () => {
  for (const raw of [undefined, null, {}, 'nonsense', 42]) {
    assert.deepEqual(normalizeConfig(raw), { ...DEFAULT_CONFIG })
  }
})

test('类型不对的项被丢弃，落回默认值而不是抛错', () => {
  const config = normalizeConfig({ remember: 'yes', hashSelector: 0, settingsOrder: 'first' })
  assert.equal(config.remember, DEFAULT_CONFIG.remember)
  assert.equal(config.hashSelector, DEFAULT_CONFIG.hashSelector)
  assert.equal(config.settingsOrder, DEFAULT_CONFIG.settingsOrder)
})

test('合法值被采纳', () => {
  const config = normalizeConfig({
    defaultTheme: 'zhuqing-light', remember: false, hashSelector: false, settingsOrder: 5,
  })
  assert.deepEqual(config, {
    defaultTheme: 'zhuqing-light', remember: false, hashSelector: false, settingsOrder: 5,
  })
})

test('形状不对的 defaultTheme 直接不认（它会被拿去查注册表）', () => {
  for (const bad of ['Zhuqing-Light', 'zhuqing light', '../etc/passwd', '', 123, {}]) {
    assert.equal(normalizeConfig({ defaultTheme: bad }).defaultTheme, undefined)
  }
})

test('settingsOrder 的 NaN / Infinity 不算数', () => {
  for (const bad of [NaN, Infinity, -Infinity]) {
    assert.equal(normalizeConfig({ settingsOrder: bad }).settingsOrder, DEFAULT_CONFIG.settingsOrder)
  }
})
