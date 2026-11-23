import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx=await b.new_context(); pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
    await pg.goto('http://localhost:8765/'); await pg.wait_for_timeout(1500)
    cdp=await ctx.new_cdp_session(pg)
    inst=await cdp.send('Page.getInstallabilityErrors'); print('erros de instalação:', inst['installabilityErrors'] or 'nenhum')
    man=await cdp.send('Page.getAppManifest'); print('manifesto:', 'ok' if not man.get('errors') else man['errors'], '| nome', '"MetricMod"' in man.get('data',''))
    await pg.reload(); await pg.wait_for_timeout(800)
    print('service worker controla a página:', await pg.evaluate("!!navigator.serviceWorker.controller"))
    await ctx.set_offline(True); await pg.reload(); await pg.wait_for_timeout(800)
    print('abre sem internet:', await pg.evaluate("document.title"), '| ferramentas', await pg.evaluate("document.querySelectorAll('.tool').length"))
    await ctx.set_offline(False)
    print('ERROS', errs); await b.close()
asyncio.run(main())
