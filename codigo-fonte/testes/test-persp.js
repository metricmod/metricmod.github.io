const MM=require('../src/core.js'); const {execSync}=require('child_process'); const fs=require('fs');
const load=(f)=>{const raw=execSync(`python3 -c "from PIL import Image;import sys;im=Image.open('${f}').convert('RGBA');sys.stdout.write(str(im.size[0])+' '+str(im.size[1])+chr(10));sys.stdout.flush();sys.stdout.buffer.write(im.tobytes())"`,{maxBuffer:2e8});const nl=raw.indexOf(10);const [W,H]=raw.slice(0,nl).toString().split(' ').map(Number);return {W,H,rgba:new Uint8ClampedArray(raw.slice(nl+1))};};
const {W,H,rgba}=load('foto-inclinada.jpg'), info=JSON.parse(fs.readFileSync('incl.json'));
const truth=Math.PI*95*55/6400;
// sem correção: escala pela régua inclinada (média dos lados longos)
const q=info.quad, e=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]); const ppuNo=(e(q[0],q[1])+e(q[3],q[2]))/2/11.25;
let g=MM.gradient(rgba,W,H), m=MM.segmentSeeds(g,W,H,[[info.bean]],[],{fillHoles:true});
console.log('sem correção : feijão', (MM.maskCount(m)/ppuNo**2).toFixed(3),'cm² | real',truth.toFixed(3), '|', ((MM.maskCount(m)/ppuNo**2/truth-1)*100).toFixed(1)+'%');
const t=Date.now(); const r=MM.rectify(rgba,W,H,MM.orderQuad(q.map(p=>p.slice()).reverse()),11.25,0.75);
const Hf=MM.homography(MM.orderQuad(q), [[r.rect[0],r.rect[1]],[r.rect[2],r.rect[1]],[r.rect[2],r.rect[3]],[r.rect[0],r.rect[3]]]);
const b2=MM.applyH(Hf,info.bean[0],info.bean[1]);
g=MM.gradient(r.rgba,r.W,r.H); m=MM.segmentSeeds(g,r.W,r.H,[[b2]],[],{fillHoles:true});
console.log('com correção : feijão', (MM.maskCount(m)/r.ppu**2).toFixed(3),'cm² | real',truth.toFixed(3), '|', ((MM.maskCount(m)/r.ppu**2/truth-1)*100).toFixed(1)+'%', '| imagem', r.W+'×'+r.H, Date.now()-t,'ms');
