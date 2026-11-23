import asyncio, json
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg=await b.new_page(viewport={'width':1500,'height':900}); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
    await pg.goto('file:///home/claude/metricmod/dist/MetricMod.html')
    async def scr(x,y):
      v=await pg.evaluate("(()=>{const r=document.getElementById('cv').getBoundingClientRect();const v=MetricMod.S.view;return [r.left,r.top,v.z,v.ox,v.oy]})()")
      return v[0]+x*v[2]+v[3], v[1]+y*v[2]+v[4]
    async def click(a,w=200): x,y=await scr(*a); await pg.mouse.click(x,y); await pg.wait_for_timeout(w)
    # perspectiva em lote
    await pg.set_input_files('#file',['foto-inclinada.jpg','foto-inclinada-2.jpg']); await pg.wait_for_timeout(1200)
    info=json.load(open('incl.json')); await pg.click('[data-tool=persp]')
    for q in info['quad']: await click(q)
    await pg.fill('#gPW','11.25'); await pg.fill('#gPH','0.75'); await pg.click('[data-a=perspOk]'); await pg.wait_for_timeout(1500)
    await pg.click('[data-a=perspAll]'); await pg.wait_for_timeout(3000)
    print('perspectiva em lote:', await pg.evaluate("MetricMod.S.photos.map(p=>!!p.canvas+' '+(p.scale&&p.scale.ppu.toFixed(2)))"))
    # colônias em lote
    await pg.set_input_files('#file',['placa.jpg','placa-luz.jpg']); await pg.wait_for_timeout(1500)
    await pg.click('[data-tool=colony]'); await pg.wait_for_timeout(2000)
    for e in json.load(open('placa-ex.json')): await click(e[:2],900)
    await pg.wait_for_timeout(1500)
    await pg.click('[data-a=colAllPhotos]'); await pg.wait_for_timeout(5000)
    print('colônias em lote:', await pg.evaluate("MetricMod.S.photos.map((p,i)=>p.name+': '+(i===MetricMod.S.cur?MetricMod.S.objs:p.objs).filter(o=>o.kind=='colony').map(o=>o.auto.reduce((a,x)=>a+x.n,0)).join(','))"))
    print('ERROS', errs); await b.close()
asyncio.run(main())
