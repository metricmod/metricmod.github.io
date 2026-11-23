import asyncio, math
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg=await b.new_page(viewport={'width':1500,'height':900}, accept_downloads=True)
    errs=[]; pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
    await pg.goto('file:///home/claude/metricmod/dist/MetricMod.html'); await pg.screenshot(path='v2-0.png')
    async def scr(x,y):
      v=await pg.evaluate("(()=>{const r=document.getElementById('cv').getBoundingClientRect();const v=MetricMod.S.view;return [r.left,r.top,v.z,v.ox,v.oy]})()")
      return v[0]+x*v[2]+v[3], v[1]+y*v[2]+v[4]
    async def click(a, mod=None):
      x,y=await scr(*a)
      if mod: await pg.keyboard.down(mod)
      await pg.mouse.click(x,y)
      if mod: await pg.keyboard.up(mod)
      await pg.wait_for_timeout(500)
    # --- imagem difícil: clique no objeto
    await pg.set_input_files('#file','dificil.png'); await pg.wait_for_timeout(500)
    await pg.click('[data-tool=area]'); await pg.wait_for_timeout(600)
    await click((300,350)); await pg.wait_for_timeout(500)
    print('difícil, clique:', await pg.evaluate("MM.maskCount(MetricMod.S.objs[0].mask)"), 'real 122485')
    await pg.screenshot(path='v2-1-dificil.png')
    # marcar fundo com Alt (teste do refinamento)
    n0=await pg.evaluate("MetricMod.S.objs[0].seeds.bg.length"); await click((800,100),'Alt')
    print('marcas de fundo', n0, '->', await pg.evaluate("MetricMod.S.objs[0].seeds.bg.length"), 'área', await pg.evaluate("MM.maskCount(MetricMod.S.objs[0].mask)"))
    # --- foto teste: contorno magnético ao redor do feijão 1 (elipse 95x55 rot 20)
    pg.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
    await pg.set_input_files('#file','foto-teste.jpg'); await pg.wait_for_timeout(800)
    await pg.evaluate("MetricMod.S.scale={ppu:80,unit:'cm',known:10,line:[140,960,940,960]}")
    await pg.click('[data-tool=area]'); await pg.wait_for_timeout(500)
    await pg.click('[data-a=mode][data-v=magnetic]'); await pg.wait_for_timeout(500)
    cx,cy,a,bb,rot=1150,250,95,55,math.radians(-20)
    pts=[]
    for t in range(0,360,45):
      u=math.radians(t); x=a*math.cos(u); y=bb*math.sin(u)
      pts.append((cx+x*math.cos(rot)-y*math.sin(rot)+3, cy+x*math.sin(rot)+y*math.cos(rot)-2))
    for q in pts: await click(q)
    x,y=await scr(*pts[2]); await pg.mouse.move(x+20,y+5); await pg.wait_for_timeout(200)
    await pg.screenshot(path='v2-2-magnetico.png')
    await pg.keyboard.press('Enter'); await pg.wait_for_timeout(300)
    area=await pg.evaluate("MetricMod.S.objs.at(-1).mask && MM.maskCount(MetricMod.S.objs.at(-1).mask)")
    print('magnético feijão1:', area, 'real', round(math.pi*95*55), f'{(area/(math.pi*95*55)-1)*100:.2f}%')
    # clique no feijão 2 e 3, comprimento e contagem
    await pg.click('[data-a=mode][data-v=click]'); await click((1250,520)); await click((1100,760))
    await pg.click('[data-tool=length]'); await pg.fill('#gN','1'); await pg.click('[data-a=lenStart]')
    x,y=await scr(1060,220); await pg.mouse.move(x,y); await pg.mouse.down(); x,y=await scr(1240,280); await pg.mouse.move(x,y,steps=8); await pg.mouse.up()
    await pg.click('[data-a=close]')
    # aparência: tracejada, espessura 3, legenda canto superior direito
    await pg.click('#btnLook'); await pg.wait_for_timeout(200)
    await pg.screenshot(path='v2-3-painel.png')
    await pg.click('#lkDash [data-v=dash]'); await pg.fill('#lkWidth','3'); await pg.dispatch_event('#lkWidth','input')
    await pg.select_option('#lkLegend','tr'); await pg.click('#brand'); await pg.wait_for_timeout(200)
    await pg.screenshot(path='v2-4-legenda.png')
    async with pg.expect_download() as d: await pg.click('#btnPng')
    dl=await d.value; await dl.save_as('v2-marcada.png')
    print(await pg.inner_text('#resBody'))
    print('ERROS', errs); await b.close()
asyncio.run(main())
