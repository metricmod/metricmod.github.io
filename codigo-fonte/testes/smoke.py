import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg=await b.new_page(viewport={'width':1500,'height':900}); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
    await pg.goto('file:///home/claude/metricmod/dist/MetricMod.html'); await pg.wait_for_timeout(400)
    await pg.set_input_files('#file',['foto-teste.jpg']); await pg.wait_for_timeout(800)
    for t in ['scale','persp','crop','adjust','area','detect','length','lw','angle','count','colony','coverage','bands','profile','edit','select']:
      await pg.click(f'[data-tool={t}]'); await pg.wait_for_timeout(700)
    await pg.click('#btnProto'); await pg.wait_for_timeout(300); await pg.screenshot(path='v7-proto.png')
    print('ERROS', errs); await b.close()
asyncio.run(main())
