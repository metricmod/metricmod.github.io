// Seleção e linha à mão livre: MetricMod × ImageJ 1.54u (referência gerada por ij-maolivre.ijm).
const MM=require('../src/core.js'); const fs=require('fs');
const ref=Object.fromEntries(fs.readFileSync('ij_maolivre.csv','utf8').trim().split('\n').map(l=>l.split(',')).map(([k,v])=>[k,+v]));
const P=JSON.parse(fs.readFileSync('maolivre.json','utf8')), Lp=JSON.parse(fs.readFileSync('linhalivre.json','utf8'));
const area=MM.maskCount(MM.rasterPolygon(P,1600,1100)); const per=MM.polyLength(P,true,true); const f=MM.feret(MM.convexHull(P)); const len=MM.polyLength(Lp,false,true);
const e=(a,b)=>((a-b)/b*100).toFixed(4)+'%';
console.log(`área ${area}/${ref.area} (${e(area,ref.area)}) | perímetro ${per.toFixed(6)}/${ref.perim} (${e(per,ref.perim)}) | Feret ${f.max.toFixed(6)}/${ref.feret} | Feret mín ${f.min.toFixed(6)}/${ref.minferet} | linha ${len.toFixed(6)}/${ref.linha} (${e(len,ref.linha)})`);
