import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

test('npm 根入口与 client 入口都提供 TypeScript 声明', () => {
  const result = spawnSync('node_modules/.bin/tsc', [
    '--noEmit',
    '--strict',
    '--module', 'NodeNext',
    '--moduleResolution', 'NodeNext',
    'test/fixtures/harness-types.d.ts',
    'test/fixtures/package-consumer.ts',
  ], { encoding: 'utf8' })

  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`)
})
