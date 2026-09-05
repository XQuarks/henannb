// 终章 Boss 脉冲人格化（第三批）：四族 L10 各不同
//   human 圣光（己方驻军 +3）  / dragon 龙息（清场无附加）
//   goblin 偷金币（-3/+3）     / dwarf  符文崩塌（敌方容量下降）
// DOM stub 与其它 e2e 同一套（每个测试自带，互不耦合）。
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
  let pass=0, fail=0;
  const T=(n,c)=>{ if(c){pass++;console.log('  ok   '+n);} else {fail++;console.log('  FAIL '+n);} };

  // ========== 四族 L10 各自人格生效 ==========
  for(const race of ['human','dragon','goblin','dwarf']){
    stageLv(race, 10);
    const b=nodes.find(n=>n.boss);
    console.log('=== '+race+' L10 ===');
    T(race+' 存在 Boss 要塞', !!b);
    if(!b) continue;
    const want=BOSS_PULSE[race].kind;
    T(race+' pulse.kind='+want+'('+BOSS_PULSE[race].label+')', !!b.pulse && b.pulse.kind===want);
    T(race+' Boss 落在中心区域（优于全图中位数）', (function(){
      const cx=W/2, cy=G_TOP+(H-G_TOP)/2;
      const ds=nodes.map(n=>Math.hypot(n.x-cx,n.y-cy)).sort((a,b)=>a-b);
      const med=ds[Math.floor(ds.length/2)];
      return Math.hypot(b.x-cx,b.y-cy) <= med + 0.01;
    })());

    // 触发一次脉冲，检查人格附加效果是否真的执行
    b.owner = 1;
    b.pulseCd = 0;
    const R = CFG.bossPulseR;
    // 与游戏内口径一致：半径内 ∪ 直接邻格（固定图格距可能大于 bossPulseR，见 index.html 脉冲处注释）
    const inR = nd => nd!==b && (Math.hypot(nd.x-b.x, nd.y-b.y) <= R || !!(nd.adj && nd.adj.includes(b)));
    const mine = nodes.filter(n=>n!==b && inR(n))[0];
    const foe  = nodes.filter(n=>n!==b && inR(n))[1];
    let beforePop=-1, beforeCap=-1, goldBefore=-1, foeGoldBefore=-1;
    if(mine){ mine.owner=1; mine.pop=5; mine.cap=30; beforePop=mine.pop; }
    if(foe){ foe.owner=2; foe.cap=40; foe.pop=20; beforeCap=foe.cap; gGold[2]=10; foeGoldBefore=gGold[2]; }
    goldBefore = gGold[1]||0;
    update(0.05);
    if(b.pulse.kind==='holy' && mine)  T(race+' 圣光：己方据点驻军 +3', mine.pop===beforePop+3);
    if(b.pulse.kind==='heist' && foe)  T(race+' 吸金：敌方金币 -3 且己方 +3', gGold[2]===foeGoldBefore-3 && (gGold[1]||0)===goldBefore+3);
    if(b.pulse.kind==='rune' && foe)   T(race+' 崩塌：敌方据点容量下降', foe.cap<beforeCap && foe.cap>=12);
    if(b.pulse.kind==='breath')        T(race+' 龙息：无附加效果（纯清场）', mine?mine.pop===beforePop:true);
    T(race+' 脉冲后 pulseCd 已重置为 8', b.pulseCd>7.5);
  }

  // ========== 反向对照：中立 Boss 只清场，不发附加效果 ==========
  stageLv('human',10);
  const b2=nodes.find(n=>n.boss);
  if(b2){
    b2.owner=0; b2.pulseCd=0;
    const inR2 = nd => nd!==b2 && (Math.hypot(nd.x-b2.x, nd.y-b2.y) <= CFG.bossPulseR || !!(nd.adj && nd.adj.includes(b2)));
    const m2=nodes.filter(n=>inR2(n))[0];
    if(m2){ m2.owner=1; m2.pop=5; m2.cap=30; }
    const pop2=m2?m2.pop:0;
    update(0.05);
    T('中立要塞只清场、不发附加效果', !m2 || m2.pop===pop2);
  }

  console.log('');
  console.log('RESULT pass='+pass+' fail='+fail);
  process.exit(fail?1:0);
}catch(e){ console.log('DRIVER ERROR: '+(e && e.stack || e)); process.exit(1); }
})();
`;
eval(js + DRIVER);