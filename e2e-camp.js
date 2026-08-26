// 冒烟：阵营敌对判定 hostileOf / 同盟箭塔不打玩家 / 同族 AI 统一阵营互不打+增援 / 同族颜色区分
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
function mkBall(owner,x,y,to){
  return { id:++ballSeq, owner, cls:'melee', x, y, from:to||nodes[0], to:to||nodes[0],
    path:[{x,y},{x:x+50,y}], seg:0, hx:1, hy:0, runT:9, spdMul:30, delay:0, age:9,
    left:true, arrived:false, stopped:false, lockTgt:null, collideFlash:0, popIn:0,
    hp:10, hpMax:10, atk:5, atkRate:1, atkCd:1, radius:5, range:0, splash:0, siege:1, dead:false };
}

// ========== A. hostileOf 语义 ==========
console.log('A. hostileOf 敌对判定');
stageLv('human', 8);                       // 同盟关：foes=[goblin,dragon]，势力3=盟友
allyMode=true; allyHostile=false;
T('同盟期 玩家↔盟友 不敌对', hostileOf(1,3)===false && hostileOf(3,1)===false);
T('同盟期 玩家↔敌人 敌对', hostileOf(1,2)===true && hostileOf(2,1)===true);
T('异族两 AI 互相敌对', hostileOf(2,3)===true);
allyHostile=true;
T('反水后 盟友恢复敌对', hostileOf(1,3)===true);
allyHostile=false;
T('中立永远可打', hostileOf(0,2)===true && hostileOf(3,0)===true);
// 同族统一阵营（非同盟关）
allyMode=false;
factionOf[1]='dragon'; factionOf[2]='goblin'; factionOf[3]='goblin';
refreshSlotColors();
T('同族两 AI = 统一阵营不敌对', hostileOf(2,3)===false);
T('同族 AI 与玩家仍敌对（玩家不结盟）', hostileOf(1,2)===true && hostileOf(1,3)===true);

// ========== B. 同族颜色区分 ==========
console.log('B. 同族颜色区分');
factionOf[2]='goblin'; factionOf[3]='goblin'; refreshSlotColors();
T('同族时 势力2/3 颜色不同', colOf(2)!==colOf(3));
T('势力3 用哥布林变体色', colOf(3)==='#b44fd0');
T('玩家保持绿色', colOf(1)==='#3ddc68');
factionOf[2]='human'; factionOf[3]='dragon'; refreshSlotColors();
T('异族时用各自主色', colOf(2)==='#fffa00' && colOf(3)==='#35cfd4');

// ========== C. 箭塔/远程索敌跳过友军 ==========
console.log('C. 塔与远程索敌');
factionOf[1]='human'; factionOf[2]='goblin'; factionOf[3]='dragon';
stageLv('human', 8);                        // 同盟关
const tw = nodes.find(n=>n.type==='tower') || nodes[0];
tw.type='tower'; tw.owner=3;                // 盟友的箭塔
balls.length=0;
const pBall=mkBall(1, tw.x+40, tw.y, tw); balls.push(pBall);
T('盟友塔射程内有玩家球 → 不索敌', findEnemyBallNearNode(tw, 200)===null);
const eBall=mkBall(2, tw.x+40, tw.y, tw); balls.push(eBall);
T('盟友塔射程内有敌球 → 正常索敌', findEnemyBallNearNode(tw, 200)===eBall);
// 玩家远程兵不打盟友球、照打敌球
rebuildGrid();                              // 网格查询按帧重建，测试里手动触发一次
const archer=mkBall(1, tw.x, tw.y, tw); archer.range=150; balls.push(archer);
T('玩家远程不打盟友球', findEnemyBallInRange(archer)===eBall);
balls.length=0;

// ========== D. 到达结算：同族/盟友=增援，敌对=占领 ==========
console.log('D. arriveBall 结算');
const nA=nodes.find(n=>n.owner===3)||nodes[0];
allyMode=false; allyHostile=false;
factionOf[2]='goblin'; factionOf[3]='goblin'; refreshSlotColors();
nA.owner=3; nA.pop=5; nA.defAcc=0; nA.shieldUntil=0;
arriveBall(nA, 2, null);                    // 同族 AI 援军
T('同族球抵达 → 增援不改归属', nA.owner===3 && nA.pop===6);
factionOf[3]='dragon'; refreshSlotColors();
allyMode=true; allyHostile=false;
nA.owner=3; nA.pop=5; nA.defAcc=0;
arriveBall(nA, 1, null);                    // 同盟期玩家援军
T('同盟期玩家球抵达 → 增援', nA.owner===3 && nA.pop===6);
allyHostile=true; nA.defAcc=0;
arriveBall(nA, 1, null);                    // 反水后=敌对结算
T('反水后抵达 → 走敌对结算（掉驻军不增援）', nA.pop===5 || nA.owner===1);
allyMode=false; allyHostile=false;
const nP=nodes.find(n=>n.owner===1)||nodes[0];
nP.owner=1; nP.pop=1; nP.shieldUntil=0; nP.runeUntil=0; nP.defAcc=0;
arriveBall(nP, 2, null);
T('敌对球抵达 → 正常占领', nP.owner===2);

// ========== E. 同族 AI 实战互不出兵（真实关卡） ==========
console.log('E. 同族 AI 决策');
stageLv('human', 1);                        // 烽火边境 foes=[goblin,goblin]
T('关卡两家敌人同为哥布林', factionOf[2]==='goblin'&&factionOf[3]==='goblin');
gameTime=999;                               // 跳过发育期
let sentIntra=0, sentAll=0;
const _send=send;
send=function(f,t,n){ sentAll++; if((f.owner===2&&t.owner===3)||(f.owner===3&&t.owner===2)) sentIntra++; return _send(f,t,n); };
for(let i=0;i<80;i++){ aiStep(2); aiStep(3); }
send=_send;
T('两家同族 AI 从未互相派兵', sentIntra===0);
T('决策非空转（对玩家/中立有出兵）', sentAll>0);

console.log('');
console.log(pass+' passed, '+fail+' failed');
if(fail>0) process.exitCode=1;
}catch(e){ console.error('DRIVER ERROR:', e && e.stack || e); process.exitCode=1; }
})();
`;

eval(js + DRIVER);
