/*
 * README 事实核对 · README fact check
 * ---------------------------------------------------------------
 * 两份 README 里的每个数字都从产出的数据重新推导一遍，对不上就失败。
 *
 * 缘起：文档里的数字会随代码漂移，而漂移是静默的。一次审计里查出六处失实 ——
 * 主题数、对比度行数、锚色数、bundle 体积全部过期，还有一句「98 套主题没有两个
 * 共享背景」根本是假的（实测 98 套只有 81 个不同的底）。靠人记得去改是不可能的，
 * 所以把它变成闸门。
 *
 * 用法：node scripts/check-readme.mjs（已并入 pnpm check）
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

/* Read the shipped source of truth. preview/themes.json is a local, ignored
 * generator artifact and therefore cannot be required by a clean checkout. */
const { THEMES: A } = await import(new URL('../src/themes.generated.js', import.meta.url));
const en = readFileSync('README.md', 'utf8');
const zh = readFileSync('README.zh-CN.md', 'utf8');
const both = en + '\n' + zh;

const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const ok = x => { const R = lin(x[0]), G = lin(x[1]), B = lin(x[2]);
  const l = Math.cbrt(.4122214708*R+.5363325363*G+.0514459929*B), m = Math.cbrt(.2119034982*R+.6806995451*G+.1073969566*B), s = Math.cbrt(.0883024619*R+.2817188376*G+.6299787005*B);
  return { L: .2104542553*l+.7936177850*m-.0040720468*s, a: 1.9779984951*l-2.4285922050*m+.4505937099*s, b: .0259040371*l+.7827717662*m-.8086757660*s }; };
const P = s => { const m = s.match(/\((\d+),\s*(\d+),\s*(\d+)/); return [+m[1], +m[2], +m[3]]; };
const RL = x => 0.2126*lin(x[0]) + 0.7152*lin(x[1]) + 0.0722*lin(x[2]);
const ct = (a, b) => { const x = RL(P(a)), y = RL(P(b)); const [h, l] = x > y ? [x, y] : [y, x]; return (h + .05) / (l + .05); };

let bad = 0;
const check = (label, claimed, actual, pass) => {
  const mark = pass ? '✓' : '✗';
  if (!pass) bad++;
  console.log(`  ${mark} ${label.padEnd(30)} 文中 ${String(claimed).padEnd(22)} 实测 ${actual}`);
};

console.log('README 事实核对');

// 计数
const light = A.filter(t => t.colorScheme === 'light');
check('锚色数', '49', light.length, both.includes('49') && light.length === 49);
check('主题数', '98', A.length, A.length === 98);
check('令牌数', '98', Object.keys(A[0].tokens).length,
  Object.keys(A[0].tokens).length === 98 && both.includes('89 个 `--dsw-*`') && both.includes('9 个 `--shiki-token-*`'));
check('精选数', '12', light.filter(t => t.curated).length, light.filter(t => t.curated).length === 12);

// 对比度行数 / 测试数（跑一次真的）
const chk = execFileSync('node', ['scripts/check-contrast.mjs'], { encoding: 'utf8' });
const rows = (chk.match(/(\d+)\/(\d+) 行通过/) || [])[2];
check('对比度行数', '3136', rows, rows === '3136' && both.includes('3136'));
// 测试数静态点算，不 spawn `pnpm test`：本脚本已并入 pnpm check，而 prepublishOnly
// 里 test 与 check 各跑一次 —— 再套一层就是把测试跑三遍。
const testFiles = readdirSync('test').filter(name => name.endsWith('.test.ts'));
const testCount = testFiles.reduce((n, name) =>
  n + (readFileSync(`test/${name}`, 'utf8').match(/^test\(/gm) || []).length, 0);
check('测试数', '60', testCount, testCount === 60 && both.includes(`${testCount} 个测试`) && both.includes(`${testCount} tests`));

// 六档分布：README 里写的那一串必须与数据一致（顺序照「程序员的一天」）
{
  const ORDER = ['心流', '禅定', '攻坚', '爆肝', '夜航', '收工'];
  const n = {};
  for (const t of light) n[t.tier] = (n[t.tier] || 0) + 1;
  const str = ORDER.map(k => `${k} ${n[k] || 0}`).join(' · ');
  check('六档分布', '心流 11 · 禅定 12 · 攻坚 8 · 爆肝 4 · 夜航 8 · 收工 6', str, both.includes(str));
  const thin = ORDER.filter(k => (n[k] || 0) < 4);
  check('无瘦档（每档 ≥ 4）', '—', thin.length ? thin.join(' ') : '全部 ≥ 4', thin.length === 0);
}

// 四族纸彩度（README 顺序：素绢 熟宣 雪青 赭纸）
const fam = {};
for (const t of light) { const o = ok(P(t.tokens['--dsw-alias-bg-base'])); (fam[t.family] ??= []).push(Math.hypot(o.a, o.b)); }
const avg = k => (fam[k].reduce((a, b) => a + b, 0) / fam[k].length).toFixed(3);
const chromaActual = ['素绢','熟宣','雪青','赭纸'].map(avg).join(' / ');
check('四族纸彩度(素熟雪赭)', '0.010/0.019/0.015/0.024', chromaActual,
  both.includes('0.010 / 0.019 / 0.015 / 0.024'));

// 纸明度
const Lb = light.map(t => ok(P(t.tokens['--dsw-alias-bg-base'])).L);
const Lr = `${Math.min(...Lb).toFixed(3)}–${Math.max(...Lb).toFixed(3)}`;
check('亮色纸明度 L', '0.963–0.971', Lr, both.includes('0.963–0.971') && Lr === '0.963–0.971');

// 帘区间
const vr = A.map(t => ct(t.tokens['--dsw-specific-bubble'], t.tokens['--dsw-alias-bg-base']));
check('帘/纸 实测落在闸门内', '1.25–1.55', `${Math.min(...vr).toFixed(2)}–${Math.max(...vr).toFixed(2)}`,
  Math.min(...vr) >= 1.25 - 1e-9 && Math.max(...vr) <= 1.55 + 1e-9);

// 墨阶
const band = k => { const v = A.map(t => ct(t.tokens[k], t.tokens['--dsw-alias-bg-base'])); return [Math.min(...v), Math.max(...v)]; };
const [b1, b2] = band('--dsw-alias-label-primary');
const [s1, s2] = band('--dsw-alias-label-secondary');
const [t1, t2] = band('--dsw-alias-label-tertiary');
check('正文墨阶', '16.7–17.5', `${b1.toFixed(2)}–${b2.toFixed(2)}`, b1 >= 16.6 && b2 <= 17.55);
check('次级墨阶', '7.4–8.0', `${s1.toFixed(2)}–${s2.toFixed(2)}`, s1 >= 7.35 && s2 <= 8.05);
check('三级墨阶', '4.6–5.5', `${t1.toFixed(2)}–${t2.toFixed(2)}`, t1 >= 4.6 && t2 <= 5.55);

// 家族分布
const dist = {}; for (const t of light) dist[t.family] = (dist[t.family] || 0) + 1;
const distStr = `素绢 ${dist['素绢']} · 熟宣 ${dist['熟宣']} · 雪青 ${dist['雪青']} · 赭纸 ${dist['赭纸']}`;
check('家族分布', '素绢 12 · 熟宣 14 · 雪青 17 · 赭纸 6', distStr, both.includes(distStr));

// 体积：tsdown 与 esbuild fallback 的压缩策略不同，闸门守发布预算而不是某个
// builder 的字节签名。README 仍记录主构建的典型体积，方便评估 review 噪音。
const kb = p => Math.round(statSync(p).size / 1024);
check('bundle 体积预算', '≤ 680 KB', kb('lib/client.js') + ' KB',
  kb('lib/client.js') <= 680 && both.includes('680 KB'));
check('sourcemap 体积预算', '≤ 1020 KB', kb('lib/client.js.map') + ' KB',
  kb('lib/client.js.map') <= 1020 && both.includes('1020 KB'));

// 最小主题距离
const de = (chk.match(/最小主题距离[^：]*：([\d.]+)/) || [])[1];
check('最小签名 ΔE', '0.018', de, both.includes('0.018') && Math.abs(+de - 0.018) < 0.0005);

// 名册表行数与星标名单
const curatedIds = new Set(light.filter(theme => theme.curated).map(theme => theme.id));
for (const [name, md] of [['README.md', en], ['README.zh-CN.md', zh]]) {
  const n = (md.match(/^\| .* \| `[a-z0-9-]+-light`/gm) || []).length;
  check(`${name} 名册行数`, '49', n, n === 49);
  const starred = new Set(
    md.split('\n')
      .filter(line => line.startsWith('| ') && line.includes('⭐'))
      .map(line => line.match(/`([a-z0-9-]+-light)`/)?.[1])
      .filter(Boolean),
  );
  const same = starred.size === curatedIds.size
    && [...curatedIds].every(id => starred.has(id));
  check(`${name} 精选星标`, '与生成数据一致', starred.size, same);
}

// 不该再出现的旧数字
const stale = [
  ['96 themes', /96 themes|96 套主题|96 主题/],
  ['2208', /2208/],
  ['48 anchors', /48 anchors|48 个锚色|48 锚色/],
  ['553KB / 790KB', /553KB|790KB/],
  ['2254 行对比度', /2254/],
  ['旧发布预算 610/910', /610 KB|910 KB/],
  ['89 个令牌的旧总数', /令牌词表（89 个）|\(89 tokens\)/],
  ['背景两两不同的假话', /No two of the \d+ themes share a background|没有两个共享背景/],
];
console.log('\n  陈旧/失实表述残留：');
for (const [label, re] of stale) {
  const hit = re.test(both);
  if (hit) bad++;
  console.log(`  ${hit ? '✗ 仍存在' : '✓ 已清除'}  ${label}`);
}

console.log(bad === 0 ? '\n✅ 全部通过' : `\n❌ ${bad} 项不符`);
process.exit(bad === 0 ? 0 : 1);
