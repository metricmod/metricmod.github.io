import asyncio, json
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg=await b.new_page(viewport={'width':1500,'height':900}, accept_downloads=True)
    errs=[]; pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
    pg.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
    await pg.goto('file:///home/claude/metricmod/dist/MetricMod.html')
    async def scr(x,y):
      v=await pg.evaluate("(()=>{const r=document.getElementById('cv').getBoundingClientRect();const v=MetricMod.S.view;return [r.left,r.top,v.z,v.ox,v.oy]})()")
      return v[0]+x*v[2]+v[3], v[1]+y*v[2]+v[4]
    async def click(a, wait=400):
      x,y=await scr(*a); await pg.mouse.click(x,y); await pg.wait_for_timeout(wait)
    async def drag(a,bb):
      x,y=await scr(*a); await pg.mouse.move(x,y); await pg.mouse.down(); x2,y2=await scr(*bb); await pg.mouse.move(x2,y2,steps=10); await pg.mouse.up(); await pg.wait_for_timeout(300)
    await pg.set_input_files('#file',['placa.jpg','foto-inclinada.jpg','foto-teste.jpg']); await pg.wait_for_timeout(1200)
    print('fotos', await pg.evaluate("MetricMod.S.photos.map(p=>p.name)"), 'atual', await pg.evaluate("MetricMod.S.name"))
    # ---- foto 1 (foto-inclinada, ordem alfabética): perspectiva pela régua
    info=json.load(open('incl.json'))
    await pg.click('[data-tool=persp]')
    for q in info['quad']: await click(q,150)
    await pg.fill('#gPW','11.25'); await pg.fill('#gPH','0.75'); await pg.click('[data-a=perspOk]'); await pg.wait_for_timeout(1500)
    print('após correção: escala', await pg.evaluate("MetricMod.S.scale.ppu.toFixed(3)+' px/'+MetricMod.S.scale.unit"), 'tamanho', await pg.evaluate("MetricMod.S.W+'x'+MetricMod.S.H"))
    await pg.screenshot(path='v3-1-persp.png')
    # grupo e área do feijão por clique
    await pg.fill('#groupIn','Tratamento A'); await pg.press('#groupIn','Enter')
    bean=await pg.evaluate(f"(()=>{{const q=MM.orderQuad({json.dumps(info['quad'])});const S=MetricMod.S;return null}})()")
    await pg.click('[data-tool=area]'); await pg.wait_for_timeout(800)
    # localizar o feijão na imagem corrigida: usar detectar? clique pela homografia
    pos=await pg.evaluate(f"""(()=>{{const S=MetricMod.S,q=MM.orderQuad({json.dumps(info['quad'])}),l=S.scale.line,h=l[1]+0.75*S.scale.ppu;
      const H=MM.homography(q,[[l[0],l[1]],[l[2],l[1]],[l[2],h],[l[0],h]]);return MM.applyH(H,{info['bean'][0]},{info['bean'][1]});}})()""")
    await click(pos,1200)
    print('feijão corrigido:', await pg.evaluate("(()=>{const o=MetricMod.S.objs[0];return (MM.maskCount(o.mask)/MetricMod.S.scale.ppu**2).toFixed(3)+' cm², grupo '+o.group})()"), '(real 2,565)')
    # ---- próxima foto: placa (PageDown)
    await pg.keyboard.press('PageDown'); await pg.wait_for_timeout(1200); await pg.keyboard.press('PageDown'); await pg.wait_for_timeout(1200)
    print('foto atual', await pg.evaluate("MetricMod.S.name"), '| escala herdada?', await pg.evaluate("!!(MetricMod.S.scale&&MetricMod.S.scale.inherited)"))
    await pg.fill('#groupIn','Placa controle'); await pg.press('#groupIn','Enter')
    await pg.click('[data-tool=colony]'); await pg.wait_for_timeout(1500)
    await pg.click('[data-a=colRoi]'); await drag((220,70),(1180,1030))
    for e in json.load(open('placa-ex.json')): await click(e[:2],900)
    await pg.wait_for_timeout(1500); print('flow', await pg.evaluate('JSON.stringify(MetricMod.S.flow)'), 'toast', await pg.inner_text('#toast'), 'objs', await pg.evaluate('MetricMod.S.objs.length'), await pg.evaluate('[MetricMod.S.space, JSON.stringify(MetricMod.S.drag), MetricMod.S.tool, MetricMod.S.sel]'), errs)
    tot=await pg.evaluate("(()=>{const o=MetricMod.S.objs.find(o=>o.kind=='colony');return o?o.auto.reduce((a,i)=>a+i.n,0):-1})()"); print('colônias automáticas', tot, '(real 60)')
    await pg.screenshot(path='v3-2-colonias.png')
    # apagar uma e adicionar uma
    first=await pg.evaluate("(()=>{const o=MetricMod.S.objs.find(o=>o.kind=='colony');const i=o.auto[5];return [i.x,i.y]})()")
    await click(first,300); await click((700,550),300)
    print('após apagar 1 e adicionar 1:', await pg.inner_text('#guide .step'))
    await pg.click('[data-a=close]')
    # ---- volta para a primeira foto e confere que manteve
    await pg.keyboard.press('PageUp'); await pg.wait_for_timeout(1000); await pg.keyboard.press('PageUp'); await pg.wait_for_timeout(1000)
    print('voltou:', await pg.evaluate("MetricMod.S.name"), 'medições', await pg.evaluate("MetricMod.S.objs.length"))
    await pg.screenshot(path='v3-3-volta.png')
    async with pg.expect_download() as d: await pg.click('#btnCsv')
    dl=await d.value; print(dl.suggested_filename); txt=open(await dl.path(),encoding='utf-8-sig').read(); print(txt[-900:])
    print('ERROS', errs); await b.close()
asyncio.run(main())
