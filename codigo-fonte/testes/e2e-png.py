# Leitura de PNG (transparência, cinza com alfa, paleta com transparência, 16 bits, entrelaçado) no Chrome × ImageJ 1.54u.
import asyncio, numpy as np
from playwright.async_api import async_playwright
H,W=120,160
JS="""async(modo)=>{const f=document.getElementById('tst').files[0];
 const bm=await createImageBitmap(f,{colorSpaceConversion:'none',imageOrientation:'from-image',premultiplyAlpha:'none'});
 const c=document.createElement('canvas');c.width=bm.width;c.height=bm.height;const x=c.getContext('2d');
 if(modo==='branco'){x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);} x.drawImage(bm,0,0);
 const d=x.getImageData(0,0,c.width,c.height).data; let o=[];
 if(modo==='calc'){for(let i=0;i<d.length;i+=4){const a=d[i+3]/255;for(let k=0;k<3;k++)o.push(Math.round(d[i+k]*a+255*(1-a)));}}
 else for(let i=0;i<d.length;i+=4)o.push(d[i],d[i+1],d[i+2]); return o;}"""
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg=await b.new_page(); await pg.goto('file:///home/claude/metricmod/dist/MetricMod.html')
    await pg.evaluate("()=>{const i=document.createElement('input');i.type='file';i.id='tst';document.body.appendChild(i);}")
    for f in ['rgba.png','pal.png','rgb.png','inter.png','la.png']:
      ref=np.fromfile(f'png/ij-{f}.raw',np.uint8).reshape(-1)
      await pg.set_input_files('#file','png/'+f); await pg.wait_for_timeout(800)
      for modo in ['app']:
        v=np.array(await pg.evaluate("()=>{const d=MetricMod.S.rgba;const o=[];for(let i=0;i<d.length;i+=4)o.push(d[i],d[i+1],d[i+2]);return o;}"),dtype=np.int32); d=np.abs(v-ref)
        print(f'{f:10s} {modo:7s} valores diferentes do ImageJ: {(d>0).sum():6d}  maior diferença {d.max()}')
    await b.close()
asyncio.run(main())
