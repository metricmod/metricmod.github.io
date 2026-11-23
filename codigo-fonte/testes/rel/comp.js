const MM=require('../../src/core.js'); const fs=require('fs'); const {execSync}=require('child_process');
const load=(f)=>{const raw=execSync(`python3 -c "from PIL import Image;import sys;im=Image.open('${f}').convert('RGBA');sys.stdout.write(str(im.size[0])+' '+str(im.size[1])+chr(10));sys.stdout.flush();sys.stdout.buffer.write(im.tobytes())"`,{maxBuffer:2e8});const nl=raw.indexOf(10);const [W,H]=raw.slice(0,nl).toString().split(' ').map(Number);return {W,H,rgba:new Uint8ClampedArray(raw.slice(nl+1))};};
const txt=(f)=>fs.readFileSync(f,'utf8').trim().split('\n').map(l=>l.split('\t').map(Number));
const ij=fs.readFileSync('rel/otsu_ij.csv','utf8').trim().split('\n').map(l=>l.split(','));
console.log('--- Otsu e conversão para cinza');
ij.forEach(([f,lo,hi],i)=>{ const g=txt(`rel/g${i}.txt`); const {W,H,rgba}=load(f); let diff=0,n=0; const hist=new Array(256).fill(0);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const v=g[y][x]; hist[v]++; const k=(y*W+x)*4; const m=MM.grayAt(rgba,null,y*W+x); if(m!==v) diff++; n++;}
  console.log(`${f}\t${W}x${H}\tcinza diferente: ${diff}/${n}\tOtsu ImageJ ${hi}\tMetricMod ${MM.otsu(hist)}`); });
console.log('--- iluminação');
const {W,H,rgba}=load('placa-luz.jpg'); const g0=txt('rel/g2.txt'); const pts=[];
for(let y=100;y<1000;y+=7)for(let x=250;x<1150;x+=7){if(Math.hypot(x-700,y-550)>440)continue;const v=g0[y][x]; if(v>150&&v<230) pts.push([x,y]);}
const cv=(get)=>{const v=pts.map(([x,y])=>get(x,y)); const m=v.reduce((s,a)=>s+a,0)/v.length; const sd=Math.sqrt(v.reduce((s,a)=>s+(a-m)**2,0)/v.length); return [m,sd,100*sd/m];};
const show=(n,r)=>console.log(`${n}\tmédia ${r[0].toFixed(1)}\tdesvio ${r[1].toFixed(2)}\tCV ${r[2].toFixed(2)}%`);
show('original', cv((x,y)=>g0[y][x]));
const c=MM.flatField(rgba,W,H,60); show('MetricMod', cv((x,y)=>{const k=(y*W+x)*4; return (c[k]+c[k+1]+c[k+2])/3;}));
for(const r of [60,150]){const g=txt(`rel/rb${r}.txt`); show('ImageJ rolling ball '+r, cv((x,y)=>g[y][x]));}
console.log('pontos', pts.length);
console.log('--- gel');
const gl=load('gel.png'); const d=[0,1,2,3].map(k=>MM.bandDensity(gl.rgba,gl.W,gl.H,[35+k*110,112,90,46],true).density);
const gi=fs.readFileSync('rel/gel_ij.csv','utf8').trim().split('\n').map(l=>+l.split(',')[3]);
console.log('MetricMod', d.map(v=>v.toFixed(0)).join(' '), '|', d.map(v=>(v/d[0]).toFixed(3)).join(' : '));
console.log('ImageJ   ', gi.map(v=>v.toFixed(0)).join(' '), '|', gi.map(v=>(v/gi[0]).toFixed(3)).join(' : '));
