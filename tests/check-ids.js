// 静态校验：JS 里 getElementById("x") 引用的每个 id 都必须真实存在于 HTML 中
// （skBack 丢失导致白屏的回归测试）
const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const defined=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
const used=new Set([...html.matchAll(/getElementById\(\s*"([^"]+)"\s*\)/g)].map(m=>m[1]));
const missing=[...used].filter(id=>!defined.has(id));
if(missing.length){
  console.log('MISSING IDS:', missing.join(', '));
  process.exit(1);
}
console.log('ALL ' + used.size + ' REFERENCED IDS EXIST');
// 额外：div 标签配平
const body=html.slice(html.indexOf('<body>'));
const open=(body.match(/<div[\s>]/g)||[]).length;
const close=(body.match(/<\/div>/g)||[]).length;
if(open!==close){ console.log('DIV MISMATCH open='+open+' close='+close); process.exit(1); }
console.log('DIV BALANCED '+open+'/'+close);
