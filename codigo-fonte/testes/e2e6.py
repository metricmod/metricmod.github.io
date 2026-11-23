import asyncio, tempfile, json, sys
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv)>1 else 'file:///home/claude/metricmod/dist/MetricMod.html'
async def main():
  async with async_playwright() as p:
    prof=tempfile.mkdtemp()
    ctx=await p.chromium.launch_persistent_context(prof, executable_path='/usr/bin/google-chrome', args=['--no-sandbox'], headless=True, viewport={'width':1500,'height':900}, accept_downloads=True)
    pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
    await pg.goto(URL); await pg.wait_for_timeout(500)
    # TIFF com escala do ImageJ + pilha + PNG de encostados
    await pg.set_input_files('#file',['tif/imagej-cal.tif','tif/g16-tiles-zlib.tif','encostados.png']); await pg.wait_for_timeout(1500)
    print('fotos:', await pg.evaluate("MetricMod.S.photos.map(p=>p.name+(p.scale?' ['+p.scale.ppu+' px/'+p.scale.unit+']':''))"))
    print('foto atual:', await pg.evaluate("MetricMod.S.name"), '| escala', await pg.evaluate("MetricMod.S.scale && MetricMod.S.scale.ppu+' px/'+MetricMod.S.scale.unit"))
    # vai para encostados.png, separar encostados
    await pg.select_option('#photoSel','2'); await pg.wait_for_timeout(800)
    await pg.click('[data-tool=detect]'); await pg.wait_for_timeout(1200)
    n0=await pg.evaluate("MetricMod.S.previewCount"); await pg.check('#gSplit'); await pg.wait_for_timeout(1200)
    print('detectar: sem separar', n0, '| separando', await pg.evaluate("MetricMod.S.previewCount"), '(ImageJ: 18)')
    await pg.screenshot(path='v5-1-separar.png')
    # medir em todas as fotos
    await pg.click('[data-a=detectAllPhotos]'); await pg.wait_for_timeout(6000)
    print('lote: medições por foto', await pg.evaluate("MetricMod.S.photos.map((p,i)=>(i===MetricMod.S.cur?MetricMod.S.objs:p.objs).length)"))
    await pg.screenshot(path='v5-2-lote.png')
    # salvar projeto
    async with pg.expect_download() as d: await pg.evaluate("window.showSaveFilePicker=undefined"); await pg.click('#btnSave')
    dl=await d.value; await dl.save_as('teste.metricmod'); import os; print('projeto salvo:', dl.suggested_filename, os.path.getsize('teste.metricmod')//1024, 'KB')
    await pg.wait_for_timeout(3500)  # deixa o salvamento automático rodar
    # recarrega: deve oferecer continuar
    await pg.reload(); await pg.wait_for_timeout(1500)
    print('oferece continuar:', await pg.evaluate("!document.getElementById('resume').hidden"), '|', await pg.inner_text('#resumeTxt'))
    await pg.click('#btnResume'); await pg.wait_for_timeout(2000)
    print('após continuar: medições por foto', await pg.evaluate("MetricMod.S.photos.map((p,i)=>(i===MetricMod.S.cur?MetricMod.S.objs:p.objs).length)"), '| foto', await pg.evaluate("MetricMod.S.name"))
    # nova janela limpa: abrir o arquivo de projeto
    pg2=await ctx.new_page(); pg2.on('pageerror',lambda e: errs.append('p2:'+str(e))); pg2.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
    await pg2.goto(URL); await pg2.wait_for_timeout(500); await pg2.set_input_files('#file',['teste.metricmod']); await pg2.wait_for_timeout(2500)
    print('projeto reaberto: fotos', await pg2.evaluate("MetricMod.S.photos.length"), '| medições', await pg2.evaluate("MetricMod.S.photos.map((p,i)=>(i===MetricMod.S.cur?MetricMod.S.objs:p.objs).length)"), '| escala foto 1', await pg2.evaluate("JSON.stringify(MetricMod.S.photos[0].scale)"))
    a1=await pg2.evaluate("(()=>{const S=MetricMod.S;const o=(S.cur===2?S.objs:S.photos[2].objs)[0];return MM.maskCount(o.mask)})()"); a0=await pg.evaluate("(()=>{const S=MetricMod.S;const o=(S.cur===2?S.objs:S.photos[2].objs)[0];return MM.maskCount(o.mask)})()")
    print('máscara igual após reabrir:', a0==a1, a0, a1)
    print('ERROS', errs); await ctx.close()
asyncio.run(main())
