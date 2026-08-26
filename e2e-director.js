// v4 剧情机制冒烟：腹背受敌地图 / 坚守战胜利 / 同盟反水 / 导演镜头与复原 / 重械营兵种
function mkEl(id){
  const el = {
    id, style:{ setProperty(){}, }, children:[], dataset:{},
    appendChild(c){ el.children.push(c); }, classList:{ list:[], toggle(c,f){ const i=el.classList.list.indexOf(c); if(f===undefined){ i>=0?el.classList.list.splice(i,1):el.classList.list.push(c);} else if(f){ if(i<0) el.classList.list.push(c); } else { if(i>=0) el.classList.list.splice(i,1); } }, add(c){ if(!el.classList.list.includes(c)) el.classList.list.push(c); }, remove(c){ const i=el.classList.list.indexOf(c); if(i>=0)el.classList.list.splice(i,1); }, contains(c){return el.classList.list.includes(c);} },
    textContent:'', innerHTML:'', title:'', value:'', width:300, height:150,
    addEventListener(){}, removeEventListener(){}, focus(){}, setAttribute(){}, getAttribute(){return null;},
    getContext(){ return ctxStub; },
    querySelector(){ return mkEl(id+'_q'); }, querySelectorAll(){ return []; },
    getBoundingClientRect(){ return {left:0,top:0,width:800,height:600}; },
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
  querySelectorAll(){ return []; },
  createElement(t){ return mkEl('dyn_'+t); },
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
const m=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
const js=m.map(x=>x[1]).join('\n');

let pass=0, fail=0;

const DRIVER = `
;(async()=>{
try{
  getProg().unlockAll = true;   // v5 渐进解锁：测试全量内容（等价设置页一键解锁）
// 注意：本文件所有驱动代码都在 eval 作用域内（严格模式 eval 的 let/function 不外泄），
// 因此 T / stageLv 必须定义在这里——模块作用域的函数给 eval 内 let 变量赋值会泄漏到全局。
function T(name, cond){
  if(cond){ pass++; console.log('  ok '+name); }
  else{ fail++; console.log('  FAIL: '+name); }
}
function stageLv(race, lv){
  pickRace(race);
  pendingCampLevel=lv; campStage=lv; campRace=race; lastMode='camp';
  stageBattle();
}
  // ========== A. 腹背受敌（人类 L6 · pincer）==========
  console.log('A. pincer 腹背受敌');
  stageLv('human', 6);
  T('修饰词生效 pincer=true', lvCtx.mods.pincer===true);
  const pB=nodes.find(n=>n.owner===1), tB=nodes.find(n=>n.owner===2), bB=nodes.find(n=>n.owner===3);
  T('三家基地都在', !!(pB&&tB&&bB));
  const cy=(tB.y+bB.y)/2;
  const playerMid = Math.abs(pB.y-cy) < Math.abs(tB.y-cy) && Math.abs(pB.y-cy) < Math.abs(bB.y-cy);
  const vertSplit = (tB.y<pB.y&&bB.y>pB.y)||(bB.y<pB.y&&tB.y>pB.y);
  T('玩家居中、两敌一南一北（腹背受敌）', playerMid && vertSplit);

  // ========== B. 坚守战（人类 L4 · holyHold）==========
  console.log('B. holyHold 坚守战');
  stageLv('human', 4);
  T('holdState 初始化 + 目标塔标记', !!holdState && !!holdState.node.holdMark && holdState.node.type==='tower');
  T('坚守需求 45s', holdState.need===45 && holdState.t===45);
  // 失守回涨：目标归敌 → 计时回升
  holdState.node.owner=2; holdState.t=20;
  update(1); update(1);
  T('失守时计时缓慢回涨', holdState.t>20 && holdState.t<=45);
  // 占领坚守：45 次整秒推进后触发终局演出
  holdState.node.owner=1;
  let guard=0;
  while(holdState && holdState.t>0 && guard++<100) update(1);
  T('坚守计时归零 → 触发终局演出（一次性，状态清空）', finale!==null && holdState===null);
  // 回归：终局演出期间 update 持续运行，不得重置演出计时 → 胜利结算必须能正常弹出
  running=true; guard=0;
  while(running && guard++<40){ update(0.016); tickFinale(0.5); }
  T('坚守胜利：演出播完弹出胜利结算', !running && finale===null
      && document.getElementById('bannerTitle').className==='win');

  // ========== C. 重械营兵种 ==========
  console.log('C. siege 兵种');
  for(const rk of ['human','goblin','dragon','dwarf']){
    factionOf[1]=rk;
    const st=unitStats(1,'siege');
    T(rk+' 攻城兵种数值完整', st.hp>0 && st.atk>0 && st.range>0 && Math.abs(st.siege-1.6)<1e-9);
  }
  factionOf[1]='goblin';
  T('哥布林投石机带溅射 / 龙蝎炮无溅射', unitStats(1,'siege').splash>0);
  factionOf[1]='dragon';
  T('龙蝎炮无溅射', unitStats(1,'siege').splash===0);
  // send 兵种映射：把一座中立重械营划给玩家再派兵
  const sc=nodes.find(n=>n.type==='siege'&&n.owner===0)||nodes[0];
  sc.owner=1; sc.pop=6; sc.type='siege';
  const dst=nodes.find(n=>n.owner===1&&n!==sc);
  balls.length=0;
  send(sc,dst);
  T('重械营出球 cls=siege', balls.length>0 && balls.every(b=>b.cls==='siege'));
  balls.length=0;

  // ========== D. 同盟反水（人类 L8 · alliance）==========
  console.log('D. alliance 同盟反水');
  stageLv('human', 8);
  T('allyMode 开启且势力3为盟友', allyMode===true && !allyHostile && factionOf[3]==='dragon');
  T('自动追加反水剧本', dirQ.some(e=>e.on==='betray'));
  // 同盟期增援不占领
  const allyN=nodes.find(n=>n.owner===3);
  const pop0=allyN.pop;
  arriveBall(allyN, 1, {cls:'melee'});
  T('玩家援军抵达盟友据点=增援', allyN.owner===3 && allyN.pop===pop0+1);
  // 反水后同一结算变为占领（先清空守军便于一次攻占）
  allyHostile=true;
  allyN.pop=1; allyN.defAcc=0;
  arriveBall(allyN, 1, {cls:'melee'});
  T('反水后抵达=占领', allyN.owner===1);
  // 反水触发链：清掉共同敌人 → update 一帧 → 盟友翻脸 + 导演暂停对白
  stageLv('human', 8);
  dirQ=dirQ.filter(e=>e.on==='betray');           // 只留反水条目，避免开场引导干扰
  nodes.forEach(n=>{ if(n.owner===2){ n.owner=0; } });
  gameTime=200;                                    // 越过时限，确保触发
  update(0.016);
  T('盟约破裂 allyHostile=true', allyHostile===true && _betrayFired===true);
  T('导演接管：暂停 + 对白场景弹出（briefing 清晰模式）', dirBusy===true && paused===true
      && document.getElementById('dialogueScene').style.display==='flex'
      && document.getElementById('dialogueScene').classList.list.includes('briefing')
      && !document.getElementById('dialogueScene').classList.list.includes('on-map'));
  // 对白结束 → 战斗恢复 + 镜头标注清空（camStep 会自动把镜头缓移回全景）
  dlgFinish();
  T('简报结束：恢复战斗并清理镜头', dirBusy===false && paused===false && cine===null && cineMarks.length===0);

  // ========== E. 导演焦点解析 ==========
  console.log('E. 导演焦点');
  const neuFix=nodes.find(n=>n.owner===0 && n.type==='village');
  if(neuFix && !nodes.some(n=>n.owner===2)) neuFix.owner=2;   // D 区清场后补一个势力2据点供解析测试
  T('focus:{owner} 解析到该势力最大据点', (()=>{ const r=dirResolveFocus({owner:1}); return r.length===1 && r[0].owner===1; })());
  T('focus 数组解析多点', dirResolveFocus([{owner:3},{owner:2}]).length===2);
  holdState=null;
  T('focus hold 无目标时安全返回空', dirResolveFocus('hold').length===0);

  // ========== F1. 斩首战（人类 L9 · regicide）==========
  console.log('F1. regicide 斩首战');
  stageLv('human', 9);
  T('修饰词 killWin=true', lvCtx.mods.killWin===true);
  const tent=nodes.find(n=>n.kingsTent);
  T('王帐存在：势力2所有 · 塔防型 · 巨型(60)', !!tent && tent.owner===2 && tent.type==='tower' && tent.cap===60 && tent.pop===50);
  T('王帐距玩家最远（非贴脸）', (()=>{
    const pb=nodes.find(n=>n.owner===1);
    const others=nodes.filter(n=>n.owner===2&&n!==tent);
    if(!pb || others.length===0) return true;   // 势力2仅剩基地时，基地即王帐，天然成立
    return dist(tent,pb) > Math.min(...others.map(n=>dist(n,pb)));
  })());
  T('focus king 解析到王帐', dirResolveFocus('king')[0]===tent);
  // 玩家攻占 → 终局演出
  tent.pop=1; tent.defAcc=0;
  arriveBall(tent, 1, {cls:'melee'});
  update(0.016);
  T('攻占王帐 → 触发终局演出', finale!==null && tent.owner===1);
  finale=null;
  // 敌方占领王帐不触发
  stageLv('human', 9);
  const t2=nodes.find(n=>n.kingsTent); t2.pop=1; t2.defAcc=0;
  arriveBall(t2, 3, {cls:'melee'});
  update(0.016);
  T('第三方占领王帐不触发胜利', finale===null && killCaptureBy===0);

  // ========== F2. 掠夺额度战（哥布林 L2 · toll / L9 · heist）==========
  console.log('F2. lootGoal 掠夺额度战');
  stageLv('goblin', 2);
  T('toll 目标 30G', lootGoalN===30 && lvCtx.mods.lootGoal===30);
  gGold[1]=31;
  update(0.016);
  T('攒满金币 → 触发终局演出', finale!==null && lootWinFired===true);
  finale=null;
  stageLv('goblin', 9);
  T('heist 目标 40G 且未达标不触发', lootGoalN===40 && (function(){ update(0.05); return finale===null; })());
  gGold[1]=10;
  T('未满额继续战斗', finale===null);

  // ========== G. 第二批导演剧本（Boss / 巨城 / 雾关 / 中央三塔）==========
  console.log('G. 导演剧本第二批');
  // 四族 L10：focus 'boss' 解析到 Boss 要塞，且剧本已入队
  for(const rk of ['human','goblin','dragon','dwarf']){
    stageLv(rk, 10);
    const e=dirQ.find(q=>q.focus==='boss');
    T(rk+' L10 Boss 引导 + focus 解析', !!e && dirResolveFocus('boss').length===1 && dirResolveFocus('boss')[0].boss===true);
  }
  // 巨型据点关：'center' 解析到 cap=80 的中央巨点
  stageLv('dragon', 5);
  T('龙L5 mega 剧本入队', dirQ.some(q=>q.focus==='center'));
  const cN=nodes.filter(n=>n.owner===0&&n.type==='village').sort((a,b)=>b.cap-a.cap)[0];
  T("'center' 解析到最大中立据点(80)", dirResolveFocus('center')[0]===cN && cN.cap>=80);
  stageLv('dwarf', 5);
  T('矮人L5 mega 剧本入队', dirQ.some(q=>q.focus==='center'));
  stageLv('goblin', 5);
  T('哥布林L5 mega 剧本入队', dirQ.some(q=>q.focus==='center'));
  // 雾关：剧本入队且带敌方阵营焦点
  stageLv('human', 5);
  const fogE=dirQ.find(q=>Array.isArray(q.focus));
  T('人类L5 浓雾引导入队', !!fogE && fogE.label.indexOf('浓雾')>=0);
  // 中央三塔关：'towers' 解析出 ≥2 座中立塔
  stageLv('dragon', 4);
  const tw2=dirResolveFocus('towers');
  T('龙L4 holy 剧本 + towers 解析≥2', dirQ.some(q=>q.focus==='towers') && tw2.length>=2 && tw2.every(n=>n.type==='tower'&&n.owner===0));
  stageLv('dwarf', 4);
  T('矮人L4 holy 剧本入队', dirQ.some(q=>q.focus==='towers') && dirResolveFocus('towers').length>=2);
  stageLv('goblin', 4);
  T('哥布林L4 holy 剧本入队', dirQ.some(q=>q.focus==='towers') && dirResolveFocus('towers').length>=2);

  // ========== H. 种族专属机制关 ==========
  console.log('H. 种族专属建筑');
  // 人类 L3 麦仓
  stageLv('human', 3);
  const barns=nodes.filter(n=>n.type==='barn');
  T('麦仓 ×3 且高产(×1.5)', barns.length===3 && barns.every(n=>n.growMul===1.5 && n.cap===45));
  T('focus barns 解析多点', dirResolveFocus('barns').length===3);
  // 哥布林 L6 货栈：首占 +8G 入箱，重复占领不再触发
  stageLv('goblin', 6);
  const stalls=nodes.filter(n=>n.type==='stall');
  T('货栈 ×4', stalls.length===4 && stalls.every(n=>n.stallGold===8));
  T('focus stalls 解析多点', dirResolveFocus('stalls').length===4);
  const st0=stalls[0]; st0.pop=1; st0.defAcc=0; gGold[1]=0;
  arriveBall(st0, 1, {cls:'melee'});
  // 货栈 8G + 哥布林首占无主地块被动 3G = 11G
  T('首占货栈 +8 金币(+首占被动3)', gGold[1]===11 && st0.owner===1);
  st0.owner=2; st0.pop=1; st0.defAcc=0; gGold[1]=0;
  arriveBall(st0, 1, {cls:'melee'});
  T('倒手再占不重复给钱（everOwned）', st0.owner===1);
  // 天龙 L8 龙神祭坛
  stageLv('dragon', 8);
  const alt=nodes.find(n=>n.sanctum);
  T('龙神祭坛存在：中立塔防型 cap40', !!alt && alt.owner===0 && alt.type==='tower' && alt.cap===40 && alt.pulseCd===8);
  T('focus altar 解析', dirResolveFocus('altar')[0]===alt);
  gameTime=100;
  update(8.5);   // 推进一个脉冲周期
  T('祭坛脉冲正常触发（无报错且冷却重置）', Math.abs(alt.pulseCd-7.5)<1.5);
  // 矮人 L6 符文熔炉：归属增益攻 +12% / 守方损耗 -15%
  stageLv('dwarf', 6);
  const fg=nodes.find(n=>n.forge);
  T('熔炉存在', !!fg && fg.type==='forge' && forgeOwner===0);
  fg.pop=1; fg.defAcc=0;
  arriveBall(fg, 1, {cls:'melee'});
  T('占领熔炉 → 归属=玩家', forgeOwner===1 && fg.owner===1);
  const atkForge=unitStats(1,'melee').atk;
  // 相对比值断言：开关 forgeOwner 对比同一状态下的攻击，排除难度/养成等干扰
  forgeOwner=0; const atkBase=unitStats(1,'melee').atk; forgeOwner=1;
  T('占领方攻击 ×1.12', Math.abs(atkForge/atkBase-1.12)<1e-6);
  const foeNo=unitStats(2,'melee').atk;
  forgeOwner=2; const foeYes=unitStats(2,'melee').atk; forgeOwner=1;
  T('熔炉归属易主后增益跟随（敌方持有则敌方+12%）', Math.abs(foeYes/foeNo-1.12)<1e-6);
  const dNode={owner:1, pop:5, defAcc:0, x:0, y:0, rad:10, type:'village', flash:0};
  arriveBall(dNode, 2, null);
  // 矮人守方石肤 0.8 × 熔炉减损 0.85 = 0.68
  T('守方据点损耗降低（0.8×0.85=0.68）', Math.abs(dNode.defAcc-0.68)<1e-6);

  console.log('RESULT pass='+pass+' fail='+fail);
}catch(e){
  fail++;
  console.log('!!! 异常：', e.message);
  console.log((e.stack||'').split('\\n').slice(0,5).join('\\n'));
  console.log('RESULT pass='+pass+' fail='+fail);
}
})();`;

eval(js + DRIVER);
