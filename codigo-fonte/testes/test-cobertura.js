// Porcentagem de cobertura (escuro e claro): MetricMod × ImageJ 1.54u (referência gerada por ij-cobertura.ijm).
const MM=require('../src/core.js'); const fs=require('fs'); const {execSync}=require('child_process');
const load=(f)=>{const raw=execSync(`python3 -c "from PIL import Image;import sys;im=Image.open('${f}').convert('RGBA');sys.stdout.write(str(im.size[0])+' '+str(im.size[1])+chr(10));sys.stdout.flush();sys.stdout.buffer.write(im.tobytes())"`,{maxBuffer:2e8});const nl=raw.indexOf(10);const [W,H]=raw.slice(0,nl).toString().split(' ').map(Number);return {W,H,rgba:new Uint8ClampedArray(raw.slice(nl+1))};};
for (const l of fs.readFileSync('ij_cobertura.csv','utf8').trim().split('\n')) { const [f,dk,lt]=l.split(','); const {W,H,rgba}=load(f);
  const pc=(m)=>{const c=MM.coverageBase(rgba,W,H,m); let n=0; for(let i=0;i<W*H;i++) if(c.img[i]>c.threshold) n++; return 100*n/(W*H);};
  console.log(`${f}: escuro ${pc('dark').toFixed(6)}/${dk} | claro ${pc('light').toFixed(6)}/${lt}`); }
// com seleção (elipse 300,300,401,233)
{ const l=fs.readFileSync('ij_cobertura_roi.csv','utf8').trim().split(','); const {W,H,rgba}=load('foto-teste.png');
  const c=MM.coverageBase(rgba,W,H,'dark'), m=MM.cropMask(MM.rasterPolygon(MM.ovalPolygon(300,300,401,233,720),W,H)), t=MM.coverageThreshold(c.img,'dark',m,W); let n=0,k=0;
  for(let j=0;j<m.h;j++)for(let i=0;i<m.w;i++) if(m.data[j*m.w+i]){ n++; if(c.img[(j+m.y)*W+i+m.x]>t) k++; }
  console.log(`elipse (limiar só dentro dela): escuro ${(100*k/n).toFixed(6)}/${l[1]} | limiar ${254-t}/${l[3]}`); }
