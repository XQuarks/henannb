// M3 双陆桥几何诊断（第三批 · A-1 顺带修的真 bug 量化）
// 关注：① 玩家 / 敌方基地分侧  ② 碉堡不贴敌方  ③ 碉堡在桥面
// 第四/五批后 4 个桥关改 M6 固定图，本测试仅用于残留的 M3 随机关（哥布林 L9）
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

  // v8：最后一个走 M3 随机桥的关（哥布林 L9）也已转固定图（b9），战役里再无 M3 关卡。
  // 但 M3 生成器仍是固定图建图失败时的兜底，所以改成直接驱动 buildMap('M3') 做几何体检，
  // 同时保留一组「战役关卡不应再走 M3」的回归断言（防止有人误把关卡改回随机 M3）。
  const targets = [
    ['M3', 0, 'M3 生成器直测'],
  ];

  let totalRun=0, totalM3=0, totalSplit=0, totalNear=0, totalBunkerOnBridge=0;
  for(const [tpl, lv, label] of targets){
    const N=20;
    let m3Runs=0, split=0, near=0, bunkerOnBridge=0;
    for(let k=0;k<N;k++){
      buildMap(tpl, {});            // 直接驱动生成器，不经由具体关卡
      totalRun++;
      if(!SHAPE || SHAPE.tpl!=='M3'){ continue; }
      totalM3++; m3Runs++;
      const key = n => SHAPE.horiz ? n.x : n.y;
      const p=nodes.find(n=>n.owner===1), a2=nodes.find(n=>n.owner===2), a3=nodes.find(n=>n.owner===3);
      const bk=nodes.find(n=>n.bunker);
      let lo=Infinity, hi=-Infinity;
      for(const n of nodes){ const v=key(n); if(v<lo)lo=v; if(v>hi)hi=v; }
      const span=hi-lo;
      const norm = n => span>0 ? (key(n)-lo)/span : 0;
      const splitOk = (p&&a2&&a3) ? ((Math.min(key(a2),key(a3))-key(p)) > span*0.40) : false;
      // 碉堡归一化位置：0=玩家端，1=敌人端。公平位置应在 [0.3, 0.85]（不能贴在玩家也不能贴在敌人）
      const bkNorm = bk ? norm(bk) : null;
      const fairBunker = bkNorm!==null && bkNorm >= 0.30 && bkNorm <= 0.85;
      if(splitOk){ split++; totalSplit++; }
      if(fairBunker){ near++; totalNear++; }
      if(bk && bk.onBridge){ bunkerOnBridge++; totalBunkerOnBridge++; }
    }
    console.log('  ['+label+']  M3 塑形 '+m3Runs+'/'+N+' 次  split='+split+'/'+m3Runs+'  碉堡公平='+near+'/'+m3Runs+'  碉堡在桥='+bunkerOnBridge+'/'+m3Runs);
  }

  console.log('');
  // M3 生成器本体（固定图建图失败时的兜底路径）仍要守住
  T('M3 生成器可用：20 次中 ≥16 次塑形成桥', totalM3>=16);
  T('M3 玩家 / 敌方基地分侧 split 率 ≥ 80%（'+totalSplit+'/'+totalM3+'）', totalM3===0 || totalSplit/totalM3 >= 0.8);
  T('M3 碉堡位置公平（不贴玩家也不贴敌方）≥ 80%（'+totalNear+'/'+totalM3+'）', totalM3===0 || totalNear/totalM3 >= 0.8);
  T('M3 碉堡 100% 落在桥面（'+totalBunkerOnBridge+'/'+totalM3+'）', totalM3===0 || totalBunkerOnBridge===totalM3);

  // 回归：战役 40 关不应再有走随机 M3 的关卡（全部应为固定图或确定性模板）
  let m3Levels=0;
  for(const race of ['human','dragon','goblin','dwarf']){
    for(let lv=1; lv<=10; lv++){
      stageLv(race, lv);
      if(SHAPE && SHAPE.tpl==='M3'){ m3Levels++; console.log('      仍在用 M3: '+race+' L'+lv); }
    }
  }
  T('战役 40 关已无随机 M3 关卡（实测 '+m3Levels+' 关）', m3Levels===0);

  console.log('');
  console.log('RESULT pass='+pass+' fail='+fail);
  process.exit(fail?1:0);
}catch(e){ console.log('DRIVER ERROR: '+(e && e.stack || e)); process.exit(1); }
})();
`;
eval(js + DRIVER);