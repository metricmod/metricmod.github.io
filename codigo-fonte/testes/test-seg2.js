const MM=require('../src/core.js'); const {execSync}=require('child_process');
const load=(f)=>{const raw=execSync(`python3 -c "from PIL import Image;import sys;im=Image.open('${f}').convert('RGBA');sys.stdout.write(str(im.size[0])+' '+str(im.size[1])+chr(10));sys.stdout.flush();sys.stdout.buffer.write(im.tobytes())"`,{maxBuffer:2e8});const nl=raw.indexOf(10);const [W,H]=raw.slice(0,nl).toString().split(' ').map(Number);return {W,H,rgba:new Uint8ClampedArray(raw.slice(nl+1))};};
const {W,H,rgba}=load('foto-teste.jpg'); const det=MM.backgroundDistance(rgba,W,H), grad=MM.gradient(rgba,W,H);
const truth={bean1:Math.PI*95*55,bean2:Math.PI*110*62,bean3:Math.PI*88*50};
const near=(m,x,y)=>{const r=MM.measureMask(m,null,W);return Math.hypot(r.centroid[0]-x,r.centroid[1]-y)<30;};
const A=MM.detectAll(det,W,H,{threshold:det.threshold,minArea:300,fillHoles:true});
const B=MM.detectAll(det,W,H,{threshold:det.threshold,minArea:300,fillHoles:true,grad});
for(const [k,[x,y]] of Object.entries({bean1:[1150,250],bean2:[1250,520],bean3:[1100,760]})){
  const a=A.find(m=>near(m,x,y)), b=B.find(m=>near(m,x,y)), c=MM.segmentSeeds(grad,W,H,[[[x,y]]],[],{fillHoles:true});
  const e=(m)=>m?((MM.maskCount(m)/truth[k]-1)*100).toFixed(2)+'%':'—';
  console.log(k,'real',Math.round(truth[k]),'| limiar',e(a),'| detectar refinado',e(b),'| clique (bordas)',e(c));
}
console.log('objetos: limiar',A.length,'refinado',B.length);
