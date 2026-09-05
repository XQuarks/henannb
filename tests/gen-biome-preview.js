// 批次B 生态皮肤预览生成器：四族「生态五件套」静态页，黎总过目后才动真实渲染代码。
// 用法：node tests/gen-biome-preview.js  →  生成 biome-preview.html
// 几何用游戏本体 buildMap(S 模板) 真实建图；上色/装饰按 MAP-REDESIGN-PROPOSAL §3 调色板程序化绘制。
function mkEl(id){
  const el = {
    id, style:{ setProperty(){}, }, children:[], dataset:{},
    appendChild(c){ el.children.push(c); }, classList:{ list:[], toggle(){}, add(){}, remove(){}, contains(){return false;} },
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
const els = {};
global.document = {
  getElementById(id){ if(!els[id]) els[id]=mkEl(id); return els[id]; },
  querySelector(s){ if(!els[s]) els[s]=mkEl(s); return els[s]; },
  querySelectorAll(){ return []; }, createElement(t){ return mkEl('dyn_'+t); },
  body:mkEl('body'), documentElement:mkEl('html'),
  addEventListener(){}, hidden:false,
};
global.window = global;
global.navigator = { userAgent:'node', maxTouchPoints:0 };
global.performance = { now:()=>Date.now() };
global.requestAnimationFrame = fn=>0;
global.cancelAnimationFrame = ()=>{};
global.localStorage = { _s:{}, getItem(k){ return this._s[k]||null; }, setItem(k,v){ this._s[k]=String(v); }, removeItem(k){ delete this._s[k]; } };
global.location = { href:'x', search:'' };
global.devicePixelRatio = 1;
global.innerWidth = 1280; global.innerHeight = 720;
global.addEventListener = ()=>{};
global.Image = function(){};

const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const js=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n');

// —— 与游戏渲染同源的边线有机化（edgeWob 复制）——
function edgeWob(ax,ay,bx,by,amp){
  let x1=ax,y1=ay,x2=bx,y2=by;
  if(x1>x2 || (x1===x2 && y1>y2)){ const t=x1;x1=x2;x2=t; const u=y1;y1=y2;y2=u; }
  let h=2166136261;
  for(const v of [Math.round(x1*2),Math.round(y1*2),Math.round(x2*2),Math.round(y2*2)]){
    h^=v; h=Math.imul(h,16777619);
  }
  return ((h>>>0)/4294967296-0.5)*amp;
}
function polyPath(poly){
  if(!poly || !poly.length) return '';
  let d='M'+poly[0].x.toFixed(1)+','+poly[0].y.toFixed(1);
  for(let i=0;i<poly.length;i++){
    const a=poly[i], b=poly[(i+1)%poly.length];
    const dx=b.x-a.x, dy=b.y-a.y, L=Math.hypot(dx,dy)||1;
    const n=edgeWob(a.x,a.y,b.x,b.y, L*0.13);
    d+='L'+((a.x+b.x)/2 - dy/L*n).toFixed(1)+','+((a.y+b.y)/2 + dx/L*n).toFixed(1);
    d+='L'+b.x.toFixed(1)+','+b.y.toFixed(1);
  }
  return d+'Z';
}
function polygonCentroid(poly){
  let x=0,y=0; for(const p of poly){ x+=p.x; y+=p.y; }
  return { x:x/poly.length, y:y/poly.length };
}
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
// 有机圆斑（湖/装饰簇用）：24 瓣 + 确定性抖动
function blobPath(cx,cy,r,sd){
  const rng=mulberry32(sd);
  const pts=[];
  for(let i=0;i<24;i++){
    const a=i/24*Math.PI*2, rr=r*(0.86+rng()*0.28);
    pts.push((cx+Math.cos(a)*rr).toFixed(1)+','+(cy+Math.sin(a)*rr).toFixed(1));
  }
  return 'M'+pts.join('L')+'Z';
}

// —— 生态五件套调色板（MAP-REDESIGN-PROPOSAL §3，唯一事实来源）——
const BIOMES = {
  human: { name:'人类 · 沃土田园', shape:'S5', shapeName:'半岛岬角',
    water:['#3d6b6f','#2a4a50'], shallow:'rgba(126,178,168,0.40)', foam:'rgba(210,236,228,0.75)',
    land:'#4a5a3a', landAlt:'#536544', lake:'#3f7a80', lakeStroke:'#2a5a60',
    mount:'#7a8a84', mountStroke:'#46524c', mountTop:'#5a7a4a',
    particle:'#f0e6c0',
    kit:'麦田块 / 橡树林 / 风车磨坊 / 飘絮花粉' },
  goblin: { name:'哥布林 · 荒原峡谷', shape:'S6', shapeName:'三汊三角洲',
    water:['#6b5a42','#4a3f30'], shallow:'rgba(190,164,120,0.35)', foam:'rgba(232,216,180,0.65)',
    land:'#8a6b42', landAlt:'#96784c', lake:'#566038', lakeStroke:'#3e4628',
    mount:'#a05a3a', mountStroke:'#6b3a24', mountTop:'#c07a4a',
    particle:'#d8c090',
    kit:'枯木 / 白骨堆 / 仙人掌 / 破货车残骸 / 沙尘' },
  dragon: { name:'天龙人 · 灰烬高地', shape:'S3', shapeName:'环形熔岩湖',
    water:['#2a2035','#1a1424'], shallow:'rgba(110,80,120,0.30)', foam:'rgba(200,150,210,0.45)',
    land:'#3d3230', landAlt:'#463a36', lake:'#e06a1e', lakeStroke:'#ffb347',
    mount:'#262029', mountStroke:'#0f0c12', mountTop:'#e06a1e',
    particle:'#ff8c3a',
    kit:'龙骸骨 / 火山口 / 烬晶簇 / 余烬上飘' },
  dwarf: { name:'矮人 · 雪山矿脉', shape:'S4', shapeName:'雪山裂谷',
    water:['#4a6470','#32434d'], shallow:'rgba(150,180,192,0.35)', foam:'rgba(230,242,248,0.8)',
    land:'#8a949c', landAlt:'#97a1a9', lake:'#bcd8e8', lakeStroke:'#e8f4fa',
    mount:'#6f7880', mountStroke:'#454c52', mountTop:'#eef2f5',
    particle:'#ffffff',
    kit:'矿洞入口 / 冰晶簇 / 缆车木架 / 落雪' },
};
// 领地归属色（实机 colOf 同款）：玩家绿 / 敌A / 敌B / 中立
const OWN = { 1:'#3ddc68', 2:'#ff6240', 3:'#35cfd4', 0:'#565a63' };
const TINT = 0.40;   // 归属薄涂不透明度（提案 §1-5：从 26 提到 40，待预览确认）

function hexRgb(h){ return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]; }
function blend(a,b,t){
  const A=hexRgb(a), B=hexRgb(b);
  return 'rgb('+Math.round(A[0]+(B[0]-A[0])*t)+','+Math.round(A[1]+(B[1]-A[1])*t)+','+Math.round(A[2]+(B[2]-A[2])*t)+')';
}

// —— 跑游戏本体取几何（S 模板、固定种子可复现）——
const DRIVER = "\n;(async()=>{\ntry{\n  getProg().unlockAll = true;\n  window.__snaps = {};\n  for(const sh of ['S3','S4','S5','S6']){\n    buildMap(sh,{seed:20260904});\n    window.__snaps[sh] = {\n      nodes: nodes.map(n=>({ x:n.x,y:n.y,rad:n.rad,owner:n.owner,type:n.type,\n        poly: n.poly.map(p=>({x:p.x,y:p.y})) })),\n      lakes: LAKES.map(L=>({ mtn: MOUNTAINS.has(L), sea: SEACELLS.has(L), pts: L.map(p=>({x:p.x,y:p.y})) })),\n      hole: (COAST && COAST.hole) ? {x:COAST.hole.x, y:COAST.hole.y, r:COAST.hole.r} : null,\n    };\n  }\n}catch(e){ console.log('SNAP ERR '+(e&&e.stack||e)); process.exit(1); }\n})();\n";
const vm=require('vm');
const ctx=vm.createContext(global);
vm.runInContext(js+DRIVER, ctx, {filename:'game.js'});
const snaps = global.window.__snaps;
if(!snaps){ console.log('没有拿到快照'); process.exit(1); }

// —— 装饰物（程序化 SVG，与游戏「零图片素材」同规矩）——
function decor(kind, x, y, s, rng, B){
  switch(kind){
    // 人类
    case 'wheat': {   // 麦田块：金黄斜纹小块
      let r='<g transform="translate('+x+','+y+') rotate('+(rng()*40-20).toFixed(0)+')">'
        +'<rect x="'+(-s)+'" y="'+(-s*0.7)+'" width="'+(s*2)+'" height="'+(s*1.4)+'" rx="2" fill="#d9b64a" opacity="0.9"/>';
      for(let i=-1;i<=1;i++) r+='<line x1="'+(i*s*0.55)+'" y1="'+(-s*0.6)+'" x2="'+(i*s*0.55)+'" y2="'+(s*0.6)+'" stroke="#a8842a" stroke-width="1.2"/>';
      return r+'</g>'; }
    case 'oak':       // 橡树：深绿冠 + 高光 + 短干
      return '<g transform="translate('+x+','+y+')"><rect x="'+(-s*0.12)+'" y="'+(-s*0.1)+'" width="'+(s*0.24)+'" height="'+(s*0.7)+'" fill="#4a3a22"/>'
        +'<circle cx="0" cy="'+(-s*0.35)+'" r="'+(s*0.62)+'" fill="#2f4a26"/>'
        +'<circle cx="'+(-s*0.2)+'" cy="'+(-s*0.55)+'" r="'+(s*0.22)+'" fill="#4a6a38"/></g>';
    case 'windmill':  // 风车磨坊：塔身 + 四叶
      return '<g transform="translate('+x+','+y+')"><path d="M'+(-s*0.45)+','+(s*0.9)+' L0,'+(-s*0.5)+' L'+(s*0.45)+','+(s*0.9)+'Z" fill="#e8e0cc" stroke="#8a7a5a" stroke-width="1.2"/>'
        +'<g stroke="#e8e0cc" stroke-width="'+(s*0.16)+'" stroke-linecap="round">'
        +'<line x1="0" y1="'+(-s*0.5)+'" x2="'+(s*0.8)+'" y2="'+(-s*1.1)+'"/><line x1="0" y1="'+(-s*0.5)+'" x2="'+(-s*0.8)+'" y2="'+(-s*1.1)+'"/>'
        +'<line x1="0" y1="'+(-s*0.5)+'" x2="'+(s*0.8)+'" y2="'+(s*0.1)+'"/><line x1="0" y1="'+(-s*0.5)+'" x2="'+(-s*0.8)+'" y2="'+(s*0.1)+'"/></g>'
        +'<circle cx="0" cy="'+(-s*0.5)+'" r="'+(s*0.14)+'" fill="#8a7a5a"/></g>';
    // 哥布林
    case 'deadwood':  // 枯木：折线枯枝
      return '<g transform="translate('+x+','+y+')" stroke="#3a2c1c" stroke-width="'+(s*0.14)+'" stroke-linecap="round" fill="none">'
        +'<path d="M0,'+(s*0.6)+' L0,'+(-s*0.5)+' M0,'+(-s*0.1)+' L'+(s*0.45)+','+(-s*0.55)+' M0,'+(s*0.05)+' L'+(-s*0.4)+','+(-s*0.35)+'"/></g>';
    case 'bones':     // 白骨堆：两根交叉骨 + 半圆颅
      return '<g transform="translate('+x+','+y+')" stroke="#e8e0d0" stroke-width="'+(s*0.13)+'" stroke-linecap="round">'
        +'<line x1="'+(-s*0.5)+'" y1="'+(-s*0.3)+'" x2="'+(s*0.5)+'" y2="'+(s*0.3)+'"/>'
        +'<line x1="'+(-s*0.5)+'" y1="'+(s*0.3)+'" x2="'+(s*0.5)+'" y2="'+(-s*0.3)+'"/>'
        +'<circle cx="'+(s*0.15)+'" cy="'+(-s*0.45)+'" r="'+(s*0.22)+'" fill="#e8e0d0" stroke="none"/></g>';
    case 'cactus':    // 仙人掌
      return '<g transform="translate('+x+','+y+')" stroke="#4a7a3a" stroke-width="'+(s*0.2)+'" stroke-linecap="round" fill="none">'
        +'<path d="M0,'+(s*0.6)+' L0,'+(-s*0.6)+' M0,'+(-s*0.1)+' L'+(s*0.4)+','+(-s*0.1)+' L'+(s*0.4)+','+(-s*0.45)+' M0,'+(s*0.1)+' L'+(-s*0.38)+','+(s*0.1)+' L'+(-s*0.38)+','+(-s*0.2)+'"/></g>';
    case 'cart':      // 破货车残骸
      return '<g transform="translate('+x+','+y+') rotate('+(rng()*30-15).toFixed(0)+')">'
        +'<rect x="'+(-s*0.7)+'" y="'+(-s*0.35)+'" width="'+(s*1.4)+'" height="'+(s*0.6)+'" rx="2" fill="#6b4a28" stroke="#3a2c1c" stroke-width="1"/>'
        +'<circle cx="'+(-s*0.4)+'" cy="'+(s*0.35)+'" r="'+(s*0.22)+'" fill="#3a2c1c"/>'
        +'<circle cx="'+(s*0.4)+'" cy="'+(s*0.35)+'" r="'+(s*0.22)+'" fill="#3a2c1c"/></g>';
    // 天龙
    case 'ribs': {    // 龙骸骨：一排肋拱
      let r='<g transform="translate('+x+','+y+')" stroke="#cfc6b8" stroke-width="'+(s*0.12)+'" fill="none" stroke-linecap="round">';
      for(let i=-1;i<=1;i++) r+='<path d="M'+(i*s*0.5)+','+(s*0.4)+' Q'+(i*s*0.5)+','+(-s*0.55)+' '+(i*s*0.5+s*0.18)+','+(-s*0.62)+'"/>';
      return r+'<line x1="'+(-s*0.8)+'" y1="'+(s*0.4)+'" x2="'+(s*0.8)+'" y2="'+(s*0.4)+'"/></g>'; }
    case 'crater':    // 火山口：焦坑 + 熔岩沿
      return '<g transform="translate('+x+','+y+')"><ellipse cx="0" cy="0" rx="'+(s*0.9)+'" ry="'+(s*0.62)+'" fill="#1c1414" stroke="#e06a1e" stroke-width="'+(s*0.14)+'"/>'
        +'<ellipse cx="0" cy="'+(s*0.05)+'" rx="'+(s*0.5)+'" ry="'+(s*0.3)+'" fill="#e06a1e" opacity="0.85"/></g>';
    case 'embercrystal':  // 烬晶簇
      return '<g transform="translate('+x+','+y+')"><polygon points="0,'+(-s*0.8)+' '+(s*0.3)+',0 '+(-s*0.3)+',0" fill="#ff7a2a"/>'
        +'<polygon points="'+(s*0.4)+','+(-s*0.45)+' '+(s*0.65)+','+(s*0.15)+' '+(s*0.15)+','+(s*0.15)+'" fill="#c9521a"/>'
        +'<polygon points="'+(-s*0.4)+','+(-s*0.45)+' '+(-s*0.15)+','+(s*0.15)+' '+(-s*0.65)+','+(s*0.15)+'" fill="#e06a1e"/></g>';
    // 矮人
    case 'mine':      // 矿洞入口：土坡 + 拱门洞
      return '<g transform="translate('+x+','+y+')"><path d="M'+(-s)+','+(s*0.5)+' Q0,'+(-s*0.9)+' '+(s)+','+(s*0.5)+'Z" fill="#6f6558"/>'
        +'<path d="M'+(-s*0.38)+','+(s*0.5)+' Q0,'+(-s*0.25)+' '+(s*0.38)+','+(s*0.5)+'Z" fill="#241c12"/>'
        +'<line x1="'+(-s*0.5)+'" y1="'+(s*0.5)+'" x2="'+(s*0.5)+'" y2="'+(s*0.5)+'" stroke="#5a4a32" stroke-width="'+(s*0.1)+'"/></g>';
    case 'icecrystal':  // 冰晶簇
      return '<g transform="translate('+x+','+y+')"><polygon points="0,'+(-s*0.85)+' '+(s*0.28)+',0 '+(-s*0.28)+',0" fill="#a8d8f0"/>'
        +'<polygon points="'+(s*0.38)+','+(-s*0.5)+' '+(s*0.62)+','+(s*0.1)+' '+(s*0.14)+','+(s*0.1)+'" fill="#c8e8f8"/>'
        +'<polygon points="'+(-s*0.38)+','+(-s*0.5)+' '+(-s*0.14)+','+(s*0.1)+' '+(-s*0.62)+','+(s*0.1)+'" fill="#8ac0e0"/></g>';
    case 'cableway':  // 缆车木架：A 字架 + 横索
      return '<g transform="translate('+x+','+y+')" stroke="#5a4a32" stroke-width="'+(s*0.12)+'" stroke-linecap="round" fill="none">'
        +'<path d="M'+(-s*0.5)+','+(s*0.6)+' L0,'+(-s*0.5)+' L'+(s*0.5)+','+(s*0.6)+' M'+(-s*0.28)+','+(s*0.05)+' L'+(s*0.28)+','+(s*0.05)+'"/>'
        +'<line x1="'+(-s*0.9)+'" y1="'+(-s*0.42)+'" x2="'+(s*0.9)+'" y2="'+(-s*0.42)+'" stroke-dasharray="'+(s*0.2)+','+(s*0.12)+'"/></g>';
  }
  return '';
}
const DECOR_SET = {
  human:  ['wheat','wheat','oak','oak','windmill'],
  goblin: ['deadwood','bones','cactus','deadwood','cart'],
  dragon: ['ribs','crater','embercrystal','embercrystal','ribs'],
  dwarf:  ['mine','icecrystal','icecrystal','cableway','mine'],
};

function renderCard(race){
  const B=BIOMES[race], S=snaps[B.shape];
  const rng=mulberry32(race.length*7919+13);
  // 包围盒（含中心洞）
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  const eat=p=>{ x0=Math.min(x0,p.x); x1=Math.max(x1,p.x); y0=Math.min(y0,p.y); y1=Math.max(y1,p.y); };
  for(const n of S.nodes) for(const p of n.poly) eat(p);
  if(S.hole){ eat({x:S.hole.x-S.hole.r,y:S.hole.y-S.hole.r}); eat({x:S.hole.x+S.hole.r,y:S.hole.y+S.hole.r}); }
  const PAD=40, vb=(x0-PAD)+' '+(y0-PAD)+' '+((x1-x0)+PAD*2)+' '+((y1-y0)+PAD*2);
  let s='<svg viewBox="'+vb+'" width="100%" style="display:block;border-radius:10px">';
  // ① 水面：生态双色渐变
  s+='<defs><linearGradient id="wg_'+race+'" x1="0" y1="0" x2="0" y2="1">'
    +'<stop offset="0" stop-color="'+B.water[0]+'"/><stop offset="1" stop-color="'+B.water[1]+'"/></linearGradient></defs>'
    +'<rect x="'+(x0-PAD)+'" y="'+(y0-PAD)+'" width="'+((x1-x0)+PAD*2)+'" height="'+((y1-y0)+PAD*2)+'" fill="url(#wg_'+race+')"/>';
  // ② 粒子（铺在水面上，地标层的底层氛围）
  for(let i=0;i<26;i++){
    const px=x0-PAD+rng()*((x1-x0)+PAD*2), py=y0-PAD+rng()*((y1-y0)+PAD*2), pr=1.2+rng()*2.2;
    s+='<circle cx="'+px.toFixed(1)+'" cy="'+py.toFixed(1)+'" r="'+pr.toFixed(1)+'" fill="'+B.particle+'" opacity="'+(0.25+rng()*0.4).toFixed(2)+'"/>';
  }
  // ③ 浅滩两圈 + 海岸浪花线
  for(const n of S.nodes){
    const cg=polygonCentroid(n.poly);
    let d='M';
    n.poly.forEach((p,i)=>{ const x=cg.x+(p.x-cg.x)*1.16, y=cg.y+(p.y-cg.y)*1.16; d+=(i?'L':'')+x.toFixed(1)+','+y.toFixed(1); });
    s+='<path d="'+d+'Z" fill="'+B.shallow+'" stroke="none"/>';
  }
  for(const n of S.nodes){
    const cg=polygonCentroid(n.poly);
    let d='M';
    n.poly.forEach((p,i)=>{ const x=cg.x+(p.x-cg.x)*1.07, y=cg.y+(p.y-cg.y)*1.07; d+=(i?'L':'')+x.toFixed(1)+','+y.toFixed(1); });
    s+='<path d="'+d+'Z" fill="none" stroke="'+B.foam+'" stroke-width="1.6" opacity="0.8"/>';
  }
  // ④ 轮廓中心洞（S3 熔岩湖 / S1 海湾等）
  if(S.hole){
    const isLava = race==='dragon';
    s+='<path d="'+blobPath(S.hole.x,S.hole.y,S.hole.r*0.97, race.length*331+7)+'" fill="'+(isLava?B.lake:B.water[1])+'" stroke="'+(isLava?B.lakeStroke:B.foam)+'" stroke-width="'+(isLava?4:2)+'"/>';
    if(isLava){  // 熔岩湖面浮渣
      for(let i=0;i<7;i++){
        const a=rng()*6.283, t=Math.sqrt(rng())*S.hole.r*0.7;
        s+='<circle cx="'+(S.hole.x+Math.cos(a)*t).toFixed(1)+'" cy="'+(S.hole.y+Math.sin(a)*t).toFixed(1)+'" r="'+(3+rng()*6).toFixed(1)+'" fill="#ffb347" opacity="0.5"/>';
      }
    }
  }
  // ⑤ 地块：生态地色 + 归属薄涂 + 归属描边（辨识度验证点）
  for(const n of S.nodes){
    const base = (n.owner===0) ? B.landAlt : blend(B.land, OWN[n.owner], TINT);
    s+='<path d="'+polyPath(n.poly)+'" fill="'+base+'" stroke="'+(n.owner?OWN[n.owner]:blend(B.land,'#000000',0.25))+'" stroke-width="'+(n.owner?2.6:1.6)+'"/>';
  }
  // ⑥ 湖与山（生态换肤；海格跳过）
  for(const L of S.lakes){
    if(L.sea) continue;
    const poly=L.pts, cg=polygonCentroid(poly);
    if(L.mtn){
      s+='<path d="'+polyPath(poly)+'" fill="'+B.mount+'" stroke="'+B.mountStroke+'" stroke-width="2"/>';
      let rMax=0; for(const p of poly){ const d=Math.hypot(p.x-cg.x,p.y-cg.y); if(d>rMax)rMax=d; }
      const rr=(k)=>{ const h=Math.imul((Math.round(cg.x*7)+Math.round(cg.y*13)+k*2654435761)>>>0, 40503)>>>0; return (h%1000)/1000; };
      for(let k=0;k<6;k++){
        const a=rr(k)*6.283, t=Math.sqrt(rr(k+40))*rMax*0.62;
        const px=cg.x+Math.cos(a)*t, py=cg.y+Math.sin(a)*t, rad=rMax*(0.16+rr(k+80)*0.16);
        s+='<path d="M'+(px-rad).toFixed(1)+','+(py+rad*0.5).toFixed(1)
          +' L'+px.toFixed(1)+','+(py-rad*0.6).toFixed(1)
          +' L'+(px+rad).toFixed(1)+','+(py+rad*0.3).toFixed(1)+'Z" '
          +'fill="'+blend(B.mount,'#000000',0.18)+'" stroke="'+B.mountStroke+'" stroke-width="1"/>'
          +'<path d="M'+(px-rad*0.45).toFixed(1)+','+(py-rad*0.28).toFixed(1)
          +' L'+px.toFixed(1)+','+(py-rad*0.6).toFixed(1)
          +' L'+(px+rad*0.45).toFixed(1)+','+(py-rad*0.28).toFixed(1)+'Z" fill="'+B.mountTop+'" opacity="0.9"/>';
      }
    } else {
      s+='<path d="'+polyPath(poly)+'" fill="'+B.lake+'" stroke="'+B.lakeStroke+'" stroke-width="2"/>';
    }
  }
  // ⑦ 装饰簇：每格 1~3 件，落在格内
  const set=DECOR_SET[race];
  for(const n of S.nodes){
    const cnt=1+Math.floor(rng()*2.4);
    for(let k=0;k<cnt;k++){
      const kind=set[Math.floor(rng()*set.length)];
      const a=rng()*6.283, t=Math.sqrt(rng())*n.rad*0.5;
      s+=decor(kind, n.x+Math.cos(a)*t, n.y+Math.sin(a)*t, n.rad*(0.28+rng()*0.16), rng, B);
    }
  }
  // ⑧ 基地白心圆点
  for(const n of S.nodes){
    if(n.owner>=1){
      s+='<circle cx="'+n.x.toFixed(1)+'" cy="'+n.y.toFixed(1)+'" r="7" fill="#fff" stroke="'+OWN[n.owner]+'" stroke-width="3"/>';
    }
  }
  s+='</svg>';
  // 卡片头：族名 + 模板 + 调色板小样
  const chips=[B.water[0],B.land,B.lake,B.mount,B.particle].map(c=>'<i style="background:'+c+'"></i>').join('');
  return '<div class="card"><div class="hd"><b>'+B.name+'</b><span class="tag">'+B.shape+' '+B.shapeName+'</span>'
    +'<span class="chip">'+chips+'</span></div>'+s
    +'<div class="kit">'+B.kit+'</div></div>';
}

let cards='';
for(const race of ['human','goblin','dragon','dwarf']) cards+=renderCard(race);
const out='<!doctype html><meta charset="utf-8"><title>批次B · 四族生态皮肤预览</title>\n<style>\n'
+'body{font-family:system-ui,"Microsoft YaHei",sans-serif;background:#14161a;margin:0;padding:24px;color:#e8e6e0}\n'
+'h1{font-size:18px;font-weight:600;margin:0 0 4px}\n'
+'.sub{font-size:13px;color:#9a988f;margin:0 0 20px;max-width:900px;line-height:1.7}\n'
+'.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(430px,1fr));gap:18px}\n'
+'.card{background:#1d2025;border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:14px 16px}\n'
+'.hd{display:flex;align-items:center;gap:10px;margin-bottom:10px;font-size:14px;flex-wrap:wrap}\n'
+'.tag{font-size:12px;color:#b0aea5;background:#2a2d33;border-radius:6px;padding:2px 8px}\n'
+'.chip i{display:inline-block;width:13px;height:13px;border-radius:3px;margin-right:3px;vertical-align:-2px;border:1px solid rgba(255,255,255,.2)}\n'
+'.kit{font-size:12px;color:#9a988f;margin-top:8px}\n'
+'</style>\n<h1>批次B · 四族生态皮肤预览（静态稿，待过目）</h1>\n'
+'<p class="sub">几何为游戏本体 S 模板真实建图（同一种子），上色与装饰按提案 §3 调色板程序化绘制——与实机将走的 BIOMES 表同源。'
+'重点核对：① 四张图是否一眼是四个世界；② 领地归属色（绿=你）在各地色上的辨识度，尤其矮人雪原浅色底；③ 装饰簇的密度与风格是否合适。</p>\n'
+'<div class="grid">'+cards+'</div>\n';
fs.writeFileSync('biome-preview.html', out);
console.log('已生成 biome-preview.html（4 族生态预览）');
