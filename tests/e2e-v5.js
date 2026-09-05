// ===================== E2E v5：多指/半军 · 绝地反击 · 渐进解锁 · 固定教学图 · 可操控引导 · 重械营放置 =====================
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
function T(name, cond){
  if(cond){ pass++; console.log('  ok '+name); }
  else{ fail++; console.log('  FAIL: '+name); }
}
function stageLv(race, lv){
  pickRace(race);
  pendingCampLevel=lv; campStage=lv; campRace=race; lastMode='camp';
  stageBattle();
}
// 快进当前导演简报：逐行 dlgAdvance 直到对话关闭、dirBusy 解除；再等 launchBattle 内 tryGuide 轮询挂引导
async function fastFwdDirector(){
  let g=0;
  while(dirBusy && g++<80){ dlgAdvance(); dlgAdvance(); await new Promise(r=>setTimeout(r,0)); }
  let g2=0; while(!guide && g2++<60){ await new Promise(r=>setTimeout(r,40)); }
}

// ========== A. 渐进解锁：种族分段开锁 ==========
console.log('A. 种族渐进解锁');
localStorage.removeItem('rtu_prog_v1'); _progCache=null;
const pa=getProg();
T('初始：仅人类解锁', raceUnlocked('human')===true && raceUnlocked('goblin')===false && raceUnlocked('dragon')===false && raceUnlocked('dwarf')===false);
saveCampaign('human',4);
T('人类通关第3关后 哥布林解锁', raceUnlocked('goblin')===true && raceUnlocked('dragon')===false);
saveCampaign('human',7);
T('人类通关第6关后 天龙人解锁', raceUnlocked('dragon')===true && raceUnlocked('dwarf')===false);
saveCampaign('human',10);
T('人类通关第9关后 矮人解锁', raceUnlocked('dwarf')===true);
// 一键解锁兜底（低进度也全开）
_progCache=null; localStorage.removeItem('rtu_prog_v1');
getProg().unlockAll=true;
T('unlockAll=true 全族可用（人类进度仍为1）', getCampaign('human')===1 && raceUnlocked('goblin') && raceUnlocked('dragon') && raceUnlocked('dwarf'));
getProg().unlockAll=false;

// ========== B. 系统门控：法师营/重械营/军械库 ==========
console.log('B. 系统门控');
_progCache=null; localStorage.removeItem('rtu_prog_v1'); _progCache=null;
lastMode='camp'; pendingCampLevel=null; campStage=null;
T('进度1：战役模式 法师营锁定', featOK('mage')===false);
T('进度1：战役模式 重械营锁定', featOK('siege')===false);
T('进度1：军械库锁定', featOK('armory')===false);
saveCampaign('human',6);
T('进度6：法师营开放 / 重械营仍锁', featOK('mage')===true && featOK('siege')===false);
saveCampaign('human',7);
T('进度7：重械营开放', featOK('siege')===true);
saveCampaign('human',9);
T('进度9：军械库开放', featOK('armory')===true);
lastMode='pvp';
saveCampaign('human',1);
T('自由对战不受门控限制', featOK('mage')===true && featOK('siege')===true && featOK('armory')===true);

// ========== C. 兵营过滤与重械营放置修复 ==========
console.log('C. 兵营门控过滤 + siege 放置修复');
_progCache=null; localStorage.removeItem('rtu_prog_v1'); _progCache=null;
lastMode='camp';
stageLv('human', 1);
T('人类L1 图上无法师营（未到里程碑）', nodes.some(n=>n.type==='mage')===false);
saveCampaign('human',6);
stageLv('human', 6);
T('人类L6 图上有法师营（介绍关）', nodes.some(n=>n.type==='mage')===true);
saveCampaign('human',7);
stageLv('human', 7);
T('人类L7 图上有重械营（此前从未放置的 bug 已修）', nodes.some(n=>n.type==='siege')===true);
lastMode='pvp'; pendingCampLevel=null;
buildMap(pickTemplate(), null);
T('自由对战图不受门控（默认含法师营）', nodes.some(n=>n.type==='mage')===true || SKEL.camps7.mods.camps==null);

// ========== D. 固定教学地图（seed 确定性） ==========
console.log('D. 固定教学地图');
buildMap('M3', { seed:20260826 });
const snap1=nodes.map(n=>Math.round(n.x)+'_'+Math.round(n.y)).join('|');
buildMap('M3', { seed:20260826 });
const snap2=nodes.map(n=>Math.round(n.x)+'_'+Math.round(n.y)).join('|');
buildMap('M3', null);
const snapR=nodes.map(n=>Math.round(n.x)+'_'+Math.round(n.y)).join('|');
T('同 seed 两次布图布局完全一致', snap1===snap2);
T('无 seed 时布局不同（随机性保留）', snap1!==snapR);
// v7：tutBridge 不再靠 seed 固定布局（种子只能复现「那张随机图」，保证不了它合不合理），
// 改成手写网格 M6 + fixedMap，见 e2e-fixed-bridge.js。
T('tutBridge 骨架走手写固定地图（M6 + fixedMap）', SKEL.tutBridge.tpl==='M6' && SKEL.tutBridge.mods.fixedMap==='dusk');
// 第七批：teach 也从「seed 固定随机图」升级为手写固定图（四族各一张 h1/g1/b1/d1），
// 所以 seed 断言只保留其余三个独占骨架（人类 L3 抢收 / L5 雾中 / L6 两线）。
T('人类独占骨架带固定 seed（L3/L5/L6）', SKEL.harvest.mods.seed!=null && SKEL.fog.mods.seed!=null && SKEL.pincer.mods.seed!=null);
T('teach 骨架改为手写固定图（M6，四族不共用一张图）', SKEL.teach.tpl==='M6' && SKEL.teach.mods.seed==null);
T('人类L7 引导骨架 tutSiege 带 seed 且独立于共用 siege', SKEL.tutSiege && SKEL.tutSiege.mods.seed!=null && SKEL.siege.mods.seed==null);
T('人类L1 带开场导演简报（先进导演讲领地，再挂拖拽引导）', !!campLv('human',1).dir && !!GUIDES.l1);

// ========== E. 半出兵（长按半军 + ½ 钮常开模式） ==========
console.log('E. 半出兵');
stageLv('human', 2);
running=true; paused=false;   // v5.1 召回/拖拽路径需要对局态
const base=nodes.find(n=>n.owner===1);
const target=nodes.find(n=>n.owner===0 && n.type==='village');
base.pop=11; base.pending=0;
send(base, target, undefined, true);
const halfSent=Math.round((11-0)/2);   // JS Math.round(5.5)=6：约一半向上取整
T('半军派出 round(avail/2)=6 颗承诺', base.pending===halfSent && base.pending===6);
base.pending=0; balls.length=0;
send(base, target);
T('全出派出 avail-1 颗（留守1）', base.pending===10);
base.pending=0; balls.length=0;
base.pop=2;
send(base, target, undefined, true);
T('avail=2 时半军=1 且留守≥1', base.pending===1);
base.pending=0; balls.length=0;
base.pop=1;
send(base, target, undefined, true);
T('avail=1 时不允许任何出兵', base.pending===0);
balls.length=0;
// —— v5.1 半军模式开关：½ 钮点亮后普通拖拽也只出一半 ——
halfMode=false;
base.pop=11; base.pending=0;
dragSend({ from:base, half:false }, target);
T('½ 钮熄灭：普通拖拽全军出击', base.pending===10);
base.pending=0; balls.length=0;
halfMode=true;
dragSend({ from:base, half:false }, target);
T('½ 钮点亮：普通拖拽也只出 round(avail/2)=6', base.pending===6);
halfMode=false; base.pending=0; balls.length=0;

// ========== E2. 召回窗口放宽（v5.1）：默认 3s 进 CFG 表，窗口内点村必成 ==========
console.log('E2. 召回窗口');
stageLv('human', 2);
running=true; paused=false;
const rb=nodes.find(n=>n.owner===1);
const rt=nodes.find(n=>n.owner===0 && n.type==='village');
T('召回窗口进 CFG 表（默认 3s / 老兵方阵 6s）', CFG.recallWin===3 && CFG.recallWinVeteran===6 && recallWindow()===3);
rb.pop=8; rb.pending=0;
send(rb, rt);
T('出兵后 lastSquad 就位（7 颗承诺）', !!rb.lastSquad && rb.lastSquad.balls.length===7);
gameTime = rb.lastSquad.t + CFG.recallWin - 0.3;
T('窗口内点村 → 召回成功且承诺清零', tryRecall(rb)===true && rb.pending===0);
balls.length=0; rb.pending=0; rb.lastSquad=null;
send(rb, rt);
gameTime = rb.lastSquad.t + CFG.recallWin + 0.2;
T('超窗后点村 → 返回 false（由 endDrag 弹「窗口已过」反馈）', tryRecall(rb)===false);
balls.length=0;

// ========== F. 绝地反击 ==========
console.log('F. 绝地反击');
stageLv('human', 8);
lastStand={used:false, until:0, peak:1};
aiFrozen=true;   // 冻结 AI：本节专注验证绝地反击数值，避免 AI 随机占领干扰
gameTime=30;
{ // 模拟玩家曾拥有2城、当前剩1城，但时间未到60s（按节点引用操作，避免索引随 filter 顺序漂移）
  const mine0=nodes.find(n=>n.owner===1);
  const other=nodes.find(n=>n.owner!==0 && n!==mine0);
  if(other){ other.owner=1; }
  update(0.05);
  T('60s 前不触发绝地反击', lastStand.used===false);
  if(other){ other.owner=other===mine0 ? 1 : 2; }   // 还原：若误取到玩家本城则保持不动
}
gameTime=70;
{
  const mine=nodes.filter(n=>n.owner===1);
  mine.forEach((n,i)=>{ if(i>0) n.owner=2; });           // 只留一城
  lastStand.peak=2;
  update(0.05);
  T('60s 后只剩1城且曾拥有≥2城 → 触发一次', lastStand.used===true && Math.abs(lastStand.until-(70+20))<0.1);
  const bn=nodes.find(n=>n.owner===1);
  bn.cap=40; bn.acc=0; bn.pop=0;
  evActive=null;
  update(1.0);
  T('反击期产能 ×2（40容量·1s·5%基础=4兵）', bn.pop>=3);
  lastStand.until=gameTime-1;                             // 反击结束
  bn.pop=0; bn.acc=0;
  update(1.0);
  T('20 秒窗口过后产能恢复', bn.pop<=2);
  const u0=lastStand.until;                               // 触发后 used 永久为 true
  update(0.05);
  T('同一局不会二次触发（until 不被刷新）', lastStand.used===true && lastStand.until===u0);
}
aiFrozen=false;

// ========== G. 可操控引导状态机 ==========
console.log('G. 可操控引导');
_progCache=null; localStorage.removeItem('rtu_prog_v1'); getProg();
stageLv('human', 2);
// L2 现在带开场导演简报——本段是引导状态机单测，直接 drive update()，若不清理导演队列会被 dirTick 触发并置 paused=true 卡住 guideEvent。隔离之。
dirQ=[]; dirBusy=false; paused=false;
gameTime=0;
guideBegin('l2');
T('引导启动：aiFrozen 冻结 AI', guide!==null && guide.key==='l2' && aiFrozen===true);
T('军师台词完整存于 dataset.full（打字机演出不影响读取）', (document.getElementById('tutTxt').dataset.full||'').indexOf('半军')>=0);
T('动作步不显示 ▼ 提示（须真做动作）', document.getElementById('tutMore').style.visibility==='hidden');
guideEvent('send',{half:false});
T('普通拖拽不推进半军课', guide.i===0);
guideEvent('send',{half:true});
T('半军拖拽 → 进入召回课', guide.i===1);
guideEvent('recall');
T('召回成功 → 进入收尾提示', guide.i===2);
T('信息步显示 ▼（说完自动继续/点击跳过）', document.getElementById('tutMore').style.visibility==='visible');
gameTime += 4.1;        // gameTime 由主循环推进；直调 update 时手动走钟
update(4.1);
T('无等待步骤 4s 自动收尾并落存档', guide===null && aiFrozen===false && getProg().tut.l2===1);
guideBegin('l2');
T('已完成课不再重复出现', guide===null);
// 技能课事件
guideBegin('l3');
gameTime += 4.1; update(0.05);   // 第一步为自动介绍步：走钟 4s 进入实操步
T('技能课介绍步自动进入实操步', guide.i===1);
doCast('rush', null);
T('技能施放推进技能课', guide.i===2);
guide=null; aiFrozen=false; cineMarks=[]; tutHide();
// 麦仓占领课事件匹配类型（批次C：人类 L5 已换为「湖畔粮道」，引导课指麦仓）
guideBegin('l5');
arriveBall(nodes.find(n=>n.type==='village'&&n.owner===0)||nodes[nodes.length-1], 1, {cls:'melee'});
guideEvent('capture',{node:{type:'village'}});
T('占领普通村庄不推进', guide.i===0);
guideEvent('capture',{node:{type:'barn'}});
T('占领麦仓 → 推进粮道课', guide.i===1);
guide=null; aiFrozen=false; cineMarks=[]; tutHide();

// ========== H. 引导触发接线（launchBattle 条件） ==========
console.log('H. 触发接线');
_progCache=null; localStorage.removeItem('rtu_prog_v1'); getProg();
pendingCampLevel=2; campStage=2; campRace='human'; factionOf[1]='human'; lastMode='camp';
stageBattle(); stagedReady=false; launchBattle();
// L2 现在带开场导演简报：先暂停播剧情，dirBusy 解除后才挂引导（导演先讲、再进引导）
T('人类L2 开战先进入导演模式（dirBusy 暂停剧情简报）', dirBusy===true);
await fastFwdDirector();
T('导演讲完 → 自动启动 l2 课', guide!==null && guide.key==='l2');
guideFinish();
T('guideFinish 清理状态', guide===null && aiFrozen===false);
factionOf[1]='goblin'; campRace='goblin';
stageBattle(); stagedReady=false; launchBattle();
T('非人类阵营不触发人类课', guide===null);

// ========== I. 人类L1 拖拽引导 + 敌方红辉光 ==========
console.log('I. L1 拖拽引导 + 敌方红辉光');
_progCache=null; localStorage.removeItem('rtu_prog_v1'); getProg();
factionOf[1]='human'; campRace='human';
pendingCampLevel=1; campStage=1; lastMode='camp';
dirQ=[]; dirBusy=false; paused=false;
stageBattle(); stagedReady=false; launchBattle();
T('人类L1 开战先进入导演模式（介绍玩家领地）', dirBusy===true);
await fastFwdDirector();
T('导演讲完 → 自动启动 l1 拖拽课', guide!==null && guide.key==='l1');
guideEvent('send',{half:false});
T('纯拖拽派兵 → 推进 l1 课', guide.i===1);
guideFinish();
// 敌方红辉光：L1 两只哥布林台词 → 对话框标记 enemy
dlgGuests = lvCommanders(campLv('human',1),1);
T('L1 敌军指挥官为两只哥布林', dlgGuests.length===2 && dlgGuests[0].race==='goblin' && dlgGuests[1].race==='goblin');
dlgLines=[[2,'火把都点了——冲进村去！一件不留！']];
dlgBuildCast(dlgLines); dlgIdx=-1; dlgNextLine();
T('哥布林台词 → 对话框标记 enemy 红辉光', document.getElementById('dlgBox').classList.contains('enemy'));
dlgLines=[[0,'他们以为人类是好拿捏的软柿子。']];
dlgIdx=-1; dlgNextLine();
T('人类台词 → 对话框无 enemy 类', !document.getElementById('dlgBox').classList.contains('enemy'));

console.log('RESULT pass='+pass+' fail='+fail);
process.exit(fail>0?1:0);   // 演出类 setTimeout 会挂住事件循环：测试完直接退出
}catch(e){
  fail++;
  console.log('!!! 异常：', e.message);
  console.log((e.stack||'').split('\\n').slice(0,6).join('\\n'));
  console.log('RESULT pass='+pass+' fail='+fail);
  process.exit(1);
}
})();
`;
eval(js + DRIVER);
