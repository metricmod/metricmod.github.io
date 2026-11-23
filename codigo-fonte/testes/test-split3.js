const MM=require('../src/core.js'); const {execSync}=require('child_process');
for (const f of ['encostados.png','encostados-ruido.png']) {
const raw=execSync(`python3 -c "from PIL import Image;import sys;im=Image.open('${f}').convert('RGBA');sys.stdout.buffer.write(im.tobytes())"`,{maxBuffer:2e8});
const W=900,H=600,rgba=new Uint8ClampedArray(raw), det=MM.backgroundDistance(rgba,W,H);
for (const [tol,rel] of [[0.5,0],[1,0],[1,0.03],[1,0.05]]) { const bin=new Uint8Array(W*H); for(let i=0;i<W*H;i++) bin[i]=det.img[i]>det.threshold?1:0;
  const sp=MM.splitTouching(bin,W,H,tol,rel); const {comps}=MM.label(sp,W,H); const c=comps.filter(c=>c.area>=50);
  console.log(f,'tol',tol,'rel',rel,'->',c.length,'objetos'); } }
