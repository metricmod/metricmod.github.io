import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg=await b.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
    await pg.goto('file:///home/claude/metricmod/dist/MetricMod.html')
    await pg.set_input_files('#file',['png/g16.png','png/rgba.png']); await pg.wait_for_timeout(1500)
    print(await pg.evaluate("()=>{const S=MetricMod.S;return {foto:S.photos[S.cur].name, raw:!!S.raw, primeiro:S.raw&&S.raw[0], max:S.raw&&Math.max(...S.raw.slice(0,500))}}"))
    print('ERROS', errs); await b.close()
asyncio.run(main())
