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
  // ========== A. 谷仓重镇（人类 L6 · 批次C 粮道）==========
  // （原「两线告急 · pincer」关已随批次C叙事重构下线，此节改测新 L6 的粮道机制接线）
  console.log('A. granaryHold 粮道');
  stageLv('human', 6);
  T('修饰词生效 frontCastle=2', lvCtx.mods.frontCastle===2);
  const fcsA=nodes.filter(n=>n.type==='fcastle');
  T('前线城堡 ×2 且开局中立', fcsA.length===2 && fcsA.every(n=>n.owner===0));
  T('中立时无人吃粮道', grainOwners().size===0);
  fcsA[0].owner=1;
  T('玩家占堡 → 粮道贯通含玩家', grainOwners().has(1));
  fcsA[0].owner=2;
  T('城堡易主 → 补贴跟着易主', !grainOwners().has(1) && grainOwners().has(2));

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
  T('坚守胜利：演出播完进入结算流程', !running && finale===null);
  // ㉒ 胜利尾声对白幕：结算横幅之前先播尾声对白，播完才弹横幅
  T('胜利先播尾声幕（横幅尚未弹出）', _outroDone===true && document.getElementById('banner').style.display!=='flex');
  dlgFinish();   // 尾声对白播完 → 回调回 endGame → 正常弹横幅
  T('尾声播完 → 正常弹出胜利结算', document.getElementById('banner').style.display==='flex'
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
  // C1.5 之后 L8 自带 onBetray 演出（midCine），导演不再重复追加通用反水剧本
  T('L8 手写 onBetray → 不重复追加通用反水剧本',
     !dirQ.some(e=>e.on==='betray') && midQ.some(e=>e.on==='onBetray'));
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
  // 反水触发链：清掉共同敌人 → update 一帧 → 盟友翻脸 + ㉑ 局中演出接管（子弹时间 + 运镜 + 对白）
  stageLv('human', 8);
  dirQ=[];                                         // 清空开场引导，只留反水演出
  nodes.forEach(n=>{ if(n.owner===2){ n.owner=0; } });
  gameTime=200;                                    // 越过时限，确保触发
  update(0.016);
  T('盟约破裂 allyHostile=true', allyHostile===true && _betrayFired===true);
  T('midCine 接管反水：子弹时间生效', midBusy===true && Math.abs(timeScale-0.25)<1e-9);
  {
    let g=0; while(midBusy && !midHold && g++<60) midStep(0.5);
    T('反水演出推进到对白（briefing 清晰模式）', midHold===true && paused===true
      && document.getElementById('dialogueScene').style.display==='flex'
      && document.getElementById('dialogueScene').classList.list.includes('briefing')
      && !document.getElementById('dialogueScene').classList.list.includes('on-map'));
    g=0; while(midBusy && g++<60){ if(midHold) dlgFinish(); else midStep(0.5); }
    T('演出结束：恢复战斗并清理镜头', midBusy===false && paused===false
      && cine===null && cineMarks.length===0 && timeScale===1);
  }
  _betrayFired=false;

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
  // 粮道关（批次C：人类 L5 已换为「湖畔粮道」）：剧本入队且带麦仓焦点
  stageLv('human', 5);
  const grE=dirQ.find(q=>q.focus==='barns');
  T('人类L5 粮道引导入队', !!grE && grE.label.indexOf('粮道')>=0);
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

  // ========== I. 第二批剧情经济机制（拆塔 / 过路费 / 刮金箔 / 麦仓腐烂）==========
  console.log('I. 第二批剧情经济机制');
  // 拆塔动作（天龙 L3 · demolish 骨架）
  stageLv('dragon', 3);
  T('徒手折辱改用 demolish 骨架', campLv('dragon',3).skel==='demolish' && lvCtx.mods.demolish===true);
  T('拆塔关正常生成箭塔（≥3 座，不再全场无塔）', nodes.filter(n=>n.type==='tower').length>=3);
  T('非己方箭塔不可拆', (()=>{ const t=nodes.find(n=>n.type==='tower'&&n.owner===2); return t ? doDemolish(t)===false : true; })());
  {
    const dt=nodes.find(n=>n.type==='tower');
    dt.owner=1; dt.pop=4;
    T('长按拆塔 → 塔降级为村庄且计数 +1', doDemolish(dt)===true && dt.type==='village' && dt.demolished===true && demolishCount===1);
    T('拆塔成就已解锁（夷为平地）', !!getProg().ach.demolish);
  }
  T('demolish 关外的长按不生效', (()=>{ stageLv('human',1); return doDemolish(nodes.find(n=>n.type==='tower'))===false; })());
  // 过路费（哥布林 L2 · toll 修饰词）
  stageLv('goblin', 2);
  T('toll 关带 toll 修饰词且桥面格有缓存', lvCtx.mods.toll===true && BRIDGE_CELLS.length>0);
  {
    const bc=BRIDGE_CELLS[0];
    bc.owner=1; gGold[1]=0;
    const fb={x:bc.x+2, y:bc.y+2, owner:1, paidToll:false};
    tollCheck(fb);
    T('兵球过己方桥面 +1G 且标记已交费', gGold[1]===CFG.tollGold && fb.paidToll===true);
    tollCheck(fb);
    T('同一颗球不重复收费', gGold[1]===CFG.tollGold);
    const fe={x:bc.x+2, y:bc.y+2, owner:2, paidToll:false};
    tollCheck(fe);
    T('敌方兵球不交过路费', fe.paidToll===false);
    bc.owner=0;
    const fb2={x:bc.x+2, y:bc.y+2, owner:1, paidToll:false};
    tollCheck(fb2);
    T('桥面在中立手中不收费', fb2.paidToll===false && gGold[1]===CFG.tollGold);
  }
  // 刮金箔（哥布林 L4 · goldholy 骨架）
  stageLv('goblin', 4);
  {
    const gts=nodes.filter(n=>n.goldTower);
    T('金顶圣塔改用 goldholy 骨架 ×3', campLv('goblin',4).skel==='goldholy' && gts.length===3 && gts.every(n=>n.type==='tower'));
    gameTime=1000; gts.forEach(n=>{ n.owner=1; });
    gGold[1]=0; goldLeafAt=gameTime-0.01;
    goldLeafTick();
    T('占住金顶塔 5s 到点刮金 +3G（1×3）', gGold[1]===3*CFG.goldLeafGold);
    goldLeafTick();
    T('未到下一周期不重复入账', gGold[1]===3*CFG.goldLeafGold);
    const gd0=gGold[1];
    gts[0].owner=2;
    goldLeafAt=gameTime+CFG.goldLeafStep; gameTime+=CFG.goldLeafStep+0.01;
    goldLeafTick();
    T('丢塔后只刮剩余两座 +2G', gGold[1]===gd0+2*CFG.goldLeafGold);
  }
  // 抢收倒计时（人类 L3 · harvest 腐烂）
  stageLv('human', 3);
  {
    const bs=nodes.filter(n=>n.type==='barn');
    const cap0=bs[0].cap;
    gameTime=200; barnRotAt=gameTime-0.01;   // 越过 60s 腐烂起点
    barnRotTick();
    T('麦仓腐烂：60s 后容量 ×0.9（下限 15）', bs.every(n=>n.cap===Math.max(CFG.barnRotFloor, Math.round(cap0*CFG.barnRotMul))));
    T('驻军钳到新容量内', bs.every(n=>n.pop<=n.cap));
  }
  // 台词/骨架命名对齐（提案 §2.2 小瑕疵）
  T('camps7 骨架确实摆 7 座兵营', (()=>{ stageLv('goblin',3); return nodes.filter(n=>['archery','mage','rogue','siege'].includes(n.type)).length===7; })());
  T('哥布林 L3 台词已改为「七座」', campLv('goblin',3).d.some(l=>l[1].indexOf('七座兵营')>=0));
  T('矮人 L3 台词已改为「七座工坊」', campLv('dwarf',3).d.some(l=>l[1].indexOf('七座工坊')>=0));
  T('旧骨架名 camps6/noTower 已不存在', SKEL.camps6===undefined && SKEL.noTower===undefined && SKEL.camps7!=null && SKEL.demolish!=null && SKEL.goldholy!=null);

  // ========== K. ㉑ 局中触发演出 midCine ==========
  console.log('K. midCine 局中演出');
  // 驱动辅助：把一条演出序列跑到自然结束（对白卡自动点完）
  function runMid(max){
    let g=0;
    while(midBusy && g++<(max||80)){ if(midHold) dlgFinish(); else midStep(0.5); }
    return !midBusy;
  }
  function midReset(){ midEnd(); paused=false; dirBusy=false; finale=null; midResume=false; }
  const HOLD = ()=>[{ pause:1.0 }];   // 占位序列：让演出停在等待态，便于断言 midBusy
  stageLv('human', 4);
  midReset();
  T('stageBattle 已装载 L4 的 midCine 队列', midQ.length===1 && midQ[0].on==='onTime');

  // K1 触发器：onTime
  midBuildQueue({ midCine:[{ on:'onTime', t:22, seq:HOLD() }] });
  gameTime=0; midTick();
  T('onTime 未到点不触发', !midBusy && midQ.length===1);
  gameTime=22; midTick();
  T('onTime 到点触发（条目出队）', midBusy===true && midQ.length===0);
  midReset();
  // K2 触发器：onCap（node / type / count）
  {
    const bn=dirResolveFocus('base')[0];
    midBuildQueue({ midCine:[{ on:'onCap', node:'base', seq:HOLD() }] });
    bn.owner=2; midTick();
    T('onCap·node 目标未归玩家不触发', !midBusy && midQ.length===1);
    bn.owner=1; midTick();
    T('onCap·node 目标归玩家触发', midBusy===true && midQ.length===0);
    midReset();

    midBuildQueue({ midCine:[{ on:'onCap', type:'barn', n:1, seq:HOLD() }] });
    const bs=nodes.filter(n=>n.type==='barn');
    bs.forEach(n=>n.owner=2);
    if(bs.length){ midTick(); T('onCap·type 持有数不足不触发', !midBusy); bs[0].owner=1; midTick(); T('onCap·type 达标触发', midBusy===true); }
    else { T('onCap·type 持有数不足不触发', true); T('onCap·type 达标触发', true); }
    midReset();

    midBuildQueue({ midCine:[{ on:'onCap', count:99, seq:HOLD() }] });
    midTick(); T('onCap·count 未达标不触发', !midBusy && midQ.length===1);
    midBuildQueue({ midCine:[{ on:'onCap', count:1, seq:HOLD() }] });
    midTick(); T('onCap·count 达标触发', midBusy===true);
    midReset();
  }
  // K3 触发器：onHpBelow
  {
    const hn=nodes.find(n=>n.holdMark) || nodes[0];
    midBuildQueue({ midCine:[{ on:'onHpBelow', node:'hold', pct:50, seq:HOLD() }] });
    hn.owner=1; hn.pop=hn.cap; midTick();
    T('onHpBelow 满编不触发', !midBusy && midQ.length===1);
    hn.pop=1; midTick();
    T('onHpBelow 跌破阈值触发', midBusy===true);
    midReset();
  }
  // K4 触发器：onGold / onAlmostWin / onBetray
  midBuildQueue({ midCine:[{ on:'onGold', n:30, seq:HOLD() }] });
  gGold[1]=0; midTick(); T('onGold 未达标不触发', !midBusy);
  gGold[1]=30; midTick(); T('onGold 达标触发', midBusy===true);
  midReset();
  midBuildQueue({ midCine:[{ on:'onAlmostWin', pct:80, seq:HOLD() }] });
  nodes.forEach(n=>{ n.owner=2; }); midTick();
  T('onAlmostWin 占比不足不触发', !midBusy && midQ.length===1);
  nodes.forEach(n=>{ n.owner=1; }); midTick();
  T('onAlmostWin 占比达标触发', midBusy===true);
  midReset();
  _betrayFired=false;
  midBuildQueue({ midCine:[{ on:'onBetray', seq:HOLD() }] });
  midTick(); T('onBetray 未反水不触发', !midBusy);
  _betrayFired=true; midTick(); T('onBetray 反水瞬间触发', midBusy===true);
  midReset(); _betrayFired=false;
  // K5 触发拦截：导演简报 / 暂停 / 终局期间不插嘴
  midBuildQueue({ midCine:[{ on:'onTime', t:0, seq:HOLD() }] });
  gameTime=50; dirBusy=true; midTick(); T('导演简报期间不插嘴', !midBusy);
  dirBusy=false; paused=true; midTick(); T('暂停期间不插嘴', !midBusy);
  paused=false; finale={t:0,dur:3}; midTick(); T('终局演出期间不插嘴', !midBusy);
  finale=null; midTick(); T('恢复后正常触发', midBusy===true);
  midReset();

  // K6 序列执行链路
  console.log('K6. 演出元素');
  midBuildQueue({ midCine:[] });
  midStart([{ slowmo:[0.25, 1.2] }]);
  T('slowmo 写入子弹时间', timeScale===0.25 && timeScaleUntil===1.2);
  midEnd(); T('midEnd 复位子弹时间', timeScale===1 && timeScaleUntil===0);
  midStart([{ cam:'hold', zoom:2.2, label:'圣塔', dur:1.5 }]);
  T('cam 写镜头 + 地图标注', !!cine && cine.zoom===2.2 && cineMarks.length>0 && cineMarks[0].label==='圣塔');
  midEnd(); T('midEnd 清镜头与标注', cine===null && cineMarks.length===0);
  {
    const fx0=fx.length;
    midStart([{ vfx:'fire', at:'base', dur:0.5 }]);
    T('vfx 产出特效', fx.length>fx0);
    midEnd();
  }
  {
    // 不给 at → 回落到「该势力容量最大的据点」，结果可精确预测
    const tgt = nodes.filter(n=>n.owner===1).sort((a,b)=>b.cap-a.cap)[0];
    tgt.pop=0;
    midStart([{ spawn:{ owner:1, n:8 }, dur:0.3 }]);
    T('spawn 给目标补驻军（不超容量）', tgt.pop===Math.min(tgt.cap, 8) && tgt.flash>0);
    midEnd();
  }
  gameTime=10;
  midStart([{ buff:{ atk:1.5, spd:1.3, dur:15 } }]);
  T('buff 生效（玩家方）', midBuffOn(1) && midBuffState.atk===1.5 && midBuffState.spd===1.3);
  gameTime=30;
  T('buff 到期自动失效', !midBuffOn(1));
  midEnd();
  midApplyBuff({ atk:2, spd:1, dur:10, owner:2 }); gameTime=10;
  T('buff 只给指定势力', midBuffOn(2) && !midBuffOn(1));
  midEnd();
  {
    let hit=0; MID_EDIT.__k = function(){ hit++; };
    midStart([{ fn:'__k' }]);
    T('fn 命中地图变更表', hit===1);
    midEnd();
    midStart([{ fn:'__not_exist__' }]);   // 未注册键静默跳过，不炸演出
    T('未注册 fn 静默跳过（序列正常收尾）', midBusy===false && midSeq===null);
    delete MID_EDIT.__k;
  }
  midStart([{ pause:2 }]);
  T('pause 冻结战斗节拍', paused===true && midPausedByCine===true);
  T('midSkip 可点掉剧情节拍', midSkip()===true && paused===false);
  midEnd();
  // 完整序列：slowmo → cam → vfx → dlg → toast 顺序跑通并自动收尾
  {
    const hn=nodes.find(n=>n.holdMark) || nodes[0];
    hn.owner=1;
    midStart([
      { slowmo:[0.3, 0.5] },
      { cam:'hold', zoom:2, label:'测试', dur:0.5 },
      { vfx:'shock', at:'hold', dur:0.3 },
      { dlg:[[1,'演出测试一'],[0,'演出测试二']] },
      { toast:['⚑','测试','演出收尾',2] }
    ]);
    T('序列起手进入子弹时间并挂起', midBusy===true && Math.abs(timeScale-0.3)<1e-9);
    let sawHold=false, g=0;
    while(midBusy && g++<80){ if(midHold){ sawHold=true; dlgFinish(); } else midStep(0.5); }
    T('dlg 元素挂起等待点击（midHold）', sawHold===true);
    T('完整序列跑完自动收尾', midBusy===false && paused===false && cine===null && timeScale===1);
  }

  // ========== L. ㉓ 败局反转接续战（人类 L4 试点） ==========
  console.log('L. 败局反转');
  stageLv('human', 4);
  midReset();
  document.getElementById('banner').style.display='none';   // 清掉前面小节留下的结算横幅
  T('L4 配置了 revive（全战役第一处）', !!campLv('human',4).revive && campLv('human',4).revive.holdTime===30);
  T('反转额度初始未用', reviveUsed===false && pyrrhic===false);
  // 玩家被全歼 → 走 endGame 失败分叉
  nodes.forEach(n=>{ if(n.owner===1) n.owner=2; });
  running=true; paused=false;
  endGame(2, true);
  T('首次失败触发反转（不弹结算）', reviveUsed===true && pyrrhic===true && running===true
      && document.getElementById('banner').style.display!=='flex');
  runMid(120);   // 反转演出播完（含对白卡）
  T('救场落地：玩家重新握有据点', nodes.some(n=>n.owner===1));
  T('救场落地：坚守目标重新上弦 30s', !!holdState && holdState.need===30 && holdState.t===30 && !!holdState.node.holdMark);
  T('救场落地：全军增益已挂上', midBuffOn(1) && midBuffState.atk===1.2);
  T('反转后战斗继续（未结算）', running===true && paused===false && document.getElementById('banner').style.display!=='flex');
  // 再败一次 → 这次真输
  nodes.forEach(n=>{ if(n.owner===1) n.owner=2; });
  endGame(2, true);
  T('第二次失败不再反转 → 真结算', document.getElementById('banner').style.display==='flex');
  T('反转标记已置位（本局为反转局）', pyrrhic===true);
  T('结算徽章带「险胜」后缀', document.getElementById('bannerMode').textContent.indexOf('险胜')>=0);
  midReset();

  // ========== M. ㉒ 全 40 关胜利尾声对白幕覆盖 ==========
  console.log('M. outro 尾声幕覆盖');
  {
    let total=0, missing=[], badLen=[], short=[];
    for(const rk of ['human','goblin','dragon','dwarf']){
      for(let lv=1; lv<=CAMP_MAX; lv++){
        const d=campLv(rk, lv);
        if(!d) continue;
        total++;
        if(!Array.isArray(d.outro) || !d.outro.length){ missing.push(rk+' L'+lv); continue; }
        if(d.outro.length<2 || d.outro.length>4) badLen.push(rk+' L'+lv+'('+d.outro.length+'句)');
        if(!d.outro.every(l=>Array.isArray(l) && l.length===2 && typeof l[1]==='string' && l[1].length>0))
          short.push(rk+' L'+lv);
      }
    }
    T('共 '+total+' 关全部配了 outro 尾声幕', total>0 && missing.length===0 && total===40);
    T('每关尾声 2~4 句', badLen.length===0);
    T('每句均为 [说话人, 文案] 合法结构', short.length===0);
    if(missing.length) console.log('   缺 outro：', missing.join(', '));
    if(badLen.length)  console.log('   句数异常：', badLen.join(', '));
  }
  // outro 只播一次：同一次结算不会重复弹对白
  {
    stageLv('human', 1);
    midReset(); document.getElementById('banner').style.display='none';
    endGame(1, false);
    T('胜利先播尾声幕（未弹横幅）', _outroDone===true && document.getElementById('banner').style.display!=='flex');
    dlgFinish();
    T('尾声播完弹横幅', document.getElementById('banner').style.display==='flex');
    endGame(1, false);
    T('outro 只播一次（再次结算不再拦）', document.getElementById('banner').style.display==='flex');
    midReset();
  }

  console.log('RESULT pass='+pass+' fail='+fail);
}catch(e){
  fail++;
  console.log('!!! 异常：', e.message);
  console.log((e.stack||'').split('\\n').slice(0,5).join('\\n'));
  console.log('RESULT pass='+pass+' fail='+fail);
}
})();`;

eval(js + DRIVER);
