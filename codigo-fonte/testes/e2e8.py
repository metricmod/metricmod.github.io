import asyncio, sys
from playwright.async_api import async_playwright
MOB = len(sys.argv)>1
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx=await b.new_context(viewport={'width':390,'height':844} if MOB else {'width':1500,'height':900}, device_scale_factor=2 if MOB else 1, is_mobile=MOB, has_touch=MOB, accept_downloads=True)
    pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
    await pg.goto('file:///home/claude/metricmod/dist/MetricMod.html'); t='m' if MOB else 'd'
    print('selo:', await pg.inner_text('#verBadge'))
    await pg.click('#btnAbout'); await pg.wait_for_timeout(300); await pg.screenshot(path=f'v6{t}-1-metodos.png')
    print('métodos:', await pg.evaluate("document.querySelectorAll('#aboutBody h3').length"), 'blocos')
    await pg.click('#aboutTabs [data-t=validacao]'); await pg.wait_for_timeout(200); await pg.screenshot(path=f'v6{t}-2-validacao.png')
    print('validação:', await pg.evaluate("document.querySelectorAll('#aboutBody tbody tr').length"), 'linhas')
    await pg.click('#aboutTabs [data-t=citar]'); await pg.wait_for_timeout(200); await pg.screenshot(path=f'v6{t}-3-citar.png')
    print('ABNT:', await pg.inner_text('#cite-abnt'))
    await pg.keyboard.press('Escape'); print('fecha com Esc:', await pg.evaluate("document.getElementById('about').hidden"))
    if not MOB:
      await pg.click('#verBadge'); await pg.wait_for_timeout(200); print('selo abre:', await pg.evaluate("document.querySelector('#aboutTabs .on').dataset.t")); await pg.click('#aboutClose')
      await pg.set_input_files('#file',['foto-teste.jpg']); await pg.wait_for_timeout(800)
      await pg.evaluate("MetricMod.S.scale={ppu:80,unit:'cm',known:10,line:[140,960,940,960]}")
      await pg.click('[data-tool=detect]'); await pg.wait_for_timeout(1500); await pg.click('[data-a=detectOk]'); await pg.wait_for_timeout(800)
      async with pg.expect_download() as d: await pg.click('#btnCsv')
      txt=open(await (await d.value).path(),encoding='utf-8-sig').read(); print('CSV início:', ' | '.join(txt.splitlines()[:6]))
      async with pg.expect_download() as d: await pg.click('#btnPng')
      await (await d.value).save_as('v6-marcada.png')
      async with pg.expect_download() as d: await pg.evaluate("window.showSaveFilePicker=undefined"); await pg.click('#btnSave')
      await (await d.value).save_as('v6.metricmod')
      raw=open('v6.metricmod','rb').read(); import json,struct; hl=struct.unpack('<I',raw[8:12])[0]; print('projeto guarda versão:', json.loads(raw[12:12+hl])['appVersion'])
    print('ERROS', errs); await b.close()
asyncio.run(main())
