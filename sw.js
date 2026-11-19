// MetricMod — guarda o app para funcionar sem internet. Ao publicar uma versão nova, o número abaixo muda.
const VERSAO = '0.5.2';
const CACHE = 'metricmod-' + VERSAO;
const ARQUIVOS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png', './favicon-32.png'];
// cache: 'reload' busca direto da rede, sem passar pelo cache comum do navegador (senão a versão antiga pode ser guardada)
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS.map((u) => new Request(u, { cache: 'reload' }))))); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('metricmod-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('message', (e) => { if (e.data === 'atualizar') self.skipWaiting(); });
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // primeiro o que está guardado (abre na hora e sem internet); a rede só para o que não estiver
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((r) => r || fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match('./index.html'))));
});
