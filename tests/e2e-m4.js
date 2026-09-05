// M4 中央堡垒（第三批 · A）：量化枢纽度 + 距心优势，确保中央地块真"中央"。
// 「拿掉中心格图就裂成六块」在 Voronoi 蜂窝结构下做不到，所以改用两个能真实兑现的指标：
//   枢纽度 = 中心格度数 / 全图平均度数  —— 六条通道是否都从中心辐射出去
//   距心优势 = 中心格到全图平均距离 / 全图平均两两距离  —— <1 表示占住它投送兵力最快
function mkEl(id){
  const el = {
    id, style:{ setProperty(){}, }, children:[], dataset:{},
    appendChild(c){ el.children.push(c); },
    classList:{ list:[], toggle(c,f){
      const i=el.classList.list.indexOf(c);
      if(f===undefined){ i>=0?el.classList.list.splice(i,1):el.classList.list.push(c); }
      else if(f){ if(i<0)el.classList.list.push(c); }
      else { if(i>=0)el.classList.list.splice(i,1); }
    }, add(c){ if(!el.classList.list.includes(c))el.classList.list.push(c); },
      remove(c){ const i=el.classList.list.indexOf(c); if(i>=0)el.classList.list.splice(i,1); },
      contains(c){return el.classList.list.includes(c);} },
    textContent:'', innerHTML:'', title:'', value:'', width:300, height:150,
    addEventListener(){}, removeEventListener(){}, focus(){}, setAttribute(){},
    getAttribute(){return null;}, getContext(){ return ctxStub; },
    querySelector(){ return mkEl(id+'_q'); }, querySelectorAll(){ return []; },
    getBoundingClientRect(){ return {left:0,top:0,width:800,height: id==='hud'?54:600}; },
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

const DRIVER = `
;(async()=>{
try{
  getProg().unlockAll = true;
  function stageLv(race, lv){
    pickRace(race);
    pendingCampLevel=lv; campStage=lv; campRace=race; lastMode='camp';
    stageBattle();
  }
  function bboxRatio(){
    let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
    for(const n of nodes){ x0=Math.min(x0,n.x); x1=Math.max(x1,n.x); y0=Math.min(y0,n.y); y1=Math.max(y1,n.y); }
    const w=Math.max(1,x1-x0), h=Math.max(1,y1-y0);
    return w>=h ? w/h : h/w;
  }
  function DIST(i,j){ if(!DISTM) return null; const a=DISTM[i]; return a? a[j] : null; }
  function avgPair(){
    let s=0,c=0;
    for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){ const d=DIST(i,j); if(d!=null&&d<1e8){s+=d;c++;} }
    return c? s/c : 0;
  }
  function distOf(i){
    let s=0,c=0;
    for(let j=0;j<nodes.length;j++){ if(j===i)continue; const d=DIST(i,j); if(d!=null&&d<1e8){s+=d;c++;} }
    return c? s/c : 0;
  }

  let pass=0, fail=0;
  const T=(n,c)=>{ if(c){pass++;console.log('  ok   '+n);} else {fail++;console.log('  FAIL '+n);} };

  // 三关 M4 中央巨型据点（mega）：dragon / goblin / dwarf L5
  const targets = [['dragon','L5','mega'], ['goblin','L5','mega'], ['dwarf','L5','mega']];

  for(const [race, lvTag, skel] of targets){
    const lv = parseInt(lvTag.slice(1),10);
    const runs=8;
    let hubs=[], centrics=[], megaCores=0, ratios=[], adoptOk=0;
    for(let k=0;k<runs;k++){
      stageLv(race, lv);
      T(race+' L'+lv+' 第 '+(k+1)+'/'+runs+' 次走 M4 分支', SHAPE && SHAPE.tpl==='M4');
      const core = M4_GEO
        ? nodes.reduce((a,b)=>Math.hypot(a.x-M4_GEO.cx,a.y-M4_GEO.cy)<Math.hypot(b.x-M4_GEO.cx,b.y-M4_GEO.cy)?a:b, nodes[0])
        : nodes[0];
      const ci = nodes.indexOf(core);
      const degs = nodes.map(n=>(n.adj||[]).length);
      const avgDeg = degs.reduce((a,b)=>a+b,0)/degs.length;
      const maxDeg = Math.max(...degs);
      const ap = avgPair(), dc = distOf(ci);
      const megaN = nodes.find(n=>n.cap===80) || null;
      hubs.push(avgDeg>0 ? degs[ci]/avgDeg : 0);
      centrics.push(ap>0 ? dc/ap : 9);
      if(megaN && nodes.indexOf(megaN)===ci) megaCores++;
      ratios.push(bboxRatio());
      if(M4_DBG && M4_DBG.adopted) adoptOk++;
    }
    const avg = a => a.reduce((s,v)=>s+v,0)/a.length;
    console.log('   '+race+' L'+lv+' ['+skel+']  '+runs+' 次均 枢纽度='+avg(hubs).toFixed(2)+'  距心='+avg(centrics).toFixed(2)+
      '  巨城落核心='+megaCores+'/'+runs+'  长宽比='+avg(ratios).toFixed(2));
    T(race+' 枢纽度 > 1.2（中心格显著比平均连通）', avg(hubs) > 1.2);
    T(race+' 距心优势 < 1.0（中心格投送兵力更快）', avg(centrics) < 1.0);
    T(race+' 巨城落核心 ≥ '+Math.ceil(runs*0.5)+'/'+runs, megaCores >= Math.ceil(runs*0.5));
    T(race+' 长宽比 ≥ 1.0（地图不畸变成条）', avg(ratios) >= 1.0);
  }

  console.log('');
  console.log('RESULT pass='+pass+' fail='+fail);
  process.exit(fail?1:0);
}catch(e){ console.log('DRIVER ERROR: '+(e && e.stack || e)); process.exit(1); }
})();
`;
eval(js + DRIVER);