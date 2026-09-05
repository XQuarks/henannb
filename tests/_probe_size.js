// 批次A 探针：实测各模板/各战役关卡的实际格数（提案目标 30~50）
function mkEl(id){
  const el = {
    id, style:{ setProperty(){}, }, children:[], dataset:{},
    appendChild(c){ el.children.push(c); }, classList:{ list:[], toggle(){}, add(){}, remove(){}, contains(){return false;} },
    textContent:'', innerHTML:'', title:'', value:'', width:300, height:150,
    addEventListener(){}, removeEventListener(){}, focus(){}, setAttribute(){}, getAttribute(){return null;},
    getContext(){ return ctxStub; },
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
  getProg().unlockAll = true;
  const out=[];
  // 1) 随机模板（M0~M5, S1~S6）各 12 次
  for(const tpl of ['M0','M1','M2','M3','M4','M5','S1','S2','S3','S4','S5','S6']){
    let mn=999, mx=0, sum=0, n=0;
    for(let k=0;k<12;k++){
      buildMap(tpl,{});
      const c=nodes.length; mn=Math.min(mn,c); mx=Math.max(mx,c); sum+=c; n++;
    }
    out.push(tpl+'  min='+mn+' avg='+(sum/n).toFixed(1)+' max='+mx);
  }
  // 2) 战役 40 关固定图/修饰词图
  for(const race of ['human','goblin','dragon','dwarf']){
    for(let lv=1;lv<=10;lv++){
      try{
        pickRace(race); pendingCampLevel=lv; campStage=lv; campRace=race; lastMode='camp';
        stageBattle();
        out.push(race+' L'+lv+'  = '+nodes.length+' 格');
      }catch(e){ out.push(race+' L'+lv+'  ERROR '+e.message); }
    }
  }
  console.log(out.join('\\n'));
})().catch(e=>{ console.log('DRIVER ERR', e); });
`;
eval(js + DRIVER);
