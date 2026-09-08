// 有机化方案对比预览：人类 L1 / L2 四个改版并排，看「方块感」被削掉多少。
// 关键：不是另画示意图，而是把 index.html 的建图源码按方案打补丁后真跑一遍，
//      所以预览里看到的地块 = 改完之后实机里的地块（同一套 Voronoi + 地形）。
// 用法：node tests/gen-map-organic.js  →  生成 map-organic-preview.html
//
// ⚠️ V11 方案已于 2026-09-08 正式落地 index.html（见 tests/apply-v11.js）。
//    本脚本是「方案对比工具」，补丁锚点已不存在于当前 index.html，直接重跑会报「锚点没找到」—— 这是正常的。
//    想看当前实机效果请跑：node tests/gen-final-map.js
function mkEl(id){
  const el = {
    id, style:{ setProperty(){}, }, children:[], dataset:{},
    appendChild(c){ el.children.push(c); },
    classList:{ list:[], toggle(){}, add(){}, remove(){}, contains(){return false;} },
    textContent:'', innerHTML:'', title:'', value:'', width:300, height:150,
    addEventListener(){}, removeEventListener(){}, focus(){}, setAttribute(){},
    getAttribute(){return null;}, getContext(){ return ctxStub; },
    querySelector(){ return mkEl(id+'_q'); }, querySelectorAll(){ return []; },
    getBoundingClientRect(){ return {left:0,top:0,width:1280,height: id==='hud'?54:720}; },
  };
  let _display='';
  Object.defineProperty(el.style,'display',{get(){return _display;},set(v){_display=v;}});
  return el;
}
const ctxStub = new Proxy({}, { get(t,k){
  if(k==='getImageData') return ()=>({data:new Uint8ClampedArray(4*300*150)});
  if(k==='measureText') return ()=>({width:10});
  if(k==='createLinearGradient'||k==='createRadialGradient') return ()=>({addColorStop(){}});
  return typeof k==='string' ? function(){} : undefined;
}, set(){ return true; } });
// 每个方案都要一个干净沙箱：复用同一个 context 会撞「Identifier 已声明」。
function makeSandbox(){
  const sb={};
  const els={};
  sb.window=sb; sb.self=sb; sb.globalThis=sb;
  sb.document = {
    getElementById(id){ if(!els[id]) els[id]=mkEl(id); return els[id]; },
    querySelector(s){ if(!els[s]) els[s]=mkEl(s); return els[s]; },
    querySelectorAll(){ return []; }, createElement(t){ return mkEl('dyn_'+t); },
    body:mkEl('body'), documentElement:mkEl('html'),
    addEventListener(){}, hidden:false,
  };
  sb.navigator = { userAgent:'node', maxTouchPoints:0 };
  sb.performance = { now:()=>Date.now() };
  sb.requestAnimationFrame = fn=>0;
  sb.cancelAnimationFrame = ()=>{};
  sb.localStorage = { _s:{}, getItem(k){ return this._s[k]||null; }, setItem(k,v){ this._s[k]=String(v); }, removeItem(k){ delete this._s[k]; } };
  sb.location = { href:'x', search:'' };
  sb.devicePixelRatio = 1;
  sb.innerWidth = 1280; sb.innerHeight = 720;
  sb.addEventListener = ()=>{};
  sb.Image = function(){};
  sb.console = console;
  sb.setTimeout = setTimeout; sb.clearTimeout = clearTimeout;
  sb.setInterval = setInterval; sb.clearInterval = clearInterval;
  sb.Math = Math; sb.JSON = JSON; sb.Date = Date;
  return sb;
}

const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const BASE_JS=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n');

// ————————————————————————————————————————————————————————————
// 补丁定义。每条都是对建图源码的精确字符串替换，找不到就报错（绝不静默跳过）。
// ————————————————————————————————————————————————————————————
const P_AMP = [
  ['const colPos = axisPos(cols, 0.15);',    'const colPos = axisPos(cols, 0.38);'],
  ['const rowPos = axisPos(rows+pad*2, 0.15);','const rowPos = axisPos(rows+pad*2, 0.38);'],
  ['const JIT = 0.12;', 'const JIT = 0.20;'],
];
const ANCHOR_GRID = "  M.grid.forEach((line,r)=>{ for(let c=0;c<cols;c++) put(c,r,line[c]===undefined ? 'v' : line[c]); });";
const P_EDGE = [[ANCHOR_GRID, ANCHOR_GRID + `
  { // 外圈种子点沿径向随机内外推 —— Voronoi 的外边界因此变成不规则海岸线，不再是矩形切边
    let ax0=1e9,ay0=1e9,ax1=-1e9,ay1=-1e9;
    for(const s of seeds){ ax0=Math.min(ax0,s.x); ax1=Math.max(ax1,s.x); ay0=Math.min(ay0,s.y); ay1=Math.max(ay1,s.y); }
    const gx=(ax0+ax1)/2, gy=(ay0+ay1)/2;
    for(const s of seeds){
      if(s.ch==='~'||s.ch==='w'||s.ch==='e'||s.ch==='B') continue;   // 江面与桥面必须保持笔直
      if(!(s.c===0||s.c===cols-1||s.r===0||s.r===rows-1)) continue;  // 只推最外圈
      const dx=s.x-gx, dy=s.y-gy, L=Math.hypot(dx,dy)||1;
      const k=(rng()-0.5)*2*step*0.30;
      s.x+=dx/L*k; s.y+=dy/L*k;
    }
  }`]];
const P_REEF = [
  ['LAKES=[]; MOUNTAINS=new Set(); SEACELLS=new Set();\n  const pb=playerBuffs();',
   'LAKES=[]; MOUNTAINS=new Set(); SEACELLS=new Set(); REEFS=[];\n  const pb=playerBuffs();'],
  ["      if(s.sea || ch==='.') SEACELLS.add(cc.cell);\n      continue;",
   "      if(s.sea || ch==='.') SEACELLS.add(cc.cell);\n"
   +"      if(ch==='.'){ const g0=polygonCentroid(cc.cell); REEFS.push(cc.cell.map(p=>({x:g0.x+(p.x-g0.x)*0.42,y:g0.y+(p.y-g0.y)*0.42}))); }\n"
   +"      continue;"],
];

// V4：低频噪声场扰动（空间相关）。与 V1/V2 的本质区别 ——
// V1/V2 是「每个种子点各跳各的」，相邻点相对位移可能很大，pairGate 采样容易掉边；
// V4 是「整片种子点被同一个噪声场推」，相邻点在噪声场里取值接近 → 相对位移极小（安全），
// 但相隔几格的点被推向不同方向 → 大范围看是连绵起伏的有机形状（这才是随机图的观感来源）。
const P_NOISE = [[ANCHOR_GRID, ANCHOR_GRID + `
  { // 低频噪声场：空间相关位移 —— 局部相对位移小（不掉边），大范围连绵起伏（形状有机）
    const w=[];
    for(let i=0;i<4;i++) w.push({ fx:(0.55+rng()*0.85)/step, fy:(0.55+rng()*0.85)/step,
                                  px:rng()*6.283, py:rng()*6.283, a:(rng()-0.5)*2 });
    for(const s of seeds){
      if(s.ch==='~'||s.ch==='w'||s.ch==='e'||s.ch==='B') continue;   // 江面与桥面必须保持笔直
      let dx=0, dy=0;
      for(const q of w){
        dx += Math.sin(s.x*q.fx+q.px)*Math.cos(s.y*q.fy*0.7+q.py)*q.a;
        dy += Math.cos(s.x*q.fy+q.py)*Math.sin(s.y*q.fx*0.7+q.px)*q.a;
      }
      s.x += dx*step*0.42; s.y += dy*step*0.42;
    }
  }`]];

// V5：在 V4 噪声场之上，再把 Voronoi 的裁剪外框从矩形改成有机多边形。
// 这是「长方形切出来」的真正根因 —— 现状外框是硬编码矩形，最外圈地块的外侧边
// 全部落在同一条直线上，所以不管内部怎么抖，外轮廓永远是个方盒子。
// clipPoly 是半平面逐边裁剪，外框允许非凸（只要顶点顺序一致、不自交），所以这个改动是安全的。
// 锚点必须带上下文：同样的 RECT 定义在 tryBuildMap（3712 行）里也有一份，那里没有 step 变量。
const ANCHOR_RECT = "  const ex=step*0.62;   // 外扩：否则最外圈地块会被包围盒裁成半截\n  bx0-=ex; by0-=ex; bx1+=ex; by1+=ex;\n  const RECT=[{x:bx0,y:by0},{x:bx1,y:by0},{x:bx1,y:by1},{x:bx0,y:by1}];";
const P_FRAME = [[ANCHOR_RECT, `
  const ex=step*0.62;   // 外扩：否则最外圈地块会被包围盒裁成半截
  bx0-=ex; by0-=ex; bx1+=ex; by1+=ex;
  const RECT=(function(){
    const N=3, amp=step*0.32, pts=[];
    const jj=()=> (rng()-0.5)*2*amp;
    for(let i=0;i<=N;i++) pts.push({x:bx0+(bx1-bx0)*i/N, y:by0+jj()});
    for(let i=1;i<=N;i++) pts.push({x:bx1+jj(),        y:by0+(by1-by0)*i/N});
    for(let i=1;i<=N;i++) pts.push({x:bx1-(bx1-bx0)*i/N, y:by1+jj()});
    for(let i=1;i<N;i++)  pts.push({x:bx0+jj(),        y:by1-(by1-by0)*i/N});
    return pts;
  })();`]];

// —— V6/V7 的核心：把 LEVEL_MAPS.h1 / dusk 整段重写。
// 旧版是「7×5 满格矩形靠 '.' 挖四角」，挖完行宽 4·5·7·5·3 上下完全对称的规则菱形 —— 这是「切出来」的根因。
// 新版用 7×7 网格，陆地格「成片集中在一处」+「走廊密排」+「外海三面包围」，
// 让 Voronoi 切出来的形状自然形成「大主格 + 中主格 + 极小走廊」4-5 倍的差异。
// 同时桥面 w-B-e 紧挨八邻、江在 col 3 贯穿（r=3 被 e 字符覆盖截断），桥关铁律保持。
//
// 锚点策略：只匹配最稳的 grid 数组本体（每行格式固定），不影响其他注释/字段
// 锚点必须含 cols/rows —— 只换 grid 数组的话 rows 仍是 5，7 行网格会被读成 5 行（V6 就是栽在这）。
// L1 新设计（7×7）：P 在西南一隅三面临海 → Voronoi 直接切成超大主格；
// 敌 2 在北、敌 3 在东南各自临海 → 中大型；N 麦仓 / T 箭塔被 v 走廊四面围死 → 小格。
// 玩法线：P → 中路 N 麦仓（教学：占中立增收）→ T 箭塔（教学：攻坚）→ 分叉北上打 2 / 东进打 3；
// 西北连山 ^ 封死西侧，逼出「从南往北推」的清晰战线，山不再是孤零零一块石头。
const H1_GRID_OLD = "  h1:{ cols:7, rows:5,\n    grid:['..^vvv.',\n          '.vvNv3.',\n          'vPvvTvv',\n          '.vvvv2.',\n          '..vv^..'] },";
const H1_GRID_NEW = "  h1:{ cols:7, rows:7,   // L1 烽火边境 · 重做\n    grid:['.......',\n          '.^^.2..',\n          '..vvv..',\n          '.vNTv..',\n          '.vvvv..',\n          '.P..v3.',\n          '.......'] },";

// L2 新设计（7×7）：江沿 col 3 南北贯穿，把战场切成西岸（我方）与东岸（敌方）；
// 桥面 w(2,3)-B(3,3)-e(4,3) 是唯一接缝，B 的八邻里 c<3 的正好 3 格 → 跨江边数与原版一致，铁律不破。
// 江的南端收进 (3,5) 的山坳 —— 江「从山里流出来」，天险有源头，不再是凭空一条蓝带子。
// 玩法线：西岸 P 起家 → 占 N 麦仓 → 强攻窄桥（w→B→e 三格走廊，易守难攻）→ 过桥撞 T 箭塔 → 分打 2 / 3。
const DUSK_GRID_OLD = "  dusk:{ cols:7, rows:5, pad:1, river:3, bridge:true, bunkerCap:25, bunkerPop:14, // 人类 L2 渡口阻击\n    grid:['..v~vv.',\n          '.vv~v2.',\n          'vPwBevv',\n          '.vv~v3.',\n          '..v~v..'] },";
const DUSK_GRID_NEW = "  dusk:{ cols:7, rows:7, pad:1, river:3, bridge:true, bunkerCap:25, bunkerPop:14, // L2 渡口阻击 · 重做\n    grid:['...~...',\n          '..v~2v.',\n          '.Pv~vv.',\n          '.vwBe3.',\n          '.vv~T..',\n          '.N.^...',\n          '...~...'] },";
const P_NEW_MAPS = [
  [H1_GRID_OLD, H1_GRID_NEW],
  [DUSK_GRID_OLD, DUSK_GRID_NEW],
];

// —— 共享边细分 + 噪声位移 ——
// 「连在一起的直线」的真正来源：Voronoi 相邻两块共享一整条完整直线边。
// 把每条边细分 SEG 段、中间点沿法向随机偏移即可破掉；难点是两块各自算会算出不同位移 → 缝隙。
// 解法：偏移只由「边的两个端点坐标」哈希决定（端点排序后取键），两块算出的细分点逐点相同，
// 方向相反时反序插入 —— 边界依旧严丝合缝，但形状变成 3~9 条折线。
// 只改 polygon 顶点，邻接仍按网格 c/r 判定 → 玩法零风险。
// —— 加权 Voronoi（Power diagram）——
// 普通 Voronoi 用中垂线切，种子点是规则网格 ⇒ 单元面积天然均匀，CV 推不上去。
// 改成功率图后每个种子带权重 w，分界线从「中点」挪到 |x-a|²-wa = |x-b|²-wb 的位置：
//   仍是直线半平面（x·(b-a) ≤ (|b|²-wb-|a|²+wa)/2），所以能复用现成的逐边裁剪，
//   只是阈值从 (|b|²-|a|²)/2 变成带权重项 —— 权重大的点能实打实多占地。
// Δw=1·step² 且种子间距≈1·step 时，边界沿连线偏移 ≈0.5·step，够拉开 3-4 倍面积差。
const ANCHOR_CLIP = "function clipPoly(poly, a, b){\n  if(poly.length<3) return [];\n  const mx=(a.x+b.x)/2, my=(a.y+b.y)/2;";
const P_POWER_FN = [[ANCHOR_CLIP,
`function clipPolyW(poly, a, b, wa, wb){
  if(poly.length<3) return [];
  const dx=b.x-a.x, dy=b.y-a.y, dd=dx*dx+dy*dy;
  if(dd<1e-9) return poly;
  const K=((b.x*b.x+b.y*b.y)-wb-(a.x*a.x+a.y*a.y)+wa)/2;
  const t=(K-(a.x*dx+a.y*dy))/dd;
  const mx=a.x+t*dx, my=a.y+t*dy;
  const sd = p => (p.x-mx)*dx + (p.y-my)*dy;
  const out=[];
  let prev=poly[poly.length-1];
  let prevIn = sd(prev) <= 0;
  for(let i=0;i<poly.length;i++){
    const cur=poly[i];
    const curIn = sd(cur) <= 0;
    if(curIn){
      if(!prevIn) out.push(clipEdge(prev, cur, sd));
      out.push(cur);
    } else if(prevIn){
      out.push(clipEdge(prev, cur, sd));
    }
    prev=cur; prevIn=curIn;
  }
  return out;
}
` + ANCHOR_CLIP]];

const ANCHOR_CALL = "      cell=clipPoly(cell, seeds[i], seeds[j]);";
const P_POWER_CALL = [[ANCHOR_CALL,
  "      cell=clipPolyW(cell, seeds[i], seeds[j], seeds[i].w||0, seeds[j].w||0);"]];

// 权重表按「玩法角色」给：主基地最大、敌方基地次大、中立建筑中等、走廊最小、山/桥面偏小。
const ANCHOR_PUSH = "    seeds.push({ c, r, ch,\n      x: cx + rx*step + (rng()-0.5)*step*JIT,\n      y: cy + ry*step + (rng()-0.5)*step*JIT });";
const PWR_BASE = {P:0.85,'2':0.55,'3':0.55,N:0.10,T:-0.20,'^':-0.30,v:-0.18,w:-0.10,B:-0.10,e:-0.10,'~':0};
function powerW(scale){
  const ent = Object.keys(PWR_BASE).map(k=>"'"+k+"':"+(PWR_BASE[k]*scale).toFixed(3)).join(',');
  return [[ANCHOR_PUSH,
`    const _CW={${ent}};
    seeds.push({ c, r, ch, w:((_CW[ch]!=null?_CW[ch]:0)*step*step),
      x: cx + rx*step + (rng()-0.5)*step*JIT,
      y: cy + ry*step + (rng()-0.5)*step*JIT });`]];
}
const P_POWER_W = powerW(1);
const P_POWER = [...P_POWER_FN, ...P_POWER_CALL, ...P_POWER_W];

const ANCHOR_CELLS = "    if(cell.length<3) continue;\n    cells.push({ s:seeds[i], cell, cg:polygonCentroid(cell) });\n  }\n  if(cells.length<12) return false;";
const P_ROUGH = [[ANCHOR_CELLS, ANCHOR_CELLS + `
  {
    const SEG=3, AMP=step*0.17;
    const hs=(s)=>{ let x=2166136261>>>0; for(let i=0;i<s.length;i++){ x^=s.charCodeAt(i); x=Math.imul(x,16777619)>>>0; } return (x>>>0)/4294967296; };
    const midsFor=(A,B)=>{
      // 键必须高精度：原始世界坐标量级只有 0~7，toFixed(1) 会让大批不同的边撞成同一个键，
      // 细分点被张冠李戴 → 多边形直接炸成锯齿（实测自交）。再挂上边长做二次区分。
      const ka=A.x.toFixed(4)+','+A.y.toFixed(4), kb=B.x.toFixed(4)+','+B.y.toFixed(4);
      const rev = !(ka<kb);               // 端点规范化，保证两块算的是同一条边
      const p0 = rev? B : A, q0 = rev? A : B;
      const k=(ka<kb?ka:kb)+'|'+(ka<kb?kb:ka)+'|'+Math.hypot(B.x-A.x,B.y-A.y).toFixed(4);
      // 这里刻意不做 cache：实测缓存命中会让细分点张冠李戴（多边形直接炸成锯齿）。
      // 计算本身是纯确定性的（同样的端点 → 同样的细分点），所以两侧共享边天然一致，
      // 缓存只是省性能，不省正确性 —— 几百条边的量级，直接重算完全够快。
      const px=p0.x, py=p0.y, qx=q0.x, qy=q0.y;
      const dx=qx-px, dy=qy-py, L=Math.hypot(dx,dy)||1;
      const nx=-dy/L, ny=dx/L, amp=AMP*Math.min(1, L/(step*0.7));
      const arr=[];
      for(let s=1;s<SEG;s++){
        const t=s/SEG + (hs(k+'@'+s)-0.5)*0.10;
        const r=(hs(k+'#'+s)-0.5)*2*amp;
        arr.push({x:px+dx*t+nx*r, y:py+dy*t+ny*r});
      }
      return {m:arr, rev};
    };
    const nc=[];
    for(const cc of cells){
      const P=cc.cell, n=P.length, np=[];
      for(let i=0;i<n;i++){
        const A=P[i], B=P[(i+1)%n];
        np.push(A);
        const r=midsFor(A,B);
        if(!r.rev){ for(let z=0;z<r.m.length;z++) np.push(r.m[z]); }
        else      { for(let z=r.m.length-1;z>=0;z--) np.push(r.m[z]); }
      }
      nc.push({ s:cc.s, cell:np, cg:cc.cg });
    }
    cells.length=0; for(const c of nc) cells.push(c);
  }`]];

const VARIANTS = [
  { id:'V0', name:'现状（原版 7×5 网格）', desc:'规则矩形网格 + 等距 Voronoi，外轮廓是硬编码矩形 —— 方格感的根源', patches:[] },
  { id:'V5', name:'只调几何，不重画网格', desc:'上一轮方案：噪声场扰动 + 打破矩形外框 + 碎礁。观感有改善，但种子点仍是规则网格，面积拉不开', patches:[...P_NOISE, ...P_FRAME, ...P_REEF] },
  { id:'V11', name:'重画网格 + 加权 Voronoi + 边缘折线 + 碎礁（推荐）', desc:'重做 L1/L2 手画网格；Power diagram 拉开面积差；每条边细分并沿法向随机位移（边不再是直线）', patches:[...P_NEW_MAPS, ...P_NOISE, ...P_FRAME, ...P_POWER_FN, ...P_POWER_CALL, ...powerW(0.55), ...roughWith(2,0.22), ...P_REEF] },
];

// 边缘细分的段数可调：SEG=3 → 每边 3 段（≈15 边，偏曲线）；SEG=2 → 每边 2 段（≈10 边，偏折线）
function roughWith(seg, amp){
  return P_ROUGH.map(([a,b]) => [a, b.replace('const SEG=3, AMP=step*0.17;',
                                              'const SEG='+seg+', AMP=step*'+amp+';')]);
}

function applyPatches(js, patches, tag){
  let out=js;
  for(const [from,to] of patches){
    if(out.indexOf(from)<0) throw new Error('['+tag+'] 补丁锚点没找到：'+from.slice(0,60)+'…');
    out=out.split(from).join(to);
  }
  return out;
}

// 跑一次游戏本体，取出 L1 / L2 / 随机图参照的几何快照
const METRICS = "  const areaOf=(p)=>{ let a=0; for(let i=0;i<p.length;i++){ const q=p[(i+1)%p.length]; a+=p[i].x*q.y-q.x*p[i].y; } return Math.abs(a/2); };\n"
// 形状不规则度：每条边长度的标准差 ÷ 平均边长。正六边形/正方形各边等长 → 接近 0；
// 被噪声推歪的 Voronoi 多边形各边长短不一 → 明显更大。这才是「方格子 vs 自然地块」的分水岭。
// （面积 CV 只反映大小差异，不反映形状：等大的正六边形和等大的歪多边形可以面积完全一样。）
+"  const __shape=(ns)=>{\n"
+"    const ar=ns.map(n=>areaOf(n.poly));\n"
+"    const m=ar.reduce((x,y)=>x+y,0)/ar.length;\n"
+"    const sd=Math.sqrt(ar.reduce((x,y)=>x+(y-m)*(y-m),0)/ar.length);\n"
+"    let esum=0, cnt=0;\n"
+"    for(const n of ns){ const p=n.poly; if(p.length<3) continue;\n"
+"      const L=[]; for(let i=0;i<p.length;i++){ const q=p[(i+1)%p.length]; L.push(Math.hypot(q.x-p[i].x,q.y-p[i].y)); }\n"
+"      const lm=L.reduce((x,y)=>x+y,0)/L.length;\n"
+"      const ls=Math.sqrt(L.reduce((x,y)=>x+(y-lm)*(y-lm),0)/L.length);\n"
+"      esum+=ls/lm; cnt++; }\n"
+"    return { cv:(sd/m), edge:(cnt?esum/cnt:0), n:ns.length };\n"
+"  };\n";

const DRIVER = "\n;(async()=>{\ntry{\n"
+"  getProg().unlockAll = true;\n"
+"  window.__snaps = {};\n"
+ METRICS
+"  const targets=[['human',1,'h1','烽火边境'],['human',2,'dusk','渡口阻击']];\n"
+"  for(const [race,lv,id,name] of targets){\n"
+"    pickRace(race); pendingCampLevel=lv; campStage=lv; campRace=race; lastMode='camp';\n"
+"    stageBattle();\n"
+"    const snapIt=(k,nm)=>{ window.__snaps[k]={\n"
+"      name:nm,\n"
+"      nodes: nodes.map(n=>({ x:n.x,y:n.y,rad:n.rad,owner:n.owner,type:n.type,\n"
+"        poly: n.poly.map(p=>({x:p.x,y:p.y})),\n"
+"        bunker:!!n.bunker,boss:!!n.boss,kingsTent:!!n.kingsTent,sanctum:!!n.sanctum,\n"
+"        forge:!!n.forge,goldTower:!!n.goldTower,prize:!!n.prize,\n"
+"        barn:n.type==='barn',stall:n.type==='stall',\n"
+"        camp:['archery','mage','rogue','siege'].includes(n.type) })),\n"
+"      lakes: LAKES.map(L=>({ mtn: MOUNTAINS.has(L), sea: SEACELLS.has(L), pts: L.map(p=>({x:p.x,y:p.y})) })),\n"
+"      reefs: (typeof REEFS!=='undefined'?REEFS:[]).map(L=>L.map(p=>({x:p.x,y:p.y}))),\n"
+"    }; };\n"
+"    // 跨江边计数：桥图铁律是「过江只有那几条边」。几何扰动若让兵球斜穿江面，这个数就会变大\n"
+"    // —— 那说明 pairGate 的穿水采样被改坏了，方案不能用。\n"
+"    let cross=0;\n"
+"    for(const a of nodes) for(const b of (a.adj||[])){\n"
+"      if(!a._g||!b._g) continue;\n"
+"      if((a._g.c<3)!==(b._g.c<3)) cross++;\n"
+"    }\n"
+"    cross=cross/2;\n"
+"    // 调试已关\n"
+"    if(false && id==='dusk'){ const aw=[]; for(const n of nodes){ if(!n._g) continue; if(n.ch==='B'||n.ch==='w'||n.ch==='e'||n.ch==='P'||n.ch==='2'||n.ch==='3'||n.ch==='N'||n.ch==='^'){ aw.push(n.ch+'('+n._g.c+','+n._g.r+')→'+(n.adj||[]).filter(m=>m._g).map(m=>m.ch+'('+m._g.c+','+m._g.r+')').join(',')); } } console.log('  L2 关键 adj:'); aw.forEach(l=>console.log('   ',l)); }\n"
+"    let conn=true;\n"
+"    if(nodes.length){ const seen=new Set([nodes[0]]), q=[nodes[0]];\n"
+"      while(q.length){ const u=q.pop(); for(const v of (u.adj||[])) if(!seen.has(v)){ seen.add(v); q.push(v); } }\n"
+"      conn = seen.size===nodes.length; }\n"
+"    const shp=__shape(nodes);\n"
+"    snapIt(id, name);\n"
+"    window.__snaps[id].cv = shp.cv;\n"
+"    window.__snaps[id].edge = shp.edge;\n"
+"    // 面积倍差 = 最大格 ÷ 最小格。CV 只反映离散程度，看不出「到底差几倍」，\n"
+"    // 而黎总要的是 3-4 倍的直观大小差，所以直接报这个数。\n"
+"    const _ar=nodes.map(n=>{ let a=0; const p=n.poly; for(let i=0;i<p.length;i++){ const q=p[(i+1)%p.length]; a+=p[i].x*q.y-q.x*p[i].y; } return Math.abs(a/2); });\n"
+"    window.__snaps[id].ratio = Math.max.apply(null,_ar)/(Math.max(1e-6,Math.min.apply(null,_ar)));\n"
+"    window.__snaps[id].edgesAvg = nodes.reduce((s,n)=>s+n.poly.length,0)/Math.max(1,nodes.length);\n"
+"    window.__snaps[id].cross = cross;\n"
+"    window.__snaps[id].conn = conn;\n"
+"  }\n"
+"  // 参照组：随机建图（人类 L3 走的就是这条路径）\n"
+"  buildMap('M0',{seed:20260907});\n"
+"  window.__snaps.REF={\n"
+"    name:'随机图参照（= 人类L3 观感）',\n"
+"    nodes: nodes.map(n=>({ x:n.x,y:n.y,rad:n.rad,owner:n.owner,type:n.type,\n"
+"      poly: n.poly.map(p=>({x:p.x,y:p.y})),\n"
+"      bunker:!!n.bunker,boss:!!n.boss,kingsTent:!!n.kingsTent,sanctum:!!n.sanctum,\n"
+"      forge:!!n.forge,goldTower:!!n.goldTower,prize:!!n.prize,\n"
+"      barn:n.type==='barn',stall:n.type==='stall',\n"
+"      camp:['archery','mage','rogue','siege'].includes(n.type) })),\n"
+"    lakes: LAKES.map(L=>({ mtn: MOUNTAINS.has(L), sea: SEACELLS.has(L), pts: L.map(p=>({x:p.x,y:p.y})) })),\n"
+"    reefs: [],\n"
+"  };\n"
+"  { const s2=__shape(nodes); window.__snaps.REF.cv=s2.cv; window.__snaps.REF.edge=s2.edge; }\n"
+"}catch(e){ window.__err = (e&&e.stack||String(e)); }\n"
+"})();\n";

const vm=require('vm');
const all={};
for(const V of VARIANTS){
  const js = 'var REEFS=[];\n' + applyPatches(BASE_JS, V.patches, V.id) + DRIVER;
  const sb = makeSandbox();
  const ctx=vm.createContext(sb);
  vm.runInContext(js, ctx, {filename:'game-'+V.id+'.js'});
  if(sb.__err){ console.log('['+V.id+'] 跑挂了：\n'+sb.__err); process.exit(1); }
  all[V.id]=JSON.parse(JSON.stringify(sb.__snaps));
  const g=all[V.id];
  console.log(V.id+'  L1='+g.h1.nodes.length+'格 CV='+g.h1.cv.toFixed(3)+' 倍差='+g.h1.ratio.toFixed(1)+'x 边数='+g.h1.edgesAvg.toFixed(1)+' 连通='+g.h1.conn
    +' | L2='+g.dusk.nodes.length+'格 CV='+g.dusk.cv.toFixed(3)+' 倍差='+g.dusk.ratio.toFixed(1)+'x 边数='+g.dusk.edgesAvg.toFixed(1)+' 跨江边='+g.dusk.cross+' 连通='+g.dusk.conn
    +' | 碎礁='+(g.h1.reefs.length+g.dusk.reefs.length));
}
console.log('参照 随机图：格数='+all.V0.REF.nodes.length+' CV='+all.V0.REF.cv.toFixed(3)+' 形状='+all.V0.REF.edge.toFixed(3));

// ————————————————————————————————————————————————————————————
// 渲染（与 gen-preview 同一套画法，观感可比）
// ————————————————————————————————————————————————————————————
function edgeWob(ax,ay,bx,by,amp){
  let x1=ax,y1=ay,x2=bx,y2=by;
  if(x1>x2 || (x1===x2 && y1>y2)){ const t=x1;x1=x2;x2=t; const u=y1;y1=y2;y2=u; }
  let h=2166136261;
  for(const v of [Math.round(x1*2),Math.round(y1*2),Math.round(x2*2),Math.round(y2*2)]){ h^=v; h=Math.imul(h,16777619); }
  return ((h>>>0)/4294967296-0.5)*amp;
}
function polyPath(poly){
  if(!poly || !poly.length) return '';
  let d='M'+poly[0].x.toFixed(1)+','+poly[0].y.toFixed(1);
  for(let i=0;i<poly.length;i++){
    const a=poly[i], b=poly[(i+1)%poly.length];
    let x1=a.x,y1=a.y,x2=b.x,y2=b.y;
    if(x1>x2 || (x1===x2 && y1>y2)){ const t=x1;x1=x2;x2=t; const u=y1;y1=y2;y2=u; }
    const dx=x2-x1, dy=y2-y1, L=Math.hypot(dx,dy)||1;
    const n=edgeWob(a.x,a.y,b.x,b.y, L*0.13);
    d+='L'+((a.x+b.x)/2 - dy/L*n).toFixed(1)+','+((a.y+b.y)/2 + dx/L*n).toFixed(1);
    d+='L'+b.x.toFixed(1)+','+b.y.toFixed(1);
  }
  return d+'Z';
}
function polygonCentroid(poly){ let x=0,y=0; for(const p of poly){ x+=p.x; y+=p.y; } return { x:x/poly.length, y:y/poly.length }; }

const COL={ 0:'#E8E6DF',1:'#C0DD97',2:'#F7C1C1',3:'#CECBF6',
  stroke:{0:'#B4B2A9',1:'#3B6D11',2:'#A32D2D',3:'#534AB7'},
  water:'#B5D4F4', waterStroke:'#185FA5', mount:'#B9B7AE', mountStroke:'#5F5E5A' };
const BG_SEA='#CFE0E6', BG_LAND='#D9D3C3';   // 背景：海（现状）vs 内陆土色（void:'land' 方案）
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

function renderCard(S, opt){
  opt=opt||{};
  const bg=opt.bg||BG_SEA;
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const n of S.nodes) for(const p of n.poly){ x0=Math.min(x0,p.x); x1=Math.max(x1,p.x); y0=Math.min(y0,p.y); y1=Math.max(y1,p.y); }
  const Wt=x1-x0, Ht=y1-y0, PAD=46;
  const vb=(x0-PAD)+' '+(y0-PAD)+' '+(Wt+PAD*2)+' '+(Ht+PAD*2);
  let s='<svg viewBox="'+vb+'" width="100%" style="max-height:300px;display:block;background:'+bg+';border-radius:10px">';
  // 浅滩
  for(const n of S.nodes){
    const cg=polygonCentroid(n.poly);
    let d='M';
    n.poly.forEach((p,i)=>{ const x=cg.x+(p.x-cg.x)*1.16, y=cg.y+(p.y-cg.y)*1.16; d+=(i?'L':'')+x.toFixed(1)+','+y.toFixed(1); });
    s+='<path d="'+d+'Z" fill="rgba(140,185,190,0.45)" stroke="none"/>';
  }
  // 碎礁（外海过渡）
  for(const R of (S.reefs||[])){
    s+='<path d="'+polyPath(R)+'" fill="#B6B2A4" stroke="#8E8A7C" stroke-width="1"/>';
  }
  // 水与山
  for(const L of S.lakes){
    if(L.sea) continue;
    const poly=L.pts, cg=polygonCentroid(poly);
    if(L.mtn){
      s+='<path d="'+polyPath(poly)+'" fill="'+COL.mount+'" stroke="'+COL.mountStroke+'" stroke-width="2"/>';
      let rMax=0; for(const p of poly){ const d=Math.hypot(p.x-cg.x,p.y-cg.y); if(d>rMax)rMax=d; }
      const rr=(k)=>{ const h=Math.imul((Math.round(cg.x*7)+Math.round(cg.y*13)+k*2654435761)>>>0,40503)>>>0; return (h%1000)/1000; };
      for(let k=0;k<7;k++){
        const a=rr(k)*6.283, t=Math.sqrt(rr(k+40))*rMax*0.7;
        const px=cg.x+Math.cos(a)*t, py=cg.y+Math.sin(a)*t;
        const rad=rMax*(0.14+rr(k+80)*0.16);
        s+='<path d="M'+(px-rad).toFixed(1)+','+(py+rad*0.5).toFixed(1)+' L'+px.toFixed(1)+','+(py-rad*0.6).toFixed(1)
          +' L'+(px+rad).toFixed(1)+','+(py+rad*0.3).toFixed(1)+' L'+(px+rad*0.4).toFixed(1)+','+(py+rad*0.7).toFixed(1)+'Z" '
          +'fill="#8F8D85" stroke="#5F5E5A" stroke-width="1.2"/>';
      }
    } else {
      s+='<path d="'+polyPath(poly)+'" fill="'+COL.water+'" stroke="'+COL.waterStroke+'" stroke-width="2"/>';
    }
  }
  // 地块
  for(const n of S.nodes){
    s+='<path d="'+polyPath(n.poly)+'" fill="'+COL[n.owner]+'" stroke="'+COL.stroke[n.owner]+'" stroke-width="1.6"/>';
  }
  // 建筑
  for(const n of S.nodes){
    if(n.bunker){
      s+='<rect x="'+(n.x-9).toFixed(1)+'" y="'+(n.y-9).toFixed(1)+'" width="18" height="18" rx="4" fill="#3a3e44" stroke="#8a8f94" stroke-width="1.4"/>'
        +'<text x="'+n.x.toFixed(1)+'" y="'+n.y.toFixed(1)+'" font-size="10" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="central">×2</text>';
    } else if(n.boss){
      s+='<polygon points="'+n.x+','+(n.y-13)+' '+(n.x+12)+','+(n.y+9)+' '+(n.x-12)+','+(n.y+9)+'" fill="#3C3489" stroke="#26215C" stroke-width="1.5"/>'
        +'<text x="'+n.x+'" y="'+(n.y+2)+'" font-size="9" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="central">堡</text>';
    } else if(n.type==='tower'||n.goldTower){
      s+='<rect x="'+(n.x-7).toFixed(1)+'" y="'+(n.y-7).toFixed(1)+'" width="14" height="14" rx="2" fill="#8a8f94" stroke="#444441" stroke-width="1"/>';
    } else if(n.barn){
      s+='<text x="'+n.x.toFixed(1)+'" y="'+n.y.toFixed(1)+'" font-size="11" fill="#854F0B" text-anchor="middle" dominant-baseline="central">仓</text>';
    } else if(n.prize){
      s+='<text x="'+n.x.toFixed(1)+'" y="'+n.y.toFixed(1)+'" font-size="11" fill="#993C1D" text-anchor="middle" dominant-baseline="central">宝</text>';
    } else if(n.forge){
      s+='<text x="'+n.x.toFixed(1)+'" y="'+n.y.toFixed(1)+'" font-size="11" fill="#712B13" text-anchor="middle" dominant-baseline="central">炉</text>';
    } else if(n.camp){
      s+='<text x="'+n.x.toFixed(1)+'" y="'+n.y.toFixed(1)+'" font-size="10" fill="#444441" text-anchor="middle" dominant-baseline="central">营</text>';
    }
  }
  for(const n of S.nodes){
    if(n.owner>=1) s+='<circle cx="'+n.x.toFixed(1)+'" cy="'+n.y.toFixed(1)+'" r="7" fill="#fff" stroke="'+COL.stroke[n.owner]+'" stroke-width="3"/>';
  }
  s+='</svg>';
  const tags=[]; tags.push(S.nodes.length+' 格');
  const seaN=S.lakes.filter(L=>L.sea).length; if(seaN) tags.push('海 '+seaN);
  if((S.reefs||[]).length) tags.push('礁 '+(S.reefs||[]).length);
  return '<div class="card"><div class="hd"><b>'+esc(opt.title||S.name)+'</b><span class="tag">'+tags.join(' · ')+'</span></div>'+s+'</div>';
}

let body='';
// 指标表：光看图容易各执一词，用「地块面积变异系数」把「方块感」量化
// CV = 面积标准差 / 平均面积。全等大的瓷砖 = 0；数值越大，格子大小越有主次。
const refCV = all.V0.REF.cv, refEDGE = all.V0.REF.edge;
let mt='<table class="mt"><tr><th>方案</th><th>L1 格数</th><th>L1 面积倍差</th><th>L1 平均边数</th><th>L1 形状不规则度</th><th>L2 格数</th><th>L2 面积倍差</th><th>L2 平均边数</th><th>L2 形状不规则度</th><th>L2 过江通路</th><th>连通</th></tr>';
for(const V of VARIANTS){
  const g=all[V.id];
  const ok = g.h1.conn && g.dusk.conn && g.dusk.cross===all.V0.dusk.cross;
  mt+='<tr'+(V.id==='V0'?'':' class="hi"')+'><td><b>'+V.id+'</b> '+esc(V.name)+'</td>'
    +'<td>'+g.h1.nodes.length+'</td><td>'+g.h1.ratio.toFixed(1)+'x</td><td>'+g.h1.edgesAvg.toFixed(1)+'</td><td>'+g.h1.edge.toFixed(3)+'</td>'
    +'<td>'+g.dusk.nodes.length+'</td><td>'+g.dusk.ratio.toFixed(1)+'x</td><td>'+g.dusk.edgesAvg.toFixed(1)+'</td><td>'+g.dusk.edge.toFixed(3)+'</td>'
    +'<td>'+g.dusk.cross+' 条</td><td>'+(ok?'✅':'⚠️')+'</td></tr>';
}
mt+='<tr class="ref"><td><b>参照</b> 随机建图（L3 观感）</td><td>'+all.V0.REF.nodes.length+'</td><td>—</td><td>—</td><td>'+refEDGE.toFixed(3)
   +'</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr></table>';
body+='<h2>量化对照</h2>'+mt
  +'<p class="mtnote">'
  +'<b>面积倍差</b> = 最大格面积 ÷ 最小格面积（你要的 3-4 倍）。<b>平均边数</b> = 地块由几条直线边围成（你要的 3-9 条）。'
  +'<b>形状不规则度</b> = 各边长度标准差 ÷ 平均边长，正六边形≈0，越不规则越大（随机图 '+refEDGE.toFixed(3)+'）。<br><br>'
  +'<b>过江通路</b>是桥关命门：L2 全图只能有那几条边能过江（必须走桥）。V11 与现状一致（'
  +all.V0.dusk.cross+' 条），说明重做地图没有让兵球斜穿江面，玩法没被改坏。</p>';
// 参照组
body+='<h2>参照 · 随机建图（人类 L3 走的就是这条路径，格数/大小天然不均，外轮廓由海岸线生成）</h2>';
body+='<div class="row">'+renderCard(all.V0.REF,{title:'随机图参照'})+'</div>';
// 四个方案
for(const V of VARIANTS){
  body+='<h2><span class="vn">'+V.id+'</span> '+esc(V.name)+'<em>'+esc(V.desc)+'</em></h2>';
  body+='<div class="row">'
    + renderCard(all[V.id].h1,  {title:'L1 烽火边境'})
    + renderCard(all[V.id].dusk,{title:'L2 渡口阻击'})
    + '</div>';
}
// V5 + 内陆土色背景（背景分语义方案）
const BEST='V11';
body+='<h2><span class="vn">附</span> V11 + 内陆背景<em>把「外海一律是水」改成按关卡走：内陆关外围是暗土 + 远景，只有江是水（背景分语义方案预览）</em></h2>';
body+='<div class="row">'
  + renderCard(all[BEST].h1,  {title:'L1 烽火边境 · 陆地基底', bg:BG_LAND})
  + renderCard(all[BEST].dusk,{title:'L2 渡口阻击 · 陆地基底', bg:BG_LAND})
  + renderCard(all.V0.h1,     {title:'对照：现状 L1 · 陆地基底', bg:BG_LAND})
  + '</div>';

const out='<!doctype html><meta charset="utf-8"><title>L1/L2 有机化方案对比</title>\n<style>\n'
+'body{font-family:system-ui,"Microsoft YaHei",sans-serif;background:#F7F6F2;margin:0;padding:26px;color:#2C2C2A}\n'
+'h1{font-size:19px;font-weight:600;margin:0 0 6px}\n'
+'h2{font-size:15px;font-weight:600;margin:30px 0 12px;color:#2C2C2A;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}\n'
+'h2 em{font-style:normal;font-weight:400;font-size:12.5px;color:#5F5E5A}\n'
+'.vn{display:inline-block;background:#2C2C2A;color:#fff;border-radius:6px;padding:2px 8px;font-size:12px}\n'
+'.sub{font-size:13px;color:#5F5E5A;margin:0 0 18px;line-height:1.7}\n'
+'.row{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:18px;margin-bottom:16px}\n'
+'.card{background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:12px;padding:14px 16px}\n'
+'.hd{display:flex;align-items:center;gap:12px;margin-bottom:10px;font-size:14px;flex-wrap:wrap}\n'
+'.tag{font-size:12px;color:#5F5E5A;background:#F1EFE8;border-radius:6px;padding:2px 8px}\n'
+'.note{margin-top:28px;background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:12px;padding:16px 18px;font-size:13px;line-height:1.9;color:#3C3C3A}\n'
+'.note b{color:#2C2C2A}\n'
+'.mt{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:10px;background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:10px;overflow:hidden}\n'
+'.mt th{background:#F1EFE8;text-align:left;padding:8px 12px;font-weight:600;font-size:12.5px;color:#3C3C3A}\n'
+'.mt td{padding:8px 12px;border-top:1px solid rgba(0,0,0,.07)}\n'
+'.mt tr.hi td{background:#F4F8EF}\n'
+'.mt tr.ref td{background:#FBF6E9;color:#5F5E5A}\n'
+'.mtnote{font-size:12.5px;color:#5F5E5A;line-height:1.8;margin:0 0 20px}\n'
+'.lg{display:flex;flex-wrap:wrap;gap:16px;margin-top:14px;font-size:12px;color:#5F5E5A}\n'
+'.lg i{display:inline-block;width:11px;height:11px;border:1.5px solid;border-radius:3px;margin-right:5px;vertical-align:-1px}\n'
+'</style>\n'
+'<h1>L1 / L2 有机化方案对比</h1>\n'
+'<p class="sub">由游戏本体真实建图渲染（node tests/gen-map-organic.js）—— 每个方案都是把 index.html 的建图源码打补丁后跑出来的，'
+'不是另画的示意图，所以预览里的地块就是改完之后实机里的地块。<br>'
+'对照顺序：先看「参照」那张随机图的感觉，再往下扫 V0 → V5 → V11，看方块感被削掉多少。</p>\n'
+ body
+'<div class="note"><b>V11 动了哪四处（前两处是根治，后两处是加分）</b><br>'
+'· <b>① 重画手画网格（根治「方盒子」）</b>：原版是 7×5 满格矩形靠 <code>.</code> 挖四角，行宽 4·5·7·5·3 完全上下对称。'
+'新版改成 7×7，陆地<b>成片集中</b>、走廊<b>密排</b>、外海<b>三面包围</b> —— L1 的 P 基地缩在西南一隅三面临空，'
+'Voronoi 切出来自然就是超大主格；N 麦仓和 T 箭塔被走廊四面围死，自然是最小格。<br>'
+'· <b>② 加权 Voronoi / Power diagram（根治「一样大」）</b>：普通 Voronoi 用中垂线切，种子点是规则网格 ⇒ 单元面积天然均匀，'
+'怎么调都推不动面积差。改成功率图后每个种子带权重，分界线从「中点」挪到 <code>|x-a|²-wa = |x-b|²-wb</code> —— '
+'它<b>仍是直线半平面</b>，所以能复用现成的逐边裁剪，只改阈值。主基地权重高多占地、走廊权重低，面积倍差就拉开了。<br>'
+'· <b>③ 共享边细分 + 噪声位移（根治「连成直线」）</b>：Voronoi 相邻两块共享一整条完整直线边。'
+'把每条边切成 2 段、中间点沿法向随机偏移即可破掉。难点是两块各自算会算出不同位移而开缝 —— '
+'解法是偏移只由「这条边的两个端点」哈希决定，两块算出的点逐点相同，方向相反时反序插入，边界依旧严丝合缝。<br>'
+'· <b>④ 外海碎礁</b>：给外海格补一圈缩小的暗礁做过渡，硬切的一刀变成碎岛渐变。阻挡判定不变（仍按完整格进 LAKES）。<br><br>'
+'<b>为什么玩法没被改坏</b>：上面四处全部只改「多边形顶点」，<b>邻接仍按网格 c/r 判定</b>。'
+'所以 P 在哪、敌在哪、桥在哪、山卡在哪条路，全部原封不动 —— L2 过江通路与现状完全一致（3 条，必须走桥面），全图连通。'
+'L1 从 22 格变 15 格、L2 从 20 格变 16 格，是新网格本身陆地更少（三面临海换大格），不是地块被吞掉。</div>\n'
+'<div class="card" style="margin-top:18px"><div class="lg">'
+'<span><i style="background:#C0DD97;border-color:#3B6D11"></i>玩家（你）</span>'
+'<span><i style="background:#F7C1C1;border-color:#A32D2D"></i>敌军 A</span>'
+'<span><i style="background:#CECBF6;border-color:#534AB7"></i>敌军 B</span>'
+'<span><i style="background:#E8E6DF;border-color:#B4B2A9"></i>中立</span>'
+'<span><i style="background:#B5D4F4;border-color:#185FA5"></i>水 / 江</span>'
+'<span><i style="background:#B9B7AE;border-color:#5F5E5A"></i>山（不可通行）</span>'
+'<span><i style="background:#B6B2A4;border-color:#8E8A7C"></i>外海碎礁（不可通行）</span>'
+'</div></div>\n';

fs.writeFileSync('map-organic-preview.html', out);
fs.writeFileSync('tests/_snaps.json', JSON.stringify(all));   // 供 tests/check-geom.js 做几何自检
console.log('已生成 map-organic-preview.html');
