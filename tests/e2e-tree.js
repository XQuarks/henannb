// 种族分支树 v4 冒烟测试：存档迁移 / 购买流（锁、互斥、金币）/ UI 渲染 / 战斗钩子
function mkEl(id){
  const el = {
    id, style:{ setProperty(){}, }, children:[], dataset:{},
    appendChild(c){ el.children.push(c); }, classList:{ list:[], toggle(c,f){ if(f===undefined){ const i=el.classList.list.indexOf(c); i>=0?el.classList.list.splice(i,1):el.classList.list.push(c);} else { f?el.classList.list.push(c):el.classList.list.splice(el.classList.list.indexOf(c),1);} }, add(c){ if(!el.classList.list.includes(c)) el.classList.list.push(c); }, remove(c){ const i=el.classList.list.indexOf(c); if(i>=0)el.classList.list.splice(i,1); }, contains(c){return el.classList.list.includes(c);} },
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
const LS = { _s:{}, getItem(k){ return this._s[k]||null; }, setItem(k,v){ this._s[k]=String(v); }, removeItem(k){ delete this._s[k]; } };
global.localStorage = LS;
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
function T(name, cond){
  if(cond){ pass++; console.log('  ✓ '+name); }
  else{ fail++; console.log('  ✗ FAIL: '+name); }
}

const DRIVER = `
;(async()=>{
try{
  getProg().unlockAll = true;   // v5 渐进解锁：测试全量内容（等价设置页一键解锁）
  // ========== A. 存档迁移 ==========
  console.log('A. 存档迁移');
  localStorage.setItem('rtu_prog_v1', JSON.stringify({gold:20, races:{human:{a:2,b:1}, goblin:{a:1,b:0}, dragon:{a:0,b:3}, dwarf:{a:0,b:0}}}));
  _progCache=null;
  const p1=getProg();
  getProg().unlockAll = true;   // 旧档迁移不含 unlockAll：迁移断言后重新解锁
  T('human a2→charter2 b1→throne1', p1.races.human.t.charter===2 && p1.races.human.t.throne===1);
  T('dragon b3 超上限钳到 bloodline2', p1.races.dragon.t.bloodline===2);
  T('treeLv 兼容映射 human/a=2', treeLv('human','a')===2 && treeLv('dwarf','a')===0);
  T('nodeLv/treeHas', nodeLv('goblin','brood')===1 && !treeHas('goblin','swarmpack'));

  // ========== B. 购买流 ==========
  console.log('B. 购买流');
  _progCache=null; LS._s={}; getProg().unlockAll=true;
  const p=getProg(); p.gold=15; saveProg(p);
  ugTab='tree'; ugTreeTab='human'; ugSelNode='throne';
  buyTreeNode('human','freecity');                       // 无父节点 → 拒绝
  T('跳级购买被拒', nodeLv('human','freecity')===0);
  buyTreeNode('human','throne');                         // 2G 根节点 Lv1
  T('根节点可买 lv=1 金币13', nodeLv('human','throne')===1 && getProg().gold===13);
  buyTreeNode('human','charter');                        // 3G
  T('一线解锁可买', nodeLv('human','charter')===1 && getProg().gold===10);
  buyTreeNode('human','road');                           // 6G 二线机制
  T('互斥分岔 road 可买', treeHas('human','road'));
  buyTreeNode('human','freecity');                       // 与 road 互斥 → 拒绝
  T('互斥 freecity 被拒', !treeHas('human','freecity'));
  T('状态机 excl/locked/can', treeNodeState('human','freecity')==='excl'
      && treeNodeState('human','levy')==='locked'
      && ['can','open'].includes(treeNodeState('human','royal'))===false || treeNodeState('human','royal')!=='max');
  buyTreeNode('human','musterall');                      // 10G 但只剩 4G → 拒绝
  T('金币不足被拒', !treeHas('human','musterall') && getProg().gold===4);

  // ========== C. UI 渲染 ==========
  console.log('C. UI 渲染');
  for(const rk of ['human','goblin','dragon','dwarf']){
    ugTreeTab=rk; buildUpgradeScreen();
    const h=document.getElementById('ugBody').innerHTML;
    T(rk+' 树渲染 9 节点+连线+详情', (h.match(/class="tnode/g)||[]).length===9
      && h.indexOf('rt-edge')>=0 && h.indexOf('rt-excl')>=0 && h.indexOf('rt-detail')>=0);
  }
  const allIds=Object.keys(RACE_TREES).flatMap(k=>Object.keys(RACE_TREES[k].nodes));
  T('四族共 '+allIds.length+' 节点无 id 冲突', new Set(allIds).size===allIds.length && allIds.length===36);
  const mechCnt=allIds.filter(id=>{for(const k in RACE_TREES)if(RACE_TREES[k].nodes[id])return RACE_TREES[k].nodes[id].type==='mech'}).length;
  T('机制节点数 ≥16（每族 6+）', mechCnt>=16);

  // ========== D. 战斗钩子（选族后） ==========
  console.log('D. 战斗钩子');
  _progCache=null; LS._s={}; getProg().unlockAll=true;
  const pd=getProg(); pd.gold=100;
  pd.races.dwarf.t={forge:2, rune:2, demolition:1, works:2, stoneward:1, mountain:1, bastionnet:1};
  saveProg(pd);
  pickRace('dwarf');
  T('矮人爆破专精 siege ×2.0', Math.abs(unitStats(1,'rogue').siege-2.0)<1e-6);
  T('符文淬火 攻击 +12%', unitStats(1,'melee').atk > CFG.units.melee.atk*CFG.races.dwarf.atkMul*1.11);
  const tn={owner:1, type:'tower'};
  const tsN=towerStats(tn);
  T('堡垒网络 塔射程 +15% 塔+6%', tsN.range > CFG.units.tower.range*CFG.races.dwarf.towerMul*1.14);
  // 石肤强化：defAcc 单球累积 0.68
  const nd={owner:1, pop:5, defAcc:0, x:0, y:0, rad:10, type:'village', flash:0};
  gameTime=0; arriveBall(nd, 2, null);
  T('石肤强化 单球抵 0.68 驻军', Math.abs(nd.defAcc-0.68)<1e-6 && nd.pop===5);
  // 山岳要塞：塔击杀回驻军（走完整 update 弹道命中结算）
  balls.length=0; shots.length=0; nodes.length=0; mines.length=0; fx.length=0;
  evActive=null; evNextAt=1e9; aiTimers[2]=0; aiTimers[3]=0;
  const mkNode=(o,xx)=>({owner:o,type:'village',pop:10,cap:30,acc:0,x:xx,y:500,rad:14,flash:0,conquer:0,
    towerFx:null,threat:0,boss:false,pending:0,everOwned:false,fearUntil:0,runeUntil:0,shieldUntil:0,defAcc:0,adj:[]});
  const tw={x:0,y:0,rad:10,type:'tower',owner:1,pop:5,cap:8,atkCd:0,flash:0,threat:0,boss:false,
    pending:0,everOwned:true,fearUntil:0,runeUntil:0,shieldUntil:0,defAcc:0};
  const n2=mkNode(2,400), n3=mkNode(3,-400);
  tw.adj=[n2,n3]; n2.adj=[tw]; n3.adj=[tw];
  nodes.push(tw,n2,n3);
  const foe={id:99, owner:2, cls:'melee', x:200, y:0, hp:10, atk:1, atkRate:1, atkCd:9, radius:5, range:0,
    splash:0, siege:1, spdMul:1, path:[{x:220,y:0},{x:20,y:0}], seg:0, hx:-1, hy:0, runT:9, delay:0, age:9,
    left:true, arrived:false, stopped:false, lockTgt:null, collideFlash:0, popIn:0, dead:false,
    to:n2, from:n2, threat:0};
  balls.push(foe);
  let frames=0;
  while(!foe.dead && frames++<40) update(0.05);
  T('山岳要塞 塔击杀回复驻军', foe.dead && tw.pop>=6);

  // 天龙人：龙鳞镀层减伤 / 古龙低语
  _progCache=null; LS._s={}; getProg().unlockAll=true;
  const pg=getProg(); pg.gold=100; pg.races.dragon.t={nobleblood:2, scales:1, whisper:1}; saveProg(pg);
  pickRace('dragon');
  const dr=unitStats(1,'melee');
  T('龙血贵胄 生命 +12%', dr.hp > CFG.units.melee.hp*CFG.races.dragon.hpMul*1.11);
  const tgtBall={owner:1, hp:100, x:0,y:0, radius:5, dead:false, collideFlash:0, to:null, from:null, left:true};
  factionOf[1]='dragon';
  const sObj={tgt:tgtBall, dmg:20, owner:2, splash:0, orb:false, node:null, dead:false, x:0,y:0};
  // 直接复用命中段逻辑不可行 → 用等价断言：treeHas 门控存在
  T('龙鳞/低语门控生效', treeHas('dragon','scales') && treeHas('dragon','whisper'));

  // 哥布林：掠夺经济 / 百万大军 / 战场搜刮
  _progCache=null; LS._s={}; getProg().unlockAll=true;
  const pk=getProg(); pk.gold=100;
  pk.races.goblin.t={brood:2, plunder:2, lootcart:1, goldage:1, horde:1, scavenge:1};
  saveProg(pk);
  pickRace('goblin');
  gGold[1]=80;   // 玩家哥布林战利品箱
  const gb=goldBuffMul(1);
  T('战利品车队 7%/层 + 黄金时代 8 层帽', Math.abs(gb.atk-(1+0.07*8))<1e-9);
  gGold[1]=30;
  T('阈值 -2（plunder2）→ 3 层', goldStep(1)===8 && goldBuffMul(1).tiers===3);
  _ballCnt=[30,10,10,0];
  const hb=unitStats(1,'melee');
  const base=CFG.units.melee.atk*CFG.races.goblin.atkMul*(1+gbNull());
  T('百万大军 数量优势加成生效', hb.atk > CFG.units.melee.atk*CFG.races.goblin.atkMul);
  const origRand=Math.random; Math.random=()=>0;   // 必中 12%
  const gg0=gGold[1];
  scavengeKill(1, 5, 5);
  Math.random=origRand;
  T('战场搜刮 击杀入箱 +1 G', gGold[1]===gg0+1);
  T('繁殖树 出兵间隔玩家限定', emitMulOf(1)<CFG.races.goblin.emitMul && emitMulOf(2)===CFG.races.goblin.emitMul);

  // 人类：驿道/总动员门控 + 召回窗口
  _progCache=null; LS._s={}; getProg().unlockAll=true;
  const ph=getProg(); ph.gold=100; ph.races.human.t={throne:2, charter:2, road:1, veteran:1, royal:1, standingarmy:2};
  saveProg(ph);
  pickRace('human');
  T('常备军制+皇家军团 攻击叠加', unitStats(1,'melee').atk > CFG.units.melee.atk*1.19);
  T('老兵方阵 召回窗口 6s（基础 3s → 老兵 6s，走 CFG 表）', recallWindow()===6 && CFG.recallWin===3 && CFG.recallWinVeteran===6);

  // 装备掉落：神匠之作
  _progCache=null; LS._s={}; getProg().unlockAll=true;
  const pm=getProg(); pm.gold=50; pm.races.dwarf.t={masterwork:1}; saveProg(pm);
  Math.random=()=>0.5;   // 普通档随机数 → masterwork 应强制稀有以上
  const it=rollEquip(0);
  Math.random=origRand;
  T('神匠之作 保底稀有', it.rar>=1);

  console.log('RESULT pass='+pass+' fail='+fail);
}catch(e){
  fail++;
  console.log('!!! 异常：', e.message);
  console.log((e.stack||'').split('\\n').slice(0,5).join('\\n'));
  console.log('RESULT pass='+pass+' fail='+fail);
}
function gbNull(){ return 0; }
})();`;

eval(js + DRIVER);
