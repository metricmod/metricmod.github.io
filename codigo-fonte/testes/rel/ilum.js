const MM=require('../../src/core.js'); const fs=require('fs'); const {execSync}=require('child_process');
const load=(f)=>{const raw=execSync(`python3 -c "from PIL import Image;import sys;im=Image.open('${f}').convert('RGBA');sys.stdout.write(str(im.size[0])+' '+str(im.size[1])+chr(10));sys.stdout.flush();sys.stdout.buffer.write(im.tobytes())"`,{maxBuffer:2e8});const nl=raw.indexOf(10);const [W,H]=raw.slice(0,nl).toString().split(' ').map(Number);return {W,H,rgba:new Uint8ClampedArray(raw.slice(nl+1))};};
const txt=(f)=>fs.readFileSync(f,'utf8').trim().split('\n').map(l=>l.split('\t').map(Number));
const {W,H,rgba}=load('placa-luz.jpg'); const g0=txt('rel/g2.txt');
// ágar: pontos dentro da placa cuja vizinhança 31x31 não tem colônia (amplitude local < 12 níveis)
const pts=[]; for(let y=120;y<980;y+=6)for(let x=270;x<1130;x+=6){ if(Math.hypot(x-700,y-550)>420) continue; let mn=255,mx=0; for(let j=-15;j<=15;j+=3)for(let i=-15;i<=15;i+=3){const v=g0[y+j][x+i]; if(v<mn)mn=v; if(v>mx)mx=v;} if(mx-mn<12) pts.push([x,y]); }
const st=(get)=>{const v=pts.map(([x,y])=>get(x,y)); const m=v.reduce((s,a)=>s+a,0)/v.length; const sd=Math.sqrt(v.reduce((s,a)=>s+(a-m)**2,0)/v.length); let lo=Infinity,hi=-Infinity; v.forEach(a=>{lo=Math.min(lo,a);hi=Math.max(hi,a)}); return `média ${m.toFixed(1)}\tdesvio ${sd.toFixed(2)}\tCV ${(100*sd/m).toFixed(2)}%\tamplitude ${(hi-lo).toFixed(1)}`;};
console.log('pontos de ágar', pts.length);
console.log('original        ', st((x,y)=>g0[y][x]));
const c=MM.flatField(rgba,W,H,60); console.log('MetricMod (r=60) ', st((x,y)=>{const k=(y*W+x)*4; return Math.round((c[k]+c[k+1]+c[k+2])/3);}));
for(const r of [60,150]){const g=txt(`rel/rbd${r}.txt`); console.log(`ImageJ rolling ${r}`, st((x,y)=>g[y][x]));}
// colônias contadas após cada correção (mesmo procedimento do teste)
