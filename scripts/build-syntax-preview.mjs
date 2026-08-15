/*
 * 语法配色对比页 · Syntax palette A/B preview
 * ---------------------------------------------------------------
 * 从**发货件** src/themes.generated.js 生成一张离线 HTML，用来肉眼对比层E 上线前后：
 *   · 左「上线前」= 本主题的纸与代码底 + 宿主默认的九个 --shiki-token-*
 *     （harness 的 ui-theme/lib/styles/shiki.css，逐字抄在下面 HOST_DEFAULT）——
 *     这正是加语法层之前用户真实看到的样子：底已经染过色，字还是宿主那套。
 *   · 右「上线后」= 同一张纸 + 本主题自己的九个语法槽。
 * 每侧标出九槽对代码底的实测最低对比度，AA 4.5 达标与否直接写在标题上。
 *
 * 代码样例的分词是**静态近似**：shiki 的真实分词在浏览器里发生，这里手工标注
 * 到同一批槽名上（页内也这么写明）。颜色值不是近似 —— 全部取自生成数据。
 *
 * 用法：node scripts/build-syntax-preview.mjs  → output/syntax-preview.html
 */
import { writeFileSync, mkdirSync } from 'node:fs';

const { THEMES } = await import(new URL('../src/themes.generated.js', import.meta.url).href);

/* 宿主默认值，逐字抄自 @deepseek-ai/dsh-client-ui-theme/lib/styles/shiki.css。
 * 这是「上线前」那一侧的全部颜色来源 —— 它与主题无关，所以 98 套长得一模一样，
 * 而这正是要给人看的那个问题。 */
const HOST_DEFAULT = {
  light: {
    constant: '#1c7ed6', string: '#2f9e44', comment: '#868e96', keyword: '#d6336c',
    parameter: '#e8590c', function: '#6741d9', 'string-expression': '#2b8a3e',
    punctuation: '#495057', link: '#1971c2',
  },
  dark: {
    constant: '#4dabf7', string: '#69db7c', comment: '#adb5bd', keyword: '#faa2c1',
    parameter: '#ffa94d', function: '#b197fc', 'string-expression': '#8ce99a',
    punctuation: '#ced4da', link: '#74c0fc',
  },
};
const SLOTS = ['keyword', 'string', 'constant', 'function', 'parameter',
               'string-expression', 'comment', 'punctuation', 'link'];
const CHROMATIC = ['keyword', 'string', 'constant', 'function', 'parameter'];

/* ── WCAG 对比度（与闸门同式，独立一份）── */
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const RL = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (a, b) => { const x = RL(a), y = RL(b); const [h, l] = x > y ? [x, y] : [y, x]; return (h + 0.05) / (l + 0.05); };
const rgbOf = s => s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/).slice(1, 4).map(Number);
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const asRgb = v => (v.startsWith('#') ? hexRgb(v) : rgbOf(v));
const css = v => (v.startsWith('#') ? v : v);

/* ── 代码样例 ──
 * 每个 token 是 [文本, 槽名|null]；null = 正文色（--shiki-foreground，即 label-primary）。
 * 挑的是这个插件自己的代码形状：import / 常量表 / 泛型 / 模板串 / 抛错。 */
const T = (text, slot = null) => [text, slot];
const SAMPLE = [
  [T('// 纸 · 帘 · 印 · 墨 · 语法 —— 一套主题的五层', 'comment')],
  [T('import', 'keyword'), T(' '), T('{', 'punctuation'), T(' registerTheme '), T('}', 'punctuation'),
   T(' '), T('from', 'keyword'), T(' '), T("'@deepseek-ai/dsh'", 'string')],
  [],
  [T('const', 'keyword'), T(' PAPERS '), T('=', 'punctuation'), T(' '), T('[', 'punctuation'),
   T("'素绢'", 'string'), T(', ', 'punctuation'), T("'熟宣'", 'string'), T(', ', 'punctuation'),
   T("'雪青'", 'string'), T(', ', 'punctuation'), T("'赭纸'", 'string'), T(']', 'punctuation')],
  [T('const', 'keyword'), T(' AA '), T('=', 'punctuation'), T(' '), T('4.5', 'constant')],
  [],
  [T('export', 'keyword'), T(' '), T('function', 'keyword'), T(' '), T('apply', 'function'),
   T('(', 'punctuation'), T('ctx', 'parameter'), T(': Context', null), T(')', 'punctuation'),
   T(': ', 'punctuation'), T('void', 'keyword'), T(' '), T('{', 'punctuation')],
  [T('  '), T('const', 'keyword'), T(' themes '), T('=', 'punctuation'), T(' PAPERS'),
   T('.', 'punctuation'), T('map', 'function'), T('(', 'punctuation'), T('(', 'punctuation'),
   T('paper', 'parameter'), T(', ', 'punctuation'), T('index', 'parameter'), T(')', 'punctuation'),
   T(' => ', 'keyword'), T('(', 'punctuation'), T('{', 'punctuation')],
  [T('    id'), T(': ', 'punctuation'), T('`zhongguo-', 'string'), T('${', 'string-expression'),
   T('index', 'string-expression'), T('}', 'string-expression'), T('`', 'string'), T(',', 'punctuation')],
  [T('    paper'), T(', ', 'punctuation'), T('ratio'), T(': ', 'punctuation'), T('AA'), T(',', 'punctuation')],
  [T('  '), T('}', 'punctuation'), T(')', 'punctuation'), T(')', 'punctuation')],
  [],
  [T('  '), T('for', 'keyword'), T(' ('), T('const', 'keyword'), T(' theme '), T('of', 'keyword'),
   T(' themes'), T(') ', 'punctuation'), T('{', 'punctuation')],
  [T('    '), T('if', 'keyword'), T(' ('), T('theme'), T('.', 'punctuation'), T('ratio '),
   T('<', 'punctuation'), T(' AA'), T(')', 'punctuation'), T(' '), T('throw', 'keyword'), T(' '),
   T('new', 'keyword'), T(' '), T('Error', 'function'), T('(', 'punctuation'),
   T('`', 'string'), T('${', 'string-expression'), T('theme', 'string-expression'),
   T('.id', 'string-expression'), T('}', 'string-expression'), T(' 未过 AA`', 'string'),
   T(')', 'punctuation')],
  [T('    '), T('registerTheme', 'function'), T('(', 'punctuation'), T('theme'), T(')', 'punctuation')],
  [T('  '), T('}', 'punctuation')],
  [T('}', 'punctuation')],
];

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** 渲染一块代码：palette 是 槽名 → 颜色值（css 串）。 */
function codeBlock(theme, palette, fg) {
  const lines = SAMPLE.map(tokens => {
    if (tokens.length === 0) return '<span class="ln"> </span>';
    return '<span class="ln">' + tokens.map(([text, slot]) => {
      const color = slot === null ? fg : palette[slot];
      return `<span style="color:${css(color)}">${esc(text)}</span>`;
    }).join('') + '</span>';
  // 不能用 '\n' 连接：.ln 已经是 block，而 <pre> 会把连接用的换行符再算一行，
  // 结果整块代码双倍行距。
  }).join('');
  return `<pre class="code" style="background:${theme.tokens['--dsw-alias-markdown-code-block']};color:${fg}">${lines}</pre>`;
}

/** 九槽对代码底的最低对比度 + 未达 4.5 的槽名。 */
function audit(theme, palette) {
  const bg = asRgb(theme.tokens['--dsw-alias-markdown-code-block']);
  let min = Infinity; const under = [];
  for (const slot of SLOTS) {
    const c = contrast(asRgb(palette[slot]), bg);
    if (c < min) min = c;
    if (c < 4.5) under.push(`${slot} ${c.toFixed(2)}`);
  }
  return { min, under };
}

/** 五个彩色槽两两最小色相分离（度）—— 「一眼分清五种东西」的可测形式。 */
function minHueSep(palette) {
  const oklabH = v => {
    const [r, g, b] = asRgb(v).map(lin);
    const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
    const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
    const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
    const A = 1.9779984951 * l - 2.4285922050 * m + .4505937099 * s;
    const B = .0259040371 * l + .7827717662 * m - .8086757660 * s;
    return (Math.atan2(B, A) * 180 / Math.PI + 360) % 360;
  };
  const hs = CHROMATIC.map(k => oklabH(palette[k]));
  let min = Infinity;
  for (let i = 0; i < hs.length; i++) for (let j = i + 1; j < hs.length; j++) {
    const d = Math.abs(hs[i] - hs[j]) % 360;
    min = Math.min(min, d > 180 ? 360 - d : d);
  }
  return min;
}

const ourPalette = theme => Object.fromEntries(SLOTS.map(k => [k, theme.tokens[`--shiki-token-${k}`]]));

/* ── 体检：上线前/后，按模式统计九槽对代码底的最低对比度与未达 AA 的套数 ──
 * 这张表是这页里唯一不靠眼睛的部分，也是唯一会说出坏消息的部分：
 * 暗色下宿主默认色（近白粉彩压在近黑底上）本来就很有余量，我们换成传统色是
 * **让出了余量**（中位 6.99 → 5.01），只是仍在 AA 之上。亮色则是反过来的：
 * 宿主默认的 comment/#868e96 压在染过色的浅纸上只有 3.1，49 套亮色主题全部不达标。 */
function modeStat(mode, which) {
  const ts = THEMES.filter(t => t.colorScheme === mode);
  const mins = ts.map(t => audit(t, which === 'host' ? HOST_DEFAULT[mode] : ourPalette(t)).min);
  const fails = ts.filter(t => audit(t, which === 'host' ? HOST_DEFAULT[mode] : ourPalette(t)).under.length > 0).length;
  const sorted = [...mins].sort((a, b) => a - b);
  return { min: Math.min(...mins), med: sorted[Math.floor(sorted.length / 2)], fails, n: ts.length };
}
const statRow = (label, mode) => {
  const h = modeStat(mode, 'host'), o = modeStat(mode, 'ours');
  const cell = s => `<td class="mono">${s.min.toFixed(2)}</td><td class="mono dim">${s.med.toFixed(2)}</td>`
    + `<td><span class="verdict ${s.fails === 0 ? 'pass' : 'fail'}">${s.fails === 0 ? `0 / ${s.n}` : `${s.fails} / ${s.n}`}</span></td>`;
  return `<tr><th class="rowhead">${label}</th>${cell(h)}${cell(o)}</tr>`;
};

/* ── 多样性体检：层E 的主题个性到底有多少 ──
 * 实测的结论是「共用底盘 + 一枚露脸槽」：五个彩色槽里，四个在同模式下基本是同一批
 * 点名（色相目标固定、名册固定，选出来自然固定），差异几乎只来自锚色出演的那一槽
 * 与印色排除。诚实写出来，别让读者以为每套主题都有一整套自己的语法色。 */
function diversity(mode) {
  const ts = THEMES.filter(t => t.colorScheme === mode);
  const sig = t => CHROMATIC.map(k => t.synNames[k] ?? '合成').join('|');
  const groups = new Map();
  for (const t of ts) groups.set(sig(t), (groups.get(sig(t)) ?? 0) + 1);
  const biggest = Math.max(...groups.values());
  return { n: ts.length, combos: groups.size, biggest, cameo: ts.filter(t => t.synAnchorSlot !== null).length };
}

/* ── 对比区：四族纸 × 亮暗，各取一个锚色 ── */
const PICKS = ['zhuqing-light', 'zhuhong-dark', 'qunqing-light', 'tenghuang-dark',
               'heyelv-dark', 'fentuanhuahong-light', 'mantianxingzi-dark', 'xionghuang-light'];

function panel(theme, palette, label, note) {
  const fg = theme.tokens['--dsw-alias-label-primary'];
  const { min, under } = audit(theme, palette);
  const ok = under.length === 0;
  return `
    <div class="panel">
      <div class="panel-head">
        <span class="panel-label">${label}</span>
        <span class="verdict ${ok ? 'pass' : 'fail'}">
          最低对比度 ${min.toFixed(2)} ${ok ? '· 九槽全过 AA' : `· ${under.length} 槽未达 4.5`}
        </span>
      </div>
      ${codeBlock(theme, palette, fg)}
      <div class="panel-note">${note}${under.length ? `<br><span class="under">未达标：${under.join(' · ')}</span>` : ''}</div>
    </div>`;
}

const compare = PICKS.map(id => {
  const t = THEMES.find(x => x.id === id);
  if (!t) throw new Error(`preview: 名册里没有 ${id}`);
  const ours = ourPalette(t);
  const host = HOST_DEFAULT[t.colorScheme];
  const sep = minHueSep(ours);
  const named = CHROMATIC.map(k => {
    const name = t.synNames[k];
    const star = t.synAnchorSlot === k ? ' ★' : '';
    return `<span class="chip"><i style="background:${t.tokens[`--shiki-token-${k}`]}"></i>${k} · ${name ?? '合成'}${star}</span>`;
  }).join('');
  return `
  <section class="theme" style="background:${t.tokens['--dsw-alias-bg-base']};color:${t.tokens['--dsw-alias-label-primary']};border-color:${t.tokens['--dsw-alias-border-l2']}">
    <header class="theme-head">
      <span class="swatch" style="background:${t.anchorHex}"></span>
      <b>${t.nameZh}</b>
      <span class="dim">${t.family} · ${t.anchorHex} · <code>${t.id}</code></span>
      <span class="spacer"></span>
      <span class="dim">五彩槽最小色相分离 ${sep.toFixed(1)}°（闸门 ≥ 15°）</span>
    </header>
    <div class="chips">${chipsLabel(t)}${named}</div>
    <div class="grid">
      ${panel(t, host, '上线前 · 宿主默认语法色', '底已是这张纸，字还是 harness 那套通用色 —— 与选了哪个传统色无关。')}
      ${panel(t, ourPalette(t), '上线后 · 本主题语法色', '九槽从 742 色名册点名，全部对代码底过 AA。★ 是锚色本人出演的槽。')}
    </div>
  </section>`;
}).join('\n');

function chipsLabel(t) {
  return t.synAnchorSlot === null
    ? '<span class="chip muted">锚色未落进任何槽的窗 · 五槽全部点名自名册</span>'
    : `<span class="chip muted">锚色露脸于 <b>${t.synAnchorSlot}</b></span>`;
}

/* ── 全名册区：98 套 × 九槽色点 ── */
const rosterRows = THEMES.map(t => {
  const dots = SLOTS.map(k => `<i class="dot" style="background:${t.tokens[`--shiki-token-${k}`]}" title="${k} ${t.tokens[`--shiki-token-${k}`]}"></i>`).join('');
  const { min } = audit(t, ourPalette(t));
  const names = CHROMATIC.map(k => (t.synAnchorSlot === k ? `<b>${t.synNames[k] ?? '合成'}</b>` : (t.synNames[k] ?? '合成'))).join(' · ');
  return `<tr style="background:${t.tokens['--dsw-alias-bg-base']};color:${t.tokens['--dsw-alias-label-primary']}">
    <td><i class="dot" style="background:${t.anchorHex}"></i> ${t.nameZh}</td>
    <td class="mono dim">${t.id}</td>
    <td>${dots}</td>
    <td class="mono">${min.toFixed(2)}</td>
    <td class="small">${names}</td>
  </tr>`;
}).join('\n');

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>语法配色对比 · dsh-theme-plugin 层E</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 32px 24px 64px;
    font: 14px/1.6 -apple-system, "PingFang SC", "Helvetica Neue", sans-serif;
    background: #f4f4f5; color: #18181b;
  }
  @media (prefers-color-scheme: dark) { body { background: #131315; color: #e8e8ea; } }
  .wrap { max-width: 1180px; margin: 0 auto; }
  h1 { font-size: 22px; margin: 0 0 6px; letter-spacing: .02em; }
  .lede { opacity: .72; margin: 0 0 4px; max-width: 78ch; }
  .caveat { opacity: .55; font-size: 12.5px; margin: 0 0 28px; max-width: 78ch; }
  h2 { font-size: 15px; letter-spacing: .12em; margin: 40px 0 12px; opacity: .6; font-weight: 700; }

  .theme { border: 1px solid; border-radius: 2px; padding: 16px 16px 14px; margin-bottom: 20px; }
  .theme-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
  .theme-head b { font-size: 15px; letter-spacing: .04em; }
  .swatch { width: 15px; height: 15px; flex: none; box-shadow: inset 0 0 0 1px rgba(128,128,128,.45); }
  .spacer { flex: 1; }
  .dim { opacity: .62; font-size: 12px; }
  .dim code { font-size: 11.5px; }

  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
  .chip {
    display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px;
    padding: 2px 8px; border: 1px solid currentColor; border-radius: 999px; opacity: .82;
  }
  .chip.muted { opacity: .6; }
  .chip i { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }

  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
  .panel-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 6px; flex-wrap: wrap; }
  .panel-label { font-size: 12px; font-weight: 700; letter-spacing: .06em; }
  .verdict { font-size: 11.5px; padding: 1px 7px; border-radius: 2px; }
  .verdict.pass { background: rgba(34,160,90,.16); }
  .verdict.fail { background: rgba(220,60,60,.18); }
  .panel-note { font-size: 11.5px; opacity: .6; margin-top: 6px; line-height: 1.5; }
  .under { opacity: .95; }

  pre.code {
    margin: 0; padding: 12px 14px; border-radius: 2px; overflow-x: auto;
    font: 12.5px/1.65 ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
    tab-size: 2;
  }
  pre.code .ln { display: block; white-space: pre; }

  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  th { text-align: left; font-size: 11px; letter-spacing: .1em; opacity: .55; padding: 6px 8px; font-weight: 700; }
  td { padding: 5px 8px; border-top: 1px solid rgba(128,128,128,.18); vertical-align: middle; }
  .dot { width: 11px; height: 11px; border-radius: 50%; display: inline-block; margin-right: 2px; box-shadow: inset 0 0 0 1px rgba(128,128,128,.35); }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; }
  .small { font-size: 11.5px; opacity: .8; }
  table.stat { width: auto; min-width: 620px; }
  table.stat th { text-align: center; border-bottom: 1px solid rgba(128,128,128,.2); }
  table.stat td { text-align: center; }
  .rowhead { text-align: left !important; opacity: .8; font-size: 12px; letter-spacing: 0; }
  td:first-child, td.mono { white-space: nowrap; }
  footer { margin-top: 40px; font-size: 12px; opacity: .55; }
</style>
</head>
<body>
<div class="wrap">
  <h1>语法配色对比 · 层E</h1>
  <p class="lede">
    左右两侧是同一张纸、同一块代码底 —— 唯一的差别是九个 <code>--shiki-token-*</code> 槽。
    左侧是层E 上线前的真实状态：底色早就跟着传统色走了，代码里的字却仍是 harness 那套通用高亮色，
    选竹青还是选朱红都一样。右侧的每种颜色都是从 742 色名册里点名的真实传统色；
    锚色色相落进某个槽的窗时，由锚色本人出演那个槽（★）。
  </p>
  <p class="caveat">
    分词是静态近似 —— shiki 的真实分词在浏览器里发生，这里把样例手工标注到同一批槽名上。
    颜色值不是近似：全部直接取自 <code>src/themes.generated.js</code>，与装进 harness 的那份逐字节相同。
    对比度按 WCAG 相对亮度在本页独立算过一遍。
  </p>

  <h2>体检 · 九槽对代码底</h2>
  <table class="stat">
    <thead>
      <tr><th rowspan="2" class="rowhead">模式</th><th colspan="3">上线前 · 宿主默认</th><th colspan="3">上线后 · 本主题</th></tr>
      <tr><th>最低</th><th>中位</th><th>未过 AA 的主题</th><th>最低</th><th>中位</th><th>未过 AA 的主题</th></tr>
    </thead>
    <tbody>
      ${statRow('亮色 49 套', 'light')}
      ${statRow('暗色 49 套', 'dark')}
    </tbody>
  </table>
  <p class="caveat" style="margin-top:10px">
    这张表也说坏消息：<b>暗色下我们是让出了对比度余量的</b>。宿主默认那套近白粉彩压在近黑底上本就宽裕（中位 6.99），
    换成传统色后落到中位 5.01 —— 仍在 AA 之上，但不再是原来的余量，换来的是「这块代码属于哪个传统色」。
    亮色则是反过来：宿主的注释色 <code>#868e96</code> 压在染过色的浅纸上只有 3.10，
    <b>49 套亮色主题全部有槽不达标</b>，层E 把它们一次性抬到了 4.5 以上。
    若认为暗色该保更多余量，把生成器的 <code>SYN_L.dark</code> 或槽的对比目标抬高即可，闸门会自动重算。
  </p>

  <p class="caveat">
    还有一件该说清楚的：<b>层E 的主题个性来自那一枚露脸槽，不是整套语法色</b>。
    五个彩色槽的色相目标是固定的，名册也是固定的，所以同一模式下四个非露脸槽基本会点到同一批色 ——
    亮色 49 套里点名组合有 ${diversity('light').combos} 种，其中最大的一组 ${diversity('light').biggest} 套完全相同；
    暗色是 ${diversity('dark').combos} 种 / 最大一组 ${diversity('dark').biggest} 套。
    锚色露脸的主题亮暗各 ${diversity('light').cameo} / ${diversity('dark').cameo} 套 ——
    锚色色相落在五个目标色相（品红 / 绿 / 蓝 / 紫 / 橙）的窗外时（黄色系居多），这套主题的代码块里就没有锚色。
    好处是跨主题的语义稳定：keyword 在哪套主题里都还认得出是 keyword。
  </p>

  <h2>四族纸 × 亮暗</h2>
  ${compare}

  <h2>全名册 · 98 套 × 九槽</h2>
  <table>
    <thead><tr><th>主题</th><th>id</th><th>keyword / string / constant / function / parameter / string-expr / comment / punct / link</th><th>最低对比度</th><th>五彩槽点名（粗体 = 锚色本人）</th></tr></thead>
    <tbody>${rosterRows}</tbody>
  </table>

  <footer>
    由 <code>scripts/build-syntax-preview.mjs</code> 从发货件生成 · 主题 ${THEMES.length} 套 · 槽 ${SLOTS.length} 个/套
  </footer>
</div>
</body>
</html>
`;

mkdirSync(new URL('../output/', import.meta.url), { recursive: true });
const out = new URL('../output/syntax-preview.html', import.meta.url);
writeFileSync(out, html);

/* 控制台同步给一份体检结论 —— 页面是给眼睛看的，这几行是给闸门看的。 */
let beforeFail = 0, afterFail = 0;
for (const t of THEMES) {
  if (audit(t, HOST_DEFAULT[t.colorScheme]).under.length) beforeFail++;
  if (audit(t, ourPalette(t)).under.length) afterFail++;
}
console.log(`写出 ${out.pathname}`);
console.log(`九槽对代码底 AA：上线前有 ${beforeFail}/${THEMES.length} 套存在未达 4.5 的槽，上线后 ${afterFail}/${THEMES.length} 套。`);
