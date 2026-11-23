# Corrigir iluminação (rolling ball) em Detectar objetos e Cobertura; e a contagem de colônias sem a opção.
import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg=await b.new_page(viewport={'width':1400,'height':900}); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
    await pg.goto('file:///home/claude/metricmod/dist/MetricMod.html'); await pg.wait_for_timeout(300)
    await pg.set_input_files('#file', ['/home/claude/metricmod/tests/placa-luz.jpg']); await pg.wait_for_timeout(1500)
    await pg.click('[data-tool=detect]'); await pg.wait_for_timeout(1500)
    a=await pg.inner_text('#guide'); await pg.check('#gFlat'); await pg.wait_for_timeout(5000); b2=await pg.inner_text('#guide')
    print('detectar sem/com correção:', a.split('\n')[0][:60], '|', b2.split('\n')[0][:60])
    await pg.click('[data-tool=coverage]'); await pg.wait_for_timeout(4000); print('cobertura com correção:', (await pg.inner_text('#guide')).split('\n')[0][:70])
    await pg.click('[data-tool=colony]'); await pg.wait_for_timeout(2500); print('gFlat na contagem:', await pg.locator('#gFlat').count())
    print('ERROS', errs); await b.close()
asyncio.run(main())
