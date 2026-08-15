import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

test('README 事实闸门可在没有本地 preview 产物的干净检出中运行', () => {
  const result = spawnSync(process.execPath, ['scripts/check-readme.mjs'], {
    cwd: root,
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stderr || result.stdout)
})
