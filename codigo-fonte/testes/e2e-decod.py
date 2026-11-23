# Confere se o navegador (Chrome) decodifica as fotos com os mesmos valores que o ImageJ usa (cinza do comando 8-bit).
import asyncio, json
from playwright.async_api import async_playwright
IMGS={'placa.jpg':'rel/g1.txt','placa-luz.jpg':'rel/g2.txt','foto-teste.png':'rel/g0.txt','fenda.png':'rel/g3.txt','gel.png':'rel/g4.txt','dificil.png':'rel/g5.txt'}
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg=await b.new_page(); await pg.goto('file:///home/claude/metricmod/dist/MetricMod.html')
    await pg.evaluate("()=>{const i=document.createElement('input');i.type='file';i.id='tst';document.body.appendChild(i);}")
    for f,ref in IMGS.items():
      await pg.set_input_files('#tst',f)
      g=await pg.evaluate("""async()=>{const f=document.getElementById('tst').files[0];
        const bm=await createImageBitmap(f,{colorSpaceConversion:'none',imageOrientation:'from-image',premultiplyAlpha:'none'});
        const c=document.createElement('canvas');c.width=bm.width;c.height=bm.height;const x=c.getContext('2d');x.drawImage(bm,0,0);
        const d=x.getImageData(0,0,c.width,c.height).data;const o=new Array(c.width*c.height);
        for(let i=0;i<o.length;i++)o[i]=Math.floor((d[i*4]+d[i*4+1]+d[i*4+2])/3+0.5);return o;}""")
      r=[int(v) for l in open(ref).read().strip().split('\n') for v in l.split('\t')]
      dif=sum(1 for a,c in zip(g,r) if a!=c); mx=max(abs(a-c) for a,c in zip(g,r))
      print(f'{f}: {len(g)} pixels, diferentes do ImageJ: {dif}, maior diferença {mx}')
    await b.close()
asyncio.run(main())
