const MM=require('../src/core.js'); const {execSync}=require('child_process');
const raw=execSync("python3 -c \"from PIL import Image;import sys;im=Image.open('dificil.png').convert('RGBA');sys.stdout.buffer.write(im.tobytes())\"",{maxBuffer:1e8});
const W=900,H=700,rgba=new Uint8ClampedArray(raw); const TRUE=+process.argv[2];
const det=MM.backgroundDistance(rgba,W,H);
const thr=MM.detectAt(det,W,H,300,350,{threshold:det.threshold,fillHoles:false});
let t0=Date.now(); const grad=MM.gradient(rgba,W,H); const tg=Date.now()-t0;
t0=Date.now(); const ws=MM.segmentSeeds(grad,W,H,[[[300,350]]],[],{fillHoles:false}); const tw=Date.now()-t0;
const wsF=MM.fillHoles(ws);
const rep=(n,m)=>console.log(n.padEnd(34), MM.maskCount(m), ((MM.maskCount(m)/TRUE-1)*100).toFixed(2)+'%');
console.log('área real'.padEnd(34),TRUE);
rep('limiar (método antigo)',thr); rep('bordas (novo), sem incluir furos',ws); rep('bordas (novo), incluindo furos',wsF);
console.log(`tempo: gradiente ${tg} ms, segmentação ${tw} ms`);
// detectar todos refinado
const all=MM.detectAll(det,W,H,{threshold:det.threshold,minArea:500,fillHoles:true});
const allR=MM.detectAll(det,W,H,{threshold:det.threshold,minArea:500,fillHoles:true,grad});
console.log('detectar todos: limiar', all.map(MM.maskCount), '| refinado', allR.map(MM.maskCount));
