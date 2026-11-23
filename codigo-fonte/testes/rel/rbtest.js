const MM=require('../../src/core.js'); const fs=require('fs'); const {execSync}=require('child_process');
const load=(f)=>{const raw=execSync(`python3 -c "from PIL import Image;import sys;im=Image.open('${f}').convert('RGBA');sys.stdout.write(str(im.size[0])+' '+str(im.size[1])+chr(10));sys.stdout.flush();sys.stdout.buffer.write(im.tobytes())"`,{maxBuffer:2e8});const nl=raw.indexOf(10);const [W,H]=raw.slice(0,nl).toString().split(' ').map(Number);return {W,H,rgba:new Uint8ClampedArray(raw.slice(nl+1))};};
const txt=(f)=>fs.readFileSync(f,'utf8').trim().split('\n').map(l=>l.split('\t').map(Number));
const cmp=(a,b)=>{let d=0,mx=0;for(let i=0;i<a.length;i++){const e=Math.abs(a[i]-b[i]); if(e){d++; if(e>mx)mx=e;}} return [d,mx];};
for (const [src,gfile,light,tag] of [['placa-luz.jpg','rel/g2.txt',false,'D'],['foto-teste.png','rel/g0.txt',true,'L']]) {
  const g=txt(gfile), H=g.length, W=g[0].length, v=new Uint8Array(W*H); g.forEach((r,y)=>r.forEach((x,i)=>v[y*W+i]=x));
  for (const r of [5,20,60,150]) { const t=Date.now(); const bg=MM.rollingBallBackground(Float32Array.from(v),W,H,r,light); const o=MM.subtractBackground8(v,bg,light);
    const ref=txt(`rel/rb${tag}${r}.txt`).flat(); const [d,mx]=cmp(o,ref); console.log(`${src} ${light?'fundo claro':'fundo escuro'} raio ${r}: pixels diferentes ${d}/${W*H} (máx ${mx}) ${Date.now()-t} ms`); }
}
for (const [src,ref,r,light] of [['placa-luz.jpg','rel/rbRGB60.png',60,false],['foto-teste.png','rel/rbRGBL80.png',80,true]]) {
  const a=load(src), b=load(ref); const t=Date.now(); const o=MM.subtractBackgroundRGBA(a.rgba,a.W,a.H,r,light); const [d,mx]=cmp(o,b.rgba);
  console.log(`${src} RGB canais separados raio ${r}: valores diferentes ${d}/${a.W*a.H*4} (máx ${mx}) ${Date.now()-t} ms | fundo claro detectado: ${MM.isLightBackground(a.rgba,a.W,a.H)}`);
}
