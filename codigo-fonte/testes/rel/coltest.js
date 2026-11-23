const MM=require('../../src/core.js'); const fs=require('fs'); const {execSync}=require('child_process');
const load=(f)=>{const raw=execSync(`python3 -c "from PIL import Image;import sys;im=Image.open('${f}').convert('RGBA');sys.stdout.write(str(im.size[0])+' '+str(im.size[1])+chr(10));sys.stdout.flush();sys.stdout.buffer.write(im.tobytes())"`,{maxBuffer:2e8});const nl=raw.indexOf(10);const [W,H]=raw.slice(0,nl).toString().split(' ').map(Number);return {W,H,rgba:new Uint8ClampedArray(raw.slice(nl+1))};};
const {W,H,rgba}=load('placa-luz.jpg'); const info=JSON.parse(fs.readFileSync('placa-ex.json'));
const count=(c)=>{const blur=MM.blurRGBA(c,W,H), grad=MM.gradient(c,W,H); const models=info.map(e=>MM.colonyModel(blur,W,MM.segmentSeeds(grad,W,H,[[e.slice(0,2)]],[],{fillHoles:true}),H));
 const it=MM.findColonies(blur,W,H,models,{tol:2.5,minF:1/3,maxF:3,circTol:0.2,clusters:true,roi:{cx:700,cy:550,rx:480,ry:480}}); return it.reduce((a,i)=>a+i.n,0);};
console.log('original', count(rgba));
// variante: fundo do ImageJ, somando de volta o nível médio do fundo de cada canal
const N=W*H, out=new Uint8ClampedArray(rgba.length);
for(let c=0;c<3;c++){const ch=new Float32Array(N); for(let i=0;i<N;i++) ch[i]=rgba[i*4+c]; const bg=MM.rollingBallBackground(ch,W,H,70,false); let m=0; for(let i=0;i<N;i++) m+=bg[i]; m/=N; for(let i=0;i<N;i++) out[i*4+c]=rgba[i*4+c]-bg[i]+m;}
for(let i=0;i<N;i++) out[i*4+3]=255; console.log('com nível médio', count(out));
console.log('ImageJ puro', count(MM.subtractBackgroundRGBA(rgba,W,H,70)));
console.log('info', JSON.stringify(info));
