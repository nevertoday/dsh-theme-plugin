# dsh-theme-plugin

以中国传统色为锚色的 **DeepSeek Harness 主题包** —— 48 个锚色 × 亮/暗 = **96 套主题**，每套写满完整 `--dsw-*` 令牌词表（89 个），逐套通过 WCAG AA 对比度校验（2208/2208 行，失败 0）。

📖 [English README](./README.md)

## 安装

要求：Node.js 18+、pnpm、`dsh` CLI（`@deepseek-ai/dsh`）且带 `web` profile（首次启动自动创建于 `~/.dsh/profiles/web`）。

```sh
cd /path/to/dsh-theme-plugin
pnpm install && pnpm build                                  # ① 构建 lib/client.js（浏览器包）
dsh plugin --profile web add -w /path/to/dsh-theme-plugin   # ② 挂到 web profile
dsh --profile web                                           # ③ 启动 → 打开 http://127.0.0.1:3080/
```

- **①** `pnpm build` 需要 tsdown；备胎：`npm i -D esbuild && node scripts/build-esbuild.mjs`。
- **②** 必须带 `-w`（profile 目录是 pnpm 工作区根）。`add` 以 `link:` 目录链接挂载并自动并入 `dsh.profile.bundles`；装载器直接读仓库里的 `lib/client.js` —— 所以 `lib/` 要提交。
- **验证**：`dsh --profile web --dump-config` 应出现 `theme-zhongguo` 行；浏览器控制台打印 `registered 96/96 themes`。
- **更新**：`git pull && pnpm install && pnpm build` 后重启即可，无需重新挂载。
- **卸载**：`dsh plugin --profile web remove dsh-theme-zhongguo`

## 使用

打开 **设置 → 传统色主题**（导航「Agent 预设」之后）点选，即时生效；或用深链分享/收藏：

```
http://127.0.0.1:3080/#theme=zhuqing-light      # 竹青·亮
http://127.0.0.1:3080/#theme=qunqing-dark       # 群青·暗
```

改 hash 即时切换。选择按**浏览器**记住（`localStorage`），不写进 `settings.yaml`，换设备不跟随。

## 配置

写在 `cordis.yml` 里本插件那一行下：

```yaml
config:
  defaultTheme: zhuqing-light   # 启动时应用的默认主题（可选）
  remember: true                # 用 localStorage 记住选择
  hashSelector: true            # 响应 #theme=<id> 深链
  settingsOrder: 40             # 设置页在导航中的位置
```

## 许可

MIT —— 见 [LICENSE](./LICENSE)。
