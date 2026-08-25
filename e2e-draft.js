// E2E 流程测试：模拟从打开游戏到开战的完整链路（真实 setTimeout 时序）
function mkEl(id){
  const el = {
    id, style:{ setProperty(){}, }, children:[], dataset:{},
    appendChild(c){ el.children.push(c); }, classList:{ list:[], toggle(c,f){ if(f===undefined){ const i=el.classList.list.indexOf(c); i>=0?el.classList.list.splice(i,1):el.classList.list.push(c);} else { f?el.classList.list.push(c):el.classList.list.splice(el.classList.list.indexOf(c),1);} }, add(c){ el.classList.list.push(c); }, remove(c){ const i=el.classList.list.indexOf(c); if(i>=0)el.classList.list.splice(i,1); }, contains(c){return el.classList.list.includes(c);} },
    textContent:'', innerHTML:'', title:'', value:'', width:300, height:150,
    addEventListener(){}, removeEventListener(){}, focus(){},
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
  createElement(t){ return mkEl('dyn_'+t+'_'+Math.random()); },
  body:mkEl('body'), documentElement:mkEl('html'),
  addEventListener(){}, hidden:false,
};
global.window = global;
global.navigator = { userAgent:'node', maxTouchPoints:0 };
global.performance = { now:()=>Date.now() };
let rafQ=[];
global.requestAnimationFrame = fn=>{ rafQ.push(fn); return rafQ.length; };
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

const step=(name)=>console.log('STEP '+name);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
try{
  eval(js + `
;(async()=>{`);
  // —— 上半段在 eval 外写不了，改为把整个驱动放 eval 内 ——
}catch(e){ console.log('EVAL ERROR:', e.message); }
})();
