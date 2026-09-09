// 几何自检：折线化（roughen）之后，地块多边形必须满足三条硬约束
//   1) 面积 > 0，没有退化成一条线
//   2) 不自交（自交会让 canvas 填充出现「蝴蝶结」黑块）
//   3) 相邻地块共享边严丝合缝 —— 两块各自算出的细分点必须逐点相同，否则会露出背景缝
// 第 3 条是 roughen 方案成立的前提，必须实测而不是靠推理。
const fs=require('fs');
const path=require('path');
// 默认校验「当前实机」快照（gen-final-map.js 产出）；给参数 compare 则校验历史方案快照。
const finalP = path.join(__dirname,'_out','_snaps.json');   // 生成物，统一放 tests/_out/
const histP  = path.join(__dirname,'_snaps.json');          // 历史方案快照（若保留）
const srcP   = (process.argv[2]==='compare' && fs.existsSync(histP)) ? histP : finalP;
if(!fs.existsSync(srcP)){
  // 快照不入库，缺失时直接自动生成，不再要求手工先跑 gen-final-map.js
  console.log('快照缺失，先自动生成：node tests/gen-final-map.js');
  require('child_process').execSync('node "'+path.join(__dirname,'gen-final-map.js')+'"', {stdio:'inherit'});
}
if(!fs.existsSync(srcP)) throw new Error('快照生成失败：'+srcP);
const all=JSON.parse(fs.readFileSync(srcP,'utf8'));

const segInt=(p1,p2,p3,p4)=>{
  const d=(p2.x-p1.x)*(p4.y-p3.y)-(p2.y-p1.y)*(p4.x-p3.x);
  if(Math.abs(d)<1e-12) return false;
  const t=((p3.x-p1.x)*(p4.y-p3.y)-(p3.y-p1.y)*(p4.x-p3.x))/d;
  const u=((p3.x-p1.x)*(p2.y-p1.y)-(p3.y-p1.y)*(p2.x-p1.x))/d;
  return t>1e-6 && t<1-1e-6 && u>1e-6 && u<1-1e-6;
};
function selfIntersect(P){
  const n=P.length;
  for(let i=0;i<n;i++) for(let j=i+2;j<n;j++){
    if(i===0 && j===n-1) continue;               // 相邻边共享端点，不算相交
    if(segInt(P[i],P[(i+1)%n],P[j],P[(j+1)%n])) return true;
  }
  return false;
}
const areaOf=(p)=>{ let a=0; for(let i=0;i<p.length;i++){ const q=p[(i+1)%p.length]; a+=p[i].x*q.y-q.x*p[i].y; } return Math.abs(a/2); };

// 共享边缝隙检测：同一条边的「规范化端点键」若出现两组不同的端点坐标 = 开缝
function seamCheck(nodes){
  // key 用 0.1 精度（容忍浮点误差导致的同一条边匹配不上）；sig 必须端点规范化，
  // 否则同一条边在两块里一次记成 A→B、一次记成 B→A，会被误判成开缝。
  const nk=(a,b,p)=>{ const ka=a.x.toFixed(p)+','+a.y.toFixed(p), kb=b.x.toFixed(p)+','+b.y.toFixed(p);
                      return ka<kb? ka+'|'+kb : kb+'|'+ka; };
  const seen={}; let mismatch=0, shared=0;
  for(const n of nodes){
    const P=n.poly, L=P.length;
    for(let i=0;i<L;i++){
      const A=P[i], B=P[(i+1)%L];
      const k=nk(A,B,1), sig=nk(A,B,2);
      if(!seen[k]){ seen[k]=sig; }
      else { shared++; if(seen[k]!==sig) mismatch++; }
    }
  }
  return {shared, mismatch};
}

let bad=0;
for(const vid of Object.keys(all)){
  for(const id of ['h1','dusk']){
    const s=all[vid][id]; if(!s||!s.nodes) continue;
    const nodes=s.nodes;
    let zero=0, selfx=0, minA=1e9, maxA=0;
    for(const n of nodes){
      const a=areaOf(n.poly);
      if(a<1e-6) zero++;
      if(selfIntersect(n.poly)) selfx++;
      minA=Math.min(minA,a); maxA=Math.max(maxA,a);
    }
    const seam=seamCheck(nodes);
    const ok = zero===0 && selfx===0 && seam.mismatch===0;
    if(!ok) bad++;
    console.log(`${vid}/${id}: 格数=${nodes.length} 零面积=${zero} 自交=${selfx} 共享边=${seam.shared} 开缝=${seam.mismatch}`
      + ` 面积=[${minA.toFixed(0)}~${maxA.toFixed(0)}] ${ok?'OK':'FAIL'}`);
  }
}
console.log(bad===0 ? '\n几何自检全部通过' : '\n有 '+bad+' 项不通过');
process.exit(bad===0?0:1);
