# dsh-theme-plugin

Chinese traditional colors as a **DeepSeek Harness theme pack** — 48 anchors × light/dark = **96 themes**, each writing the full `--dsw-*` token vocabulary (89 tokens) and passing WCAG AA contrast checks (2208/2208 rows, 0 failures).

📖 [中文文档](./README.zh-CN.md)

## Install

Requirements: Node.js 18+, pnpm, and the `dsh` CLI (`@deepseek-ai/dsh`) with a `web` profile (first boot creates it at `~/.dsh/profiles/web`).

```sh
cd /path/to/dsh-theme-plugin
pnpm install && pnpm build                                  # ① build lib/client.js (browser bundle)
dsh plugin --profile web add -w /path/to/dsh-theme-plugin   # ② register with the web profile
dsh --profile web                                           # ③ boot → open http://127.0.0.1:3080/
```

- **①** `pnpm build` needs `tsdown`; fallback: `npm i -D esbuild && node scripts/build-esbuild.mjs`.
- **②** `-w` is required because the profile directory is a pnpm workspace root. `add` links the directory (`link:` dependency) and auto-appends the package to `dsh.profile.bundles`; the loader reads `lib/client.js` straight from the repo, which is why `lib/` is committed.
- **Verify:** `dsh --profile web --dump-config` shows a `theme-zhongguo` row; the browser console logs `registered 96/96 themes`.
- **Update:** `git pull && pnpm install && pnpm build`, then boot — no re-registration needed.
- **Uninstall:** `dsh plugin --profile web remove dsh-theme-zhongguo`

## Usage

Open **Settings → Traditional Colors** (after "Agent presets" in the nav) and pick a theme — applies immediately. Or share/bookmark a deep link:

```
http://127.0.0.1:3080/#theme=zhuqing-light      # 竹青 light
http://127.0.0.1:3080/#theme=qunqing-dark       # 群青 dark
```

Changing the hash switches themes live. Your pick is remembered per browser (`localStorage`), not in `settings.yaml` — it does not follow you across devices.

## Configuration

Under the plugin's row in `cordis.yml`:

```yaml
config:
  defaultTheme: zhuqing-light   # theme applied at boot (optional)
  remember: true                # remember the pick in localStorage
  hashSelector: true            # honour #theme=<id> deep links
  settingsOrder: 40             # settings page position in the nav
```

## License

MIT — see [LICENSE](./LICENSE).
