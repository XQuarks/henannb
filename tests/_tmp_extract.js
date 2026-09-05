// 临时工具：从 index.html 里按大括号计数提取 CAMPAIGNS / SKEL，列出四族 40 关骨架
const fs = require('fs');
const s = fs.readFileSync('index.html', 'utf8');

function grab(decl) {
  const i = s.indexOf(decl);
  if (i < 0) throw new Error('not found: ' + decl);
  let j = s.indexOf('{', i);
  let d = 0;
  for (let k = j; k < s.length; k++) {
    if (s[k] === '{') d++;
    else if (s[k] === '}') { d--; if (d === 0) return s.slice(j, k + 1); }
  }
  throw new Error('unbalanced: ' + decl);
}

const SKEL = eval('(' + grab('const SKEL=') + ')');
const CAMPAIGNS = eval('(' + grab('const CAMPAIGNS=') + ')');

for (const race of ['human', 'dragon', 'goblin', 'dwarf']) {
  console.log('=== ' + race + ' ===');
  CAMPAIGNS[race].forEach((L, i) => {
    const sk = SKEL[L.skel] || {};
    const mods = Object.keys(sk.mods || {}).join(',');
    console.log(`L${i + 1}\t${L.name}\tskel=${L.skel}\ttpl=${sk.tpl}\t[${mods}]\t${sk.info || ''}`);
  });
}
