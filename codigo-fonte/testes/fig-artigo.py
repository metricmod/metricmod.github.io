# Gera as figuras do artigo (telas do MetricMod 0.7.4).
import asyncio
from playwright.async_api import async_playwright
HTML='file:///home/claude/metricmod/dist/MetricMod.html'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg=await b.new_page(viewport={'width':1440,'height':860}, device_scale_factor=2); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
    await pg.goto(HTML); await pg.set_input_files('#file','foto-teste.png'); await pg.wait_for_timeout(1200)
    async def scr(x,y):
      v=await pg.evaluate("(()=>{const r=document.getElementById('cv').getBoundingClientRect();const v=MetricMod.S.view;return [r.left,r.top,v.z,v.ox,v.oy]})()")
      return v[0]+x*v[2]+v[3], v[1]+y*v[2]+v[4]
    async def drag(a,bb):
      x,y=await scr(*a); await pg.mouse.move(x,y); await pg.mouse.down(); x2,y2=await scr(*bb); await pg.mouse.move(x2,y2,steps=12); await pg.mouse.up()
    await pg.click('[data-tool=scale]'); await drag((140,960),(940,960))
    await pg.fill('#gKnown','10'); await pg.select_option('#gUnit','cm'); await pg.click('[data-a=scaleOk]'); await pg.wait_for_timeout(300)
    await pg.click('[data-tool=detect]'); await pg.wait_for_timeout(1500); await pg.click('[data-a=detectOk]'); await pg.wait_for_timeout(800)
    await pg.screenshot(path='/home/claude/metricmod/artigo/fig-desktop.png')
    m=await b.new_page(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    await m.goto(HTML); await m.wait_for_timeout(300); await m.click('#btnProto'); await m.wait_for_timeout(400)
    await m.screenshot(path='/home/claude/metricmod/artigo/fig-mob-1.png')
    await m.goto(HTML); await m.click('#btnExamples'); await m.wait_for_timeout(2500); await m.click('#btnProto'); await m.wait_for_timeout(300); await m.click('[data-use=sementes]'); await m.wait_for_timeout(2500)
    await m.screenshot(path='/home/claude/metricmod/artigo/fig-mob-2.png')
    print('ERROS', errs); await b.close()
asyncio.run(main())
