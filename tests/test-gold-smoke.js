// DOM 桩冒烟：验证哥布林战利品经济（每势力独立记账 / 首占+3 / 掠夺上限 / 贪食狂热叠层 / unitStats 增益）
function mkEl(id){
  const el = {
    id, style:{ setProperty(){}, }, children:[], dataset:{},
    appendChild(c){ el.children.push(c); }, classList:{ list:[], toggle(c,f){ const i=el.classList.list.indexOf(c); if(f===undefined){ i>=0?el.classList.list.splice(i,1):el.classList.list.push(c);} else if(f){ if(i<0) el.classList.list.push(c); } else { if(i>=0) el.classList.list.splice(i,1); } }, add(c){ if(!el.classList.list.includes(c)) el.classList.list.push(c); }, remove(c){ const i=el.classList.list.indexOf(c); if(i>=0)el.classList.list.splice(i,1); }, contains(c){return el.classList.list.includes(c);} },
    textContent:'', innerHTML:'', title:'', value:'', width:300, height:150,
    addEventListener(){}, removeEventListener(){}, focus(){}, setAttribute(){}, getAttribute(){ return null; },
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
global.requestAnimationFrame = ()=>0;
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

// 断言在同一次 eval 内执行，才能访问游戏的 let/const 顶层作用域
const TESTS = `
;console.log('script evaluated OK');
let failed=0;
function T(name,cond){ if(cond){ console.log('PASS '+name); } else { failed++; console.log('FAIL '+name); } }

// —— 场景：玩家(1)=哥布林、AI(2)=哥布林、AI(3)=人类 —— 多哥布林阵营金币不共用
factionOf[1]='goblin'; factionOf[2]='goblin'; factionOf[3]='human';
gGold={1:0,2:0,3:0}; lootCount={1:0,2:0,3:0};

T('goldStep 玩家默认 10', goldStep(1)===10);
T('goldStep AI 固定 10', goldStep(2)===10);

const mk=()=>({ owner:0, pop:0, cap:30, x:0,y:0, rad:10, type:'village' });

// 首占无主地块 +3
const n1=mk(); arriveBall(n1, 1, null);
T('首占无主 +3（玩家）', gGold[1]===3);
T('everOwned 标记', n1.everOwned===true);

// AI 哥布林独立记账
const n2=mk(); arriveBall(n2, 2, null);
T('AI 哥布林独立首占 +3，不与玩家共用', gGold[2]===3 && gGold[1]===3);

// 非哥布林不进账
const n3=mk(); arriveBall(n3, 3, null);
T('人类阵营无战利品', gGold[3]===0);

// 倒手不再触发首占奖励
n3.owner=0; n3.everOwned=true; n3.pop=0;
arriveBall(n3, 1, null);
T('已易主地块倒手无首占奖励', gGold[1]===3);

// 掠夺：占领敌方据点 +1（限 3 次），玩家同步入账局外金币
const pBefore=getProg().gold;
const e1=mk(); e1.owner=3; e1.pop=0;
arriveBall(e1, 1, null);
T('占敌据点掠夺 +1', gGold[1]===4 && (getProg().gold - pBefore)===1);
for(let i=0;i<5;i++){ const e=mk(); e.owner=3; e.pop=0; arriveBall(e,1,null); }
T('掠夺上限 3 次（4+2=6，第 4 次起不再进账）', gGold[1]===6 && lootCount[1]===3);

// 贪食狂热：跨过 10 金阈值触发 buff 层
gGold[1]=10;
T('10 金 → 1 层 +5%', goldBuffMul(1).atk===1.05 && goldBuffMul(1).tiers===1);
gGold[1]=20; T('20 金 → 2 层 +10%', goldBuffMul(1).tiers===2 && Math.abs(goldBuffMul(1).atk-1.10)<1e-9);

// AI 阈值固定 10；人类恒 1
gGold[2]=13; T('AI 13 金 → 1 层', goldBuffMul(2).tiers===1);
T('人类阵营恒 1 倍', goldBuffMul(3).atk===1 && goldBuffMul(3).spd===1);

// unitStats 实际生效（同族同养成下只随金币变化：atk/spd 均放大）
factionOf[1]='goblin'; gGold[1]=0;
const baseAtk=unitStats(1,'melee').atk, baseSpd=unitStats(1,'melee').spd;
gGold[1]=20;
const gAtk=unitStats(1,'melee').atk, gSpd=unitStats(1,'melee').spd;
T('unitStats：哥布林 20 金 atk ×1.10', Math.abs(gAtk-baseAtk*1.10)<1e-6);
T('unitStats：哥布林 20 金 spd ×1.10', Math.abs(gSpd-baseSpd*1.10)<1e-6);
factionOf[1]='human'; gGold[1]=20;
const hAtk=unitStats(1,'melee').atk, hSpd=unitStats(1,'melee').spd;
T('非哥布林同金币无增益', hAtk===unitStats(1,'melee').atk && goldBuffMul(1).atk===1);

// 掠夺树 v4：玩家阈值 10→8（plunder 满级 2 级）
factionOf[1]='goblin';
getProg().races.goblin.t.plunder=2;
T('掠夺树满级 → 阈值 8', goldStep(1)===8);
gGold[1]=16; T('16 金 @阈值8 → 2 层', goldBuffMul(1).tiers===2);
getProg().races.goblin.t.plunder=0;

// HUD 徽章逻辑（updateHUD 不抛错且徽章按种族显隐）
running=false; updateHUD();
T('updateHUD 正常返回', true);

// —— 战利品箱悬浮框 ——
running=true; factionOf[1]='goblin'; factionOf[2]='goblin'; factionOf[3]='human';
gGold={1:23,2:5,3:0};
renderLootBox();
const lb=document.getElementById('lootBox');
T('悬浮框显示（有哥布林阵营时）', lb.classList.list.includes('on'));
T('玩家 23 金：大数字 + 正面 SVG 金币（己方1枚+敌方1枚，无钱袋 emoji）',
  lb.innerHTML.indexOf('<span class="gnum">23</span>')>=0
  && (lb.innerHTML.match(/<svg/g)||[]).length===2
  && lb.innerHTML.indexOf('💰')<0);
gGold[1]=25; renderLootBox();
T('金币入账 → 主金币弹入动画 + 数字刷新',
  (lb.innerHTML.match(/ccoin pop/g)||[]).length===1 && lb.innerHTML.indexOf('<span class="gnum">25</span>')>=0);
gGold[1]=30; renderLootBox();
T('加成为独立绿框药丸（▲全军攻/移 +15%）',
  lb.innerHTML.indexOf('gbuff')>=0 && lb.innerHTML.indexOf('全军攻/移 +15%')>=0);
gGold[2]=12; renderLootBox();   // 敌方跨过 10 金阈值 → 有加成药丸
T('敌方哥布林金币数与加成药丸可见',
  lb.innerHTML.indexOf('<span class="fnum">12</span>')>=0 && lb.innerHTML.indexOf('fpill')>=0);
factionOf[1]='human'; factionOf[2]='dragon'; factionOf[3]='dwarf'; gGold={1:0,2:0,3:0};
renderLootBox();
T('无哥布林对局不显示悬浮框', !lb.classList.list.includes('on'));

// —— 两段式开局：出征先布图 → 对话浮于地图 → 开战不重铺地图 ——
pendingCampLevel=1; campRace='goblin'; lastMode='camp';
stageBattle();
T('stageBattle 只布图不开打', running===false && nodes.length>0 && stagedReady===true);
showDialogue(()=>{}, true);
const ds=document.getElementById('dialogueScene');
T('对话以半透明遮罩浮于战斗地图上（on-map）', ds.classList.list.includes('on-map') && ds.style.display==='flex');
dlgFinish();
start();
T('选技后 start 复用已布图并开战', running===true && stagedReady===false);
running=false;

// —— 剧情开场直接进入台词（移除章节卡静默阶段：两位 NPC 不再站着都不说话）——
pendingCampLevel=4; campRace='goblin';    // 章节首关（第二章 at:4）
showDialogue(()=>{}, true);
const db=document.getElementById('dlgBox');
T('章节首关也直接进入第 1 句台词（无静默空档）', db.style.display==='' && document.getElementById('dlgText').dataset.full.length>0 && document.getElementById('dlgChapter').style.display==='none');
dlgFinish();
pendingCampLevel=2;                        // 非章节关
showDialogue(()=>{}, true);
T('非章节关同样直接进入台词', db.style.display==='' && document.getElementById('dlgText').dataset.full.length>0);
dlgFinish();

// —— 关卡名入场演出 ——
playLevelIntro(3,'测试关卡','统 一 之 路 · 测试战役',()=>{});
const li=document.getElementById('lvIntro');
T('演出淡入类与文案就位', li.classList.list.includes('on')&&li.classList.list.includes('in')&&document.getElementById('lvInT').textContent.indexOf('测试关卡')>=0);

// —— 技能页二次确认流（选关→选技能→出击） ——
raceMode='camp'; campRace='goblin'; pendingCampLevel=2; lastMode='camp';
showSkillSelect('goblin');
const skGrid=document.getElementById('skGrid'), goBtn=document.getElementById('skGo');
T('技能页渲染卡片且出击初始为灰', skGrid.children.length===5 && goBtn.disabled===true);
pickSkill('rush');
T('点选后出击亮起并显示技能名', goBtn.disabled===false && goBtn.textContent.indexOf('急行军')>=0);
let pickedCnt=0; for(const c of skGrid.children) if(c.classList.list.includes('picked')) pickedCnt++;
T('仅一张卡带选中框', pickedCnt===1);
deployFromSkillSelect();
T('出击：布图+演出就位但未立即开战', running===false && stagedReady===true && document.getElementById('lvIntro').classList.list.includes('on'));
launchBattle();
T('演出对话链走完进入实战（同一张地图）', running===true);
running=false;
// 未选技能时 deploy 直拦
skPicked=null;
const wasRunning=running;
deployFromSkillSelect();
T('未选技能时出击直拦不生效', running===wasRunning);

// —— 终局占领演出：攻下最后一城 → 镜头推近 + 慢动作放完特效 → 缓缓弹出结算 ——
pendingCampLevel=1; campRace='goblin'; lastMode='camp'; raceMode='camp';
stageBattle(); launchBattle();
T('开局正常进行（无终局演出）', running===true && finale===null && Math.abs(cam.zoom-camHome.zoom)<0.01);   // 批次A：开局相机=全景归位点（大地图 home zoom≠1）
for(const n of nodes){ if(n.owner!==1){ n.owner=1; n.pop=1; n.conquer=0.85; _lastCapNode=n; } }
update(0.016);   // 胜利判定应触发终局演出，而不是立即弹结算
T('攻下最后敌建 → 进入终局演出且不立即结算', finale!==null && running===true
  && document.getElementById('banner').style.display!=='flex');
camStep(1.0);
T('镜头缓缓推向刚占领的建筑', cam.zoom>1.2);
const scFull=finaleScale(); finale.t=0.7; const scSlow=finaleScale();
T('表现速度缓入慢动作（全速 → 0.22×）', scFull>0.9 && Math.abs(scSlow-0.22)<0.02);
tickFinale(99);  // 快进：让演出播完
// ㉒ 胜利尾声对白幕：终局演完后、结算横幅之前先播 2~4 句尾声对白，播完才弹横幅
T('终局演完 → 先播胜利尾声对白幕（横幅尚未弹出）', running===false && _outroDone===true
  && document.getElementById('banner').style.display!=='flex');
dlgFinish();   // 尾声对白播完 → 回调回 endGame → 正常弹横幅
T('尾声播完 → 结算以 slow 模式缓缓出现', running===false && bannerSlow===false
  && document.getElementById('banner').style.display==='flex'
  && document.getElementById('banner').classList.list.includes('slow'));
running=false; finale=null;

// —— 速胜按钮路径：点击「胜利在望」也必须走终局演出，不得直接弹结算 ——
stageBattle(); launchBattle();
for(const n of nodes){ if(n.owner!==1){ n.owner=1; n.pop=1; _lastCapNode=n; } }
{ const _p=getProg(); _p.camp.goblin=1; saveProg(_p); }   // 强制回退进度 → 本胜仍判定为首通（保底稀有掉落）
tlSamples.push({t:5,p:0.4,r:0.3,y:0.3},{t:10,p:0.55,r:0.25,y:0.2});   // 时间轴至少 2 个采样点
update(0.016);                       // 先触发终局演出（模拟攻下最后一城的瞬间）
T('演出进行中速胜按钮不响应', running===true);
finale=null; bannerSlow=false;
fastWinSettle();                     // 点击「胜利在望」的处理函数
T('点击「胜利在望」→ 进入终局演出而非立即结算', finale!==null && running===true
  && document.getElementById('banner').style.display!=='flex');
tickFinale(99);
T('速胜路径同样先播尾声幕（横幅尚未弹出）', _outroDone===true
  && document.getElementById('banner').style.display!=='flex');
dlgFinish();
T('速胜路径演出播完 → 缓缓弹出胜利结算', running===false
  && document.getElementById('banner').classList.list.includes('slow')
  && document.getElementById('bannerTitle').className==='win');
running=false; finale=null;

// —— 分层结算布局：①徽章 ②奖励 ③装备卡 ④剧情 ⑤统计 ⑥折叠战报 ⑦进度 ——
const bMode=document.getElementById('bannerMode'), bRw=document.getElementById('bannerReward'),
      bStory=document.getElementById('bannerStory'), bSub=document.getElementById('bannerSub'),
      bStats=document.getElementById('bannerStats'), bRp=document.getElementById('bannerReport'),
      bRpBody=document.getElementById('rpBody'), bNext=document.getElementById('bannerNext');
T('① 模式徽章显示战役上下文', bMode.style.display==='inline-block' && bMode.textContent.indexOf('统一之路')>=0);
T('② 奖励区：+15 G 大数字 + 明细（基础 5 · 首通 +10）', bRw.style.display==='block'
  && bRw.innerHTML.indexOf('+15<i>G</i>')>=0 && bRw.innerHTML.indexOf('基础 5')>=0
  && bRw.innerHTML.indexOf('首通 +10')>=0);
T('③ 掉落装备独立成卡（首通保底稀有以上）', bRw.innerHTML.indexOf('eq-card')>=0
  && bRw.innerHTML.indexOf('· 掉落')>=0
  && (bRw.innerHTML.indexOf('稀有')>=0 || bRw.innerHTML.indexOf('史诗')>=0));
T('④ 剧情收尾句独立成行', bStory.style.display==='block' && bStory.textContent.length>0);
T('⑤⑥ 长句正文隐藏；统计一行无图表；战报默认折叠但已注入', bSub.style.display==='none'
  && bStats.innerHTML.indexOf('TIME')>=0 && bStats.innerHTML.indexOf('<svg')<0
  && !bRp.classList.list.includes('open') && bRpBody.innerHTML.indexOf('<svg')>=0);
document.getElementById('rpToggle').onclick();
T('⑥ 点开「详细战报」→ 展开并显示时间轴图表', bRp.classList.list.includes('open')
  && bRpBody.innerHTML.indexOf('tlChart')>=0);
T('⑦ 进度提示：已解锁 第 2 关', bNext.style.display==='block' && bNext.textContent.indexOf('已解锁 第 2 关')>=0);

// —— 败北结算布局：无奖励/剧情，正文显示失利信息 ——
stageBattle(); launchBattle();
for(const n of nodes) if(n.owner===1){ n.owner=2; }
update(0.016);
T('败北结算：奖励/剧情隐藏，标题与正文提示失利', running===false
  && document.getElementById('banner').style.display==='flex'
  && bRw.style.display==='none' && bStory.style.display==='none'
  && bSub.style.display==='block'
  && document.getElementById('bannerTitle').textContent==='你输了'
  && bSub.textContent.indexOf('吞并')>=0);

// —— 军械库独立成页 / 军政厅三分页 / 首页入口 ——
T('军械库已从军政厅拆出（gear 页签移除，armoryScreen 存在）',
  html.indexOf('id="tabGear"')<0 && html.indexOf('id="armoryScreen"')>=0);
showArmoryScreen();
T('军械库独立页可打开（军政厅保持隐藏）', document.getElementById('armoryScreen').style.display==='flex'
  && document.getElementById('upgradeScreen').style.display==='none');
{ // 清空背包 → 空状态；再放入一件 → 卡片渲染
  const _p=getProg(); _p.equips=[]; _p.load=[null,null,null,null,null,null]; saveProg(_p);
}
buildArmoryScreen();
T('军械库渲染 6 格穿戴位 + 库存空提示', document.getElementById('amBody').innerHTML.indexOf('bp-slots')>=0
  && document.getElementById('amBody').innerHTML.indexOf('暂无库存')>=0);
T('空背包时汇总条显示占位提示', document.getElementById('amBody').innerHTML.indexOf('暂无加成')>=0);
{ // 穿戴一件史诗仓储 → 槽位显示具体属性；汇总条显示实际加成
  const _p=getProg(); _p.equips=[]; _p.load=[{stat:'cap',rar:2,val:18},null,null,null,null,null]; saveProg(_p);
}
buildArmoryScreen();
T('穿戴位显示具体提升属性（村庄容量 +18%）', document.getElementById('amBody').innerHTML.indexOf('bp-slot filled')>=0
  && document.getElementById('amBody').innerHTML.indexOf('bp-fx')>=0
  && document.getElementById('amBody').innerHTML.indexOf('仓储宝箱')>=0);
T('汇总条显示实际总收益（▣ 村庄容量 +18%）', document.getElementById('amBody').innerHTML.indexOf('村庄容量 +18%')>=0
  && document.getElementById('amBody').innerHTML.indexOf('am-chip')>=0
  && document.getElementById('amBody').innerHTML.indexOf('暂无加成')<0);
{ const _p=getProg(); _p.equips=[]; _p.load=[null,null,null,null,null,null];
  _p.equips.push({stat:'cap',rar:2,val:18},{stat:'speed',rar:1,val:12}); saveProg(_p); }
buildArmoryScreen();
T('库存卡片化：品质标签 + 属性 + 穿上/分解按钮 + 按稀有度排序',
  document.getElementById('amBody').innerHTML.indexOf('bp-card eq-rar2')>=0
  && document.getElementById('amBody').innerHTML.indexOf('bp-card eq-rar1')>=0
  && document.getElementById('amBody').innerHTML.indexOf('eq-tag t2')>=0
  && document.getElementById('amBody').innerHTML.indexOf('>穿上</button>')>=0
  && document.getElementById('amBody').innerHTML.indexOf('全军移速 +12%')>=0
  && document.getElementById('amBody').innerHTML.indexOf('bp-card eq-rar2') < document.getElementById('amBody').innerHTML.indexOf('bp-card eq-rar1'));
showUpgradeScreen();
T('军政厅仍可独立打开（强化页）', document.getElementById('upgradeScreen').style.display==='flex'
  && document.getElementById('armoryScreen').style.display==='none');
// 首页：金币角标 / 军械库解锁态描述行 / 成就进度（v5：每日挑战已移除，改为军械库门控提示）
refreshMenuMeta();
T('首页元信息刷新：军械库提示与成就进度就位', document.getElementById('amHint').textContent.length>0
  && document.getElementById('achCnt').textContent.indexOf('/')>=0);

// —— 战斗开场徽章（种族特色演出；时长×2 且不可点击跳过） ——
playBattleLogo('goblin', ()=>{});
const blo=document.getElementById('battleLogo');
T('哥布林徽章：盖章入场+战吼+金币下落', blo.classList.list.includes('on')
  && document.getElementById('blEmblem').innerHTML.indexOf('<svg')>=0
  && document.getElementById('blCry').textContent.indexOf('开抢')>=0
  && blo.classList.list.includes('fall'));
let logoDone=false;
playBattleLogo('dragon', ()=>{ logoDone=true; });
T('天龙徽章切换：火星上升', !blo.classList.list.includes('fall')
  && document.getElementById('blCry').textContent.indexOf('龙威')>=0);
T('徽章无任何点击跳过途径（skipBattleLogo 已移除）', typeof skipBattleLogo==='undefined');
setTimeout(()=>{
  T('演出自然播完才触发回调并收场（时长×2）', logoDone===true && !blo.classList.list.includes('on'));
  console.log(failed===0 ? 'ALL PASS' : (failed+' FAILURES'));
  if(failed!==0) process.exitCode=1;
}, 4100);
`;

try{
  eval(js + TESTS);
}catch(e){ console.log('EVAL ERROR:', e.message, e.stack && e.stack.split('\n')[1]); process.exit(1); }
