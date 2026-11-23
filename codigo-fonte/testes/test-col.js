const MM=require('../src/core.js'); const {execSync}=require('child_process'); const fs=require('fs');
const load=(f)=>{const raw=execSync(`python3 -c "from PIL import Image;import sys;im=Image.open('${f}').convert('RGBA');sys.stdout.write(str(im.size[0])+' '+str(im.size[1])+chr(10));sys.stdout.flush();sys.stdout.buffer.write(im.tobytes())"`,{maxBuffer:2e8});const nl=raw.indexOf(10);const [W,H]=raw.slice(0,nl).toString().split(' ').map(Number);return {W,H,rgba:new Uint8ClampedArray(raw.slice(nl+1))};};
const {W,H,rgba}=load('placa.jpg'); const info=JSON.parse(fs.readFileSync('placa.json'));
let t=Date.now(); const grad=MM.gradient(rgba,W,H), blur=MM.blurRGBA(rgba,W,H);
const [sx,sy]=info.sample; const m=MM.segmentSeeds(grad,W,H,[[[sx,sy]]],[],{fillHoles:true});
const model=MM.colonyModel(blur,W,m,H); console.log('exemplo: área',model.area,'esperado ≈',Math.round(Math.PI*info.sample[2]**2),'circ',model.circ.toFixed(2),'cor',model.mean.map(v=>v.toFixed(1)).join(','));
for (const roi of [null,{cx:700,cy:550,rx:470,ry:470}]) {
  const items=MM.findColonies(blur,W,H,[model],{tol:1.5,minF:0.33,maxF:3,circTol:0.2,clusters:true,roi});
  const total=items.reduce((a,i)=>a+i.n,0);
  console.log(roi?'com área de busca':'sem área de busca','| marcações',items.length,'| colônias',total,'| real',info.truth,'| aglomerados',items.filter(i=>i.n>1).map(i=>i.n).join(','), '|',Date.now()-t,'ms');
}
{ const items=MM.findColonies(blur,W,H,[model],{tol:1.5,minF:0.33,maxF:3,circTol:0.2,clusters:true,roi:{cx:700,cy:550,rx:470,ry:470}}).filter(i=>i.n===1).sort((a,b)=>a.area-b.area);
  const pick=[items[2],items[Math.floor(items.length/2)],items[items.length-3]].map(i=>[+i.x.toFixed(1),+i.y.toFixed(1),i.area]);
  fs.writeFileSync('placa-ex.json',JSON.stringify(pick)); console.log('exemplos',pick); }
