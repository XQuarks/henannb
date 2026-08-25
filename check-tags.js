// 定位多余的 </div>：在每个顶层元素标记处深度应为 0
const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('<body>');
const body=html.slice(start);
const lines=body.split('\n');
let depth=0;
const markers=['<div id="hud"','<div id="lootBox"','<div id="lvIntro"','<div id="tip"','<div id="evBanner"','<div id="banner"','<div id="factionSelect"','<div id="skillSelect"','<div id="menuScreen"'];
lines.forEach((ln,i)=>{
  const opens=(ln.match(/<div[\s>]/g)||[]).length;
  const closes=(ln.match(/<\/div>/g)||[]).length;
  for(const mk of markers){
    if(ln.includes(mk)) console.log('depth='+depth+'  <- '+mk+'  (line '+(i+1)+')');
  }
  depth+=opens-closes;
});
console.log('final depth =', depth);
