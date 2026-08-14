# dsh-theme-plugin

以中国传统色为锚色的 **DeepSeek Harness 主题包** —— 49 个锚色 × 亮/暗 = **98 套主题**，每套写满完整 `--dsw-*` 令牌词表（89 个），逐套通过 WCAG AA 对比度校验（2254/2254 行，失败 0）。选择面板默认只给 12 色精选。

📖 [English README](./README.md)

<p align="center">
  <img src="https://raw.githubusercontent.com/nevertoday/dsh-theme-plugin/main/docs/img/theme-zhuqing-light.png" alt="竹青·亮：素绢纸，气泡是一层竹青罩染，发送键是锚色本人" width="49%">
  <img src="https://raw.githubusercontent.com/nevertoday/dsh-theme-plugin/main/docs/img/theme-zhuhong-dark.png" alt="朱红·暗：熟宣纸压成暖墨，气泡是深绛罩染，发送键是朱砂" width="49%">
  <br>
  <img src="https://raw.githubusercontent.com/nevertoday/dsh-theme-plugin/main/docs/img/theme-qunqing-light.png" alt="群青·亮：雪青绢，气泡是一层群青罩染，发送键是群青" width="49%">
  <img src="https://raw.githubusercontent.com/nevertoday/dsh-theme-plugin/main/docs/img/theme-tenghuang-dark.png" alt="藤黄·暗：赭纸压成橄榄墨，气泡是橄榄罩染，发送键是明黄" width="49%">
</p>
<p align="center">
  <sub>竹青·亮（素绢）&nbsp; | &nbsp;朱红·暗（熟宣）<br>群青·亮（雪青）&nbsp; | &nbsp;藤黄·暗（赭纸）</sub><br>
  <sub>四种纸各取一个锚色。每一套里，<b>屏上最艳的那一块都是你选的那个色</b>。</sub>
</p>

## 安装

```sh
npx -y @deepseek-ai/dsh plugin --profile web add dsh-theme-plugin@latest
npx -y @deepseek-ai/dsh --profile web          # 启动 → 打开 http://127.0.0.1:3080/
```

装的是 npm 上的预构建产物 —— 不用 clone，也不用构建。`web` profile 会在首次启动时自动创建于 `~/.dsh/profiles/web`。

- **验证**：`dsh --profile web --dump-config` 应出现 `theme-zhongguo` 行；浏览器控制台打印 `registered 98/98 themes`。
- **更新**：把上面那条 `add` 命令再跑一次（`@latest`）。
- **卸载**：`dsh plugin --profile web remove dsh-theme-plugin`

### 从源码安装（开发用）

要求：Node.js 20+（`package.json` 的 `engines`；`pnpm test` 直跑 `.ts` 另需 23.6+）与 pnpm。

```sh
git clone https://github.com/nevertoday/dsh-theme-plugin
cd dsh-theme-plugin
pnpm install && pnpm build                                # ① 构建 lib/client.js（浏览器包）
dsh plugin --profile web add -w .                         # ② 挂载（'.' 即当前目录）
dsh --profile web                                         # ③ 启动 → 打开 http://127.0.0.1:3080/
```

- **①** `pnpm install` 的 `prepare` 已经构建过一次，后面的 `pnpm build` 是显式的保险（用 `--ignore-scripts` 安装时它就成了必需）。需要 tsdown；备胎 `node scripts/build-esbuild.mjs`（esbuild 已在 devDependencies 里）。仓库带一份 `.npmrc`（`auto-install-peers=false`）—— **缺了它 pnpm ≥ 9 装不上**：它会去装 `@deepseek-ai/*` peer（即便都标了 optional），而 `dsh-client-runtime` 的 latest 依赖一个未发布到 npm 的包，安装会以 `ERR_PNPM_FETCH_404` 失败。
- **②** 必须带 `-w`（profile 目录是 pnpm 工作区根）。`add` 会把 `.` 这类相对路径锚定到执行命令的目录；以 `link:` 目录链接挂载并自动并入 `dsh.profile.bundles`；装载器直接读工作副本里的 `lib/client.js` —— 那个文件由步骤 ① 生成，所以**不必**提交（提交也可以，代价是每次安装后 553KB 产物 + 790KB sourcemap 都会显示为改动）。
- **闸门（不用起 harness）**：`pnpm check`（2254 行对比度 + 不变量）与 `pnpm test`（46 条行为断言，含对 `lib/client.js` 的装载锁）。
- **更新**：`git pull && pnpm install && pnpm build` 后重启即可，无需重新挂载。

## 使用

打开 **设置 → 传统色主题**（导航「Agent 预设」之后）点选，即时生效；或用深链分享/收藏：

```
http://127.0.0.1:3080/#theme=zhuqing-light      # 竹青·亮
http://127.0.0.1:3080/#theme=qunqing-dark       # 群青·暗
```

改 hash 即时切换。选择按**浏览器**记住（`localStorage`），不写进 `settings.yaml`，换设备不跟随。

<p align="center">
  <img src="https://raw.githubusercontent.com/nevertoday/dsh-theme-plugin/main/docs/img/settings-light.png" alt="设置 → 传统色主题，竹青·亮：精选置顶，其后按纸家族排全部；每行的色卡画的是这套主题实际交付的纸/帘/焦点" width="49%">
  <img src="https://raw.githubusercontent.com/nevertoday/dsh-theme-plugin/main/docs/img/settings-dark.png" alt="同一个面板在藤黄·暗下：面板自身也随主题变色，因为它只引用 --dsw-* 令牌" width="49%">
</p>
<p align="center">
  <sub>每行的色卡画的是这套主题<b>实际交付</b>的纸、帘、焦点，不是满彩度的锚色。
  当前主题那行还写明了印是谁、为什么是它（<code>茜红 · 策展印 · 冷暖对冲</code>）。</sub>
</p>

面板自己也随主题变色 —— 它的样式只引用 `--dsw-*` 令牌，所以它同时是这套主题的演示。

## 设计哲学：纸 · 帘 · 印

中国画不先上颜色，先备纸，再罩染，最后落款。这套主题按同一道工序施工，三个字对应三层实现。

- **纸**（层 A，约六成面积）—— 底不是「把传统色调浅」，而是另换一种材料：素绢、熟宣、雪青绢、赭纸四个家族各有自己的明度与彩度闸门。四族纸相的彩度被刻意拉开（OKLab 约 0.010 / 0.015 / 0.019 / 0.024），让四种纸是眼睛分得出的四种材料，而不只是数据上不同。底色定在 L ≈ 0.966–0.970 —— 是暖白不是纯白，纸退一步，抬升面才有地方浮起来。49 个锚色各有自己的地，98 个主题没有两个共享背景。
- **帘**（层 B，约两成半）—— 侧栏与气泡是锚色本人，不掺纸色，走独立的彩度闸门。**一眼认出是哪个传统色，靠气泡，不靠背景。**
- **印**（层 D）—— **焦点就是锚色本人**：主按钮与发送键都是锚色压深的版本；那枚策展的配伍印退到导航选中态那一抹余痕上，是落款，不是焦点。这条推翻了本包原先的律（印去填主按钮，而印与锚色的色相中位差 109° —— 于是你选竹青，屏上最响的是一块茜红）。生成器仍逐主题记录 `sealName` / `sealRel` / `sealWhy`，只是它们现在描述的是那一枚落款。
- **留白与墨**（层 C）—— 文字、线、次级面走同一支墨梯（纸色再压深），基础样式表里每个 `nb-XX` 引用换成同明度的染色中性 `N(XX)`；悬停位移、海拔阶梯、边框与交互水洗的 alpha 值逐一照抄 —— 只换色相，不改关系。
- **精选** —— 49 个锚色里有 12 个带 `curated` 标记，在选择面板置顶。名单不手工维护：`CURATED` 里活过闸门的那些，不足处用 OKLab 最远点采样补齐，让这 12 色在色彩空间里铺得开，而不是挤成一堆。
- **正本清源** —— 生成器区分「点名」（直接使用某个传统色的 hex）与「兜底」（`ensure()` 沿 OKLab 明度推出的派生值），逐项记入 `degraded`：当前全库为气泡彩度兜底 16 个主题、印色兜底 10 个，共涉及 26 个主题，并在 stdout 汇总报告。未过 AA 断言矩阵的锚色整体弃用并记录原因。

四个纸家族的锚色分布：素绢 11 · 熟宣 14 · 雪青 18 · 赭纸 6。

## 主题总览

<details>
<summary><b>49 锚色 × 亮/暗 = 98 主题</b> —— 点击展开</summary>

显示名为 `名·亮` / `名·暗`，如 `竹青·暗`。

⭐ 为选择面板置顶的 12 色精选。

| 传统色 | 锚色 hex | 纸家族 | 印色 | 亮色主题 id | 暗色主题 id |
|---|---|---|---|---|---|
| 竹青 ⭐ | `#00A86B` | 素绢 | 茜红 | `zhuqing-light` | `zhuqing-dark` |
| 朱红 ⭐ | `#ED5126` | 熟宣 | 赭石 | `zhuhong-light` | `zhuhong-dark` |
| 群青 ⭐ | `#1772B4` | 雪青 | 枫叶红 | `qunqing-light` | `qunqing-dark` |
| 藤黄 ⭐ | `#FFD111` | 赭纸 | 瑶碧 | `tenghuang-light` | `tenghuang-dark` |
| 绛紫 ⭐ | `#8E354A` | 熟宣 | 洋葱紫 | `jiangzi-light` | `jiangzi-dark` |
| 紫云 ⭐ | `#A020F0` | 雪青 | 蜻蜓红 | `ziyun-light` | `ziyun-dark` |
| 玫红色 ⭐ | `#FF007F` | 熟宣 | 品红 | `meihongse-light` | `meihongse-dark` |
| 淡曙红 | `#EE2746` | 熟宣 | 殷红 | `danshuhong-light` | `danshuhong-dark` |
| 绀青 | `#4F84FF` | 雪青 | 落霞 | `ganqing-light` | `ganqing-dark` |
| 玫瑰紫 | `#BA2F7B` | 熟宣 | 高粱红 | `meiguizi-light` | `meiguizi-dark` |
| 鹦鹉绿 | `#5BAE23` | 素绢 | 猩红 | `yingwulv-light` | `yingwulv-dark` |
| 菠萝红 | `#FC7930` | 熟宣 | 芙蓉红 | `boluohong-light` | `boluohong-dark` |
| 覆盆子红 | `#AC1F18` | 熟宣 | 苋菜红 | `fupenzihong-light` | `fupenzihong-dark` |
| 苍碧 | `#2A52BE` | 雪青 | 猩红 | `cangbi-light` | `cangbi-dark` |
| 雄黄 | `#FF9900` | 赭纸 | 绀青 | `xionghuang-light` | `xionghuang-dark` |
| 琥珀黄 | `#FEBA07` | 赭纸 | 绀青 | `hupohuang-light` | `hupohuang-dark` |
| 魏紫 | `#7E1671` | 雪青 | 魏紫·深 | `weizi-light` | `weizi-dark` |
| 橄榄黄绿 | `#BEC936` | 素绢 | 魏紫 | `ganlanhuanglv-light` | `ganlanhuanglv-dark` |
| 火砖红 | `#CD6227` | 熟宣 | 淡可可棕 | `huozhuanhong-light` | `huozhuanhong-dark` |
| 香叶红 | `#F07C82` | 熟宣 | 鹅冠红 | `xiangyehong-light` | `xiangyehong-dark` |
| 烟萦紫 | `#8A4B9C` | 雪青 | 烟萦紫·深 | `yanyingzi-light` | `yanyingzi-dark` |
| 韎韐 | `#A5441B` | 熟宣 | 蟹蝥红 | `meige-light` | `meige-dark` |
| 綟绶 | `#6B8E23` | 素绢 | 暗紫苑红 | `lishou-light` | `lishou-dark` |
| 紫藤萝 | `#9B8AE8` | 雪青 | 淡罂粟红 | `zitengluo-light` | `zitengluo-dark` |
| 汉绣绿 | `#2E7D32` | 素绢 | 绛紫 | `hanxiulv-light` | `hanxiulv-dark` |
| 暗紫苑红 | `#82202B` | 熟宣 | 殷红 | `anziyuanhong-light` | `anziyuanhong-dark` |
| 菱锰红 ⭐ | `#D276A3` | 熟宣 | 苋菜紫 | `lingmenghong-light` | `lingmenghong-dark` |
| 满天星紫 | `#2E317C` | 雪青 | 栗紫 | `mantianxingzi-light` | `mantianxingzi-dark` |
| 孔雀蓝 | `#0EB0C9` | 雪青 | 胭脂红 | `kongquelan-light` | `kongquelan-dark` |
| 宝石蓝 | `#2486B9` | 雪青 | 朱墙 | `baoshilan-light` | `baoshilan-dark` |
| 美蝶绿 | `#12AA9C` | 素绢 | 枫叶红 | `meidielv-light` | `meidielv-dark` |
| 扁豆紫 | `#A35C8F` | 雪青 | 扁豆紫·深 | `biandouzi-light` | `biandouzi-dark` |
| 浅紫藤萝 ⭐ | `#D1B3FF` | 雪青 | 杏子 | `qianzitengluo-light` | `qianzitengluo-dark` |
| 青矾绿 | `#2C9678` | 素绢 | 汉绣红 | `qingfanlv-light` | `qingfanlv-dark` |
| 碧螺春绿 | `#867018` | 赭纸 | 苍碧 | `biluochunlv-light` | `biluochunlv-dark` |
| 橄榄石绿 | `#B2CF87` | 素绢 | 酢酱草红 | `ganlanshilv-light` | `ganlanshilv-dark` |
| 粉团花红 | `#EC9BAD` | 熟宣 | 锦葵红 | `fentuanhuahong-light` | `fentuanhuahong-dark` |
| 荷叶绿 ⭐ | `#1A6840` | 素绢 | 栗紫 | `heyelv-light` | `heyelv-dark` |
| 石绿 | `#57C3C2` | 素绢 | 银红 | `shilv-light` | `shilv-dark` |
| 柞叶棕 | `#692A1B` | 熟宣 | 栗棕 | `zhayezong-light` | `zhayezong-dark` |
| 长春花蓝 | `#7EC0EE` | 雪青 | 香叶红 | `changchunhualan-light` | `changchunhualan-dark` |
| 山梗紫 | `#61649F` | 雪青 | 满江红 | `shangengzi-light` | `shangengzi-dark` |
| 鷃蓝 | `#144A74` | 雪青 | 枣红 | `yanlan-light` | `yanlan-dark` |
| 粉绿 ⭐ | `#83CBAC` | 素绢 | 梅红 | `fenlv-light` | `fenlv-dark` |
| 玉鈫蓝 | `#126E82` | 雪青 | 赭石 | `yuqinlan-light` | `yuqinlan-dark` |
| 皮弁 | `#8B5D33` | 赭纸 | 石青 | `pibian-light` | `pibian-dark` |
| 橄榄绿 | `#5E5314` | 赭纸 | 满天星紫 | `ganlanlv-light` | `ganlanlv-dark` |
| 萝兰紫 | `#C08EAF` | 雪青 | 萝兰紫·深 | `luolanzi-light` | `luolanzi-dark` |
| 黛紫 ⭐ | `#5D3A6F` | 雪青 | 黛紫·深 | `daizi-light` | `daizi-dark` |

名单以生成器实跑结果为准，不手工维护；表格可由 `node scripts/generate-themes.mjs` 的 stdout 汇总重新导出。

</details>

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
