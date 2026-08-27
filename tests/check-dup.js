// 检查重复 ID（getElementById 只认第一个，重复会让逻辑绑到不可见元素上）
const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
const seen={}, dup={};
for(const id of ids){ seen[id]=(seen[id]||0)+1; if(seen[id]===2) dup[id]=true; }
console.log('total ids:', ids.length, '| duplicated:', Object.keys(dup).length);
console.log(Object.keys(dup).join(', ')||'(none)');
// 关键新元素确认存在且唯一
for(const k of ['lootBox','lvIntro','lvInT','lvInS','skGo','lbGo','skGrid']){
  console.log(k, 'x'+(seen[k]||0));
}
