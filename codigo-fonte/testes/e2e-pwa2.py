import asyncio, tempfile
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    ctx=await p.chromium.launch_persistent_context(tempfile.mkdtemp(), executable_path='/usr/bin/google-chrome', args=['--no-sandbox'], headless=True)
    pg=await ctx.new_page(); await pg.goto('http://localhost:8765/'); await pg.wait_for_timeout(2500)
    cdp=await ctx.new_cdp_session(pg); inst=await cdp.send('Page.getInstallabilityErrors')
    print('erros de instalação (perfil normal):', inst['installabilityErrors'] or 'nenhum — instalável')
    await ctx.close()
asyncio.run(main())
