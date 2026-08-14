# dsh-theme-zhongguo · 中国传统色主题包

**以中国传统色为锚色的 DeepSeek Harness 主题插件。** 48 个锚色 × 亮/暗 = **96 个注册主题**，每个主题写满整份 `--dsw-*` 词表（89 个令牌：78 alias + 11 specific），确定性生成，逐主题通过 WCAG AA 对比度断言。

📖 **[English README](./README.md)**

---

## 一览

| | |
|---|---|
| 主题数 | 96（亮 48 / 暗 48） |
| 每主题令牌 | 89 / 89 —— 整份 `--dsw-*` 词表 |
| 取色来源 | 742 条传统色及其和声关系 |
| 生成方式 | 确定性 —— 同一输入字节级复现 `src/themes.generated.js` |
| 可达性 | 逐主题 WCAG 断言；对比度 2208/2208 行通过，失败主题 0 |
| 选主题入口 | 自带设置页（**设置 → 传统色主题**）、`#theme=<id>` 深链、配置项 `defaultTheme` |
| 是否记住 | 记在本浏览器里，刷新后自动恢复 |
| 实机验证 | `dsh web` 0.1.0-rc.6，浏览器实测，2026-08-14 |

## 前置要求

- Node.js 18+ 与 pnpm（或 npm）
- 一个带 `web` profile 的 DeepSeek Harness 安装（`dsh --profile web`）
- `@deepseek-ai/*` 是**可选的 type-only peerDependencies** —— 装不上不影响构建

## 安装

### 1. 构建

```sh
cd dsh-theme-plugin
pnpm install          # @deepseek-ai/* 为 optional peer，装不上不影响构建
pnpm build            # tsdown → lib/index.js（host 半）+ lib/client.js（浏览器包）
```

没有 tsdown 时用 esbuild 备胎 —— 产物形状完全一致，实机验证跑的就是它：

```sh
npm i -D esbuild
node scripts/build-esbuild.mjs      # 或 pnpm build:esbuild
```

浏览器产物**必须**以这一行开头：

```js
window.__ModuleLoader__.load({ id: "dsh-theme-zhongguo", factory: (require) => {
```

`id` 必须等于包名 —— 这是 harness 装载后要校验的图行 id。

### 2. 挂到 profile（官方外部插件通道）

本包在 `package.json` 里同时声明 `dsh.bundle`（`cordis.patch.yml`，向组合树插入自己的行）和 `dsh.client`（`platform: web` 浏览器清单）：

```sh
# profile 目录是 pnpm 工作区根时需要 -w（否则 pnpm 报 ERR_PNPM_ADDING_TO_ROOT）
dsh plugin --profile web add -w /绝对路径/dsh-theme-plugin

dsh --profile web --dump-config     # 应看到 "# == dsh-theme-zhongguo" 图层，含 theme-zhongguo 行
dsh --profile web                   # 启动后打开 http://127.0.0.1:3080/
```

源码 checkout 下同样的命令加 `pnpm` 前缀（`pnpm dsh plugin …`），并先在 harness 仓库根 `pnpm run build`。

卸载：`dsh plugin --profile web remove dsh-theme-zhongguo`

### 3. 选主题

内置 Appearance 行只列 Light / Dark / System —— 它读的是自己的 `THEME_PREFERENCES`，不枚举主题注册表，所以第三方主题在那里**根本不出现**。本插件因此自带一个选择页。

**① 设置页（推荐）**：打开 **设置 → 传统色主题**（导航里在「Agent 预设」之后）。48 个锚色按四个纸家族分组，每行是锚色色块 + 中文色名 + 右侧那枚印色的小点；顶部有明/暗分段、搜索（色名 / 拼音 / 印色名）、当前主题摘要（纸家族 + 印色出处）和「恢复内置主题」。点一下即时生效。

**② 深链**（分享或写进书签时用）：

```
http://127.0.0.1:3080/#theme=zhuqing-light      # 竹青·亮（青绿素绢 + 茜红印）
http://127.0.0.1:3080/#theme=qunqing-dark       # 群青·暗（雪青绢 + 枫叶红印）
http://127.0.0.1:3080/#theme=tenghuang-light    # 藤黄·亮（陈宣赭纸 + 绀青印）
```

改 hash 即时切换，无需刷新。

> **选择会被记住，但不是记在 `settings.yaml` 里。** 第三方主题 id 进不了 harness 的持久化偏好 —— 那是 `ui-theme` 的行为，插件改不了。插件改为把选择记进本浏览器的 `localStorage`，下次打开自动套回来；点「恢复内置主题」即忘掉。不想要就把 `remember` 设成 `false`。见[配置](#配置)。

## 配置

值写在 `cordis.yml` 里本插件那一行下（或 profile 的组合配置里），装载期由导出的 Schemastery schema 校验：

```yaml
- insert:
    - id: theme-zhongguo
      name: dsh-theme-zhongguo
      config:
        defaultTheme: zhuqing-light   # 启动时套用；默认没有
        remember: true                # 把用户的选择记进 localStorage
        hashSelector: true            # 是否响应 #theme=<id> 深链
        settingsOrder: 40             # 设置页在导航里的位置
```

| 字段 | 类型 | 默认 | 含义 |
|---|---|---|---|
| `defaultTheme` | string | — | 启动时套用的主题 id。优先级最低：`#theme=` 深链 > 记住的选择 > 本项。 |
| `remember` | boolean | `true` | 把选择持久化到 `localStorage`（按浏览器、按 origin），下次打开恢复。 |
| `hashSelector` | boolean | `true` | `#theme=<id>` 是否能选主题。 |
| `settingsOrder` | number | `40` | 设置页在导航里的位置。 |

`defaultTheme` 是部署方的默认值、不是用户的选择，所以**有意不**写进 `localStorage` —— 否则以后改了配置也再送不到那个已经存过旧值的浏览器。

> 客户端图是否把 `cordis.yml` 的 config 递给**浏览器**行，尚未实测（见[已知限制](#已知限制)）。因此每一项在客户端侧也各有默认值，而 `remember` 走的是 `localStorage`，与 config 怎么送达无关。

## 无需 harness 的预览

预览页是 mock 聊天界面 + 96 主题画廊 + 实时对比度徽章，主题数据用 `fetch()` 从同目录的 `themes.json` 载入。因此**必须经本地 HTTP 服务打开** —— `file://` 下浏览器会拦掉这次 fetch，页面会显示「无法加载 themes.json」：

> **`preview/` 是本地开发产物，不属于本仓库**（见 `.gitignore`）。全新 clone 没有 `preview/` 目录，下面的命令只在本地已存在该目录时适用。`preview/themes.json` 由 `pnpm generate` 与 `src/themes.generated.js` 同批产出；画廊页面与截图是原 checkout 的工作文件。

```sh
cd preview
python3 -m http.server 8000     # 或 npx serve .
# 浏览器打开 http://localhost:8000/
```

## 设计哲学：纸 · 帘 · 印

中国画不先上颜色，先备纸，再罩染，最后落款。这套主题按同一道工序施工，三个字对应三层实现。

- **纸**（层 A，约六成面积）—— 底不是「把传统色调浅」，而是另换一种材料：素绢、熟宣、雪青绢、赭纸四个家族各有自己的明度与彩度闸门。锚色只留一缕呼吸，彩度被硬钳死，看上去只是「这张白（或这块黑）不太一样」。48 个锚色因此各有自己的地，96 个主题没有两个共享背景。
- **帘**（层 B，约两成半）—— 侧栏与气泡是锚色本人，不掺纸色，走独立的彩度闸门。**一眼认出是哪个传统色，靠气泡，不靠背景。**
- **印**（层 D，不到半成）—— 主按钮**不是**锚色，而是这个锚色关系色里那枚被策展过的印：青绿配朱文、金地配石青。全屏最艳的一块只有它，唯一焦点自动成立（生成器逐主题记录 `sealName` / `sealRel` / `sealWhy`）。
- **留白与墨**（层 C）—— 文字、线、次级面走同一支墨梯（纸色再压深），基础样式表里每个 `nb-XX` 引用换成同明度的染色中性 `N(XX)`；悬停位移、海拔阶梯、边框与交互水洗的 alpha 值逐一照抄 —— 只换色相，不改关系。
- **正本清源** —— 生成器区分「点名」（直接使用某个传统色的 hex）与「兜底」（`ensure()` 沿 OKLab 明度推出的派生值），逐项记入 `degraded`：当前全库为气泡彩度兜底 18 个主题、印色兜底 10 个，共涉及 27 个主题，并在 stdout 汇总报告。未过 AA 断言矩阵的锚色整体弃用并记录原因。

四个纸家族的锚色分布：素绢 12 · 熟宣 14 · 雪青 15 · 赭纸 7。

## 质量保证

每个发货主题通过以下断言（`node scripts/check-contrast.mjs` 可独立复验）：

- `label-primary` 对 `bg-base` / `bg-layer-1` / 侧栏 / 气泡 / 输入框 / 代码块 ≥ 4.5:1
- `label-secondary` 对 `bg-base` ≥ 4.5:1；`label-tertiary` ≥ 3:1
- 主按钮文字对 `button-primary-fill` ≥ 4.5:1；链接色对 `bg-base` ≥ 4.5:1
- 错误 / 成功 / 警示标签色对 `bg-base` ≥ 4.5:1（图标类 ≥ 3:1）
- 气泡与底色可辨（比值 ≥ 1.04）
- 四组结构不变量：层次方向、帘彩度闸门、唯一焦点（最艳一块必须是印）、89/89 令牌覆盖
- 无随机性：同一输入字节级复现 `src/themes.generated.js`；主题签名两两不同（同 scheme 最小签名 dE 0.015 门槛）

最近一次实跑：

```
主题数：96（light 48 / dark 48）
对比度检查：2208/2208 行通过 · 失败主题 0
不变量检查：失败 0
token 图 SHA-1 重复：0
发货件 ↔ 预览件一致性：失败 0
同 scheme 最小主题距离：0.0172 dE（xiangyehong-dark ↔ fentuanhuahong-dark）
```

插件行为 —— 选主题、启动竞态、配置处理、以及构建产物本身 —— 由 `pnpm test` 另外盯着（23 条断言，不需要浏览器）。

## 主题总览

<details>
<summary><b>48 锚色 × 亮/暗 = 96 主题</b> —— 点击展开</summary>

显示名为 `名·亮` / `名·暗`，如 `竹青·暗`。

| 传统色 | 锚色 hex | 纸家族 | 印色 | 亮色主题 id | 暗色主题 id |
|---|---|---|---|---|---|
| 竹青 | `#00A86B` | 素绢 | 茜红 | `zhuqing-light` | `zhuqing-dark` |
| 朱红 | `#ED5126` | 熟宣 | 赭石 | `zhuhong-light` | `zhuhong-dark` |
| 群青 | `#1772B4` | 雪青 | 枫叶红 | `qunqing-light` | `qunqing-dark` |
| 藤黄 | `#FFD111` | 赭纸 | 绀青 | `tenghuang-light` | `tenghuang-dark` |
| 绛紫 | `#8E354A` | 熟宣 | 洋葱紫 | `jiangzi-light` | `jiangzi-dark` |
| 紫云 | `#A020F0` | 雪青 | 蜻蜓红 | `ziyun-light` | `ziyun-dark` |
| 玫红色 | `#FF007F` | 熟宣 | 品红 | `meihongse-light` | `meihongse-dark` |
| 淡曙红 | `#EE2746` | 熟宣 | 殷红 | `danshuhong-light` | `danshuhong-dark` |
| 绀青 | `#4F84FF` | 雪青 | 落霞 | `ganqing-light` | `ganqing-dark` |
| 玫瑰紫 | `#BA2F7B` | 熟宣 | 高粱红 | `meiguizi-light` | `meiguizi-dark` |
| 鹦鹉绿 | `#5BAE23` | 素绢 | 猩红 | `yingwulv-light` | `yingwulv-dark` |
| 菠萝红 | `#FC7930` | 熟宣 | 芙蓉红 | `boluohong-light` | `boluohong-dark` |
| 覆盆子红 | `#AC1F18` | 熟宣 | 苋菜红 | `fupenzihong-light` | `fupenzihong-dark` |
| 苍碧 | `#2A52BE` | 雪青 | 猩红 | `cangbi-light` | `cangbi-dark` |
| 雄黄 | `#FF9900` | 赭纸 | 绀青 | `xionghuang-light` | `xionghuang-dark` |
| 魏紫 | `#7E1671` | 雪青 | 魏紫·深 | `weizi-light` | `weizi-dark` |
| 橄榄黄绿 | `#BEC936` | 素绢 | 魏紫 | `ganlanhuanglv-light` | `ganlanhuanglv-dark` |
| 新禾绿 | `#D2B116` | 赭纸 | 釉蓝 | `xinhelv-light` | `xinhelv-dark` |
| 火砖红 | `#CD6227` | 熟宣 | 淡可可棕 | `huozhuanhong-light` | `huozhuanhong-dark` |
| 香叶红 | `#F07C82` | 熟宣 | 鹅冠红 | `xiangyehong-light` | `xiangyehong-dark` |
| 烟萦紫 | `#8A4B9C` | 雪青 | 烟萦紫·深 | `yanyingzi-light` | `yanyingzi-dark` |
| 韎韐 | `#A5441B` | 熟宣 | 蟹蝥红 | `meige-light` | `meige-dark` |
| 綟绶 | `#6B8E23` | 素绢 | 暗紫苑红 | `lishou-light` | `lishou-dark` |
| 紫藤萝 | `#9B8AE8` | 雪青 | 紫藤萝·深 | `zitengluo-light` | `zitengluo-dark` |
| 汉绣绿 | `#2E7D32` | 素绢 | 绛紫 | `hanxiulv-light` | `hanxiulv-dark` |
| 金棕 | `#B8860B` | 赭纸 | 柏林蓝 | `jinzong-light` | `jinzong-dark` |
| 暗紫苑红 | `#82202B` | 熟宣 | 殷红 | `anziyuanhong-light` | `anziyuanhong-dark` |
| 新绿 | `#6CC788` | 素绢 | 茜裙 | `xinlv-light` | `xinlv-dark` |
| 菱锰红 | `#D276A3` | 熟宣 | 苋菜紫 | `lingmenghong-light` | `lingmenghong-dark` |
| 满天星紫 | `#2E317C` | 雪青 | 栗紫 | `mantianxingzi-light` | `mantianxingzi-dark` |
| 孔雀蓝 | `#0EB0C9` | 雪青 | 胭脂红 | `kongquelan-light` | `kongquelan-dark` |
| 美蝶绿 | `#12AA9C` | 素绢 | 枫叶红 | `meidielv-light` | `meidielv-dark` |
| 扁豆紫 | `#A35C8F` | 雪青 | 扁豆紫·深 | `biandouzi-light` | `biandouzi-dark` |
| 青矾绿 | `#2C9678` | 素绢 | 汉绣红 | `qingfanlv-light` | `qingfanlv-dark` |
| 碧螺春绿 | `#867018` | 赭纸 | 苍碧 | `biluochunlv-light` | `biluochunlv-dark` |
| 橄榄石绿 | `#B2CF87` | 素绢 | 酢酱草红 | `ganlanshilv-light` | `ganlanshilv-dark` |
| 粉团花红 | `#EC9BAD` | 熟宣 | 锦葵红 | `fentuanhuahong-light` | `fentuanhuahong-dark` |
| 荷叶绿 | `#1A6840` | 素绢 | 栗紫 | `heyelv-light` | `heyelv-dark` |
| 石绿 | `#57C3C2` | 素绢 | 银红 | `shilv-light` | `shilv-dark` |
| 柞叶棕 | `#692A1B` | 熟宣 | 栗棕 | `zhayezong-light` | `zhayezong-dark` |
| 长春花蓝 | `#7EC0EE` | 雪青 | 香叶红 | `changchunhualan-light` | `changchunhualan-dark` |
| 山梗紫 | `#61649F` | 雪青 | 满江红 | `shangengzi-light` | `shangengzi-dark` |
| 鷃蓝 | `#144A74` | 雪青 | 枣红 | `yanlan-light` | `yanlan-dark` |
| 粉绿 | `#83CBAC` | 素绢 | 梅红 | `fenlv-light` | `fenlv-dark` |
| 玉鈫蓝 | `#126E82` | 雪青 | 赭石 | `yuqinlan-light` | `yuqinlan-dark` |
| 皮弁 | `#8B5D33` | 赭纸 | 石青 | `pibian-light` | `pibian-dark` |
| 橄榄绿 | `#5E5314` | 赭纸 | 满天星紫 | `ganlanlv-light` | `ganlanlv-dark` |
| 黛紫 | `#5D3A6F` | 雪青 | 黛紫·深 | `daizi-light` | `daizi-dark` |

名单以生成器实跑结果为准，不手工维护；表格可由 `node scripts/generate-themes.mjs` 的 stdout 汇总重新导出。

</details>

## 开发

```sh
pnpm generate         # 重新生成 src/themes.generated.js（产物已提交，见下方注意事项）
pnpm check            # node scripts/check-contrast.mjs —— 对比度 + 不变量 + 一致性断言
pnpm test             # node --test test/*.test.ts —— 插件行为（.ts 直跑需 Node ≥ 23.6）
pnpm build            # tsdown；或 node scripts/build-esbuild.mjs
```

目录职责：

| 路径 | 职责 |
|---|---|
| `src/index.ts` | host 半 —— 图行锚点 + 配置 schema，无宿主侧行为 |
| `src/config.ts` | 配置形状、默认值与收敛 —— 两半和测试共用一份 |
| `src/client/index.ts` | 浏览器插件：注册 96 主题，接线选择器、配置与设置页 |
| `src/client/selector.ts` | 选主题状态机 —— 启动竞态重试 vs 用户主权。纯逻辑，不碰 `ctx`/DOM |
| `src/client/ThemeSection.tsx` | 选择页 UI。只吃 props —— presentation 层不碰 `ctx` |
| `src/client/locales.ts` | 设置页文案（zh / en），两份字典的键由类型互相约束 |
| `src/themes.generated.js` | 生成产物：96 主题 × 89 令牌 + 出处信息 |
| `scripts/generate-themes.mjs` | 确定性生成器 |
| `scripts/check-contrast.mjs` | 数据闸门：对比度、不变量、发货件 ↔ 预览件一致性 |
| `test/` | 行为闸门：选择器、配置，以及对构建产物的装载锁 |
| `preview/` | 独立画廊 —— 仅本地、**不随仓库发布**（`themes.json` 与生成产物同批产出） |

`test/bundle.test.ts` 用 stub 的 `window.__ModuleLoader__` 装 `lib/client.js`，所以先跑 `pnpm build` —— 没有产物时那一组会跳过并明说跳了，而不是静默通过。

两条给贡献者的注意事项：

- **`pnpm generate` 不是自包含的。** 生成器从**本目录往上两级**读取传统色和声数据集（`assets/data/harmonies.js`，742 条色），只能在父仓库 `zhongguo-traditional-colors` 的 checkout 里跑。`pnpm build` 与 `pnpm check` 不需要它，因为生成产物已提交。
- **`pnpm check` 的断言跑在 `src/themes.generated.js` 上** —— 客户端 bundle 真正 import 的那份 —— 并另外断言 `preview/themes.json` 仍与它一致。手改任何一份，一致性断言就会失败。发布的 tarball 里同时带着生成产物和这个脚本，所以在装好的包里跑 `npm run check` 能对着**实际发货的数据**重验全部 2208 行对比度（那种情况下一致性那一段会跳过并明说）。

## 已知限制

- **选择按浏览器记，不跟账号走。** 第三方主题 id 进不了 `settings.yaml` —— 这是 `ui-theme` 的行为，插件改不了。插件用 `localStorage` 绕过它，所以在这台浏览器上刷新还在，但换设备、换浏览器配置就不跟着走。
- **config 是否递到浏览器行尚未实测。** host 半导出了 Schemastery schema，`cordis.yml` 里的值在装载期会被校验；客户端图是否把同一份 config 交给浏览器行则没测过。每一项在客户端侧都有默认值，`remember` 也不依赖它。
- **内置 Appearance 行里没有入口。** 它只按自己的 schema 渲染 light/dark/system，第三方主题根本不出现。本插件自带的设置页才是预期入口。
- **第三方客户端插件只能 `require` 页面模块表里已 seed 的包**（`react` / `react/jsx-runtime` / `react-dom` / `@deepseek-ai/cordis` / `ui-slots` / `web-react` / `ui-primitives`）。因此设置页用 React 自己的 `useState` + 由 `apply()` 递下来的 `subscribe`，而不是 `dsh-client-runtime` 的 `defineStore`；样式不走 CSS modules（第三方 esbuild 构建没有那个 loader），全部内联并只引用 `--dsw-*` 令牌 —— 副作用是面板自身也随主题变色。
- **启动是一场竞态，但输掉竞态不等于可以跟用户较劲。** `ui-layout` 的 presenter 按自己的时机挂载，settings 作用域随后又会读回持久化偏好并 `adopt()`，两者都可能覆盖 `apply()` 期间发出的 `setTheme`。插件对着 presenter 真正写入的 DOM 自验证，未生效则有界退避重试（最多 8 次 ≈5s，成功即停）；启动后 5 秒窗口内被覆盖，最多重新断言 5 次。**窗口过后，偏好被改一律视为用户的决定，插件让位** —— 在内置 Appearance 行点 Light 就保持 Light。这套逻辑在 `src/client/selector.ts`，由 `test/selector.test.ts` 锁住。
- **遮罩与骨架屏令牌已发货，但只在预览页里看过**，未在真实 harness 界面里核对观感。令牌覆盖本身是完整的（89/89）。
- **尚无 harness 实机截图。** 实机验证是用计算样式取证做的（当时环境的浏览器截图不可用）；`preview/` 下的截图（本地未发布的产物）是独立预览页的截图。

<details>
<summary>验证状态 —— 哪些是确证的、哪些是实机测过的、哪些还没测</summary>

**引自 harness 源码 / 文档的事实（本包据此构建）：**

- 主题 API：`ThemeDefinition { id, colorScheme: 'light' | 'dark', tokens: Record<string, string> }`；`ctx.theme.register(definition): () => void`，重复 id 抛错、`'system'` 不可注册，返回的 disposer 反注册并回退偏好（`packages/client/ui-theme/src/client/index.ts`）。
- 外部插件官方通道是 bundle + profile（`docs/user/develop/basic/publish.md`）：`dsh plugin --profile <name> add <path>`。客户端图扫描不区分 in-tree / out-of-tree，只要求包能从 profile 目录 `require.resolve`，且声明 `dsh.client` + `exports["./client"]`。
- 客户端 bundle 形状（cjs/browser 闭包工厂、banner/footer/intro、id = 包名）复刻自 `packages/client/tsdown.client.ts`。**该共享预设是仓库内部的、未发布 npm**，所以本包用自己的 `tsdown.config.ts` 复刻其输出，并以 `scripts/build-esbuild.mjs` 作等形状备胎。
- 动态运行时（self-modification / 动态包）在 master 上不存在，仅有 proposed 笔记；本包不依赖它。

**实机已验证（2026-08-14，`npx @deepseek-ai/dsh@0.1.0-rc.6 web`，浏览器实测）：**

- 整条装载链成立。`dsh plugin --profile web add -w <此目录>` 会把包写进 profile 的 `dependencies` 并自动追加到 `dsh.profile.bundles`；`--dump-config` 里出现 `- id: theme-zhongguo`；服务在 `/plugins/dsh-theme-zhongguo/client.js?rev=…` 返回 200；控制台打出 `registered 96/96 themes (48 light / 48 dark)`。
- 主题真的应用到了真实界面。`#theme=zhuqing-light` 后 `<body>` 上有约 4.4KB 内联令牌：`--dsw-alias-bg-base: rgb(246,253,247)`（青绿纸）、`--dsw-specific-bubble: rgb(179,233,201)`（帘）、`--dsw-alias-button-primary-fill: rgb(199,0,57)`（茜红印）。暗色同验：群青·暗 底 `rgb(14,19,26)` + 枫叶红印 `rgb(213,54,64)`，`body[data-ds-dark-theme]` 已置。
- 设置页四项功能均通过：点击切换、明暗分段、搜索（输 `daizi` 过滤到 1 套）、交还内置主题（内联令牌清零并回落内置偏好）。
- 注册必须走 `ctx.slots.inject('settings.section', () => ctx.slots.register(...))` —— 裸 `register` 进别人声明的槽会抛错。

**仍未实测：**

- `@deepseek-ai/*` 的安装。它们现声明为 optional peerDependencies（npm 对其 `next` dist-tag 的解析曾致 arborist 崩溃，故不放 devDependencies）。除一处以外都是 type-only：`@deepseek-ai/schemastery` 在 host 半是值导入，构建时被 external 掉，运行时由 harness 提供。上述实机验证发生在加配置 schema 之前。
- `cordis.yml` 的 config 是否到得了浏览器行（见已知限制）。
- 遮罩 / 骨架屏令牌在真实 harness 界面里的观感（见已知限制）。

</details>

## 许可

MIT —— 见 [LICENSE](./LICENSE)。
