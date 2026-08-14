/*
 * 页面已经 seed 的模块 · Modules the page's own table already holds
 * ---------------------------------------------------------------
 * 客户端 bundle 必须在运行时 `require` 这些包，**不能把自己那份打进去**。
 * React 尤其致命：页面里出现第二份 React，hooks 会直接罢工 ——
 * "Invalid hook call / Cannot read properties of null (reading 'useState')"，
 * 于是槽里的组件整块崩掉（主题注册那条路不用 hooks，所以看起来"装上了但面板空白"）。
 *
 * 这份清单是从活页面 `Object.keys(window.__DSH_MODULES__.seed)` 读出来的，
 * 不是抄 shell 的 platform.ts —— 它反映的是运行中的 app 真的 seed 了什么。
 *
 * 两条构建路径（tsdown.config.ts 与 scripts/build-esbuild.mjs）都从这里取，
 * 免得改了一处漏了另一处。**不要**改成"解析不到就当外部"那种隐式做法：
 * 那样一旦 node_modules 里出现 react（比如为了跑个 SSR 检查装了一次），
 * 打包器就会静默把它inline 进产物，而且体积只涨 60KB，肉眼极难发现。
 * test/bundle.test.ts 里有一条断言专门盯这件事。
 */
export const PLATFORM_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-runtime',
  '@deepseek-ai/dsh-client-runtime/client',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-theme',
  '@deepseek-ai/dsh-client-ui-theme/client',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
]
