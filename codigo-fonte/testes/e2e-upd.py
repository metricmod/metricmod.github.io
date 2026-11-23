import asyncio, tempfile, subprocess
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    ctx=await p.chromium.launch_persistent_context(tempfile.mkdtemp(), executable_path='/usr/bin/google-chrome', args=['--no-sandbox'], headless=True)
    pg=await ctx.new_page(); await pg.goto('http://localhost:8765/'); await pg.wait_for_timeout(1500); await pg.reload(); await pg.wait_for_timeout(800)
    print('versão aberta:', await pg.evaluate("document.getElementById('brand').title"))
    subprocess.run("cd /home/claude/metricmod && echo 0.5.1 > VERSION && ./build.sh", shell=True)
    await pg.evaluate("navigator.serviceWorker.getRegistration().then(r=>r.update())"); await pg.wait_for_timeout(2000)
    print('aviso de versão nova visível:', await pg.evaluate("!document.getElementById('updBar').hidden"))
    await pg.click('#btnUpd'); await pg.wait_for_timeout(2500)
    print('versão depois de atualizar:', await pg.evaluate("document.getElementById('brand').title"))
    await ctx.close()
asyncio.run(main())
