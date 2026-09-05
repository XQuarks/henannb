// 碉堡落点稳定性（第三批）：M3 随机关 / M6 固定关 都要保证碉堡落在桥面上
// 这条规则在 P3 之前有 25% 失败率（碉堡排在种族专属建筑之后、选格太晚），提到最前面后已 100% 稳定
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

  const N = parseInt(process.env.N||'100',10);
  // 四个固定桥关（M6）+ 一个走 M3 随机桥的关（哥布林 L9「抢劫犯被抢」）作回归
  const targets = [
    ['human',  2, '渡口阻击'],
    ['dragon', 2, '焚断桥'],
    ['goblin', 2, '此桥是我开'],
    ['dwarf',  2, '断桥立誓'],
    ['goblin', 9, '抢劫犯被抢（M3 随机）'],
  ];

  for(const [race, lv, label] of targets){
    let noShape=0, noBridgeCell=0, noBunker=0, offBridge=0, ok=0;
    for(let k=0;k<N;k++){
      stageLv(race, lv);
      const bk = nodes.find(x=>x.bunker);
      const nb = nodes.filter(x=>x.onBridge).length;
      // 接受 M3（随机桥）和 M6（固定桥）两种地形
      if(!SHAPE || (SHAPE.tpl!=='M3' && SHAPE.tpl!=='M6')){ noShape++; continue; }
      if(nb===0){ noBridgeCell++; continue; }
      if(!bk){ noBunker++; continue; }
      if(!bk.onBridge){ offBridge++; continue; }
      ok++;
    }
    const total = N;
    const isFixed = (lv === 2);  // L2 四个桥关是固定 M6 地图，L9 哥布林是 M3 随机
    const expectRate = isFixed ? 1.0 : 0.95;  // 固定图必 100%；M3 随机允许小幅抖动
    console.log('  ['+label+'] '+total+' 次: 桥面合格 '+ok+' | 无SHAPE '+noShape+' | 桥面0格 '+noBridgeCell+' | 无碉堡 '+noBunker+' | 碉堡离桥 '+offBridge+'  ('+(100*ok/total).toFixed(1)+'%)');
    T(label+' 碉堡落桥面 ≥ '+(expectRate*100)+'%（'+ok+'/'+total+' = '+(100*ok/total).toFixed(1)+'%）', ok/total >= expectRate);
  }

  console.log('');
  console.log('RESULT pass='+pass+' fail='+fail);
  process.exit(fail?1:0);
}catch(e){ console.log('DRIVER ERROR: '+e.stack); process.exit(1); }
})();
`;
eval(js + DRIVER);