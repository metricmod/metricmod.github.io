#!/bin/sh
# Gera:
#   dist/MetricMod.html  — arquivo único (abre com dois cliques, sem internet)
#   site/                — versão instalável (PWA) para publicar num endereço https (ex.: GitHub Pages)
cd "$(dirname "$0")" && mkdir -p dist site && VERSION=$(cat VERSION) python3 - <<'P'
import os, shutil, re
v=os.environ['VERSION']
s=open('src/index.html').read()
s=s.replace('/*CSS*/',open('src/style.css').read()).replace('/*CORE*/',open('src/core.js').read()).replace('/*APP*/',open('src/app.js').read())
s=s.replace('__VERSION__',v)
open('dist/MetricMod.html','w').write(s.replace('<!--PWA-->',''))
head='''<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#000000">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="MetricMod">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="icon" type="image/png" href="favicon-32.png">'''
open('site/index.html','w').write(s.replace('<!--PWA-->',head))
for f in os.listdir('pwa'):
    if f=='sw.template.js': open('site/sw.js','w').write(open('pwa/'+f).read().replace('__VERSION__',v))
    else: shutil.copy('pwa/'+f,'site/'+f)
P
