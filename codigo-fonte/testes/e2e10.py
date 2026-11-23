import asyncio, json, struct, math
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg=await b.new_page(viewport={'width':1500,'height':900}, accept_downloads=True); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
    await pg.goto('file:///home/claude/metricmod/dist/MetricMod.html'); await pg.wait_for_timeout(400)
    E=lambda js: pg.evaluate(js)
    async def scr(x,y):
      v=await E("(()=>{const r=document.getElementById('cv').getBoundingClientRect();const v=MetricMod.S.view;return [r.left,r.top,v.z,v.ox,v.oy]})()")
      return v[0]+x*v[2]+v[3], v[1]+y*v[2]+v[4]
    async def click(a,w=250): x,y=await scr(*a); await pg.mouse.click(x,y); await pg.wait_for_timeout(w)
    async def drag(a,bb,w=400): x,y=await scr(*a); await pg.mouse.move(x,y); await pg.mouse.down(); x2,y2=await scr(*bb); await pg.mouse.move(x2,y2,steps=8); await pg.mouse.up(); await pg.wait_for_timeout(w)
    async def go(i): await pg.select_option('#photoSel', str(i)); await pg.wait_for_timeout(900)
    # 1. exemplos
    await pg.click('#btnExamples'); await pg.wait_for_timeout(2500)
    print('1 exemplos:', await E("MetricMod.S.photos.map(p=>p.name).join(', ')"))
    # escala na foto 1 (régua 10 cm: 140..940 px na original 1600 → ×0.75 na versão de 1200)
    await pg.click('[data-tool=scale]'); await drag((105,720),(705,720)); await pg.fill('#gKnown','10'); await pg.click('[data-a=scaleOk]'); await pg.wait_for_timeout(300)
    # 2. ângulo
    await pg.click('[data-tool=angle]'); await click((100,100)); await click((300,400)); await click((500,150),400)
    print('2 ângulo:', await E("(()=>{const o=MetricMod.S.objs.find(o=>o.kind=='angle');return MM.angle3(...o.pts).toFixed(3)})()"), '(esperado 72.350)')
    # 3. retângulo e elipse + intensidade
    await pg.check('#measureInt'); await pg.wait_for_timeout(200)
    await pg.click('[data-tool=area]'); await pg.wait_for_timeout(600); await pg.click('[data-a=mode][data-v=oval]'); await drag((825,160),(905,215))
    await pg.click('[data-a=mode][data-v=rect]'); await pg.click('[data-a=role][data-v=fundo]'); await drag((950,50),(1050,120)); await pg.click('[data-a=role][data-v=""]')
    txt=await pg.inner_text('#resBody'); print('3 tabela de áreas tem Média/CTCF/Papel:', all(k in txt for k in ['Média','CTCF','Papel','fundo']))
    print('  elipse perímetro (Ramanujan):', await E("(()=>{const o=MetricMod.S.objs.find(o=>o.method=='oval');const b=o.box;return (MM.ovalPerimeter(b[2],b[3])).toFixed(2)+' px, área '+MM.maskCount(o.mask)})()"))
    await pg.screenshot(path='v7-1-intensidade.png')
    # 4. barra de escala na imagem salva
    await E("MetricMod.S.style.sbar=true"); 
    async with pg.expect_download() as d: await pg.click('#btnPng')
    await (await d.value).save_as('v7-barra.png'); print('4 barra de escala: imagem salva')
    # 5. perfil
    await pg.click('[data-tool=profile]'); await drag((150,500),(1100,500),600)
    print('5 perfil: gráfico visível', await E("!document.getElementById('chartBox').hidden"), '| pontos', await E("MetricMod.S.objs.find(o=>o.kind=='profile').pvals.length"))
    # 6. ajustar imagem (só visual)
    await pg.click('[data-tool=adjust]'); await pg.click('[data-a=adjAuto]'); await pg.click('[data-a=adjCh][data-v=g]'); await pg.wait_for_timeout(300)
    print('6 ajuste ativo só na tela:', await E("!!MetricMod.S.disp"), '| imagem de análise igual à original:', await E("(()=>{const S=MetricMod.S;return !S.flat && !S.adj.use})()"))
    await pg.click('[data-a=adjReset]')
    # 7. cobertura (foto inteira, diferente do fundo)
    await pg.click('[data-tool=coverage]'); await pg.wait_for_timeout(1500)
    print('7 cobertura prévia:', await pg.inner_text('#guide .msg'))
    await pg.click('[data-a=covOk]'); await pg.wait_for_timeout(400)
    # 8. girar e recortar (foto 2)
    await go(1); w0=await E("[MetricMod.S.W,MetricMod.S.H]")
    await pg.click('[data-tool=crop]'); await pg.click('[data-a=rot][data-v="90"]'); await pg.wait_for_timeout(900); w1=await E("[MetricMod.S.W,MetricMod.S.H]")
    await drag((100,100),(600,500)); await pg.click('[data-a=cropOk]'); await pg.wait_for_timeout(900); w2=await E("[MetricMod.S.W,MetricMod.S.H]")
    print('8 girar:', w0,'→',w1,'| recortar →', w2)
    await pg.click('[data-a=perspUndo]'); await pg.wait_for_timeout(1200); print('  voltar à original:', await E("[MetricMod.S.W,MetricMod.S.H]"))
    # 9. bandas (foto 5)
    await go(4); await pg.click('[data-tool=bands]'); await pg.wait_for_timeout(300)
    await drag((35,112),(125,158)); 
    for k in range(1,4): await click((80+k*110,135),300)
    print('9 bandas relativas:', await E("MetricMod.S.objs.find(o=>o.kind=='bands').dens.map(d=>(d.density/MetricMod.S.objs.find(o=>o.kind=='bands').dens[0].density*100).toFixed(1)).join(' : ')"), '(esperado 100 : 200 : 50 : 150)')
    # 10. protocolo cicatrização em lote (fotos 3 e 4)
    await pg.click('#btnProto'); await pg.wait_for_timeout(300); await pg.click('[data-use=cicatrizacao]'); await pg.wait_for_timeout(500)
    await go(2); await pg.click('[data-a=gapAll]'); await pg.wait_for_timeout(6000)
    await go(3); txt=await pg.inner_text('#resBody'); print('10 cicatrização (foto 24 h):', ' | '.join([l for l in txt.splitlines() if l.startswith('A')][:2]))
    # 11. comparar
    await pg.click('#btnCmp'); await pg.wait_for_timeout(800); print('11 comparar com:', await E("MetricMod.S.cmp && MetricMod.S.cmp.name")); await pg.screenshot(path='v7-2-comparar.png'); await pg.click('#btnCmp')
    # 12. protocolo próprio: criar, exportar, excluir, importar
    await pg.click('[data-a=protoExit]') if await pg.query_selector('[data-a=protoExit]') else None
    await go(0); await pg.click('[data-tool=detect]'); await pg.wait_for_timeout(1200); await pg.check('#gSplit'); await pg.wait_for_timeout(500)
    await pg.click('#btnProto'); await pg.click('#pNew'); await pg.fill('#pfNome','Feijão do laboratório'); await pg.fill('#pfPassos','Foto a 30 cm\nRégua ao lado'); await pg.check('#pfScale'); await pg.click('#pfSave'); await pg.wait_for_timeout(300)
    saved=await E("JSON.parse(localStorage.getItem('metricmod.protocols'))"); print('12 protocolo salvo:', saved[0]['nome'], '| ferramenta', saved[0]['ferramenta'], '| separar', saved[0]['config']['split'], '| escala', round(saved[0]['scale']['ppu'],2))
    async with pg.expect_download() as d: await pg.click(f"[data-exp='{saved[0]['id']}']")
    dl=await d.value; await dl.save_as('protocolo.json'); print('  exportado:', dl.suggested_filename)
    await pg.click(f"[data-delp='{saved[0]['id']}']"); await pg.wait_for_timeout(200); print('  depois de excluir:', len(await E("JSON.parse(localStorage.getItem('metricmod.protocols'))")))
    await pg.set_input_files('#protoFile','protocolo.json'); await pg.wait_for_timeout(400); print('  importado de volta:', [x['nome'] for x in await E("JSON.parse(localStorage.getItem('metricmod.protocols'))")])
    await pg.click('[data-mine="1"]'); await pg.wait_for_timeout(1000); print('  aplicado → ferramenta', await E("MetricMod.S.tool"), '| separar', await E("MetricMod.S.split"))
    # 13. projeto com tudo
    async with pg.expect_download() as d: await E("window.showSaveFilePicker=undefined"); await pg.click('#btnSave')
    await (await d.value).save_as('v7.metricmod')
    pg2=await b.new_page(); pg2.on('pageerror',lambda e: errs.append('p2:'+str(e))); await pg2.goto('file:///home/claude/metricmod/dist/MetricMod.html'); await pg2.set_input_files('#file',['v7.metricmod']); await pg2.wait_for_timeout(2500)
    print('13 projeto reaberto, tipos por foto:', await pg2.evaluate("MetricMod.S.photos.map((p,i)=>(i===MetricMod.S.cur?MetricMod.S.objs:p.objs).map(o=>o.kind+(o.role?':'+o.role:'')).join('+'))"))
    print('ERROS', errs); await b.close()
asyncio.run(main())
