/*
 * 宿主半 · Host loader entry
 * ---------------------------------------------------------------
 * 主题本身完全在浏览器里（见 src/client/index.ts），这一半只做一件事：
 * 当组合树里的那一行 —— cordis.patch.yml 插入的 `theme-zhongguo`。
 * 所以 apply() 是空的，这是有意的，不是没写完。
 *
 * **这个文件不 import 任何运行时包**，这条纪律是实机撞出来的：
 * 曾经这里 `import Schema from '@deepseek-ai/schemastery'` 来声明配置 schema，
 * 结果 `dsh plugin add -w <本目录>`（link: 装法）一启动就 ERR_MODULE_NOT_FOUND ——
 * node 是从**被链接的仓库目录**解析的，那里没有这个包；npm 装法之所以看不出来，
 * 只是因为 profile 的 node_modules 恰好 hoist 了 harness 自己那份。
 * 而"给仓库也装一份"会把框架模块变成两个实例（同一天刚被两份 React 教育过）。
 *
 * DSH 0.1 的客户端 boot manifest 不携带宿主 config，因此这里不公开假配置 API；
 * 选择入口是设置页与 #theme=，持久化在浏览器 localStorage。
 */
export const name = 'theme-zhongguo'

/** Provides no host-side behavior — the roster and the picker are browser-side. */
export function apply(): void {}
