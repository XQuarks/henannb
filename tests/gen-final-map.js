// 出一张「当前 index.html 实机跑出来的 L1 / L2」预览，用于改完代码后复核落地效果。
// 不重复造轮子：沙箱与 SVG 渲染直接复用 gen-map-organic.js 里的同一份代码，
// 保证「预览里的画法」和之前对比时完全一致，只是这次不打任何补丁（跑的就是磁盘上的真实代码）。
// 用法：node tests/gen-final-map.js
const fs=require('fs');
const vm=require('vm');
const path=require('path');
// 产物统一落在 tests/_out/（生成物，不入库），不再往仓库根目录丢预览 HTML
const OUT_DIR=path.join(__dirname,'_out');
if(!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

const GEN = fs.readFileSync('tests/gen-map-organic.js','utf8');
function slice(a, b, tag){
  const i=GEN.indexOf(a), j=GEN.indexOf(b);
  if(i<0||j<0||j<=i) throw new Error('从 gen-map-organic.js 抽取 ['+tag+'] 失败');
  return GEN.slice(i,j);
}
// 沙箱（mkEl / ctxStub / makeSandbox）+ 渲染辅助（edgeWob / polyPath / renderCard …）
const HELP = new Function(
  slice('function mkEl(id){', "const fs=require('fs');", 'sandbox')
  + slice('function edgeWob(ax,ay,bx,by,amp){', "let body='';", 'render')
  + '; return { makeSandbox, renderCard };'
)();

// 指标 + 驱动脚本（METRICS / DRIVER），与对比脚本同源
const DRV = slice('const METRICS = ', 'const vm=require(\'vm\');', 'driver');

const html = fs.readFileSync('index.html','utf8');
const BASE_JS = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n');

const drvSrc = new Function(DRV + '; return DRIVER;')();   // METRICS 已内联进 DRIVER

const sb = HELP.makeSandbox();
vm.runInContext(BASE_JS + '\n' + drvSrc, vm.createContext(sb), {filename:'game-final.js'});
if(sb.__err){ console.log('实机跑挂了：\n'+sb.__err); process.exit(1); }
const S = sb.__snaps;

// 落盘给 tests/check-geom.js 做几何自检（结构需与历史 _snaps.json 一致：变体 → 关卡）
fs.writeFileSync(path.join(OUT_DIR,'_snaps.json'), JSON.stringify({ NOW: S }));

const L1=S.h1, L2=S.dusk;
console.log('L1 '+L1.nodes.length+'格 面积倍差='+L1.ratio.toFixed(1)+'x 平均边数='+L1.edgesAvg.toFixed(1)
  +' 形状='+L1.edge.toFixed(3)+' 连通='+L1.conn);
console.log('L2 '+L2.nodes.length+'格 面积倍差='+L2.ratio.toFixed(1)+'x 平均边数='+L2.edgesAvg.toFixed(1)
  +' 形状='+L2.edge.toFixed(3)+' 过江通路='+L2.cross+'条 连通='+L2.conn);
console.log('碎礁 L1='+L1.reefs.length+' L2='+L2.reefs.length);

const CSS = `<style>
*{box-sizing:border-box}
body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;margin:0;padding:26px;background:#F7F6F3;color:#2C2C2A}
h1{font-size:21px;margin:0 0 6px}
h2{font-size:16px;margin:26px 0 10px;padding-left:9px;border-left:3px solid #7F8C6E}
.sub{font-size:13px;color:#5F5E5A;margin:0 0 4px}
.row{display:flex;gap:16px;flex-wrap:wrap}
.card{flex:1 1 380px;background:#fff;border:1px solid #E3E1DA;border-radius:12px;padding:12px}
.hd{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}
.hd b{font-size:14px}
.tag{font-size:11px;color:#5F5E5A}
.mt{width:100%;border-collapse:collapse;font-size:13px;background:#fff;border:1px solid #E3E1DA;border-radius:10px;overflow:hidden}
.mt th,.mt td{padding:8px 10px;border-bottom:1px solid #EFEDE7;text-align:center}
.mt th{background:#F1F0EA;font-weight:600}
.mt td:first-child{text-align:left}
.mt tr.ref td{background:#FAFAF7;color:#5F5E5A}
.mtnote{font-size:12.5px;color:#5F5E5A;line-height:1.75;margin-top:10px}
.note{margin-top:22px;padding:14px 16px;background:#fff;border:1px solid #E3E1DA;border-radius:10px;font-size:13px;line-height:1.8}
.ok{color:#3B6D11;font-weight:600}
.bad{color:#A32D2D;font-weight:600}
</style>`;

const okAll = L1.conn && L2.conn && L2.cross===3;
let out='<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>L1 / L2 新地图 · 实机复核</title>'+CSS+'</head><body>';
out+='<h1>第一关 / 第二关 新地图 · 实机复核</h1>';
out+='<p class="sub">下面两张图是<b>磁盘上当前 index.html 真实跑出来的地块</b>（同一套 Voronoi + 地形代码），不是示意图。</p>';

out+='<h2>L1 烽火边境</h2><div class="row">'+HELP.renderCard(L1,{title:'L1 烽火边境'})+'</div>';
out+='<h2>L2 渡口阻击</h2><div class="row">'+HELP.renderCard(L2,{title:'L2 渡口阻击'})+'</div>';

out+='<h2>关键指标</h2><table class="mt">'
  +'<tr><th>关卡</th><th>格数</th><th>面积倍差</th><th>平均边数</th><th>形状不规则度</th><th>过江通路</th><th>全图连通</th></tr>'
  +'<tr><td>L1 烽火边境</td><td>'+L1.nodes.length+'</td><td>'+L1.ratio.toFixed(1)+'x</td><td>'+L1.edgesAvg.toFixed(1)
    +'</td><td>'+L1.edge.toFixed(3)+'</td><td>—</td><td>'+(L1.conn?'✅':'❌')+'</td></tr>'
  +'<tr><td>L2 渡口阻击</td><td>'+L2.nodes.length+'</td><td>'+L2.ratio.toFixed(1)+'x</td><td>'+L2.edgesAvg.toFixed(1)
    +'</td><td>'+L2.edge.toFixed(3)+'</td><td>'+L2.cross+' 条</td><td>'+(L2.conn?'✅':'❌')+'</td></tr>'
  +'<tr class="ref"><td>参照：随机图（L3 观感）</td><td>'+S.REF.nodes.length+'</td><td>—</td><td>—</td><td>'
    +S.REF.edge.toFixed(3)+'</td><td>—</td><td>—</td></tr></table>';
out+='<p class="mtnote"><b>面积倍差</b>＝最大格÷最小格（目标 3-4 倍）。<b>平均边数</b>＝地块由几条直线边围成。'
  +'<b>形状不规则度</b>＝各边长度标准差÷平均边长，正六边形≈0，越大越不规则（随机图 '+S.REF.edge.toFixed(3)+'）。<br>'
  +'<b>过江通路</b>是桥关命门：L2 全图只有那几条边能过江，必须走桥。改图后仍是 '+L2.cross+' 条，铁律未破。</p>';

out+='<div class="note"><b>自检结论：'+(okAll?'<span class="ok">全部通过</span>':'<span class="bad">有异常，需要回看</span>')+'</span></b><br>'
  +'· 全图连通：L1 '+(L1.conn?'是':'否')+' / L2 '+(L2.conn?'是':'否')+'<br>'
  +'· L2 过江通路 '+L2.cross+' 条（必须走桥，未出现斜穿江面的捷径）<br>'
  +'· 碎礁过渡带：L1 '+L1.reefs.length+' 块 / L2 '+L2.reefs.length+' 块<br>'
  +'· 几何自检（零面积 / 自交 / 相邻开缝）见 <code>node tests/check-geom.js</code></div>';
out+='</body></html>';

const outP=path.join(OUT_DIR,'map-preview.html');
fs.writeFileSync(outP, out);
console.log('已生成 '+path.relative(process.cwd(), outP)+'（快照同步写入同目录，供 check-geom 使用）');
