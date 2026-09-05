// 焚桥（第三批 · 兑现天龙 L2 / 矮人 L2「再烧断他们的退路」）
// 玩家拿下江心碉堡 → 桥面敌军烧光、桥两头烧断，敌方再也过不来（玩家通道保留）
// 第五批扩展：固定桥（M6）也能焚（之前只对 M3 双陆桥生效）
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

  // 两关带 burnBridge：天 L2「焚断桥」(M6) + 矮 L2「断桥立誓」(M6)
  const RUNS = [['dragon',2,'焚断桥'],['dwarf',2,'断桥立誓']];

  for(const [race, lv, label] of RUNS){
    console.log('=== '+race+' L'+lv+' '+label+' ===');
    stageLv(race, lv);

    const bk = nodes.find(n=>n.bunker);
    const bridge = nodes.filter(n=>n.onBridge);
    // 接受 M3（双陆桥）和 M6（固定桥）两种地形
    T(label+': 桥形模板已加载（M3 或 M6）', SHAPE && (SHAPE.tpl==='M3' || SHAPE.tpl==='M6'));
    T(label+': 桥面格 >0（实测 '+bridge.length+' 格）', bridge.length>0);
    T(label+': 碉堡存在且落在桥面', !!bk && !!bk.onBridge);
    T(label+': lvCtx.mods.burnBridge 已开启', !!(lvCtx && lvCtx.mods && lvCtx.mods.burnBridge));
    if(!bk || !bridge.length) continue;

    // —— 焚桥前：敌军应当能上桥 ——
    const reachBefore = bridge.filter(bc=>nodes.some(u=>!u.onBridge && findPath(u,bc,2))).length;
    T(label+': 焚桥前 敌方可以走上桥面（'+reachBefore+'/'+bridge.length+' 格可达）', reachBefore===bridge.length);

    // —— 布场：桥面交给敌方，桥上放敌方部队，然后玩家攻下碉堡 ——
    for(const bc of bridge){ if(bc!==bk){ bc.owner=2; bc.pop=4; } }
    bk.owner=2; bk.pop=1; bk.defAcc=0; bk.shieldUntil=0;
    balls.length=0;
    for(const bc of bridge){
      balls.push({dead:false,left:true,owner:2,x:bc.x,y:bc.y,vx:0,vy:0,to:bc,from:bc,cls:null,siege:1});
    }
    const enemyBallsBefore = balls.filter(b=>!b.dead && b.owner!==1).length;

    // 玩家一颗带攻城加成的球砸下碉堡 → 触发占领回调 → 焚桥
    arriveBall(bk, 1, {siege:6, cls:null});

    T(label+': 碉堡已被玩家拿下', bk.owner===1);
    T(label+': bridgeBurned 已置位（一次性事件触发）', bridgeBurned===true);
    T(label+': BURNED 记入了断掉的边（'+BURNED.size+' 条）', BURNED.size>0);
    T(label+': 桥面全部标记为焦土', bridge.every(n=>n.burned===true));
    T(label+': 桥上敌方部队已被烧光（'+enemyBallsBefore+' → '+balls.filter(b=>!b.dead&&b.owner!==1).length+'）',
       balls.filter(b=>!b.dead && b.owner!==1).length===0);
    T(label+': 桥面非玩家守军已清空', bridge.every(n=>n.owner===1 || n.owner===0));

    // —— 焚桥后：敌军上不了桥，玩家畅通 ——
    const foeCan = bridge.filter(bc=>nodes.some(u=>!u.onBridge && findPath(u,bc,2))).length;
    T(label+': 焚桥后 敌方无法再上桥（可达 '+foeCan+'/'+bridge.length+'，期望 0）', foeCan===0);
    const meCan = bridge.filter(bc=>nodes.some(u=>!u.onBridge && findPath(u,bc,1))).length;
    T(label+': 焚桥后 玩家仍能上桥（可达 '+meCan+'/'+bridge.length+'）', meCan===bridge.length);

    // —— 断的是"退路"而不是"全局"：玩家必须还能走到每一个格 ——
    const base = nodes.find(n=>n.owner===1 && !n.onBridge) || nodes[0];
    const unreachable = nodes.filter(n=>n!==base && !findPath(base,n,1));
    T(label+': 玩家仍可到达全图（不可达 '+unreachable.length+' 格，期望 0）', unreachable.length===0);

    // —— AI 感知：距离矩阵里敌方看桥对面应当是 Infinity ——
    const foeSide = nodes.filter(n=>!n.onBridge);
    T(label+': 距离矩阵已按断裂重算（敌方视角桥面不可达）',
       bridge.every(bc=>foeSide.every(u=>!isFinite(pathDist(u,bc)))));

    // 敌方还剩多少可打的空间（断退路的战术收益，只记录不判失败）
    const foeReach = nodes.filter(n=>n!==base && findPath(base,n,2)).length;
    console.log('       敌方残余可达: '+foeReach+'/'+nodes.length+' 格');
    console.log('');
  }

  // —— 反向对照：没有 burnBridge 的关不该烧 ——
  console.log('=== 反向对照：教学关 / 哥布林 L2（无 burnBridge）不该焚桥 ===');
  stageLv('human', 1);
  const tutBk = nodes.find(n=>n.bunker);
  console.log('       人类 L1 skel 模板: '+(SHAPE?SHAPE.tpl:'-')+'  burnBridge='+(lvCtx&&lvCtx.mods?!!lvCtx.mods.burnBridge:'-'));
  if(tutBk && (SHAPE.tpl==='M3' || SHAPE.tpl==='M6')){
    T('教学关未开启 burnBridge', !lvCtx.mods.burnBridge);
    tutBk.owner=2; tutBk.pop=1; tutBk.defAcc=0; tutBk.shieldUntil=0;
    arriveBall(tutBk, 1, {siege:6, cls:null});
    T('教学关攻下碉堡后未触发焚桥', bridgeBurned===false && BURNED.size===0);
  } else {
    console.log('       （该关非桥形，跳过）');
  }

  console.log('');
  console.log('RESULT pass='+pass+' fail='+fail);
  process.exit(fail?1:0);
}catch(e){ console.log('DRIVER ERROR: '+(e && e.stack || e)); process.exit(1); }
})();
`;
eval(js + DRIVER);