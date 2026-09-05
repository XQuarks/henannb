// 固定地图一页预览生成器：跑游戏本体建图，把 13 张固定图渲染成亮色 SVG 俯视图。
// 用法：node tests/gen-preview.js  →  覆盖 terrain-preview.html
// 黎总迭代地图观感时，不用一关关进游戏，开这一个页面看全部效果。
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

// —— 与游戏渲染同源的边线有机化：预览和实机观感一致 ——
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
    let x1=a.x,y1=a.y,x2=b.x,y2=b.y;
    if(x1>x2 || (x1===x2 && y1>y2)){ const t=x1;x1=x2;x2=t; const u=y1;y1=y2;y2=u; }
    const dx=x2-x1, dy=y2-y1, L=Math.hypot(dx,dy)||1;
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

// —— 跑游戏本体 ——
const DRIVER = "\n;(async()=>{\ntry{\n  getProg().unlockAll = true;\n  window.__snaps = {};\n  function stageLv(race, lv){\n    pickRace(race);\n    pendingCampLevel=lv; campStage=lv; campRace=race; lastMode='camp';\n    stageBattle();\n  }\n  const targets=[\n    ['human',1,'烽火边境'],['human',2,'渡口阻击'],['human',10,'和平之门'],\n    ['dragon',1,'蝼蚁的村庄'],['dragon',2,'焚断桥'],['dragon',10,'君临天下'],\n    ['goblin',1,'饿肚子开工'],['goblin',2,'此桥是我开'],['goblin',9,'抢劫犯被抢'],['goblin',10,'传说金库'],\n    ['dwarf',1,'嘲笑的代价'],['dwarf',2,'断桥立誓'],['dwarf',10,'让世界低头']];\n  for(const [race,lv,name] of targets){\n    stageLv(race,lv);\n    window.__snaps[race+lv] = {\n      name, race, lv,\n      nodes: nodes.map(n=>({ x:n.x,y:n.y,rad:n.rad,owner:n.owner,type:n.type,\n        poly: n.poly.map(p=>({x:p.x,y:p.y})),\n        bunker:!!n.bunker,boss:!!n.boss,kingsTent:!!n.kingsTent,sanctum:!!n.sanctum,\n        forge:!!n.forge,goldTower:!!n.goldTower,prize:!!n.prize,\n        barn:n.type==='barn',stall:n.type==='stall',\n        camp:['archery','mage','rogue','siege'].includes(n.type) })),\n      lakes: LAKES.map(L=>({ mtn: MOUNTAINS.has(L), sea: SEACELLS.has(L), pts: L.map(p=>({x:p.x,y:p.y})) })),\n      mountains: [...MOUNTAINS].map(L=>L.map(p=>({x:p.x,y:p.y}))),\n    };\n  }\n  // 批次A：S1~S6 轮廓层模板各取一张种子样本（固定种子，预览可复现）\n  for(const sh of ['S1','S2','S3','S4','S5','S6']){\n    buildMap(sh,{seed:20260904});\n    window.__snaps[sh] = {\n      name: TPL_NAMES[sh], race:'S', lv:sh,\n      nodes: nodes.map(n=>({ x:n.x,y:n.y,rad:n.rad,owner:n.owner,type:n.type,\n        poly: n.poly.map(p=>({x:p.x,y:p.y})),\n        bunker:!!n.bunker,boss:!!n.boss,kingsTent:!!n.kingsTent,sanctum:!!n.sanctum,\n        forge:!!n.forge,goldTower:!!n.goldTower,prize:!!n.prize,\n        barn:n.type==='barn',stall:n.type==='stall',\n        camp:['archery','mage','rogue','siege'].includes(n.type) })),\n      lakes: LAKES.map(L=>({ mtn: MOUNTAINS.has(L), sea: SEACELLS.has(L), pts: L.map(p=>({x:p.x,y:p.y})) })),\n      mountains: [...MOUNTAINS].map(L=>L.map(p=>({x:p.x,y:p.y}))),\n    };\n  }\n}catch(e){ console.log('SNAP ERR '+(e&&e.stack||e)); process.exit(1); }\n})();\n";
const vm=require('vm');
const ctx=vm.createContext(global);
vm.runInContext(js+DRIVER, ctx, {filename:'game.js'});

const snaps = global.window.__snaps;
if(!snaps){ console.log('没有拿到快照'); process.exit(1); }

// —— 渲染成亮色 SVG（与黎总参考图同视角：浅底、清晰描边、装饰点缀）——
const COL = {
  0:'#E8E6DF', 1:'#C0DD97', 2:'#F7C1C1', 3:'#CECBF6',
  stroke:{ 0:'#B4B2A9', 1:'#3B6D11', 2:'#A32D2D', 3:'#534AB7' },
  water:'#B5D4F4', waterStroke:'#185FA5',
  mount:'#B9B7AE', mountStroke:'#5F5E5A',
};
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

function renderCard(key){
  const S=snaps[key];
  // 包围盒
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const n of S.nodes) for(const p of n.poly){ x0=Math.min(x0,p.x); x1=Math.max(x1,p.x); y0=Math.min(y0,p.y); y1=Math.max(y1,p.y); }
  const Wt=x1-x0, Ht=y1-y0, PAD=46;
  const vb=(x0-PAD)+' '+(y0-PAD)+' '+(Wt+PAD*2)+' '+(Ht+PAD*2);
  let s='';
  s+='<svg viewBox="'+vb+'" width="100%" style="max-height:330px;display:block;background:#DFE7E9;border-radius:10px">';

  // 浅滩：陆地放大两档
  for(const n of S.nodes){
    const cg=polygonCentroid(n.poly);
    let d='M';
    n.poly.forEach((p,i)=>{ const x=cg.x+(p.x-cg.x)*1.16, y=cg.y+(p.y-cg.y)*1.16; d+=(i?'L':'')+x.toFixed(1)+','+y.toFixed(1); });
    s+='<path d="'+d+'Z" fill="rgba(140,185,190,0.45)" stroke="none"/>';
  }

  // 水与山（山体带 mtn 标记，画岩石堆；其余画水；sea=海岸雕刻啃出的外海，与背景同色不另画）
  for(const L of S.lakes){
    if(L.sea) continue;
    const poly=L.pts, cg=polygonCentroid(poly);
    if(L.mtn){
      s+='<path d="'+polyPath(poly)+'" fill="'+COL.mount+'" stroke="'+COL.mountStroke+'" stroke-width="2"/>';
      let rMax=0; for(const p of poly){ const d=Math.hypot(p.x-cg.x,p.y-cg.y); if(d>rMax)rMax=d; }
      const rr=(k)=>{ const h=Math.imul((Math.round(cg.x*7)+Math.round(cg.y*13)+k*2654435761)>>>0, 40503)>>>0; return (h%1000)/1000; };
      for(let k=0;k<7;k++){
        const a=rr(k)*6.283, t=Math.sqrt(rr(k+40))*rMax*0.7;
        const px=cg.x+Math.cos(a)*t, py=cg.y+Math.sin(a)*t;
        const rad=rMax*(0.14+rr(k+80)*0.16);
        s+='<path d="M'+(px-rad).toFixed(1)+','+(py+rad*0.5).toFixed(1)
          +' L'+px.toFixed(1)+','+(py-rad*0.6).toFixed(1)
          +' L'+(px+rad).toFixed(1)+','+(py+rad*0.3).toFixed(1)
          +' L'+(px+rad*0.4).toFixed(1)+','+(py+rad*0.7).toFixed(1)+'Z" '
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

  // 特殊建筑标记
  for(const n of S.nodes){
    if(n.bunker){
      s+='<rect x="'+(n.x-9).toFixed(1)+'" y="'+(n.y-9).toFixed(1)+'" width="18" height="18" rx="4" '
        +'fill="#3a3e44" stroke="#8a8f94" stroke-width="1.4"/>'
        +'<text x="'+n.x.toFixed(1)+'" y="'+n.y.toFixed(1)+'" font-size="10" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="central">×2</text>';
    } else if(n.boss){
      s+='<polygon points="'+n.x+','+(n.y-13)+' '+(n.x+12)+','+(n.y+9)+' '+(n.x-12)+','+(n.y+9)+'" '
        +'fill="#3C3489" stroke="#26215C" stroke-width="1.5"/>'
        +'<text x="'+n.x+'" y="'+(n.y+2)+'" font-size="9" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="central">堡</text>';
    } else if(n.type==='tower'||n.goldTower){
      s+='<rect x="'+(n.x-7).toFixed(1)+'" y="'+(n.y-7).toFixed(1)+'" width="14" height="14" rx="2" '
        +'fill="#8a8f94" stroke="#444441" stroke-width="1"/>';
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
  // 基地白心圆点
  for(const n of S.nodes){
    if(n.owner>=1){
      s+='<circle cx="'+n.x.toFixed(1)+'" cy="'+n.y.toFixed(1)+'" r="7" fill="#fff" stroke="'+COL.stroke[n.owner]+'" stroke-width="3"/>';
    }
  }
  s+='</svg>';
  const tags=[];
  tags.push(S.nodes.length+' 格');
  if(S.mountains.length) tags.push('山 '+S.mountains.length);
  const waterN=S.lakes.filter(L=>!L.mtn&&!L.sea).length;
  if(waterN>0) tags.push('水 '+waterN);
  const seaN=S.lakes.filter(L=>L.sea).length;
  if(seaN>0) tags.push('海 '+seaN);
  const bk=S.nodes.find(n=>n.bunker); if(bk) tags.push('碉堡');
  const boss=S.nodes.find(n=>n.boss); if(boss) tags.push('Boss');
  const title = S.race==='S' ? (S.lv+' '+esc(S.name)) : (esc(S.raceName||'')+'L'+S.lv+' '+esc(S.name));
  return '<div class="card"><div class="hd"><b>'+title+'</b>'
    +'<span class="tag">'+tags.join(' · ')+'</span></div>'+s+'</div>';
}
// 种族名
const RACE={ human:'人类', dragon:'天龙', goblin:'哥布林', dwarf:'矮人' };
for(const k of Object.keys(snaps)) snaps[k].raceName=RACE[snaps[k].race]||'';

const keys=Object.keys(snaps);
const sKeys=keys.filter(k=>snaps[k].race==='S');
const fKeys=keys.filter(k=>snaps[k].race!=='S');
let cards='';
for(let i=0;i<fKeys.length;i+=3){
  cards+='<div class="row">'+fKeys.slice(i,i+3).map(renderCard).join('')+'</div>';
}
let sCards='';
for(let i=0;i<sKeys.length;i+=3){
  sCards+='<div class="row">'+sKeys.slice(i,i+3).map(renderCard).join('')+'</div>';
}
const out='<!doctype html><meta charset="utf-8"><title>地图预览 · 固定图 + 轮廓层</title>\n<style>\n'
+'body{font-family:system-ui,"Microsoft YaHei",sans-serif;background:#F7F6F2;margin:0;padding:24px;color:#2C2C2A}\n'
+'h1{font-size:18px;font-weight:600;margin:0 0 4px}\n'
+'h2{font-size:15px;font-weight:600;margin:26px 0 12px;color:#444441}\n'
+'.sub{font-size:13px;color:#5F5E5A;margin:0 0 20px}\n'
+'.row{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px;margin-bottom:18px}\n'
+'.card{background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:12px;padding:14px 16px}\n'
+'.hd{display:flex;align-items:center;gap:12px;margin-bottom:10px;font-size:14px;flex-wrap:wrap}\n'
+'.tag{font-size:12px;color:#5F5E5A;background:#F1EFE8;border-radius:6px;padding:2px 8px}\n'
+'.lg{display:flex;flex-wrap:wrap;gap:16px;margin-top:14px;font-size:12px;color:#5F5E5A}\n'
+'.lg i{display:inline-block;width:11px;height:11px;border:1.5px solid;border-radius:3px;margin-right:5px;vertical-align:-1px}\n'
+'</style>\n<h1>地图预览 · 固定图 + 轮廓层</h1>\n'
+'<p class="sub">由游戏本体实时生成（node tests/gen-preview.js）。地形有机边线与实机同源；灰石堆＝山（不可通行），蓝＝水，×2＝桥头碉堡，紫三角＝Boss要塞，白心圆点＝三家基地；被海岸雕刻啃掉的边角格与背景同色（外海）。</p>\n'
+cards
+'<h2>批次A · 大陆架轮廓层 S1~S6（同一固定种子的样本；外形×骨架正交组合的地基）</h2>\n'
+sCards
+'<div class="card" style="grid-column:auto"><div class="lg">'
+'<span><i style="background:#C0DD97;border-color:#3B6D11"></i>玩家（你）</span>'
+'<span><i style="background:#F7C1C1;border-color:#A32D2D"></i>敌军 A</span>'
+'<span><i style="background:#CECBF6;border-color:#534AB7"></i>敌军 B</span>'
+'<span><i style="background:#E8E6DF;border-color:#B4B2A9"></i>中立</span>'
+'<span><i style="background:#B5D4F4;border-color:#185FA5"></i>水</span>'
+'<span><i style="background:#B9B7AE;border-color:#5F5E5A"></i>山（不可通行）</span>'
+'</div></div>\n';
fs.writeFileSync('terrain-preview.html', out);
console.log('已生成 terrain-preview.html（'+keys.length+' 张图）');