// 全关卡连通性/可玩性体检：四族 × 10 关全部跑一遍建图，
// 任何一关出现「格数暴跌 / 不连通 / 我方无起点 / 敌方无基地」都算改坏。
// 这次改动虽然只锁在 buildFixedMap 内，但另外 11 张手画固定图也一起被有机化了，必须逐个验。
const fs=require('fs');
const vm=require('vm');

const GEN = fs.readFileSync('tests/gen-map-organic.js','utf8');
function slice(a,b,tag){ const i=GEN.indexOf(a), j=GEN.indexOf(b);
  if(i<0||j<0||j<=i) throw new Error('抽取 ['+tag+'] 失败'); return GEN.slice(i,j); }
const HELP = new Function(
  slice('function mkEl(id){', "const fs=require('fs');",'sandbox')
  + '; return { makeSandbox };'
)();

const html = fs.readFileSync('index.html','utf8');
const BASE_JS = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n');

const DRIVER = "\n;(function(){\ntry{\n"
+"  getProg().unlockAll = true;\n"
+"  window.__rep = [];\n"
+"  const races=['human','dragon','goblin','dwarf'];\n"
+"  for(const race of races){\n"
+"    for(let lv=1; lv<=10; lv++){\n"
+"      pickRace(race); pendingCampLevel=lv; campStage=lv; campRace=race; lastMode='camp';\n"
+"      let err=null;\n"
+"      try{ stageBattle(); }catch(e){ err=String(e.message||e); }\n"
+"      if(err){ window.__rep.push({race,lv,err}); continue; }\n"
+"      let conn=true;\n"
+"      if(nodes.length){ const seen=new Set([nodes[0]]), q=[nodes[0]];\n"
+"        while(q.length){ const u=q.pop(); for(const v of (u.adj||[])) if(!seen.has(v)){ seen.add(v); q.push(v); } }\n"
+"        conn = seen.size===nodes.length; }\n"
+"      let mine=0, foe=0;\n"
+"      for(const n of nodes){ if(n.owner===1) mine++; else if(n.owner>=2) foe++; }\n"
+"      window.__rep.push({race,lv,n:nodes.length,conn,mine,foe});\n"
+"    }\n"
+"  }\n"
+"}catch(e){ window.__err=(e&&e.stack||String(e)); }\n"
+"})();\n";

const sb=HELP.makeSandbox();
vm.runInContext(BASE_JS + DRIVER, vm.createContext(sb), {filename:'all-levels.js'});
if(sb.__err){ console.log('跑挂了：\n'+sb.__err); process.exit(1); }

const RN={human:'人类',dragon:'天龙',goblin:'哥布林',dwarf:'矮人'};
let bad=0;
for(const r of sb.__rep){
  if(r.err){ console.log(`${RN[r.race]} L${r.lv}  建图抛错: ${r.err}`); bad++; continue; }
  const ok = r.n>=8 && r.conn && r.mine>=1 && r.foe>=1;
  if(!ok) bad++;
  console.log(`${RN[r.race]} L${r.lv}  ${r.n}格  连通=${r.conn?'是':'否'}  我方=${r.mine}  敌方=${r.foe}  ${ok?'':'  <<< 异常'}`);
}
console.log(bad===0 ? '\n全部 40 关体检通过' : '\n有 '+bad+' 关异常');
process.exit(bad?1:0);
