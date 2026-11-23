import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg=await b.new_page(viewport={'width':1500,'height':900}, accept_downloads=True)
    errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
    await pg.goto('file:///home/claude/metricmod/dist/MetricMod.html')
    await pg.set_input_files('#file','foto-teste.jpg'); await pg.wait_for_timeout(500)
    await pg.evaluate("MetricMod.S.scale={ppu:80,unit:'cm',known:10,line:[140,960,940,960]}")
    await pg.click('[data-tool=detect]'); await pg.wait_for_timeout(1500); await pg.click('[data-a=detectOk]'); await pg.wait_for_timeout(800)
    n1=await pg.evaluate("MetricMod.S.objs.length"); await pg.keyboard.press('Control+z'); n2=await pg.evaluate("MetricMod.S.objs.length"); await pg.keyboard.press('Control+y'); n3=await pg.evaluate("MetricMod.S.objs.length")
    print('desfazer/refazer', n1, n2, n3)
    async with pg.expect_download() as d: await pg.click('#btnCsv')
    dl=await d.value; path=await dl.path(); print(dl.suggested_filename); print(open(path,encoding='utf-8-sig').read())
    async with pg.expect_download() as d: await pg.click('#btnPng')
    dl=await d.value; await dl.save_as('marcada.png'); print(dl.suggested_filename)
    print('ERROS', errs); await b.close()
asyncio.run(main())
