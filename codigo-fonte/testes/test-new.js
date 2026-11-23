const MM=require('../src/core.js'); const {execSync}=require('child_process'); const fs=require('fs');
const load=(f)=>{const raw=execSync(`python3 -c "from PIL import Image;import sys;im=Image.open('${f}').convert('RGBA');sys.stdout.write(str(im.size[0])+' '+str(im.size[1])+chr(10));sys.stdout.flush();sys.stdout.buffer.write(im.tobytes())"`,{maxBuffer:2e8});const nl=raw.indexOf(10);const [W,H]=raw.slice(0,nl).toString().split(' ').map(Number);return {W,H,rgba:new Uint8ClampedArray(raw.slice(nl+1))};};
// 1) iluminação: desvio do ágar antes/depois
{ const {W,H,rgba}=load('placa-luz.jpg');
  // ágar = pontos dentro da placa sem colônia por perto (amplitude local < 12 na foto original); mesmos pontos antes e depois
  const g0=(x,y)=>{const k=(y*W+x)*4; return Math.floor((rgba[k]+rgba[k+1]+rgba[k+2])/3+0.5);}; const pts=[];
  for(let y=120;y<980;y+=6)for(let x=270;x<1130;x+=6){ if(Math.hypot(x-700,y-550)>420) continue; let mn=255,mx=0; for(let j=-15;j<=15;j+=3)for(let i=-15;i<=15;i+=3){const v=g0(x+i,y+j); if(v<mn)mn=v; if(v>mx)mx=v;} if(mx-mn<12) pts.push([x,y]); }
  const agar=(a)=>{const v=pts.map(([x,y])=>{const k=(y*W+x)*4; return (a[k]+a[k+1]+a[k+2])/3;}); const m=v.reduce((s,x)=>s+x,0)/v.length; return Math.sqrt(v.reduce((s,x)=>s+(x-m)**2,0)/v.length);};
  const t=Date.now(), c=MM.subtractBackgroundRGBA(rgba,W,H,70); console.log(`iluminação (rolling ball, raio 70): desvio do ágar antes ${agar(rgba).toFixed(2)} → depois ${agar(c).toFixed(2)} em ${pts.length} pontos (${Date.now()-t} ms)`);
  const blur=MM.blurRGBA(rgba,W,H), grad=MM.gradient(rgba,W,H), info=JSON.parse(fs.readFileSync('placa-ex.json'));
  const models=info.map(e=>MM.colonyModel(blur,W,MM.segmentSeeds(grad,W,H,[[e.slice(0,2)]],[],{fillHoles:true}),H));
  const it=MM.findColonies(blur,W,H,models,{tol:2.5,minF:1/3,maxF:3,circTol:0.2,clusters:true,roi:{cx:700,cy:550,rx:480,ry:480}}); console.log('  colônias (a contagem usa a foto original; o anel de fundo compensa a luz):', it.reduce((a,i)=>a+i.n,0),'(real 60)'); }
// 2) fenda
{ const {W,H,rgba}=load('fenda.png'), truth=+fs.readFileSync('fenda.txt','utf8'); const m=MM.detectGap(rgba,W,H); const n=MM.maskCount(m); console.log(`fenda: ${n} px | real ${truth} | ${((n/truth-1)*100).toFixed(1)}%`); }
// 3) gel
{ const {W,H,rgba}=load('gel.png'); const d=[0,1,2,3].map(k=>MM.bandDensity(rgba,W,H,[35+k*110,112,90,46],true).density); console.log('gel: relativo à banda 1 →', d.map(v=>(v/d[0]).toFixed(3)).join(' : '), '(real 1 : 2 : 0.5 : 1.5)'); }
// 4) girar e recortar
{ const {W,H,rgba}=load('foto-teste.png'); let r={rgba,W,H}; for(let i=0;i<4;i++) r=MM.rotate90(r.rgba,r.W,r.H,true); let same=r.rgba.every((v,i)=>v===rgba[i]); const f=MM.flip(MM.flip(rgba,W,H,true).rgba,W,H,true); console.log('4× girar 90° = original:',same,'| espelhar 2× = original:', f.rgba.every((v,i)=>v===rgba[i]));
  const a=MM.rotate(rgba,W,H,30), b=MM.rotate(a.rgba,a.W,a.H,-30); const c=MM.crop(b.rgba,b.W,b.H,[(b.W-W)/2,(b.H-H)/2,W,H]); let e=0,n=0; for(let y=200;y<900;y+=3)for(let x=200;x<1400;x+=3){e+=Math.abs(c.rgba[(y*c.W+x)*4]-rgba[(y*W+x)*4]);n++;} console.log('girar 30° e voltar: erro médio', (e/n).toFixed(2),'níveis de cinza (interpolação)'); }
