const MM = require('../src/core.js'); const fs = require('fs');
const rows = fs.readFileSync(__dirname+'/shapes.txt','utf8').trim().split('\n').map(l=>l.split('\t').map(Number));
const H = rows.length, W = rows[0].length, rgba = new Uint8ClampedArray(W*H*4);
for (let y=0;y<H;y++) for (let x=0;x<W;x++){const v=rows[y][x],k=(y*W+x)*4; rgba[k]=rgba[k+1]=rgba[k+2]=v; rgba[k+3]=255;}
const det = MM.backgroundDistance(rgba,W,H);
const masks = MM.detectAll(det,W,H,{threshold:det.threshold,minArea:1,fillHoles:true});
const ij = fs.readFileSync(__dirname+'/ij_particles.csv','utf8').trim().split('\n').map(l=>l.split(',').map(Number));
let maxErr = {area:0,perim:0,feret:0,minFeret:0,circ:0}, fail=0;
console.log(`objetos: MetricMod ${masks.length} | ImageJ ${ij.length}`);
for (const m of masks) {
  const r = MM.measureMask(m, rgba, W);
  const ref = ij.find(q => Math.hypot(q[0]-r.centroid[0], q[1]-r.centroid[1]) < 1);
  if (!ref) { console.log('sem par', r.centroid); fail++; continue; }
  const cmp = {area:[r.area,ref[2]], perim:[r.perimeter,ref[3]], feret:[r.feret,ref[4]], minFeret:[r.minFeret,ref[5]], circ:[r.circularity,ref[6]]};
  const line = Object.entries(cmp).map(([k,[a,b]])=>{const e=Math.abs(a-b)/Math.max(1e-9,Math.abs(b)); maxErr[k]=Math.max(maxErr[k],e); return `${k} ${a.toFixed(3)}/${b}`;});
  console.log(line.join(' | '));
}
console.log('erro relativo máximo:', Object.fromEntries(Object.entries(maxErr).map(([k,v])=>[k,(v*100).toFixed(4)+'%'])));
// polígono fracionário
const P = [[10.3,10.8],[90.7,20.1],[70.2,95.4],[5.6,60.5]];
const pm = MM.rasterPolygon(P, 600, 400);
let shoe=0; for(let i=0,j=3;i<4;j=i++) shoe += (P[j][0]+P[i][0])*(P[j][1]-P[i][1]); shoe=Math.abs(shoe/2);
const ijp = fs.readFileSync(__dirname+'/ij_poly.csv','utf8').split(',').map(Number);
console.log(`polígono: pixels ${MM.maskCount(pm)} | área geométrica ${shoe.toFixed(2)} | ImageJ Area ${ijp[0]}`);
const f = MM.feret(MM.convexHull(P)); console.log(`polígono Feret ${f.max.toFixed(4)}/${ijp[2]} MinFeret ${f.min.toFixed(4)}/${ijp[3]}`);
