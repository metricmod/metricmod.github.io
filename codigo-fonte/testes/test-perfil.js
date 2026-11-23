// Perfil de linha e histograma: MetricMod × ImageJ 1.54u (referência gerada por ij-perfil.ijm).
const MM=require('../src/core.js'); const {execSync}=require('child_process'); const fs=require('fs');
const raw=execSync(`python3 -c "from PIL import Image;import sys;im=Image.open('foto-teste.png').convert('RGBA');sys.stdout.buffer.write(im.tobytes())"`,{maxBuffer:2e8});
const W=1600,H=1100,rgba=new Uint8ClampedArray(raw);
const ref=Object.fromEntries(fs.readFileSync('ij_perfil.csv','utf8').trim().split('\n').map(l=>{const a=l.split(',');return [a[0],a.slice(1).map(Number)];}));
const L=[[100,200,600,450],[1050.5,190.5,1260.25,330.75],[300,800,300,1000]];
L.forEach((l,i)=>{ const r=ref['L'+i]; for (const off of [0.5]) { const p=MM.lineProfile(rgba,W,H,l.map(v=>v+off)).values; let mx=0; for(let k=0;k<Math.min(p.length,r.length);k++) mx=Math.max(mx,Math.abs(p[k]-r[k])); console.log(`linha ${i}: pontos ${p.length}/${r.length}: maior diferença ${mx.toExponential(2)}`); } });
const m=MM.cropMask(MM.rasterPolygon(MM.ovalPolygon(300,300,401,233,720),W,H)); const h=MM.histogram(m,rgba,W,H).h; let d=0; for(let k=0;k<256;k++) d+=Math.abs(h[k]-ref.H[k]); console.log('histograma da elipse: diferença total', d);
const ht=MM.histogram(null,rgba,W,H).h; d=0; for(let k=0;k<256;k++) d+=Math.abs(ht[k]-ref.HT[k]); console.log('histograma da foto: diferença total', d);
