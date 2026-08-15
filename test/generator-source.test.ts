import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

test('生成器在执行上游脚本前校验固定的 SHA-256', () => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-theme-source-'))
  try {
    mkdirSync(join(root, 'assets/data'), { recursive: true })
    mkdirSync(join(root, 'assets/js'), { recursive: true })
    writeFileSync(join(root, 'assets/data/harmonies.js'), 'window.tampered = true\n')
    writeFileSync(join(root, 'assets/js/color-core.js'), 'window.ZH_COLOR_CORE = {}\n')

    const result = spawnSync('node', ['scripts/generate-themes.mjs'], {
      encoding: 'utf8',
      env: { ...process.env, ZH_COLORS_REPO: root },
    })

    assert.notEqual(result.status, 0)
    assert.match(`${result.stdout}${result.stderr}`, /SHA-256.*不匹配/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
