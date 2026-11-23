const MM=require('../src/core.js'); const {execSync}=require('child_process');
const raw=execSync(`python3 -c "from PIL import Image;import sys;im=Image.open('encostados.png').convert('RGBA');sys.stdout.buffer.write(im.tobytes())"`,{maxBuffer:2e8});
const W=900,H=600,rgba=new Uint8ClampedArray(raw), det=MM.backgroundDistance(rgba,W,H);
for (const split of [false,true]) { const t=Date.now(); const m=MM.detectAll(det,W,H,{threshold:det.threshold,minArea:50,fillHoles:true,split}); console.log(split?'separando  ':'sem separar', m.length,'objetos', Date.now()-t,'ms', split? m.map(MM.maskCount).sort((a,b)=>a-b).join(' '):''); }
