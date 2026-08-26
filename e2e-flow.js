// E2E 流程测试：模拟从打开游戏到开战的完整链路（真实 setTimeout 时序），定位“卡住”环节
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
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
  getProg().unlockAll = true;   // v5 渐进解锁：测试全量内容（等价设置页一键解锁）
  console.log('STEP1 开机：菜单显示 =', document.getElementById("menuScreen").style.display);
  pickRace('goblin');
  console.log('STEP2 选族完成：路线图 =', document.getElementById('campaignScreen').style.display);
  openLevelBrief(1);
  console.log('STEP3 关卡详情 =', document.getElementById('levelBrief').style.display);
  document.getElementById('lbGo').onclick();
  console.log('STEP4 点击选择技能 → 技能页 =', document.getElementById('skillSelect').style.display,
              '| 出击灰 =', document.getElementById('skGo').disabled);
  pickSkill('rush');
  console.log('STEP5 选中技能 → 出击亮 =', !document.getElementById('skGo').disabled);
  deployFromSkillSelect();
  console.log('STEP6 出击 → 布图 nodes='+nodes.length+' | 未开战 running='+running+
              '| 演出中 lvIntro.on='+document.getElementById('lvIntro').classList.list.includes('on'));
  await sleep(2300);
  const ds=document.getElementById('dialogueScene');
  console.log('STEP7 演出结束 → 对话场景 =', ds.style.display,
              '| on-map =', ds.classList.list.includes('on-map'),
              '| 章节卡(应隐藏) =', document.getElementById('dlgChapter').style.display,
              '| 对话框 =', document.getElementById('dlgBox').style.display);
  console.log('STEP8 开局即台词：首句 =', JSON.stringify((document.getElementById('dlgText').dataset.full||'').slice(0,12)),
              '| running =', running);
  dlgAdvance();
  console.log('STEP8b 点击推进到下一句 =', JSON.stringify((document.getElementById('dlgText').dataset.full||'').slice(0,12)));
  dlgFinish();
  const blo=document.getElementById('battleLogo');
  console.log('STEP9 对话结束 → 战斗徽章 on =', blo.classList.list.includes('on'),
              '| 战吼 =', document.getElementById('blCry').textContent,
              '| 徽章SVG =', document.getElementById('blEmblem').innerHTML.indexOf('<svg')>=0);
  console.log('STEP9b 徽章无跳过途径：skipBattleLogo 已移除 =', typeof skipBattleLogo==='undefined');
  await sleep(4100);   // 时长×2 且不可点击，只能等演出自然结束（3.9s）
  console.log('STEP10 演出自然播完 → 实战 running =', running, '| stagedReady =', stagedReady);
  for(let f=0;f<8;f++){
    update(0.016); gameTime+=0.016; draw(); updateHUD();
    if(f===3){
      const mine=nodes.find(n=>n.owner===1);
      if(mine && mine.pop>3){ const t=nodes.find(n=>n.owner!==1); if(t) send(mine,t); }
    }
  }
  console.log('STEP10 战斗帧跑通 | balls='+balls.length+' | gGold='+JSON.stringify(gGold)+' | lootBox='+(document.getElementById('lootBox').classList.list.includes('on')));
  console.log('E2E ALL OK');
}catch(e){
  console.log('!!! 卡住/报错：', e.message);
  console.log((e.stack||'').split('\\n').slice(0,4).join('\\n'));
}
})();`;

eval(js + DRIVER);
