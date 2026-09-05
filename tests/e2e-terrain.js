// v6 地形塑形专项：双陆桥 M3 / 狭长走廊 M5 / 内陆湖 lakeBig
// 背景：SKEL 里的 tpl 之前从未被建图流程读取，六种模板实际全是同一张树状大陆。
// 本文件锁定「剧情关说有桥 / 走廊 / 湖，地图上就必须真的有」。
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

const DRIVER = `
;(async()=>{
try{
  getProg().unlockAll = true;
function T(name, cond){
  if(cond){ pass++; console.log('  ok '+name); }
  else{ fail++; console.log('  FAIL: '+name); }
}
function stageLv(race, lv){
  pickRace(race);
  pendingCampLevel=lv; campStage=lv; campRace=race; lastMode='camp';
  stageBattle();
}
function bbox(){
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const n of nodes){ x0=Math.min(x0,n.x); x1=Math.max(x1,n.x); y0=Math.min(y0,n.y); y1=Math.max(y1,n.y); }
  return {w:x1-x0, h:y1-y0, cx:(x0+x1)/2, cy:(y0+y1)/2};
}
function connectedAll(){
  const seen=new Set([0]); const q=[0];
  while(q.length){
    const u=q.pop();
    for(const v of nodes[u].adj){ const i=nodes.indexOf(v); if(!seen.has(i)){ seen.add(i); q.push(i); } }
  }
  return seen.size===nodes.length;
}

  // ========== A. 双陆桥 M3：四族三个「桥」关 + 哥布林竞速关 ==========
  console.log('A. M3 双陆桥（剧情里叫「桥」的关卡必须真的有桥）');
  // v8：五关带「桥」的剧情关（四族 L2 + 哥布林 L9）已全部改为手写固定地图（M6），
  // 由 e2e-fixed-bridge.js 专项覆盖 —— 战役里再没有关卡走随机 M3 双陆桥。
  // 但 M3 生成器仍是「固定图建图失败时的兜底路径」，也是闲置骨架 dualFoe 用的模板，
  // 所以这里改成直接驱动 buildMap('M3') 测生成器本身，不再经由具体关卡。
  const bridgeLevels=[['M3 随机双陆桥（生成器直测）']];
  // 固定种子集（20 个）：buildMap(tpl,{seed}) 走 MAP_RNG，生成完全确定 → 断言零抖动。
  // 不要再改回 Math.random 大样本统计阈值——批次A地图放大后割点真实率约 76~78%，
  // 任何「百分比×小样本」的写法都有个位数百分比的踩空概率（实测翻车多次）。
  const M3_SEEDS=[11,23,37,41,53,67,71,83,97,101,113,127,131,149,163,179,191,211,229,241];
  for(const [label] of bridgeLevels){
    let shaped=0, split=0, choke=0, conn=0, minN=999;
    for(const sd of M3_SEEDS){
      buildMap('M3', {seed:sd});
      if(nodes.length<8) continue;
      minN=Math.min(minN, nodes.length);
      if(connectedAll()) conn++;
      if(SHAPE && SHAPE.tpl==='M3'){
        shaped++;
        const key = n => SHAPE.horiz ? n.x : n.y;
        const p=nodes.find(n=>n.owner===1), a2=nodes.find(n=>n.owner===2), a3=nodes.find(n=>n.owner===3);
        if(p&&a2&&a3){
          const bb=bbox();
          const span = SHAPE.horiz?bb.w:bb.h;
          // 玩家在一端、两家 AI 在另一端，且间隔够远
          if(Math.min(key(a2),key(a3))-key(p) > span*0.40) split++;
        }
        if(articulationPoints().size>0) choke++;
      }
    }
    T(label+' 20 种子中 ≥16 次塑形成桥形', shaped>=16);
    T(label+' 玩家守一端 / 两 AI 据另一端（桥是唯一陆路）', split>=Math.ceil(shaped*0.8));
    T(label+' 存在咽喉割点（可断退路）', choke>=Math.ceil(shaped*0.6));
    T(label+' 20 种子全部连通且格数充足', conn>=20 && minN>=8);
  }

  // ========== A2. 桥头碉堡 ==========
  console.log('A2. 桥头碉堡（M3 生成器：桥面靠敌侧 · 上限 10 · 1 兵抵 2 兵）');
  for(const [label] of bridgeLevels){
    let hasBunker=0, capOK=0, onBridge=0, nearFoe=0;
    // 与 A 段同一组固定种子（确定性，零抖动）
    for(const sd of M3_SEEDS){
      buildMap('M3', {seed:sd});
      const bk=nodes.find(n=>n.bunker);
      if(!bk) continue;
      hasBunker++;
      if(bk.cap===10) capOK++;
      if(bk.onBridge) onBridge++;
      // 碉堡必须比玩家基地更靠近敌人端（玩家守一端、两 AI 据另一端）
      if(SHAPE){
        const key = n => SHAPE.horiz ? n.x : n.y;
        const p=nodes.find(n=>n.owner===1);
        if(p && key(bk)>key(p)) nearFoe++;
      }
    }
    T(label+' 20 次中 ≥18 次生成碉堡', hasBunker>=18);
    T(label+' 碉堡自然兵力上限 = 10', capOK===hasBunker);
    T(label+' 碉堡落在桥面上', onBridge>=hasBunker-2);          // 允许极少数兜底落到桥头外沿
    T(label+' 碉堡位于玩家与敌人之间（靠敌侧挡路）', nearFoe>=hasBunker-2);
  }
  // 抵消倍率：同样送 4 兵，普通据点掉 4 驻军，碉堡只掉 2
  {
    stageLv('human', 2);
    const bk=nodes.find(n=>n.bunker);
    const plain=nodes.find(n=>n.owner===0 && !n.bunker && n.type==='village');
    T('桥头碉堡存在', !!bk);
    if(bk && plain){
      plain.owner=2; plain.pop=20; plain.defAcc=0;
      bk.owner=2; bk.pop=20; bk.defAcc=0;
      for(let i=0;i<4;i++) arriveBall(plain, 1, {cls:'melee'});
      for(let i=0;i<4;i++) arriveBall(bk, 1, {cls:'melee'});
      T('4 兵打普通据点 → 掉 4 驻军', plain.pop===16);
      T('4 兵打碉堡 → 只掉 2 驻军（1 兵抵 2 兵）', bk.pop===18);
    }
  }

  // ========== B. 狭长走廊 M5：矮人 L8 山谷冲锋 ==========
  console.log('B. M5 狭长走廊（山谷冲锋：不绕路、正面碾过去）');
  let corrShaped=0, narrow=0, connC=0;
  for(let k=0;k<10;k++){
    stageLv('dwarf', 8);
    if(connectedAll()) connC++;
    if(SHAPE && SHAPE.tpl==='M5'){
      corrShaped++;
      const bb=bbox();
      const ratio=Math.max(bb.w,bb.h)/Math.max(1,Math.min(bb.w,bb.h));
      if(ratio>1.8) narrow++;
    }
  }
  T('矮人L8 10 次中 ≥8 次塑形成走廊', corrShaped>=8);
  T('走廊长宽比 > 1.8（真的窄长，无法迂回包抄）', narrow>=Math.round(corrShaped*0.8));
  T('走廊图 10 次生成全部连通', connC>=10);

  // ========== C. 内陆湖 lakeBig ==========
  console.log('C. lakeBig 内陆湖（三岔口 / 围城打援 / 三面合围）');
  for(const [race,lv,label] of [['goblin',8,'三岔口分赃'],['human',8,'围城打援'],['dragon',8,'三面合围']]){
    let withLake=0, connL=0, altarOK=0;
    for(let k=0;k<10;k++){
      stageLv(race, lv);
      if(connectedAll()) connL++;
      if(LAKES.length>0) withLake++;
      if(race==='dragon'){
        const alt=nodes.find(n=>n.sanctum);
        // 湖心祭坛：祭坛存在，且它被水环绕（邻居数明显少于普通内陆格）
        if(alt){
          const avgAdj=nodes.reduce((s,n)=>s+n.adj.length,0)/nodes.length;
          if(alt.adj.length>0 && alt.adj.length<=Math.ceil(avgAdj)) altarOK++;
        }
      }
    }
    T(label+' 10 次中 ≥6 次真的挖出内陆湖', withLake>=6);
    T(label+' 10 次生成全部连通（挖湖不断路）', connL>=10);
    if(race==='dragon') T('龙神祭坛落在湖心岛（四周被水环绕）', altarOK>=6);
  }

  // ========== D. 回归：普通关不得被误塑形 ==========
  console.log('D. 回归检查（M0 关卡保持原样）');
  stageLv('human', 1);
  // 第七批：L1 教学关已改为手写固定图（M6），不再是「M0 不塑形」。
  // 四族各一张（h1/g1/b1/d1），所以这里改判：走 M6 分支 + 格数与连通性达标。
  T('人类L1 教学关走手写固定图（SHAPE=M6）', !!SHAPE && SHAPE.tpl==='M6');
  T('人类L1 格数正常且连通', nodes.length>=8 && connectedAll());
  stageLv('dragon', 7);
  T('天龙L7 攻坚关不塑形（siege 骨架仍是树状大陆）', SHAPE===null);
  T('天龙L7 格数正常且连通', nodes.length>=8 && connectedAll());
  stageLv('human', 6);
  // 批次C：人类 L6 已由「两线告急(pincer)」换成「谷仓重镇(granaryHold)」——S1 塑形 + 前线城堡×2
  T('人类L6 谷仓重镇走 S1 塑形 + 前线城堡×2', lvCtx.mods.frontCastle===2 && curTpl==='S1');

  // ========== E. 全关卡建图稳定性（40 关跑一遍）==========
  console.log('E. 四族 40 关建图稳定性');
  let bad=[];
  for(const race of ['human','dragon','goblin','dwarf']){
    for(let lv=1; lv<=10; lv++){
      try{
        stageLv(race, lv);
        if(nodes.length<8) bad.push(race+' L'+lv+' 格数不足('+nodes.length+')');
        else if(!connectedAll()) bad.push(race+' L'+lv+' 不连通');
      }catch(e){ bad.push(race+' L'+lv+' 抛异常: '+e.message); }
    }
  }
  T('40 关全部建图成功、连通、无异常', bad.length===0);
  if(bad.length) console.log('    问题关卡: '+bad.join(' | '));

  // ========== F. 批次A 轮廓层：S1~S6 有机外形 ==========
  console.log('F. 轮廓层 S1~S6（打破方形地图：有机海岸、全部落格在轮廓内、连通、种子可复现）');
  // 与 M3 段同理：固定种子集驱动，断言零抖动
  const S_SEEDS=[101,203,307,409,503,607,709,811,907,1013];
  for(const sh of ['S1','S2','S3','S4','S5','S6']){
    let coastOn=0, conn=0, inC=0, minN=999;
    for(const sd of S_SEEDS){
      buildMap(sh,{seed:sd});
      if(nodes.length<8) continue;
      minN=Math.min(minN,nodes.length);
      if(connectedAll()) conn++;
      if(COAST && COAST.shape===sh){
        coastOn++;
        let allIn=true;
        for(const n of nodes){ if(!COAST.test(n.x,n.y)){ allIn=false; break; } }
        if(allIn) inC++;
      }
    }
    T(sh+' 10 种子生成全部连通且格数充足', conn>=10 && minN>=8);
    // 批次A地图放大底线：密度 ladder 四档（最深 dense 0.62）后实测各模板 min≥19，
    // 锁 16 防「放大回退成小图」；再低说明 ladder 或轮廓裁切被人改坏
    T(sh+' 批次A放大底线（min≥16 格）', minN>=16);
    T(sh+' 海岸线生效且全部落格在轮廓内', coastOn>=10 && inC>=10);
    if(sh==='S1' || sh==='S3'){
      let holeClear=0;
      for(const sd of S_SEEDS){
        buildMap(sh,{seed:sd});
        if(!COAST || !COAST.hole) continue;
        let bad=false;
        for(const n of nodes){ if(Math.hypot(n.x-COAST.hole.x,n.y-COAST.hole.y)<COAST.hole.r*0.8){ bad=true; break; } }
        if(!bad) holeClear++;
      }
      T(sh+' 海湾/湖心洞里真的没有陆地（镂空成形）', holeClear>=10);
    }
  }
  // 种子可复现：同一种子建两次，轮廓与布局完全一致
  {
    buildMap('S1',{seed:20260904}); const aN=nodes.length, aX=nodes[0].x, aY=nodes[0].y;
    buildMap('S1',{seed:20260904});
    T('S 模板种子可复现（固定图以外的教学/剧情标注基础）', aN===nodes.length && aX===nodes[0].x && aY===nodes[0].y);
  }

  // ========== G. 批次A 固定图海岸雕刻 ==========
  console.log('G. 固定图海岸雕刻（手写矩形啃出有机海岸：保护格不动、连通不破、桥面完好）');
  {
    const sample=[['human',1],['human',2],['dragon',1],['goblin',1],['dwarf',1],['human',10],['goblin',9],['dwarf',10]];
    let carvedLv=0, protOK=0, connOK=0, m6=0;
    for(const [race,lv] of sample){
      stageLv(race,lv);
      if(!(SHAPE && SHAPE.tpl==='M6')) continue;
      m6++;
      if(SEACELLS.size>0) carvedLv++;
      if(nodes.find(n=>n.owner===1)&&nodes.find(n=>n.owner===2)&&nodes.find(n=>n.owner===3)) protOK++;
      if(connectedAll()) connOK++;
    }
    T('样本固定图全部连通（雕刻不断路）', connOK===m6 && m6===sample.length);
    T('样本固定图三家基地全在（保护格不动）', protOK===m6);
    T('样本固定图全部啃出了海（SEACELLS>0，矩形感已破）', carvedLv===m6);
    stageLv('human',2);
    T('桥关碉堡与桥面三格完好', !!nodes.find(n=>n.bunker) && nodes.filter(n=>n.onBridge).length>=3);
    // 雕刻确定性：同一关重进两次，啃掉的海格数一致（按 mapId 哈希播种）
    stageLv('human',1); const s1=SEACELLS.size;
    stageLv('human',1);
    T('雕刻确定性（同关两次入海格数一致）', SEACELLS.size===s1);
  }

  // ========== H. 批次A 常驻相机 ==========
  console.log('H. 常驻相机（全景归位 / 缩放锚点 / 边界钳制 / 复位 / 导演覆盖）');
  {
    stageLv('human',1);
    T('开局相机在全景归位点', Math.abs(cam.zoom-camHome.zoom)<1e-9 && camUser===false);
    T('地图包围盒已记录（平移边界依据）', !!MAPBB && MAPBB.x1>MAPBB.x0);
    const c0=scr2world({x:W/2,y:H/2});
    T('屏幕中心映射相机中心', Math.abs(c0.x-cam.x)<0.5 && Math.abs(c0.y-cam.y)<0.5);
    const ax=W/2+137, ay=H/2-88;
    const w0=scr2world({x:ax,y:ay});
    camZoomAt(ax,ay,1.5);
    const w1=scr2world({x:ax,y:ay});
    T('缩放锚点不动（锚点下世界点保持）', Math.abs(w0.x-w1.x)<0.6 && Math.abs(w0.y-w1.y)<0.6);
    T('缩放后标记为玩家视角', camUser===true);
    camZoomAt(ax,ay,99);
    T('缩放不超过上限 CFG.camMaxZoom', cam.zoom<=CFG.camMaxZoom+1e-9);
    camZoomAt(ax,ay,1e-9);
    T('缩放不低于下限 CFG.camMinZoom', cam.zoom>=CFG.camMinZoom-1e-9);
    camPanBy(1e7,0);
    T('平移边界钳制（拖不出世界尽头）', isFinite(cam.x) && cam.x<=MAPBB.x1+70 && Math.abs(cam.x-(MAPBB.x0+MAPBB.x1)/2)<(MAPBB.x1-MAPBB.x0)/2+70+W/cam.zoom);
    camReset();
    T('复位后清除玩家视角标记', camUser===false);
    for(let i=0;i<120;i++) camStep(0.05);
    T('camStep 缓移回全景归位点', Math.abs(cam.zoom-camHome.zoom)<0.02 && Math.abs(cam.x-camHome.x)<8 && Math.abs(cam.y-camHome.y)<8);
    cine={x:camHome.x+50,y:camHome.y,zoom:2.0};
    for(let i=0;i<120;i++) camStep(0.05);
    T('导演聚焦覆盖玩家相机', Math.abs(cam.zoom-2.0)<0.05);
    cine=null; camReset();
    for(let i=0;i<120;i++) camStep(0.05);
    T('导演结束后回到全景', Math.abs(cam.zoom-camHome.zoom)<0.02);
  }

  // ── I. 批次B · 生态皮肤（BIOMES）────────────────────────────────────
  {
    T('BIOMES 五套生态齐全', ['light','human','goblin','dragon','dwarf'].every(k=>BIOMES[k]));
    T('每套生态五件套字段齐全（水面/地色/湖/山/装饰+粒子）',
      Object.values(BIOMES).every(b=>b.bg&&b.land!==undefined&&b.lake&&b.mount&&b.kinds&&b.kinds.length&&b.mote&&b.pal));
    // 解析规则：战役按族，lvDef.biome 覆盖，自由对战回 light
    const _m=lastMode, _r=campRace;
    lastMode='camp'; campRace='dragon';
    T('战役按族解析生态', resolveBiome(null)==='dragon');
    T('关卡 biome 字段可覆盖种族默认', resolveBiome({biome:'dwarf'})==='dwarf');
    T('非法 biome 值回退种族默认', resolveBiome({biome:'xxx'})==='dragon');
    lastMode='free'; T('自由对战回通用主题', resolveBiome(null)==='light');
    lastMode=_m; campRace=_r;
    // 装饰词缀：按生态出词 + 总数上限（固定种子，零抖动）
    curBiome='dwarf'; buildMap('S4',{seed:101}); PROPS=[]; PROPS_KEY=''; makeProps();
    T('雪原生态装饰非空且守上限（≤格数×3 且 ≤260）',
      PROPS.length>0 && PROPS.length<=Math.min(nodes.length*3,260));
    T('雪原只出现雪原词缀（冰晶/雪松/岩石/雪窝）',
      PROPS.every(p=>['crystal','pine','rock','snowtuft'].includes(p.kind)));
    curBiome='dragon'; PROPS_KEY=''; makeProps();
    T('灰烬生态只出现灰烬词缀（烬晶/龙骸/焦木/黑岩）',
      PROPS.every(p=>['crystal','ribs','deadwood','rock'].includes(p.kind)));
    curBiome='light'; PROPS_KEY=''; makeProps();
    T('通用主题恢复原四件套（岩/枯木/草/树）',
      PROPS.every(p=>['rock','deadwood','grass','tree'].includes(p.kind)));
    T('四族生态地色两两不同（一眼认出是哪个世界）',
      new Set([BIOMES.human.land,BIOMES.goblin.land,BIOMES.dragon.land,BIOMES.dwarf.land]).size===4);
  }

  // ── J. 批次C · 人类战役结构表落地（C1）─────────────────────────────
  {
    T('人类 L3 抢收麦季 → S5 半岛', CAMPAIGNS.human[2].tpl==='S5');
    T('人类 L4 圣塔守望 → S1 新月湾', CAMPAIGNS.human[3].tpl==='S1');
    T('人类 L5 湖畔粮道 → grainRoute/S2 碎群岛', CAMPAIGNS.human[4].skel==='grainRoute' && SKEL.grainRoute.tpl==='S2');
    T('人类 L6 谷仓重镇 → granaryHold/S1 + 前线城堡×2', CAMPAIGNS.human[5].skel==='granaryHold' && SKEL.granaryHold.mods.frontCastle===2);
    T('人类 L7 光复村镇 → 加三座烽火台（mods 合并）', !!(CAMPAIGNS.human[6].mods && CAMPAIGNS.human[6].mods.towers===3));
    T('人类 L8 围城打援 → S6 三角洲 / L9 王对王 → S5 半岛', CAMPAIGNS.human[7].tpl==='S6' && CAMPAIGNS.human[8].tpl==='S5');
    T('教学关 L1/L2 保留手作图（无 tpl 覆盖）', !CAMPAIGNS.human[0].tpl && !CAMPAIGNS.human[1].tpl);
    // 逐关真实建图冒烟：形状对、能建成、有界
    const plans=[[3,'S5'],[4,'S1'],[5,'S2'],[6,'S1'],[7,'M0'],[8,'S6'],[9,'S5']];
    for(const [lv,expect] of plans){
      const def=CAMPAIGNS.human[lv-1];
      const mods=def.mods?Object.assign({},SKEL[def.skel].mods,def.mods):SKEL[def.skel].mods;
      buildMap(def.tpl||SKEL[def.skel].tpl, mods);
      T('人类 L'+lv+'「'+def.name+'」建成 '+expect+' 形态（'+nodes.length+' 格）', curTpl===expect && nodes.length>=10 && !!MAPBB);
    }
    // 谷仓重镇摆位：正好 2 座、中立、容量/驻军定值
    buildMap('S1', SKEL.granaryHold.mods);
    const fcs=nodes.filter(n=>n.type==='fcastle');
    T('谷仓重镇摆 2 座中立前线城堡', fcs.length===2 && fcs.every(n=>n.owner===0));
    T('前线城堡定容定驻（40/20）', fcs.every(n=>n.cap===40 && n.pop===20));
    T('中立时无人吃粮道', grainOwners().size===0);
    fcs[0].owner=1; fcs[1].owner=2;
    T('城堡各归其主 → 粮道各算各的', grainOwners().has(1) && grainOwners().has(2));
    fcs[0].owner=0; fcs[1].owner=0;
    // 粮道功能：同一个村、同一段时长，占城堡后产兵 ≈ ×1.5（冻 AI、关事件，排除干扰）
    const vil=nodes.find(n=>n.owner===0 && n.type==='village' && !n.bunker);
    vil.owner=1;
    aiFrozen=true; evNextAt=Infinity; gameTime=100;
    vil.pop=10; vil.acc=0;
    for(let i=0;i<480;i++){ update(0.016); gameTime+=0.016; }
    const base=vil.pop-10;
    fcs[0].owner=1; vil.pop=10; vil.acc=0;
    for(let i=0;i<480;i++){ update(0.016); gameTime+=0.016; }
    const boosted=vil.pop-10;
    T('粮道贯通后农舍产兵 ≈×'+CFG.grainRoadMul+'（实测基线 '+base+' → 加成 '+boosted+'）',
      base>0 && boosted>base && boosted/base>1.35 && boosted/base<1.7);
    aiFrozen=false;
    // 引导同步：L5 指麦仓、L6 指前线城堡，焦点解析器认得新词
    buildMap('S1', SKEL.granaryHold.mods);
    T('guideFocus 认得 fcastle（L6 引导可聚焦）', guideFocus('fcastle').length===1);
    T('dirResolveFocus 认得 fcastle（开场分镜可聚焦）', dirResolveFocus('fcastle').length===2);
  }

  console.log('');
  console.log('RESULT pass='+pass+' fail='+fail);
  process.exit(fail?1:0);
}catch(e){ console.log('DRIVER ERROR: '+(e && e.stack || e)); process.exit(1); }
})();
`;

eval(js + DRIVER);
