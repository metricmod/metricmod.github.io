import asyncio, json, sys
from playwright.async_api import async_playwright
MOBILE = len(sys.argv)>1 and sys.argv[1]=='mobile'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx=await b.new_context(viewport={'width':390,'height':844} if MOBILE else {'width':1500,'height':900}, device_scale_factor=2 if MOBILE else 1, is_mobile=MOBILE, has_touch=MOBILE)
    pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
    await pg.goto('file:///home/claude/metricmod/dist/MetricMod.html'); tag='m' if MOBILE else 'd'
    await pg.screenshot(path=f'v4{tag}-0.png')
    await pg.set_input_files('#file',['placa.jpg']); await pg.wait_for_timeout(800)
    async def scr(x,y):
      v=await pg.evaluate("(()=>{const r=document.getElementById('cv').getBoundingClientRect();const v=MetricMod.S.view;return [r.left,r.top,v.z,v.ox,v.oy]})()")
      return v[0]+x*v[2]+v[3], v[1]+y*v[2]+v[4]
    async def tap(a, wait=500):
      x,y=await scr(*a)
      if MOBILE: await pg.touchscreen.tap(x,y)
      else: await pg.mouse.click(x,y)
      await pg.wait_for_timeout(wait)
    await pg.click('[data-tool=colony]'); await pg.wait_for_timeout(2000)
    roi=await pg.evaluate("JSON.stringify(MetricMod.S.flow.roi)"); print('placa detectada', roi)
    await pg.screenshot(path=f'v4{tag}-1-placa.png')
    ex=json.load(open('placa-ex.json'))
    for i,e in enumerate(ex):
      await tap(e[:2], 1500 if i==2 else 700)
      if i==1: await pg.screenshot(path=f'v4{tag}-2-exemplos.png')
    tot=await pg.evaluate("(()=>{const o=MetricMod.S.objs.find(o=>o.kind=='colony');return o?o.auto.reduce((a,i)=>a+i.n,0)+' (modelos '+o.models.length+')':'nenhum'})()")
    print('colônias com 3 exemplos:', tot, '(real 60)')
    await pg.screenshot(path=f'v4{tag}-3-contagem.png')
    if not MOBILE:
      # arrastar a placa (mover) e redimensionar pela borda
      x,y=await scr(700,300); await pg.mouse.move(x,y); await pg.mouse.down(); await pg.mouse.move(x+40,y+10,steps=6); await pg.mouse.up(); await pg.wait_for_timeout(1200)
      print('após mover:', await pg.evaluate("(()=>{const r=MetricMod.S.objs[0].roi;return [r.cx.toFixed(0),r.cy.toFixed(0),r.rx.toFixed(0)]})()"))
      r=await pg.evaluate("MetricMod.S.objs[0].roi"); x,y=await scr(r['cx']+r['rx'], r['cy'])
      await pg.mouse.move(x,y); await pg.mouse.down(); await pg.mouse.move(x-30,y,steps=6); await pg.mouse.up(); await pg.wait_for_timeout(1200)
      print('após redimensionar:', await pg.evaluate("(()=>{const r=MetricMod.S.objs[0].roi;return [r.cx.toFixed(0),r.cy.toFixed(0),r.rx.toFixed(0)]})()"), 'colônias', await pg.evaluate("MetricMod.S.objs[0].auto.reduce((a,i)=>a+i.n,0)"))
      await pg.keyboard.press('Control+z'); await pg.wait_for_timeout(300); await pg.keyboard.press('Control+z'); await pg.wait_for_timeout(300)
      print('desfazer 2×:', await pg.evaluate("(()=>{const r=MetricMod.S.objs[0].roi;return [r.cx.toFixed(0),r.cy.toFixed(0),r.rx.toFixed(0)]})()"))
    else:
      # pinça via CDP: dois dedos se afastando
      cdp=await ctx.new_cdp_session(pg); z0=await pg.evaluate("MetricMod.S.view.z")
      cx,cy=195,450
      await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':cx-30,'y':cy,'id':1},{'x':cx+30,'y':cy,'id':2}]})
      for k in range(1,11): await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':cx-30-k*8,'y':cy,'id':1},{'x':cx+30+k*8,'y':cy,'id':2}]})
      await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]}); await pg.wait_for_timeout(300)
      print('pinça: zoom', round(z0,3), '->', round(await pg.evaluate("MetricMod.S.view.z"),3), '| objetos', await pg.evaluate("MetricMod.S.objs.length"), '(não deve criar nada)')
      await pg.click('#btnRes'); await pg.wait_for_timeout(400); await pg.screenshot(path=f'v4{tag}-4-resultados.png')
      await pg.click('#resClose'); await pg.wait_for_timeout(300)
      await pg.click('#btnLook'); await pg.wait_for_timeout(200); await pg.screenshot(path=f'v4{tag}-5-aparencia.png'); await pg.click('#btnLook')
    print('ERROS', errs); await b.close()
asyncio.run(main())
