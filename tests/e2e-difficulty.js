// 四族 40 关的难度曲线（第三批 · C 难度单调不降 / L10 全族最难）
// 算法来自 SKEL.mods.diffBoost：Math.min(12, Math.max(1, round(L*0.8)) + boost)
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

// 静态分析：直接从源码里按大括号计数提取 SKEL/CAMPAIGNS
function grab(decl){
  const i = html.indexOf(decl);
  if (i < 0) throw new Error('not found: ' + decl);
  let j = html.indexOf('{', i);
  let d = 0;
  for (let k = j; k < html.length; k++) {
    if (html[k] === '{') d++;
    else if (html[k] === '}') { d--; if (d === 0) return html.slice(j, k + 1); }
  }
  throw new Error('unbalanced: ' + decl);
}
const SKEL = eval('(' + grab('const SKEL=') + ')');
const CAMPAIGNS = eval('(' + grab('const CAMPAIGNS=') + ')');

const NAME = { human:'人类', dragon:'天龙', goblin:'哥布林', dwarf:'矮人' };
const RACES = ['human','dragon','goblin','dwarf'];

let pass=0, fail=0;
function T(n,c){ if(c){pass++;console.log('  ok   '+n);} else {fail++;console.log('  FAIL '+n);} }

console.log('A. 难度曲线：四族单调不降、L10 全族最难');
for(const race of RACES){
  const vals = CAMPAIGNS[race].map((L,i)=>{
    const boost = (SKEL[L.skel].mods||{}).diffBoost || 0;
    return Math.min(12, Math.max(1, Math.round((i+1)*0.8)) + boost);
  });
  console.log('   '+NAME[race]+' '+vals.map((v,i)=>'L'+(i+1)+'='+v).join(' '));
  // 单调不降
  let monotonic=true;
  for(let i=1;i<vals.length;i++){ if(vals[i]<vals[i-1]){ monotonic=false; break; } }
  T(NAME[race]+' 难度曲线单调不降', monotonic);
  // 全部在 [1,12]
  T(NAME[race]+' 难度值都在 [1,12] 范围', vals.every(v=>v>=1 && v<=12));
  // L10 全族最难
  const mx = Math.max(...vals);
  T(NAME[race]+' L10='+vals[9]+' 等于全族最高（终章最难）', vals[9]===mx);
  // L10 >= L9（终章比前关难或持平）
  T(NAME[race]+' L10 至少等于 L9', vals[9]>=vals[8]);
}

console.log('');
console.log('RESULT pass='+pass+' fail='+fail);
process.exit(fail?1:0);