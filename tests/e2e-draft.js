// E2E 流程测试：开局草稿链路（选族 → 选技能 → 出击）的业务规则断言
// 覆盖：战役/自由对战两种模式的 draft 分支、技能页灰/亮二次确认、每族技能隔离、出击存档写入
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

const DRIVER = `
;(async()=>{
let pass=0, fail=0;
function T(name, cond){
  if(cond){ pass++; console.log('  ok '+name); }
  else{ fail++; console.log('  FAIL: '+name); }
}
const vis = id => document.getElementById(id).style.display==='flex';
const hid = id => document.getElementById(id).style.display==='none';
try{
  getProg().unlockAll = true;   // v5 渐进解锁：测试全量内容（等价设置页一键解锁）
  // ========== A. 战役模式选族 ==========
  console.log('A. 战役模式 draft');
  showRaceSelect('camp');
  T('选族页弹出', vis('factionSelect'));
  T('raceMode=camp', raceMode==='camp');
  T('标题为战役选族', document.getElementById('fsTitle').textContent.indexOf('选择你的种族')>=0);
  T('四族卡片齐全', document.getElementById('fsGrid').children.length===4);
  T('卡片带战役进度条（暗轨道）', document.getElementById('fsGrid').children[0].innerHTML.indexOf('box-shadow:inset')>=0);
  document.getElementById('fsBack').onclick();
  T('返回 → 主菜单', vis('menuScreen') && hid('factionSelect'));

  // ========== B. 技能草稿规则（战役链路） ==========
  console.log('B. 技能草稿二次确认');
  pickRace('human');
  T('选族 → 路线图', vis('campaignScreen'));
  openLevelBrief(1);
  T('关卡详情弹出', vis('levelBrief'));
  document.getElementById('lbGo').onclick();
  T('选择技能 → 技能页', vis('skillSelect') && hid('levelBrief'));
  T('未选技能：出击为灰', document.getElementById('skGo').disabled===true);
  T('未选技能：按钮文案提示先选择', document.getElementById('skGo').textContent.indexOf('先选择')>=0);
  T('技能卡 = 通用3 + 人类专属2', document.getElementById('skGrid').children.length===5);
  const ids = document.getElementById('skGrid').children.map(c=>c.dataset.sk).sort().join(',');
  T('人类技能列表正确', ids==='drop,horn,muster,rush,shield');
  pickSkill('rush');
  T('选中后出击亮起', document.getElementById('skGo').disabled===false);
  T('按钮文案变为出击', document.getElementById('skGo').textContent.indexOf('先选择')<0 && document.getElementById('skGo').textContent.indexOf('出击')>=0);
  document.getElementById('skBack').onclick();
  T('技能页返回 → 关卡详情（战役分支）', vis('levelBrief'));

  // ========== C. 出击链路与存档 ==========
  console.log('C. 出击链路');
  document.getElementById('lbGo').onclick();
  pickSkill('rush');
  deployFromSkillSelect();
  T('出击 → 布图完成', nodes.length>0);
  T('演出链启动，实战未开（running=false）', running===false);
  T('技能选择写入存档', getProg().skill==='rush');
  T('入场演出 lvIntro 播放中', document.getElementById('lvIntro').classList.list.includes('on'));

  // ========== D. 自由对战 draft ==========
  console.log('D. 自由对战 draft');
  showRaceSelect('ffa');
  T('标题为自由对战选族', document.getElementById('fsTitle').textContent.indexOf('自由对战')>=0);
  pickRace('goblin');
  T('不经过路线图，直达技能页', vis('skillSelect') && hid('campaignScreen'));
  T('raceMode=ffa', raceMode==='ffa');
  T('敌方两家与玩家不同族', factionOf[2]!=='goblin' && factionOf[3]!=='goblin');
  T('敌方两家互不相同', factionOf[2]!==factionOf[3]);

  // ========== E. 每族技能隔离 ==========
  console.log('E. 技能列表隔离');
  const uni=['rush','drop','shield'];
  for(const r of ['human','goblin','dragon','dwarf']){
    const s=skillsForRace(r);
    T(r+' 技能共 5 个', s.length===5);
    T(r+' 含全部通用技', uni.every(u=>s.includes(u)));
  }
  T('人类专属：muster/horn', skillsForRace('dragon').includes('muster')===false && skillsForRace('human').includes('muster'));
  T('龙族专属不外泄', skillsForRace('human').includes('breath')===false && skillsForRace('dragon').includes('breath'));

  console.log(fail===0 ? 'DRAFT E2E ALL OK' : 'DRAFT E2E FAILED');
  console.log('RESULT pass='+pass+' fail='+fail);
}catch(e){
  fail++;
  console.log('!!! 卡住/报错：', e.message);
  console.log((e.stack||'').split('\\n').slice(0,4).join('\\n'));
  console.log('RESULT pass='+pass+' fail='+fail);
}
})();`;

eval(js + DRIVER);
