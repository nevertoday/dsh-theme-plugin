# X 推文草稿

配图：`docs/img/panel-light.png`（或你截的藤黄那张）挂在第 1 条。
链接放最后一条，避免第 1 条被算作「带外链」压推荐量。

---

## 1/5 · 主帖

给 DeepSeek Harness 做了套主题：49 个中国传统色 × 亮暗 = 98 套。

最满意的不是配色，是选色的方式——不问你喜欢什么颜色，问你今天想怎么工作：

晨起 心流 · 午后 禅定 · 傍晚 攻坚
深夜 爆肝 · 凌晨 夜航 · 天亮 收工

这六档是算出来的，不是我编的 ↓

---

## 2/5

判据只用锚色在 OKLab 里的明度、彩度、色相：

暗而静 → 夜航
暗而烈 → 爆肝
淡而静 → 禅定
暖而烈 → 攻坚
暖而明 → 收工
冷而浓 → 心流

49 个色恰好各归一档，没有空标签：
心流 11 · 禅定 12 · 攻坚 8 · 爆肝 4 · 夜航 8 · 收工 6

---

## 3/5

配色本身按中国画的工序来。中国画不先上颜色——先备纸，再罩染，最后落款：

纸（约六成面积）四种材料：素绢 · 熟宣 · 雪青 · 赭纸
帘（约两成半）锚色本人的一层罩染，你靠气泡认出这是哪个色
印（落款）那一枚钤印，小到不能再小

---

## 4/5

中间做错过一版，值得说：

主按钮当时填的是锚色的「配伍色」，和锚色的色相中位差 109°。于是你选了竹青，屏幕上最响的一笔是茜红。

现在改成一色到底——最艳的那一块，永远是你选的那个色。

---

## 5/5

全部由生成器算出，不手工调色：
· 3136 条对比度断言逐条过 WCAG AA
· 代码块的语法高亮也进了主题
· 生成器确定性，重跑必须字节一致

一行装：
npx -y @deepseek-ai/dsh plugin --profile web add dsh-theme-plugin@latest

MIT ｜ github.com/nevertoday/dsh-theme-plugin

---

# 备选：单条版（不发串）

给 DeepSeek Harness 做了套主题：49 个中国传统色 × 亮暗 = 98 套。

选色不问你喜欢什么颜色，问你今天想怎么工作：
晨起 心流 · 午后 禅定 · 傍晚 攻坚
深夜 爆肝 · 凌晨 夜航 · 天亮 收工

六档由锚色的明度/彩度/色相算出。配色按中国画的工序：先备纸，再罩染，最后落款。3136 条对比度断言全过 AA。

github.com/nevertoday/dsh-theme-plugin

---

# English version (if you want one)

Built a theme pack for DeepSeek Harness: 49 traditional Chinese colors × light/dark = 98 themes.

The part I like isn't the palette — it's how you pick one. It doesn't ask what color you like. It asks how you want to work today:

morning Flow · afternoon Zen · evening Push
late night Crunch · small hours Night · daybreak Ship

The six tiers are computed, not curated by hand — from each anchor's OKLab lightness, chroma and hue.

The palette itself follows the order of Chinese painting: prepare the paper, wash over it, sign last. Paper is ~60% of the screen, the veil ~25% carries the identity, and the seal is a signature.

3136 contrast assertions, all clearing WCAG AA. Deterministic generator.

MIT — github.com/nevertoday/dsh-theme-plugin
