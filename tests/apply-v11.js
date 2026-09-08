// 把 V11 方案（预览里确认过的那版）正式写进 index.html。
// 补丁定义不在这里重复写 —— 直接从 gen-map-organic.js 里抽出来执行，
// 保证「预览看到的图」和「游戏里跑出来的图」用的是同一份补丁，不会漂移。
// 用法：node tests/apply-v11.js
const fs=require('fs');
const vm=require('vm');

const ROOT = 'index.html';
let html = fs.readFileSync(ROOT,'utf8');

// —— 1. 抽补丁定义块 ——
const src = fs.readFileSync('tests/gen-map-organic.js','utf8');
const s = src.indexOf('const P_AMP = [');
const e = src.indexOf('function applyPatches');   // 必须含到 roughWith：它定义在 VARIANTS 之后
if(s<0||e<0) throw new Error('在 gen-map-organic.js 里找不到补丁定义块');
const box = {};
vm.runInNewContext(src.slice(s,e) + `
;__out = { P_NEW_MAPS, P_NOISE, P_FRAME, P_POWER_FN, P_POWER_CALL, powerW, roughWith, P_REEF };
`, box);
const P = box.__out;

const V11 = [
  ...P.P_NEW_MAPS,
  ...P.P_NOISE,
  ...P.P_FRAME,
  ...P.P_POWER_FN,
  ...P.P_POWER_CALL,
  ...P.powerW(0.55),
  ...P.roughWith(2, 0.22),
  ...P.P_REEF,
];

// —— 2. 唯一性校验 + 应用 ——
let changed = 0;
for(const [from, to] of V11){
  const n = html.split(from).length - 1;
  if(n !== 1) throw new Error('锚点在 index.html 里出现 '+n+' 次（必须恰好 1 次）:\n  '+from.slice(0,90).replace(/\n/g,'\\n'));
  html = html.replace(from, ()=>to);
  changed++;
}
console.log('已应用 '+changed+' 处补丁');

// —— 3. 碎礁需要全局声明 + 渲染，否则 P_REEF 只是堆死数据 ——
if(html.indexOf('let REEFS') < 0 && html.indexOf('var REEFS') < 0){
  const anchor = 'let SEACELLS=new Set();';
  const k = html.split(anchor).length - 1;
  if(k !== 1) throw new Error('找不到 REEFS 声明锚点（出现 '+k+' 次）: '+anchor);
  html = html.replace(anchor, 'let SEACELLS=new Set();\nlet REEFS=[];            // 外海碎礁：纯视觉过渡带，让陆地边缘不是一刀切（不参与邻接/阻挡判定）');
  console.log('已声明 REEFS 全局');
} else {
  console.log('REEFS 已存在，跳过声明');
}

fs.writeFileSync(ROOT, html);
console.log('已写入 '+ROOT);
