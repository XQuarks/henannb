// v7 固定桥地图专项：四族「桥」关改成手写网格（M6）后的地形与关隘规则
// 背景：随机生成的 M3 双陆桥每局都在飘，碉堡还被写死选在「最靠敌人端」——
//       玩家实测看到的是堡垒紧贴敌方大本营、离自己老远，而且兵球能从碉堡头顶飞过去。
// 本文件锁定四件事：地图 100% 可复现、碉堡居中不偏袒、碉堡是唯一跨江点、未占碉堡不许穿行。
// DOM stub 与 e2e-terrain.js 同一套（每个测试文件自带一份，互不耦合）。
function mkEl(id){
  const el = {
    id, style:{ setProperty(){}, }, children:[], dataset:{},
    appendChild(c){ el.children.push(c); }, classList:{ list:[], toggle(c,f){ const i=el.classList.list.indexOf(c); if(f===undefined){ i>=0?el.classList.list.splice(i,1):el.classList.list.push(c);} else if(f){ if(i<0)el.classList.list.push(c); } else { if(i>=0)el.classList.list.splice(i,1); } }, add(c){ if(!el.classList.list.includes(c)) el.classList.list.push(c); }, remove(c){ const i=el.classList.list.indexOf(c); if(i>=0)el.classList.list.splice(i,1); }, contains(c){return el.classList.list.includes(c);} },
    textContent:'', innerHTML:'', title:'', value:'', width:300, height:150,
    addEventListener(){}, removeEventListener(){}, focus(){}, setAttribute(){}, getAttribute(){return null;},
    getContext(){ return ctxStub; },
    querySelector(){ return mkEl(id+'_q'); }, querySelectorAll(){ return []; },
    getBoundingClientRect(){
      // hud 必须返回真实量级的高度：G_TOP 由 hud 实测高度推出，
      // 若这里给 600，可玩区只剩 720-604=116px，地图小到只有 8~14 格，地形无从塑形。
      return {left:0,top:0,width:800,height: id==='hud'?54:600};
    },
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
const DRIVER = "\n;(async()=>{\ntry{\n  getProg().unlockAll = true;\nfunction T(name, cond){\n  if(cond){ pass++; console.log('  ok '+name); }\n  else{ fail++; console.log('  FAIL: '+name); }\n}\nfunction stageLv(race, lv){\n  pickRace(race);\n  pendingCampLevel=lv; campStage=lv; campRace=race; lastMode='camp';\n  stageBattle();\n}\nfunction hops(a,b){\n  if(!a||!b) return -1;\n  if(a===b) return 0;\n  const d=new Map([[a,0]]); const q=[a];\n  while(q.length){ const u=q.shift();\n    for(const v of u.adj){ if(!d.has(v)){ d.set(v,d.get(u)+1); q.push(v); } } }\n  return d.has(b)?d.get(b):-1;\n}\nfunction reachWithout(gate, from){\n  const bak=[];\n  for(const n of nodes){\n    const i=n.adj.indexOf(gate);\n    if(i>=0){ bak.push(n); n.adj.splice(i,1); }\n  }\n  const seen=new Set([from]); const q=[from];\n  while(q.length){ const u=q.pop();\n    for(const v of u.adj){ if(!seen.has(v)){ seen.add(v); q.push(v); } } }\n  for(const n of bak) n.adj.push(gate);\n  return seen;\n}\nfunction snap(){ return nodes.map(n=>Math.round(n.x)+','+Math.round(n.y)+','+n.owner+','+n.type).join('|'); }\n\nconst levels=[['human',2,'渡口阻击'],['dragon',2,'焚断桥'],['goblin',2,'此桥是我开'],['dwarf',2,'断桥立誓']];\n\n  // ========== A. 四关都走固定桥分支，地形要素齐全 ==========\n  console.log('A. 固定桥地图（M6）：一江一桥一堡，全部写死');\n  for(const [race,lv,label] of levels){\n    stageLv(race,lv);\n    const bk=nodes.find(n=>n.bunker);\n    T(label+' 建图成功（陆格 >=10）', nodes.length>=10);\n    T(label+' 走固定桥分支 curTpl=M6', curTpl==='M6');\n    T(label+' 地图里有江（LAKES 非空）', LAKES.length>0);\n    T(label+' 有桥头堡且带 gate 关隘标记', !!bk && bk.gate===true);\n    T(label+' 桥面 3 格（西桥头+碉堡+东桥头）', nodes.filter(n=>n.onBridge).length===3);\n    T(label+' 碉堡中立开局（两边抢）', !!bk && bk.owner===0);\n    T(label+' 三家基地齐全（你 1 家 / 敌 2 家）',\n      nodes.filter(n=>n.owner===1).length===1 && nodes.filter(n=>n.owner===2).length===1 && nodes.filter(n=>n.owner===3).length===1);\n  }\n\n  // ========== B. 布局确定性：同一关连开两次必须一模一样 ==========\n  console.log('B. 固定地图布局可复现（随机生成的老毛病就是这一条）');\n  for(const [race,lv,label] of levels){\n    stageLv(race,lv); const s1=snap(); const n1=nodes.length;\n    stageLv(race,lv); const s2=snap(); const n2=nodes.length;\n    T(label+' 两次建图布局逐格一致', s1===s2 && n1===n2);\n    if(s1!==s2) console.log('    第一次: '+s1.slice(0,180)+' / 第二次: '+s2.slice(0,180));\n  }\n\n  // ========== C. 碉堡位置：不再贴敌方（本次反馈的核心问题）==========\n  console.log('C. 碉堡居中：不贴敌方大本营，你反而更快');\n  for(const [race,lv,label] of levels){\n    stageLv(race,lv);\n    const bk=nodes.find(n=>n.bunker);\n    const p=nodes.find(n=>n.owner===1), a2=nodes.find(n=>n.owner===2), a3=nodes.find(n=>n.owner===3);\n    const hp=hops(p,bk), h2=hops(a2,bk), h3=hops(a3,bk);\n    console.log('    ['+label+'] 陆格='+nodes.length+' 水='+LAKES.length+' 碉堡度='+bk.adj.length+' | 你='+hp+' 步 / 敌2='+h2+' 步 / 敌3='+h3+' 步');\n    T(label+' 你 2 步到碉堡', hp===2);\n    T(label+' 两路敌军到碉堡不比你更近（不能白送敌方先手）', h2>=hp && h3>=hp);\n    const ratio = dist(p,bk) / Math.min(dist(a2,bk), dist(a3,bk));\n    T(label+' 碉堡不贴敌方（你/敌到碉堡距离比 ∈ [0.5,1.8]，实测 '+ratio.toFixed(2)+'）', ratio>=0.5 && ratio<=1.8);\n  }\n\n  // ========== D. 碉堡是唯一跨江点（割点语义）==========\n  console.log('D. 摘掉碉堡 = 两岸断绝（桥必须真是咽喉）');\n  for(const [race,lv,label] of levels){\n    stageLv(race,lv);\n    const bk=nodes.find(n=>n.bunker);\n    const p=nodes.find(n=>n.owner===1), a2=nodes.find(n=>n.owner===2), a3=nodes.find(n=>n.owner===3);\n    const seen=reachWithout(bk, p);\n    T(label+' 摘掉碉堡后你够不着任何敌方基地', !seen.has(a2) && !seen.has(a3));\n    T(label+' 摘掉碉堡后本岸仍连通（陆军没被拆散）', seen.has(p) && seen.size>=4);\n  }\n\n  // ========== E. 关隘阻挡：占领堡垒才能穿行（本次要兑现的规则）==========\n  console.log('E. 关隘规则：未占堡垒不许穿行，占下后自由通行');\n  for(const [race,lv,label] of levels){\n    stageLv(race,lv);\n    const bk=nodes.find(n=>n.bunker);\n    const p=nodes.find(n=>n.owner===1), a2=nodes.find(n=>n.owner===2), a3=nodes.find(n=>n.owner===3);\n    T(label+' 未占碉堡时派兵去对岸被拒', findPath(p,a2,1)===null && findPath(p,a3,1)===null);\n    T(label+' 未占碉堡时可以派兵去打碉堡', findPath(p,bk,1)!==null);\n    bk.owner=1; bk.pop=5;                        // 你抢下桥头堡\n    T(label+' 占下碉堡后派兵去对岸放行', findPath(p,a2,1)!==null && findPath(p,a3,1)!==null);\n    T(label+' 你占碉堡后 AI 打不到你老家', findPath(a2,p,2)===null && findPath(a3,p,2)===null);\n    T(label+' AI 仍能派兵去攻坚碉堡（不是死局）', findPath(a2,bk,2)!==null && findPath(a3,bk,2)!==null);\n  }\n\n  // ========== F. 剧情机制仍挂在碉堡上（焚桥 / 过路费）==========\n  console.log('F. 剧情机制：焚桥与过路费仍由桥头堡触发');\n  for(const [race,lv,label] of [['dragon',2,'焚断桥'],['dwarf',2,'断桥立誓']]){\n    stageLv(race,lv);\n    const bk=nodes.find(n=>n.bunker);\n    bk.pop=1;\n    arriveBall(bk, 1, {siege:99});               // 走真实占领回调，不是直接调 burnBridge\n    T(label+' 玩家占下碉堡触发焚桥', bridgeBurned===true && BURNED.size>0);\n  }\n  {\n    stageLv('goblin',2);\n    T('此桥是我开 过路费桥面 3 格', BRIDGE_CELLS.length===3);\n    T('此桥是我开 掠夺目标 30 金', !!(lvCtx && lvCtx.mods.lootGoal===30 && lvCtx.mods.toll));\n  }\n\n  // ========== G. 竖屏（手机）==========\n  console.log('G. 竖屏适配（手机：整张图转 90 度，桥改南北向、江横贯）');\n  {\n    const bw=W, bh=H;\n    W=420; H=900;\n    try{\n      buildMap('M6', {fixedMap:'dusk'});\n      const bk=nodes.find(n=>n.bunker);\n      const p=nodes.find(n=>n.owner===1), a2=nodes.find(n=>n.owner===2), a3=nodes.find(n=>n.owner===3);\n      T('竖屏 建图成功（陆格 >=10）', nodes.length>=10);\n      T('竖屏 有江有碉堡', LAKES.length>0 && !!bk);\n      T('竖屏 三家基地齐全', !!p && !!a2 && !!a3);\n      T('竖屏 SHAPE.horiz=false（桥是南北向）', !!(SHAPE && SHAPE.horiz===false));\n      const seen=reachWithout(bk, p);\n      T('竖屏 摘掉碉堡仍断两岸', !seen.has(a2) && !seen.has(a3));\n      T('竖屏 未占碉堡不许穿行', findPath(p,a2,1)===null);\n      T('竖屏 你仍 2 步到碉堡', hops(p,bk)===2);\n    } finally { W=bw; H=bh; }\n  }\n\n  // ========== H. 地图倾斜（v7 防堵球）：桥面三格非共线 ==========\n  console.log('H. 地图倾斜：桥面三格非共线，球流经不会全部撞到同一入口点');\n  for(const [race,lv,label] of levels){\n    stageLv(race,lv);\n    const w = nodes.find(n=>n._g && n._g.c===2 && n._g.r===1);\n    const B = nodes.find(n=>n.bunker);\n    const e = nodes.find(n=>n._g && n._g.c===4 && n._g.r===1);\n    if(!w||!B||!e) continue;\n    const area = Math.abs((e.x-w.x)*(B.y-w.y) - (e.y-w.y)*(B.x-w.x)) / 2;\n    T(label+' 桥面三格已倾斜（非共线度 '+area.toFixed(1)+'）', area > 2);\n    const P = nodes.find(n=>n.owner===1);\n    if(P && w){ const dx = P.x - w.x, dy = P.y - w.y; T(label+' 玩家基地相对桥面有角度', Math.abs(dx)+Math.abs(dy) > 5); }\n  }\n\n  console.log('');\n  console.log('RESULT pass='+pass+' fail='+fail);\n  process.exit(fail?1:0);\n}catch(e){ console.log('DRIVER ERROR: '+(e && e.stack || e)); process.exit(1); }\n})();\n";
eval(js + DRIVER);
