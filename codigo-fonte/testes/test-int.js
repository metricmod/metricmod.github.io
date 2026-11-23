const MM=require('../src/core.js'); const {execSync}=require('child_process'); const fs=require('fs');
const raw=execSync(`python3 -c "from PIL import Image;import sys;im=Image.open('foto-teste.png').convert('RGBA');sys.stdout.buffer.write(im.tobytes())"`,{maxBuffer:2e8});
const W=1600,H=1100,rgba=new Uint8ClampedArray(raw);
const ref=Object.fromEntries(fs.readFileSync('ij_int.csv','utf8').trim().split('\n').map(l=>{const a=l.split(',');return [a[0],a.slice(1).map(Number)];}));
const shapes={oval:[MM.ovalPolygon(1050,190,200,120,720),200,120],oval2:[MM.ovalPolygon(300,300,401,233,720),401,233],poly:[[[1100,450],[1350,500],[1300,620],[1150,600]]]};
for (const [k,[pts,w,h]] of Object.entries(shapes)) {
  const m=MM.cropMask(MM.rasterPolygon(pts,W,H)), st=MM.intensityStats(m,rgba,W), area=MM.maskCount(m);
  const per= w? MM.ovalPerimeter(w,h) : MM.polyLength(pts,true,false);
  const mine=[area,per,st.mean,st.sd,st.min,st.max,area*st.mean,st.rawIntDen], r=ref[k];
  const names=['Área','Perím','Média','Desvio','Mín','Máx','IntDen','RawIntDen'];
  console.log(k, names.map((n,i)=>`${n} ${(+mine[i].toFixed(3))}/${r[i]} (${(Math.abs(mine[i]-r[i])/Math.max(1e-9,Math.abs(r[i]))*100).toFixed(3)}%)`).join(' | '));
}
console.log('ângulo', MM.angle3([100,100],[300,400],[500,150]).toFixed(4), '/', ref.angle[0]);
