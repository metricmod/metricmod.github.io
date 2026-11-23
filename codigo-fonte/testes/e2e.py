import asyncio, sys
from playwright.async_api import async_playwright
HTML='file:///home/claude/metricmod/dist/MetricMod.html'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg=await b.new_page(viewport={'width':1500,'height':900})
    errs=[]; pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
    await pg.goto(HTML); await pg.screenshot(path='s0-vazio.png')
    await pg.set_input_files('#file','foto-teste.jpg'); await pg.wait_for_timeout(600)
    await pg.screenshot(path='s1-aberta.png')
    # converte coord imagem -> tela
    async def scr(x,y):
      v=await pg.evaluate("(()=>{const r=document.getElementById('cv').getBoundingClientRect();const v=MetricMod.S.view;return [r.left,r.top,v.z,v.ox,v.oy]})()")
      return v[0]+x*v[2]+v[3], v[1]+y*v[2]+v[4]
    async def drag(a,bb,steps=12):
      x,y=await scr(*a); await pg.mouse.move(x,y); await pg.mouse.down()
      x2,y2=await scr(*bb); await pg.mouse.move(x2,y2,steps=steps); await pg.mouse.up()
    async def click(a):
      x,y=await scr(*a); await pg.mouse.click(x,y)
    # escala
    await pg.click('[data-tool=scale]'); await drag((140,960),(940,960))
    await pg.fill('#gKnown','10'); await pg.select_option('#gUnit','cm'); await pg.click('[data-a=scaleOk]')
    print('escala', await pg.evaluate("MetricMod.S.scale.ppu"))
    # área por clique
    await pg.click('[data-tool=area]'); await pg.click('[data-a=mode][data-v=click]'); await click((1150,250)); await pg.wait_for_timeout(300)
    await pg.screenshot(path='s2-area-clique.png')
    # área à mão livre ao redor da folha
    await pg.click('[data-a=mode][data-v=free]')
    import math
    pts=[(500+340*math.cos(math.radians(t)),420+170*math.sin(math.radians(t))) for t in range(0,361,10)]
    x,y=await scr(*pts[0]); await pg.mouse.move(x,y); await pg.mouse.down()
    for q in pts[1:]:
      x,y=await scr(*q); await pg.mouse.move(x,y,steps=2)
    await pg.mouse.up(); await pg.wait_for_timeout(200)
    # comprimento: 2 objetos
    await pg.click('[data-tool=length]'); await pg.fill('#gN','2'); await pg.click('[data-a=lenStart]')
    await drag((1060,220),(1240,280)); await drag((1150,700),(1050,820))
    await pg.screenshot(path='s3-comprimento.png')
    # comprimento x largura: 1 objeto, largura primeiro
    await pg.click('[data-tool=lw]'); await pg.fill('#gN','1'); await pg.click('[data-a=lenStart]')
    await drag((1230,470),(1275,570)); await drag((1160,585),(1340,455))
    # contagem
    await pg.click('[data-tool=count]')
    for q in [(1150,250),(1250,520),(1100,760)]: await click(q)
    await pg.click('[data-a=close]')
    # detectar todos
    await pg.click('[data-tool=detect]'); await pg.wait_for_timeout(1500)
    await pg.screenshot(path='s4-detectar.png')
    await pg.click('[data-a=detectOk]'); await pg.wait_for_timeout(800)
    # ajustar contorno: apagar parte de A1 com borracha
    await pg.evaluate("MetricMod.S.sel = MetricMod.S.objs.find(o=>o.kind=='area').id")
    await pg.click('[data-tool=edit]'); await pg.click('[data-a=brush][data-v=brushErase]')
    a1=await pg.evaluate("(()=>{const o=MetricMod.S.objs.find(o=>o.kind=='area');return o.mask.w*0+0})()")
    await drag((1150,200),(1150,300))
    await pg.screenshot(path='s5-ajuste.png')
    await pg.click('[data-a=close]')
    # unidade de exibição
    await pg.select_option('#dispUnit','mm'); await pg.wait_for_timeout(200)
    await pg.screenshot(path='s6-final.png')
    txt=await pg.inner_text('#resBody'); print(txt)
    print('ERROS:',errs)
    await b.close()
asyncio.run(main())
