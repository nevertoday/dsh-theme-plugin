import { apply } from 'dsh-theme-plugin'
// @ts-expect-error DSH 0.1 的 client manifest 不转发宿主配置，不能公开假 Config。
import type { Config } from 'dsh-theme-plugin'
import { apply as applyClient, inject, name as clientName } from 'dsh-theme-plugin/client'

apply()
void [applyClient, inject, clientName]
