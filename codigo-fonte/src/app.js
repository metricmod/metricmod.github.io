/* MetricMod — interface de janela única com fluxos guiados. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const APP_VERSION = '__VERSION__', AB = window.MM_ABOUT;
  const cv = $('cv'), ctx = cv.getContext('2d'), wrap = $('canvasWrap'), guide = $('guide');
  const COLORS = ['#ff3d7f', '#00b3e6', '#ffb000', '#8f6bff', '#00c48c', '#ff6b2c', '#e040fb', '#4fc3f7'];
  const PREFIX = { area: 'A', length: 'C', lw: 'CL', count: 'N', colony: 'P', angle: 'AN', coverage: 'CB', bands: 'G', profile: 'PL' };

  const S = {
    img: null, imgCanvas: null, W: 0, H: 0, rgba: null, det: null, name: '',
    scale: null, view: { z: 1, ox: 0, oy: 0 }, objs: [], seq: { area: 0, length: 0, lw: 0, count: 0 },
    sel: null, tool: null, flow: {}, undo: [], redo: [],
    sens: 50, fill: true, excl: false, refine: true, minArea: 0, brushPx: 18, preview: null, previewCount: null,
    pointer: null, space: false, drag: null, grad: null,
    style: { width: 2, dash: 'solid', legend: 'line', size: 13, tags: true, stamp: true, sbar: false, sbarPos: 'br', sbarColor: 'auto', sbarLen: 0, sbarThick: 1, sbarText: true },
  };
  try { Object.assign(S.style, JSON.parse(localStorage.getItem('metricmod.style') || '{}')); } catch { /* sem armazenamento */ }
  const saveStyle = () => { try { localStorage.setItem('metricmod.style', JSON.stringify(S.style)); } catch { /* ignora */ } };

  /* ---------- ícones ---------- */
  const I = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const ICONS = {
    scale: I('<path d="M2 16 16 2l6 6L8 22z"/><path d="m6 12 2 2m1-5 2 2m1-5 2 2"/>'),
    area: I('<path d="M5 9c0-4 7-6 11-3s4 10-1 12-10 1-10-9z"/><path d="M9 12h0M12 10h0M13 14h0" stroke-width="2.6"/>'),
    detect: I('<circle cx="7" cy="8" r="3"/><circle cx="16" cy="7" r="2.5"/><circle cx="12" cy="16" r="3.5"/><path d="M2 2h4M2 2v4M22 22h-4M22 22v-4"/>'),
    length: I('<path d="M4 20 20 4"/><circle cx="4" cy="20" r="2"/><circle cx="20" cy="4" r="2"/>'),
    lw: I('<ellipse cx="12" cy="12" rx="9" ry="5" transform="rotate(-30 12 12)"/><path d="M4 17 20 7M10 8l4 8"/>'),
    count: I('<circle cx="6" cy="7" r="2.5"/><circle cx="17" cy="6" r="2.5"/><circle cx="8" cy="17" r="2.5"/><circle cx="17" cy="16" r="2.5"/>'),
    edit: I('<path d="M4 20c3 0 4-2 4-4a3 3 0 1 1 3 3"/><path d="m11 13 8-8 2 2-8 8"/>'),
    select: I('<path d="m5 3 14 8-6 2-2 6z"/>'),
    persp: I('<path d="M6 5h12l3 14H3z"/><path d="M9 9h6M8 14h8" stroke-dasharray="2 2"/>'),
    angle: I('<path d="M4 20 20 20M4 20 15 6"/><path d="M11 20a7 7 0 0 0-2-5"/>'),
    crop: I('<path d="M6 2v16h16"/><path d="M2 6h16v16"/>'),
    adjust: I('<circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>'),
    coverage: I('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 14c4-1 5-6 9-6s5 4 9 3v8H3z" fill="currentColor" opacity=".55"/>'),
    bands: I('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M6 8h4M14 8h4M6 13h4M14 14h4M6 17h4"/>'),
    profile: I('<path d="M3 20h18"/><path d="M3 16l4-6 4 4 4-9 6 8"/>'),
    colony: I('<circle cx="12" cy="12" r="9.5"/><circle cx="9" cy="9" r="1.6"/><circle cx="15" cy="10" r="1.6"/><circle cx="10" cy="15" r="1.6"/><circle cx="15.5" cy="15" r="1.2"/>'),
  };
  const TOOLS = [
    { group: 'Preparar' },
    { id: 'scale', name: 'Escala', hint: 'Informe a medida da régua' },
    { id: 'persp', name: 'Corrigir perspectiva', hint: 'Endireita a foto por um retângulo' },
    { id: 'crop', name: 'Recortar e girar', hint: 'Girar, espelhar, endireitar, recortar' },
    { id: 'adjust', name: 'Ajustar imagem', hint: 'Brilho, contraste, canal' },
    { group: 'Medir' },
    { id: 'area', name: 'Área', hint: 'Contorne ou clique no objeto' },
    { id: 'detect', name: 'Detectar objetos', hint: 'Mede todos de uma vez' },
    { id: 'length', name: 'Comprimento', hint: 'Uma linha por objeto' },
    { id: 'lw', name: 'Comprimento × Largura', hint: 'Duas linhas por objeto' },
    { id: 'angle', name: 'Ângulo', hint: 'Três cliques: lado, vértice, lado' },
    { id: 'count', name: 'Contagem', hint: 'Clique em cada item' },
    { id: 'colony', name: 'Contar colônias', hint: 'Marca todas as parecidas' },
    { id: 'coverage', name: 'Cobertura (%)', hint: 'Fração da área coberta' },
    { id: 'bands', name: 'Bandas de gel', hint: 'Densidade de cada banda' },
    { id: 'profile', name: 'Perfil de linha', hint: 'Intensidade ao longo de uma linha' },
    { group: 'Ajustar' },
    { id: 'edit', name: 'Ajustar contorno', hint: 'Complete ou apague partes' },
    { id: 'select', name: 'Mover e selecionar', hint: 'Arraste as pontas das linhas' },
  ];
  $('tools').innerHTML = `<button class="protoBtn" id="btnProto" title="Análises prontas, já configuradas"><span class="ic">${I('<path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/>')}</span><span><b>Protocolos</b><small>Análises prontas e os seus</small></span></button>` + TOOLS.map((t) => t.group ? `<h2>${t.group}</h2>` :
    `<button class="tool" data-tool="${t.id}" disabled><span class="ic">${ICONS[t.id]}</span><span><b>${t.name}</b><small>${t.hint}</small></span></button>`).join('');
  document.querySelectorAll('.tool').forEach((b) => b.onclick = () => setTool(S.tool === b.dataset.tool ? null : b.dataset.tool));

  /* ---------- utilidades ---------- */
  // unidades: fator em metros
  const UNITS = [['nm', 1e-9, 'nanômetro'], ['µm', 1e-6, 'micrômetro'], ['mm', 1e-3, 'milímetro'], ['cm', 1e-2, 'centímetro'], ['dm', 1e-1, 'decímetro'], ['m', 1, 'metro'], ['km', 1e3, 'quilômetro'], ['pol', 0.0254, 'polegada'], ['pé', 0.3048, 'pé']];
  const UF = Object.fromEntries(UNITS.map((u) => [u[0], u[1]]));
  const unitOpts = (sel) => UNITS.map(([u, , n]) => `<option value="${u}" ${u === sel ? 'selected' : ''}>${u} (${n})</option>`).join('');
  const unit = () => S.scale ? (S.dispUnit || S.scale.unit) : 'px';
  const k = () => S.scale ? (1 / S.scale.ppu) * UF[S.scale.unit] / UF[unit()] : 1;
  const nf = (v, d) => Number.isFinite(v) ? v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
  const digits = (v) => { const a = Math.abs(v); return a >= 1000 ? 0 : a >= 100 ? 1 : a >= 10 ? 2 : 3; };
  const fmt = (v) => nf(v, digits(v));
  const fmtLen = (px) => `${fmt(px * k())} ${unit()}`;
  const fmtArea = (px2) => `${fmt(px2 * k() * k())} ${unit()}²`;
  const lineLen = (l) => Math.hypot(l[2] - l[0], l[3] - l[1]);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let toastT; const toast = (msg) => { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); };
  const busy = (on) => { $('busy').style.display = on ? 'block' : 'none'; };
  const later = (fn) => { busy(true); setTimeout(() => { try { fn(); } finally { busy(false); } }, 20); };
  const thresholdFromSens = () => { const o = S.det ? S.det.threshold : 128; return Math.max(1, Math.min(254, Math.round(o * (2 - S.sens / 50)))); };
  // Imagem usada nas detecções: a original, opcionalmente com iluminação corrigida e/ou com os ajustes de imagem.
  // As medidas de intensidade usam sempre a original (S.rgba ou os valores brutos do TIFF em S.raw).
  // Na contagem de colônias a correção não é usada: o modelo de cor já compara cada colônia com o anel de fundo em volta,
  // e a subtração de fundo muda as cores que o modelo aprende.
  const flatOn = () => !!S.flat && S.tool !== 'colony';
  const anaKey = () => `${flatOn()}|${!!(S.adj && S.adj.use && adjActive())}`;
  const syncAna = () => { if (S.anaFor !== anaKey()) { S.ana = null; S.det = null; S.grad = null; S.blur = null; S.covBase = null; S.anaFor = anaKey(); } };
  const ana = () => {
    syncAna();
    if (!flatOn() && !(S.adj && S.adj.use && adjActive())) return S.rgba;
    if (!S.ana) { let a = S.rgba; if (flatOn()) a = MM.subtractBackgroundRGBA(a, S.W, S.H, Math.max(20, Math.round(Math.max(S.W, S.H) / 20))); if (S.adj && S.adj.use && adjActive()) a = adjustRGBA(a); S.ana = a; }
    return S.ana;
  };
  const resetAna = () => { S.ana = null; S.det = null; S.grad = null; S.blur = null; S.covBase = null; };
  const ensureDet = () => { syncAna(); if (!S.det) S.det = MM.backgroundDistance(ana(), S.W, S.H); return S.det; };
  const ensureGrad = () => { syncAna(); if (!S.grad) S.grad = MM.gradient(ana(), S.W, S.H); return S.grad; };
  const ensureBlur = () => { syncAna(); if (!S.blur) S.blur = MM.blurRGBA(ana(), S.W, S.H); return S.blur; };
  const objName = (o) => `${PREFIX[o.kind]}${o.n}`;

  /* ---------- desfazer ---------- */
  const cloneStrokes = (a) => a.map((st) => st.map((p) => p.slice()));
  const cloneObj = (o) => ({ ...o, poly: o.poly && o.poly.map((p) => p.slice()), line: o.line && o.line.slice(), lines: o.lines && o.lines.map((l) => l.slice()), points: o.points && o.points.map((p) => p.slice()), seeds: o.seeds && { fg: cloneStrokes(o.seeds.fg), bg: cloneStrokes(o.seeds.bg) },
    pts: o.pts && o.pts.map((p) => p.slice()), rects: o.rects && o.rects.map((r) => r.slice()), box: o.box && o.box.slice(), roiPoly: o.roiPoly && o.roiPoly.map((p) => p.slice()),
    models: o.models && o.models.slice(), auto: o.auto && o.auto.slice(), removed: o.removed && o.removed.map((p) => p.slice()), added: o.added && o.added.map((i) => ({ ...i })), roi: o.roi && { ...o.roi }, params: o.params && { ...o.params } });
  const snap = () => ({ objs: S.objs.map(cloneObj), scale: S.scale && { ...S.scale, line: S.scale.line && S.scale.line.slice() }, seq: { ...S.seq } });
  const pushUndo = () => { S.undo.push(snap()); if (S.undo.length > 80) S.undo.shift(); S.redo = []; updUndo(); };
  const restore = (s) => { S.objs = s.objs; S.scale = s.scale; S.seq = s.seq; if (!S.objs.find((o) => o.id === S.sel)) S.sel = null; S.flow.temp = null; refreshAll(); };
  const undo = () => { if (!S.undo.length) return; S.redo.push(snap()); restore(S.undo.pop()); updUndo(); };
  const redo = () => { if (!S.redo.length) return; S.undo.push(snap()); restore(S.redo.pop()); updUndo(); };
  const updUndo = () => { $('btnUndo').disabled = !S.undo.length; $('btnRedo').disabled = !S.redo.length; };
  let idSeq = 1;
  S.group = ''; S.groups = [];
  const addObj = (o) => { o.id = idSeq++; S.seq[o.kind] = (S.seq[o.kind] || 0) + 1; o.n = S.seq[o.kind]; o.color = COLORS[(o.n - 1) % COLORS.length]; o.group = S.group; o.photoUid = curUid();
    if (o.kind === 'area' && S.role && !o.role) { o.role = S.role; if (S.role === 'fundo') o.color = '#9aa6a3'; if (S.role === 'fenda') o.color = '#4fc3f7'; }
    S.objs.push(o); return o; };

  /* ---------- colônias ---------- */
  // marcações finais = automáticas (menos as apagadas) + adicionadas à mão
  function colonyItems(o) {
    const auto = (o.auto || []).filter((it) => !o.removed.some((p) => Math.hypot(p[0] - it.x, p[1] - it.y) <= it.r + 3));
    return auto.concat(o.added);
  }
  const typicalR = (o) => { const a = o.models.reduce((s2, m) => s2 + m.area, 0) / o.models.length; return Math.sqrt(a / Math.PI); };
  function recomputeColonies(o, cb) {
    later(() => {
      const P = o.params;
      o.auto = MM.findColonies(ensureBlur(), S.W, S.H, o.models, { tol: P.tol, minF: 1 / P.size, maxF: P.size, circTol: P.shape, clusters: P.clusters, roi: o.roi });
      refreshAll(); if (cb) cb();
    });
  }
  const COL_PARAMS = () => ({ tol: 2.5, size: 3, shape: 0.2, clusters: true });
  function colonyCreate() {
    const f = S.flow; if (!f.samples || !f.samples.length) return;
    pushUndo();
    const n = addObj({ kind: 'colony', models: f.samples.map((x) => x.model), auto: [], removed: [], added: [], roi: f.roi ? { ...f.roi } : null, params: S.protocol && S.protocol.config.colParams ? { ...S.protocol.config.colParams } : COL_PARAMS() });
    S.sel = n.id; f.samples = []; f.mode = null;
    recomputeColonies(n, () => { if (!colonyItems(n).length) toast('Nenhuma colônia parecida encontrada. Aumente a tolerância de cor.'); });
  }
  function colonyClick(p) {
    if (p.x < 0 || p.y < 0 || p.x >= S.W || p.y >= S.H) return;
    const f = S.flow, o = selObj(), col = o && o.kind === 'colony' ? o : null;
    if (!col || f.mode === 'example') {
      later(() => {
        const md = colonySample(Math.floor(p.x), Math.floor(p.y)); if (!md) return;
        if (col) { pushUndo(); col.models = col.models.concat([md]); f.mode = null; recomputeColonies(col); return; }
        f.samples = (f.samples || []).concat([{ model: md, outline: md.outline, x: p.x, y: p.y }]);
        if (f.samples.length >= 3) colonyCreate(); else refreshAll();
      });
      return;
    }
    pushUndo();
    const it = colonyItems(col), tol = 6 / S.view.z;
    const hit = it.find((i) => Math.hypot(i.x - p.x, i.y - p.y) <= Math.max(i.r, 3) + tol);
    if (hit) { if (hit.auto) col.removed.push([hit.x, hit.y]); else col.added = col.added.filter((i) => i !== hit); }
    else col.added.push({ x: p.x, y: p.y, n: 1, r: typicalR(col), area: NaN, auto: false });
    refreshAll();
  }
  function detectPlateInto(f, quiet) {
    later(() => {
      const c = MM.detectPlate(S.rgba, S.W, S.H), o = selObj(), col = o && o.kind === 'colony' ? o : null;
      const roi = c ? { cx: c.cx, cy: c.cy, rx: c.r, ry: c.r } : null;
      if (col) { pushUndo(); col.roi = roi; recomputeColonies(col); } else f.roi = roi;
      if (c) toast('Placa encontrada. Arraste dentro dela para centralizar e puxe a borda para ajustar o tamanho.');
      else if (!quiet) toast('Não encontrei uma placa redonda nesta foto. Desenhe a placa ou conte na foto inteira.');
      refreshAll();
    });
  }
  function colonySample(x, y) { // segmenta a colônia clicada e devolve o modelo
    const m = MM.segmentSeeds(ensureGrad(), S.W, S.H, [[[x, y]]], [], { fillHoles: true, minArea: 4 });
    const n = MM.maskCount(m);
    if (n < 4) { toast('Não consegui separar essa colônia. Dê zoom e clique no centro dela.'); return null; }
    if (n > S.W * S.H * 0.05) { toast('O contorno pegou uma região grande demais. Clique bem no centro de uma colônia, ou marque a área da placa antes.'); return null; }
    const md = MM.colonyModel(ensureBlur(), S.W, m, S.H); md.outline = MM.outlines(m).map((o) => o.poly); return md;
  }

  /* ---------- medições ---------- */
  const mCache = new WeakMap();
  const measureArea = (o) => {
    let m = mCache.get(o.mask);
    if (!m) {
      m = MM.measureMask(o.mask, S.rgba, S.W);
      if (o.photoUid === curUid()) { m.int = MM.intensityStats(o.mask, S.rgba, S.W, S.raw); o.int = m.int; o.meanColor = m.mean; }
      else { m.int = o.int || null; if (o.meanColor) m.mean = o.meanColor; }
      mCache.set(o.mask, m);
    }
    if (o.poly && o.method === 'oval' && o.box) { // elipse: perímetro de Ramanujan, como o ImageJ
      const key = o.poly; let pm = mCache.get(key);
      if (!pm) { const perim = MM.ovalPerimeter(o.box[2], o.box[3]), f = MM.feret(MM.convexHull(o.poly)); pm = { ...m, perimeter: perim, feret: f.max, minFeret: f.min, maxLine: f.maxLine, minLine: f.minLine, circularity: Math.min(1, 4 * Math.PI * m.area / (perim * perim)) }; mCache.set(key, pm); }
      return pm;
    }
    if (o.poly) { // traçado à mão/polígono ainda não editado: perímetro e Feret pelo traçado (como o ImageJ)
      const key = o.poly; let pm = mCache.get(key);
      if (!pm) {
        const perim = MM.polyLength(o.poly, true, o.method === 'free' || o.method === 'magnetic'), f = MM.feret(MM.convexHull(o.poly));
        pm = { ...m, perimeter: perim, feret: f.max, minFeret: f.min, maxLine: f.maxLine, minLine: f.minLine, circularity: Math.min(1, 4 * Math.PI * m.area / (perim * perim)) };
        mCache.set(key, pm);
      }
      return pm;
    }
    return m;
  };
  const curUid = () => (S.photos[S.cur] || {}).uid;
  const lwSorted = (o) => { const [a, b] = o.lines; return lineLen(a) >= lineLen(b) ? [a, b] : [b, a]; };

  /* ---------- ajustes de imagem (só visualização, a menos que "usar nas detecções") ---------- */
  S.adj = { b: 0, c: 0, inv: false, ch: 'all', auto: null, use: false };
  const adjActive = () => { const a = S.adj; return a.b || a.c || a.inv || a.ch !== 'all' || a.auto; };
  function adjustRGBA(src) {
    const a = S.adj, out = new Uint8ClampedArray(src.length), cf = Math.pow(10, a.c / 100), lut = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v++) {
      let x = v; if (a.auto) x = (x - a.auto[0]) * 255 / Math.max(1, a.auto[1] - a.auto[0]);
      x = (x - 128) * cf + 128 + a.b * 1.28; if (a.inv) x = 255 - x; lut[v] = x;
    }
    for (let i = 0; i < src.length; i += 4) {
      if (a.ch === 'all') { out[i] = lut[src[i]]; out[i + 1] = lut[src[i + 1]]; out[i + 2] = lut[src[i + 2]]; }
      else { const v = a.ch === 'r' ? src[i] : a.ch === 'g' ? src[i + 1] : a.ch === 'b' ? src[i + 2] : Math.floor((src[i] + src[i + 1] + src[i + 2]) / 3 + 0.5); out[i] = out[i + 1] = out[i + 2] = lut[v]; }
      out[i + 3] = 255;
    }
    return out;
  }
  function autoLevels() { // como o "Auto" do ImageJ: corta 0,35% dos extremos
    const h = new Float64Array(256), r = S.rgba, n = r.length / 4; for (let i = 0; i < r.length; i += 4) h[Math.floor((r[i] + r[i + 1] + r[i + 2]) / 3)]++;
    let acc = 0, lo = 0, hi = 255; for (let v = 0; v < 256; v++) { acc += h[v]; if (acc > n * 0.0035) { lo = v; break; } }
    acc = 0; for (let v = 255; v >= 0; v--) { acc += h[v]; if (acc > n * 0.0035) { hi = v; break; } }
    return [lo, Math.max(lo + 1, hi)];
  }
  function dispCanvas() {
    if (!adjActive()) return S.imgCanvas;
    if (!S.disp) { S.disp = document.createElement('canvas'); S.disp.width = S.W; S.disp.height = S.H; S.disp.getContext('2d').putImageData(new ImageData(adjustRGBA(S.rgba), S.W, S.H), 0, 0); }
    return S.disp;
  }

  /* ---------- vista ---------- */
  const toImg = (sx, sy) => [(sx - S.view.ox) / S.view.z, (sy - S.view.oy) / S.view.z];
  const toScr = (x, y) => [x * S.view.z + S.view.ox, y * S.view.z + S.view.oy];
  const fit = () => {
    if (!S.img) return; const r = wrap.getBoundingClientRect();
    const z = Math.min(r.width / S.W, r.height / S.H) * 0.94;
    S.view = { z, ox: (r.width - S.W * z) / 2, oy: (r.height - S.H * z) / 2 }; render();
  };
  const zoomAt = (f, sx, sy) => {
    const r = wrap.getBoundingClientRect(); if (sx == null) { sx = r.width / 2; sy = r.height / 2; }
    const z = Math.max(0.02, Math.min(40, S.view.z * f)), [ix, iy] = toImg(sx, sy);
    S.view.z = z; S.view.ox = sx - ix * z; S.view.oy = sy - iy * z; render();
  };

  /* ---------- desenho ---------- */
  const maskCanvases = new WeakMap();
  const maskCanvas = (o) => {
    let c = maskCanvases.get(o.mask);
    if (c && c._color === o.color) return c;
    const m = o.mask; c = document.createElement('canvas'); c.width = Math.max(1, m.w); c.height = Math.max(1, m.h); c._color = o.color;
    if (m.w && m.h) {
      const id = c.getContext('2d').createImageData(m.w, m.h), r = parseInt(o.color.slice(1, 3), 16), g = parseInt(o.color.slice(3, 5), 16), b = parseInt(o.color.slice(5, 7), 16);
      for (let i = 0; i < m.data.length; i++) if (m.data[i]) { id.data[i * 4] = r; id.data[i * 4 + 1] = g; id.data[i * 4 + 2] = b; id.data[i * 4 + 3] = 85; }
      c.getContext('2d').putImageData(id, 0, 0);
    }
    maskCanvases.set(o.mask, c); return c;
  };

  let raf = 0;
  const render = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };

  // Texto de cada medição (usado nos rótulos e na legenda).
  function describe(o) {
    if (o.kind === 'area') return `Área ${fmtArea(measureArea(o).area)}`;
    if (o.kind === 'length') return `Comprimento ${fmtLen(lineLen(o.line))}`;
    if (o.kind === 'lw') { const [a, b] = lwSorted(o); return `Comprimento ${fmtLen(lineLen(a))}, largura ${fmtLen(lineLen(b))}`; }
    if (o.kind === 'count') return `Contagem: ${o.points.length} ${o.points.length === 1 ? 'item' : 'itens'}`;
    if (o.kind === 'colony') { const n = colonyItems(o).reduce((a, i) => a + i.n, 0); return `Colônias: ${n}`; }
    if (o.kind === 'angle') return `Ângulo ${nf(MM.angle3(...o.pts), 1)}°`;
    if (o.kind === 'coverage') return `Cobertura ${nf(o.covered / o.total * 100, 1)}%`;
    if (o.kind === 'bands') return `${o.rects.length} banda${o.rects.length === 1 ? '' : 's'}`;
    if (o.kind === 'profile') return `Perfil ${fmtLen(lineLen(o.line))}`;
    return '';
  }
  const DASH = { solid: [], dash: [3, 2], dot: [0.01, 2] };

  // Desenha camadas de medição. g: contexto; P: mapeia imagem→destino; u: tamanho de unidade gráfica (px).
  function drawOverlays(g, P, u) {
    const st = S.style, LW = st.width, fs = st.size, onLine = st.legend === 'line';
    const tagOnly = !onLine && st.tags, noText = !onLine && !st.tags;
    const placed = [];
    const label = (x, y, text, color, strong) => {
      g.font = `${strong ? 600 : 500} ${fs * u}px Bahnschrift, "Segoe UI", sans-serif`;
      const w = g.measureText(text).width + 12 * u, h = fs * 1.55 * u;
      const hit = (yy) => placed.some((r) => Math.abs(r[0] - x) < (r[2] + w) / 2 + 2 * u && Math.abs(r[1] - yy) < h + 2 * u);
      for (let t = 1; t < 8 && hit(y); t++) { const dy = Math.ceil(t / 2) * (h + 3 * u) * (t % 2 ? 1 : -1); if (!hit(y + dy)) { y += dy; break; } }
      placed.push([x, y, w]);
      g.fillStyle = 'rgba(0,0,0,.8)'; g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h, 5 * u); g.fill();
      g.fillStyle = color; g.fillRect(x - w / 2, y - h / 2, 3 * u, h);
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x + 1.5 * u, y + 0.5 * u);
    };
    const tag = (o) => onLine ? `${objName(o)}  ${describe(o).replace(/^(Área|Comprimento|Contagem:) /, '')}` : objName(o);
    const path = (pts, close) => { g.beginPath(); pts.forEach((p, i) => { const [x, y] = P(p[0], p[1]); i ? g.lineTo(x, y) : g.moveTo(x, y); }); if (close) g.closePath(); };
    const styled = (w, color, dash) => { // contorno escuro + linha colorida no estilo escolhido
      const d = (dash || DASH.solid).map((v) => v * w * u * (dash === DASH.dot ? 1.6 : 2.4));
      g.lineCap = dash === DASH.dot ? 'round' : 'butt'; g.lineJoin = 'round';
      g.setLineDash(d); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = (w + 2) * u; g.stroke();
      g.strokeStyle = color; g.lineWidth = w * u; g.stroke(); g.setLineDash([]); g.lineCap = 'butt';
    };
    const seg = (l, color, w, dash) => {
      const [a, b] = [P(l[0], l[1]), P(l[2], l[3])];
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); styled(w, color, dash);
      for (const p of [a, b]) { g.beginPath(); g.arc(p[0], p[1], (2.5 + w * 0.8) * u, 0, 7); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 1.6 * u; g.strokeStyle = color; g.stroke(); }
      return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, b[0] - a[0], b[1] - a[1]];
    };
    const offsetLabel = (mid, text, color, strong) => {
      const L = Math.hypot(mid[2], mid[3]) || 1, nx = -mid[3] / L, ny = mid[2] / L, off = (fs + LW * 2 + 6) * u;
      label(mid[0] + nx * off, mid[1] + ny * off, text, color, strong);
    };
    const dash = DASH[st.dash] || DASH.solid;

    if (S.scale && S.scale.line) {
      const mid = seg(S.scale.line, '#f5b700', LW + 1);
      if (onLine) offsetLabel(mid, `Escala ${nf(S.scale.known, digits(S.scale.known))} ${S.scale.unit}`, '#f5b700');
    }
    for (const o of S.objs) {
      const sel = o.id === S.sel, w = LW + (sel ? 1 : 0);
      if (o.kind === 'area') {
        const m = measureArea(o);
        if (o.poly) { path(o.poly, true); styled(w, o.color, dash); }
        else for (const ol of m.outlines) { path(ol, true); styled(w, o.color, dash); }
        if (sel && m.maxLine && S.tool !== 'edit') { seg(m.maxLine, '#ffffff', 1, DASH.dash); if (m.minLine) seg(m.minLine, '#ffffff', 1, DASH.dash); }
        if (m.area && !noText) { const [x, y] = P(m.centroid[0], m.centroid[1]); label(x, y, tag(o), o.color, sel); }
      } else if (o.kind === 'length') {
        const mid = seg(o.line, o.color, w, dash); if (!noText) offsetLabel(mid, tag(o), o.color, sel);
      } else if (o.kind === 'lw') {
        const [a, b] = lwSorted(o);
        const m1 = seg(a, o.color, w, dash), m2 = seg(b, o.color, Math.max(1, w * 0.75), dash);
        if (onLine) { offsetLabel(m1, `${objName(o)} comp. ${fmtLen(lineLen(a))}`, o.color, sel); offsetLabel(m2, `larg. ${fmtLen(lineLen(b))}`, o.color, sel); }
        else if (!noText) offsetLabel(m1, objName(o), o.color, sel);
      } else if (o.kind === 'count') {
        const r = (fs * 0.7 + LW) * u;
        o.points.forEach((p, i) => {
          const [x, y] = P(p[0], p[1]);
          g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = o.color; g.fill(); g.lineWidth = 2 * u; g.strokeStyle = sel ? '#fff' : 'rgba(0,0,0,.6)'; g.stroke();
          g.fillStyle = '#111'; g.font = `600 ${fs * 0.85 * u}px Bahnschrift, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), x, y + 0.5 * u);
        });
        if (tagOnly && o.points.length) { const [x, y] = P(o.points[0][0], o.points[0][1]); label(x, y - r - fs * u, objName(o), o.color, sel); }
      } else if (o.kind === 'angle') {
        const [a, v, b] = o.pts.map((q) => P(q[0], q[1]));
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(v[0], v[1]); g.lineTo(b[0], b[1]); styled(w, o.color, dash);
        const a1 = Math.atan2(a[1] - v[1], a[0] - v[0]), a2 = Math.atan2(b[1] - v[1], b[0] - v[0]); let d = a2 - a1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
        const R = Math.max(14 * u, Math.min(Math.hypot(a[0] - v[0], a[1] - v[1]), Math.hypot(b[0] - v[0], b[1] - v[1])) * 0.3);
        g.beginPath(); g.arc(v[0], v[1], R, a1, a1 + d, d < 0); g.strokeStyle = o.color; g.lineWidth = Math.max(1, w * 0.8) * u; g.stroke();
        for (const q of [a, v, b]) { g.beginPath(); g.arc(q[0], q[1], (2.5 + w * 0.8) * u, 0, 7); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 1.6 * u; g.strokeStyle = o.color; g.stroke(); }
        if (!noText) { const am = a1 + d / 2; label(v[0] + Math.cos(am) * (R + 22 * u), v[1] + Math.sin(am) * (R + 22 * u), onLine ? `${objName(o)}  ${nf(MM.angle3(...o.pts), 1)}°` : objName(o), o.color, sel); }
      } else if (o.kind === 'profile') {
        const mid = seg(o.line, o.color, w, dash); if (!noText) offsetLabel(mid, objName(o), o.color, sel);
      } else if (o.kind === 'coverage') {
        if (o.roiPoly) { path(o.roiPoly, true); styled(w, '#f5b700', DASH.dash); }
        if (!noText) { const q = o.roiPoly ? o.roiPoly[0] : [S.W * 0.04, S.H * 0.06]; const [x, y] = P(q[0], q[1]); label(x + 70 * u, y + 20 * u, onLine ? `${objName(o)}  ${describe(o)}` : objName(o), o.color, sel); }
      } else if (o.kind === 'bands') {
        o.rects.forEach((rc, i) => {
          const [x0, y0] = P(rc[0], rc[1]), [x1, y1] = P(rc[0] + rc[2], rc[1] + rc[3]);
          g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); styled(Math.max(1, w * 0.8), i === 0 ? '#f5b700' : o.color, dash);
          if (!noText) { g.font = `600 ${fs * 0.9 * u}px Bahnschrift, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.lineWidth = 3 * u; g.strokeStyle = '#000'; g.strokeText(String(i + 1), (x0 + x1) / 2, y0 - 3 * u); g.fillStyle = '#fff'; g.fillText(String(i + 1), (x0 + x1) / 2, y0 - 3 * u); }
        });
      } else if (o.kind === 'colony') {
        const it = colonyItems(o), z = P(1, 0)[0] - P(0, 0)[0];
        for (const c of it) {
          const [x, y] = P(c.x, c.y), r = Math.max(4 * u, (c.r + 2) * z);
          g.beginPath(); g.arc(x, y, r, 0, 7); styled(Math.max(1, LW * 0.8), c.auto ? o.color : '#ffffff', c.auto ? dash : DASH.dot);
          if (c.n > 1) { g.font = `600 ${fs * 0.85 * u}px Bahnschrift, sans-serif`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.lineWidth = 3 * u; g.strokeStyle = '#000'; g.strokeText(`×${c.n}`, x + r + 2 * u, y); g.fillStyle = '#fff'; g.fillText(`×${c.n}`, x + r + 2 * u, y); }
        }
        if (!noText && it.length) {
          const top = it.reduce((a, c) => (c.y < a.y ? c : a), it[0]), [x, y] = P(top.x, top.y);
          label(x, y - (top.r * z + fs * 1.6 * u), onLine ? `${objName(o)}  ${describe(o)}` : objName(o), o.color, sel);
        }
      }
    }
    if (!onLine && st.legend !== 'none') drawLegend(g, P, u);
    if (st.sbar && S.scale) drawScaleBar(g, P, u);
    return { label, seg, path };
  }

  // Barra de escala: comprimento redondo (~1/5 da largura) ou o valor escolhido, num canto da imagem.
  function drawScaleBar(g, P, u) {
    const st = S.style, K = k(), lenU = st.sbarLen > 0 ? st.sbarLen : MM.niceLength(S.W / 5 * K), px = lenU / K;
    const [ix0, iy0] = P(0, 0), [ix1, iy1] = P(S.W, S.H), z = (ix1 - ix0) / S.W, L = px * z, th = Math.max(2, (st.sbarThick || 1) * 4) * u, m = 18 * u;
    const right = !st.sbarPos || st.sbarPos.endsWith('r'), bottom = !st.sbarPos || st.sbarPos.startsWith('b');
    const fsz = st.size * u * 1.05, txt = `${nf(lenU, lenU < 1 ? 2 : lenU % 1 ? 1 : 0)} ${unit()}`;
    let col = st.sbarColor || 'auto';
    if (col === 'auto') { // escolhe branco ou preto pelo brilho do canto
      const cx = Math.floor(right ? S.W * 0.9 : S.W * 0.1), cy = Math.floor(bottom ? S.H * 0.92 : S.H * 0.08); let s2 = 0, n = 0;
      for (let y = Math.max(0, cy - 20); y < Math.min(S.H, cy + 20); y += 4) for (let x = Math.max(0, cx - 40); x < Math.min(S.W, cx + 40); x += 4) { const q = (y * S.W + x) * 4; s2 += S.rgba[q] + S.rgba[q + 1] + S.rgba[q + 2]; n++; }
      col = s2 / n / 3 > 140 ? 'black' : 'white';
    }
    const c = col === 'black' ? '#000' : '#fff', x = right ? ix1 - m - L : ix0 + m, y = bottom ? iy1 - m - (st.sbarText !== false ? fsz * 1.4 : 0) - th : iy0 + m;
    g.fillStyle = c; g.fillRect(x, y, L, th);
    if (st.sbarText !== false) { g.font = `600 ${fsz}px Bahnschrift, "Segoe UI", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText(txt, x + L / 2, y + th + 3 * u); }
  }

  // Legenda num canto da imagem: cor da marcação + nome + valores.
  function drawLegend(g, P, u) {
    const st = S.style, fs = st.size, rows = [];
    if (S.scale && S.scale.line) rows.push({ color: '#f5b700', text: `Escala  ${nf(S.scale.known, digits(S.scale.known))} ${S.scale.unit}`, kind: 'line' });
    for (const o of S.objs) if (o.kind !== 'area' || o.mask.w) rows.push({ color: o.color, text: `${objName(o)}  ${describe(o)}`, kind: o.kind });
    if (!rows.length) return;
    g.font = `500 ${fs * u}px Bahnschrift, "Segoe UI", sans-serif`;
    const [ix0, iy0] = P(0, 0), [ix1, iy1] = P(S.W, S.H), pad = 10 * u, rh = fs * 1.6 * u, sw = 26 * u;
    const maxRows = Math.max(1, Math.floor((iy1 - iy0 - 2 * pad - 12 * u) / rh));
    const cols = []; for (let i = 0; i < rows.length; i += maxRows) cols.push(rows.slice(i, i + maxRows));
    const colW = cols.map((c) => Math.max(...c.map((r) => g.measureText(r.text).width)) + sw + 10 * u);
    const bw = colW.reduce((a, b) => a + b, 0) + pad * 2 + (cols.length - 1) * 14 * u, bh = Math.min(rows.length, maxRows) * rh + pad * 2;
    const m = 12 * u, right = st.legend.endsWith('r'), bottom = st.legend.startsWith('b');
    const x = right ? ix1 - m - bw : ix0 + m, y = bottom ? iy1 - m - bh : iy0 + m;
    g.fillStyle = 'rgba(0,0,0,.78)'; g.beginPath(); g.roundRect(x, y, bw, bh, 8 * u); g.fill();
    let cx = x + pad;
    cols.forEach((c, ci) => {
      c.forEach((r, i) => {
        const yy = y + pad + rh * i + rh / 2;
        g.beginPath(); g.moveTo(cx, yy); g.lineTo(cx + sw - 6 * u, yy);
        g.setLineDash((DASH[st.dash] || []).map((v) => v * st.width * u * (st.dash === 'dot' ? 1.6 : 2.4))); g.lineCap = st.dash === 'dot' ? 'round' : 'butt';
        g.strokeStyle = r.color; g.lineWidth = Math.max(2, st.width) * u; g.stroke(); g.setLineDash([]); g.lineCap = 'butt';
        g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(r.text, cx + sw, yy + 0.5 * u);
      });
      cx += colW[ci] + 14 * u;
    });
  }

  function draw() {
    const r = wrap.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    $('zoomLbl').textContent = Math.round(S.view.z * 100) + '%';
    if (!S.img) return;
    const { z, ox, oy } = S.view;
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * ox, dpr * oy);
    ctx.imageSmoothingEnabled = z < 2;
    ctx.drawImage(dispCanvas(), 0, 0);
    if (S.cmp && S.cmp.canvas) { // comparar: a outra foto aparece à direita da divisória, na mesma posição
      const sx = (S.cmp.split * r.width - ox) / z; ctx.save(); ctx.beginPath(); ctx.rect(sx, -1e5, 2e5, 2e5); ctx.clip(); ctx.fillStyle = '#000'; ctx.fillRect(sx, -1e5, 2e5, 2e5); ctx.drawImage(S.cmp.canvas, 0, 0); ctx.restore();
    }
    if ((S.tool === 'detect' || S.tool === 'coverage') && S.preview) ctx.drawImage(S.preview, 0, 0);
    for (const o of S.objs) if ((o.kind === 'area' || o.kind === 'coverage') && o.mask && o.mask.w) ctx.drawImage(maskCanvas(o), o.mask.x, o.mask.y);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const T = drawOverlays(ctx, toScr, 1);
    if (S.cmp && S.cmp.canvas) {
      const x = S.cmp.split * r.width; ctx.fillStyle = '#f5b700'; ctx.fillRect(x - 1.5, 0, 3, r.height);
      ctx.beginPath(); ctx.arc(x, r.height / 2, 14, 0, 7); ctx.fill(); ctx.fillStyle = '#000'; ctx.font = '600 14px Bahnschrift, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⇔', x, r.height / 2 + 1);
      T.label(Math.max(80, x / 2), 18, S.name, '#ffffff'); T.label(Math.min(r.width - 80, x + (r.width - x) / 2), 18, S.cmp.name, '#f5b700');
    }

    // traçados em andamento
    const f = S.flow, p = S.pointer;
    if (f.temp && f.temp.type === 'line') { const l = f.temp.l; const mid = T.seg(l, S.tool === 'scale' ? '#f5b700' : '#ffffff', 2.5); if (lineLen(l) > 1) T.label(mid[0] - mid[3] / (Math.hypot(mid[2], mid[3]) || 1) * 16, mid[1] + mid[2] / (Math.hypot(mid[2], mid[3]) || 1) * 16, fmtLen(lineLen(l)), '#fff'); }
    if (f.temp && f.temp.type === 'free') { T.path(f.temp.pts, false); ctx.strokeStyle = f.temp.erase ? '#ff5252' : f.temp.seed === 'fg' ? '#35e0c0' : '#fff'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]); }
    if (S.tool === 'area' && f.mode === 'poly' && f.pts && f.pts.length) {
      const pts = p ? f.pts.concat([p.img]) : f.pts; T.path(pts, false); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      const [x0, y0] = toScr(f.pts[0][0], f.pts[0][1]); ctx.beginPath(); ctx.arc(x0, y0, 7, 0, 7); ctx.strokeStyle = '#f5b700'; ctx.lineWidth = 2; ctx.stroke();
      for (const q of f.pts) { const [x, y] = toScr(q[0], q[1]); ctx.fillStyle = '#fff'; ctx.fillRect(x - 3, y - 3, 6, 6); }
    }
    if (S.tool === 'area' && f.mode === 'magnetic' && f.anchors && f.anchors.length) {
      ctx.lineJoin = 'round';
      for (const sg of f.segs) { T.path(sg, false); ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.stroke(); ctx.strokeStyle = '#35e0c0'; ctx.lineWidth = 2; ctx.stroke(); }
      if (f.prevPath) { T.path(f.prevPath, false); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]); }
      f.anchors.forEach((a, i) => { const [x, y] = toScr(a[0] + 0.5, a[1] + 0.5); ctx.beginPath(); ctx.arc(x, y, i ? 4 : 7, 0, 7); ctx.fillStyle = i ? '#35e0c0' : 'transparent'; ctx.fill(); ctx.strokeStyle = i ? '#000' : '#f5b700'; ctx.lineWidth = 2; ctx.stroke(); });
    }
    if (S.tool === 'area' && f.mode === 'click') { const o = selObj(); if (o && o.seeds) {
      for (const [list, col] of [[o.seeds.fg, '#35e0c0'], [o.seeds.bg, '#ff5252']]) for (const st of list) {
        if (st.length > 1) { T.path(st, false); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke(); }
        else { const [x, y] = toScr(st[0][0], st[0][1]); ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.stroke(); }
      }
    } }
    if (f.temp && f.temp.type === 'box') {
      const [x0, y0] = toScr(f.temp.a[0], f.temp.a[1]), [x1, y1] = toScr(f.temp.b[0], f.temp.b[1]);
      ctx.beginPath(); if (f.temp.oval) ctx.ellipse((x0 + x1) / 2, (y0 + y1) / 2, Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, 0, 0, 7); else ctx.rect(x0, y0, x1 - x0, y1 - y0);
      ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]);
    }
    if (S.tool === 'crop' && f.cropBox) {
      const [x0, y0] = toScr(f.cropBox[0], f.cropBox[1]), [x1, y1] = toScr(f.cropBox[0] + f.cropBox[2], f.cropBox[1] + f.cropBox[3]);
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.rect(0, 0, r.width, r.height); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.fill('evenodd');
      ctx.strokeStyle = '#f5b700'; ctx.lineWidth = 2; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    }
    if (S.tool === 'coverage' && S.covPoly && S.covRoi !== 'whole') { T.path(S.covPoly, true); ctx.strokeStyle = '#f5b700'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]); }
    if (S.tool === 'angle' && f.pts && f.pts.length) {
      const pts = p ? f.pts.concat([p.img]) : f.pts; T.path(pts, false); ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      for (const q of f.pts) { const [x, y] = toScr(q[0], q[1]); ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); }
      if (pts.length === 3) { const [x, y] = toScr(pts[1][0], pts[1][1]); T.label(x, y - 22, `${nf(MM.angle3(...pts), 1)}°`, '#fff'); }
    }
    if (S.tool === 'persp' && f.pts && f.pts.length) {
      const pts = f.pts.length === 4 ? MM.orderQuad(f.pts) : f.pts;
      T.path(pts, pts.length === 4); ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.stroke(); ctx.strokeStyle = '#35e0c0'; ctx.lineWidth = 2; ctx.stroke();
      if (pts.length === 4) { const [a, b] = [toScr(pts[0][0], pts[0][1]), toScr(pts[1][0], pts[1][1])]; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.strokeStyle = '#f5b700'; ctx.lineWidth = 4; ctx.stroke(); T.label((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 18, 'largura', '#f5b700'); }
      for (const q of pts) { const [x, y] = toScr(q[0], q[1]); ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fillStyle = '#35e0c0'; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke(); }
    }
    if (S.tool === 'colony') {
      const o = selObj(), roi = f.temp && f.temp.type === 'ellipse' ? { cx: (f.temp.a[0] + f.temp.b[0]) / 2, cy: (f.temp.a[1] + f.temp.b[1]) / 2, rx: Math.abs(f.temp.b[0] - f.temp.a[0]) / 2, ry: Math.abs(f.temp.b[1] - f.temp.a[1]) / 2 } : (o && o.kind === 'colony' ? o.roi : f.roi);
      if (roi) {
        const [x, y] = toScr(roi.cx, roi.cy), rx = roi.rx * S.view.z, ry = roi.ry * S.view.z;
        ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 5; ctx.stroke(); ctx.strokeStyle = '#f5b700'; ctx.lineWidth = 2.5; ctx.stroke();
        for (const [hx, hy] of [[x + rx, y], [x - rx, y], [x, y + ry], [x, y - ry]]) { ctx.fillStyle = '#f5b700'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.rect(hx - 5, hy - 5, 10, 10); ctx.fill(); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y); ctx.moveTo(x, y - 8); ctx.lineTo(x, y + 8); ctx.strokeStyle = '#f5b700'; ctx.lineWidth = 2; ctx.stroke();
        T.label(x, y - ry - 16, 'Placa', '#f5b700');
      }
      (f.samples || []).forEach((sm, i) => {
        for (const ol of sm.outline || []) { T.path(ol, true); ctx.strokeStyle = '#000'; ctx.lineWidth = 5; ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke(); }
        const [x, y] = toScr(sm.x, sm.y); T.label(x, y - 24, `Exemplo ${i + 1}`, '#ffffff', true);
      });
    }
    if (S.tool === 'edit' && f.brush && f.brush.startsWith('brush') && p && S.sel) {
      ctx.beginPath(); ctx.arc(p.sx, p.sy, S.brushPx, 0, 7); ctx.strokeStyle = (f.brush === 'brushAdd') !== !!p.alt ? '#fff' : '#ff5252'; ctx.lineWidth = 1.5; ctx.stroke();
    }
  }

  /* ---------- faixa de instruções ---------- */
  const step = (txt) => `<span class="step">${txt}</span>`;
  const msg = (main, sub) => `<div class="msg">${main}${sub ? `<em>${sub}</em>` : ''}</div>`;
  function renderGuide() {
    const f = S.flow; let h = '';
    if (!S.img) h = msg('Abra uma foto para começar.', 'Formatos aceitos: JPG, PNG, WebP, BMP, GIF.');
    else if (!S.tool) h = S.scale ? msg('Escolha o que você quer medir na barra à esquerda.', 'Arraste com o botão direito ou segure Espaço para mover a imagem. Use a roda do mouse para zoom.') +
      (S.photos.length > 1 ? `<div class="ctl"><button class="gbtn" data-a="scaleAll" title="As outras fotos passam a usar esta escala">Usar esta escala em todas as fotos</button>${S.lastPersp && S.photos[S.cur].canvas ? '<button class="gbtn" data-a="perspAll" title="Para fotos tiradas com a câmera fixa, na mesma posição">Corrigir as outras fotos do mesmo jeito</button>' : ''}</div>` : '')
      : msg('Primeiro, defina a escala.', 'Clique em Escala e trace uma linha sobre a régua ou outro objeto de medida conhecida.') + `<div class="ctl"><button class="pbtn" data-a="goScale">Definir escala</button></div>`;
    else if (S.tool === 'scale') {
      if (f.stage === 'value') h = msg(`A linha tem ${nf(lineLen(f.line), 1)} pixels. Quanto ela mede de verdade?`) +
        `<div class="ctl"><input type="number" id="gKnown" min="0" step="any" value="${S.scale ? S.scale.known : 1}"><select id="gUnit">${unitOpts(S.scale ? S.scale.unit : 'cm')}</select>
         <button class="pbtn" data-a="scaleOk">Definir escala</button><button class="gbtn" data-a="scaleRedo">Traçar de novo</button></div>`;
      else h = msg('Trace uma linha sobre o objeto de medida conhecida.', 'Por exemplo, de 0 a 10 cm na régua. Dê zoom para marcar as pontas com precisão.') +
        (S.scale ? `<div class="ctl"><button class="gbtn" data-a="scaleClear">Remover escala</button></div>` : '');
    } else if (S.tool === 'area') {
      const modes = `<div class="seg">${[['click', 'Clicar no objeto'], ['magnetic', 'Contorno magnético'], ['free', 'À mão'], ['poly', 'Polígono'], ['rect', 'Retângulo'], ['oval', 'Elipse']].map(([m, t]) => `<button data-a="mode" data-v="${m}" class="${f.mode === m ? 'on' : ''}">${t}</button>`).join('')}</div>`;
      const so = selObj(), canSeed = so && so.seeds;
      const sub = {
        free: 'Segure o botão e contorne a região. Ao soltar, a área é calculada.',
        rect: 'Arraste de um canto ao outro.', oval: 'Arraste de um canto ao outro do retângulo que contém a elipse.',
        poly: 'Clique para marcar os cantos. Clique no primeiro ponto ou pressione Enter para fechar.',
        magnetic: 'Clique num ponto da borda e vá clicando ao redor: a linha gruda sozinha na borda. Feche clicando no primeiro ponto ou com Enter. Backspace desfaz o último trecho.',
        click: f.seed === 'fg' ? 'Clique ou risque sobre a parte do objeto que ficou de fora.' : f.seed === 'bg' ? 'Clique ou risque sobre o fundo que entrou por engano no contorno.' :
          'Clique dentro do objeto. O contorno para na borda mais nítida entre o objeto e o fundo. Atalhos: Shift+clique marca objeto, Alt+clique marca fundo.',
      }[f.mode];
      const main = f.last ? `${f.last}. Meça a próxima região ou escolha outra ferramenta.` : 'Selecione a região que deseja saber a área.';
      const roles = S.measureInt || S.role ? `<div class="ctl"><span class="lbl2">Marcando:</span><div class="seg">${[['', 'Objeto'], ['fundo', 'Fundo (referência)']].concat(S.protocol && S.protocol.id === 'cicatrizacao' ? [['fenda', 'Fenda']] : []).map(([r, t]) => `<button data-a="role" data-v="${r}" class="${(S.role || '') === r ? 'on' : ''}">${t}</button>`).join('')}</div></div>` : '';
      h = msg(main, sub) + `<div class="ctl">${modes}</div>` + roles + (f.mode === 'click' ? `<div class="ctl">
        <div class="seg">${[['new', 'Novo objeto'], ['fg', 'Marcar objeto'], ['bg', 'Marcar fundo']].map(([m, t]) => `<button data-a="seed" data-v="${m}" class="${(f.seed || 'new') === m ? 'on' : ''}" ${m !== 'new' && !canSeed ? 'disabled' : ''}>${t}</button>`).join('')}</div>
        <label><input type="checkbox" id="gFill" ${S.fill ? 'checked' : ''}> Incluir furos</label></div>` : '') +
        (so && so.kind === 'area' ? `<div class="ctl"><button class="gbtn" data-a="goEdit">Ajustar contorno</button></div>` : '');
    } else if (S.tool === 'detect') {
      const cnt = S.previewCount == null ? '…' : S.previewCount;
      const minDisp = S.scale ? +(S.minArea * k() * k()).toPrecision(3) : S.minArea;
      h = msg(`${cnt} objeto${cnt === 1 ? '' : 's'} encontrado${cnt === 1 ? '' : 's'}. Confira a marcação e clique em Medir.`, 'Se pegou fundo ou faltou parte, ajuste a sensibilidade. Depois você pode corrigir cada contorno em Ajustar contorno.') +
        `<div class="ctl"><label>Sensibilidade <input type="range" id="gSens" min="1" max="100" value="${S.sens}"></label>
        <label>Tamanho mínimo <input type="number" id="gMin" min="0" step="any" value="${minDisp}"> ${unit()}²</label></div>
        <div class="ctl"><label><input type="checkbox" id="gFill" ${S.fill ? 'checked' : ''}> Incluir furos</label>
        <label><input type="checkbox" id="gExcl" ${S.excl ? 'checked' : ''}> Ignorar objetos cortados na borda</label>
        <label title="Coloca o contorno onde a borda é mais nítida, em vez de seguir só a cor"><input type="checkbox" id="gRefine" ${S.refine ? 'checked' : ''}> Refinar bordas</label>
        <label title="Divide objetos que estão se tocando (como o Watershed do ImageJ)"><input type="checkbox" id="gSplit" ${S.split ? 'checked' : ''}> Separar objetos encostados</label>
        <label title="Compensa sombra e luz mais forte no centro da foto"><input type="checkbox" id="gFlat" ${S.flat ? 'checked' : ''}> Corrigir iluminação desigual</label>
        <button class="pbtn" data-a="detectOk" ${!S.previewCount ? 'disabled' : ''}>Medir ${S.previewCount || ''} objetos</button>${S.photos.length > 1 ? `<button class="gbtn" data-a="detectAllPhotos">Medir em todas as ${S.photos.length} fotos</button>` : ''}</div>`;
    } else if (S.tool === 'length' || S.tool === 'lw') {
      const lw = S.tool === 'lw';
      if (f.stage === 'ask') h = msg(lw ? 'De quantos objetos você quer o comprimento e a largura?' : 'Quantos objetos você quer medir o comprimento?', lw ? 'Para cada objeto você traça duas linhas. A maior vira o comprimento e a menor, a largura.' : 'Para cada objeto, você traça uma linha de ponta a ponta.') +
        `<div class="ctl"><input type="number" id="gN" min="1" max="500" value="${f.n || 1}"><button class="pbtn" data-a="lenStart">Começar</button></div>`;
      else if (f.stage === 'draw') {
        const second = lw && f.first;
        h = step(`Objeto ${f.i} de ${f.n}`) + msg(lw ? (second ? 'Agora trace a segunda medida, atravessando o objeto.' : 'Trace a primeira medida do objeto.') : 'Arraste do ponto inicial ao ponto final do objeto.',
          lw ? 'Pode começar por qualquer uma: o programa decide qual é o comprimento e qual é a largura.' : 'Dê zoom para marcar as pontas com precisão. Esc cancela.') +
          `<div class="ctl"><button class="gbtn" data-a="lenStop">Parar aqui</button></div>`;
      } else h = msg(`Pronto: ${f.done} objeto${f.done === 1 ? '' : 's'} medido${f.done === 1 ? '' : 's'}.`, 'Os valores estão na tabela à direita. Para corrigir uma linha, use Mover e selecionar e arraste a ponta.') +
        `<div class="ctl"><button class="pbtn" data-a="lenMore">Medir mais objetos</button><button class="gbtn" data-a="close">Concluir</button></div>`;
    } else if (S.tool === 'count') {
      const o = S.objs.find((x) => x.id === f.obj); const n = o ? o.points.length : 0;
      h = `<span class="step">Total: ${n}</span>` + msg('Clique em cada item para contar.', 'Clique de novo sobre um item para desmarcar.') +
        `<div class="ctl"><button class="gbtn" data-a="countNew">Nova contagem</button><button class="pbtn" data-a="close">Concluir</button></div>`;
    } else if (S.tool === 'edit') {
      const o = selObj();
      if (!o || o.kind !== 'area') h = msg('Clique no objeto que você quer ajustar.', 'Funciona com áreas desenhadas ou detectadas.');
      else h = msg(`Ajustando ${objName(o)}: ${fmtArea(measureArea(o).area)}`, 'Pincel e laço completam a parte que faltou. Borracha e laço de apagar removem o que passou. Segure Alt para inverter.') +
        `<div class="ctl"><div class="seg">${[['brushAdd', 'Pincel: completar'], ['brushErase', 'Borracha'], ['lassoAdd', 'Laço: completar'], ['lassoErase', 'Laço: apagar']].map(([m, t]) => `<button data-a="brush" data-v="${m}" class="${f.brush === m ? 'on' : ''}">${t}</button>`).join('')}</div>
        ${f.brush.startsWith('brush') ? `<label>Tamanho <input type="range" id="gBrush" min="3" max="80" value="${S.brushPx}"></label>` : ''}
        <button class="pbtn" data-a="close">Concluir</button></div>`;
    } else if (S.tool === 'persp') {
      const ph = S.photos[S.cur], n = f.pts.length;
      if (n < 4) h = step(`Canto ${n + 1} de 4`) + msg('Clique nos 4 cantos de um retângulo de medida conhecida.', 'Por exemplo, uma folha A4, um cartão ou um quadrado de referência, no mesmo plano dos objetos. Qualquer ordem. Backspace desfaz o último canto.') +
        (ph && ph.orig ? `<div class="ctl"><button class="gbtn" data-a="perspUndo">Desfazer correção desta foto</button></div>` : '');
      else h = msg('Quanto mede o retângulo?', 'Largura é o lado marcado em amarelo; altura, o lado ao lado dele. A foto fica endireitada e a escala, definida.') +
        `<div class="ctl"><label>Largura <input type="number" id="gPW" min="0" step="any" value="${f.w || ''}"></label><label>Altura <input type="number" id="gPH" min="0" step="any" value="${f.h || ''}"></label>
         <select id="gPU">${unitOpts(f.u || 'cm')}</select></div>
         <div class="ctl"><button class="gbtn" data-a="perspPreset" data-v="a4">Folha A4</button><button class="gbtn" data-a="perspPreset" data-v="carta">Folha Carta</button>
         <button class="pbtn" data-a="perspOk">Corrigir foto</button><button class="gbtn" data-a="perspRedo">Marcar de novo</button></div>`;
    } else if (S.tool === 'colony') {
      const o = selObj(), col = o && o.kind === 'colony' ? o : null;
      if (f.mode === 'roi') h = msg('Arraste de um canto ao outro da placa para marcar a área de busca.', 'Só o que estiver dentro da elipse é contado. Isso evita marcar a borda da placa e reflexos.') + `<div class="ctl"><button class="gbtn" data-a="colRoiCancel">Cancelar</button></div>`;
      else if (!col) {
        const n = (f.samples || []).length;
        h = step(`Exemplo ${n + 1} de 3`) + msg('Clique numa colônia típica.', 'Escolha 3 colônias que representem as da placa, de preferência com tamanhos e tons diferentes. O programa junta as características das três e marca todas as outras. Para mexer na placa, arraste dentro dela ou puxe a borda.') +
          `<div class="ctl">${n ? `<button class="pbtn" data-a="colGo">Contar com ${n} exemplo${n > 1 ? 's' : ''}</button><button class="gbtn" data-a="colUndoSample">Desfazer último exemplo</button>` : ''}
           <button class="gbtn" data-a="colPlate">${f.roi ? 'Detectar placa de novo' : 'Detectar placa'}</button><button class="gbtn" data-a="colRoi">Desenhar a placa</button>${f.roi ? '<button class="gbtn" data-a="colNoPlate">Contar na foto inteira</button>' : ''}</div>`;
      } else if (f.mode === 'example') h = msg('Clique em mais uma colônia de referência.', 'Use para ensinar um tipo de colônia que ficou de fora.') + '<div class="ctl"><button class="gbtn" data-a="colExampleCancel">Cancelar</button></div>';
      else {
        const it = colonyItems(col), N = it.reduce((a, i) => a + i.n, 0), P = col.params;
        h = `<span class="step">${N} colônia${N === 1 ? '' : 's'}</span>` + msg('Confira as marcações.', 'Clique numa marcação errada para apagar ou num ponto sem marcação para adicionar. ×2, ×3 são colônias encostadas contadas pelo tamanho. A placa pode ser arrastada ou redimensionada pela borda; a contagem é refeita.') +
          `<div class="ctl"><label title="Quanto a cor pode variar">Cor <input type="range" id="gCTol" min="1" max="6" step="0.25" value="${P.tol}"></label>
           <label title="Quanto o tamanho pode variar em relação ao exemplo">Tamanho <input type="range" id="gCSize" min="1.5" max="8" step="0.5" value="${P.size}"></label>
           <label title="Mais à direita aceita formatos menos redondos">Formato <input type="range" id="gCShape" min="0.05" max="0.6" step="0.05" value="${P.shape}"></label>
           <label><input type="checkbox" id="gCClu" ${P.clusters ? 'checked' : ''}> Dividir colônias encostadas</label></div>
           <div class="ctl"><button class="gbtn" data-a="colExample">Adicionar outro exemplo</button><button class="gbtn" data-a="colPlate">Detectar placa de novo</button><button class="gbtn" data-a="colRoi">Desenhar a placa</button>
           <button class="gbtn" data-a="colNew">Nova placa</button>${S.photos.length > 1 ? `<button class="gbtn" data-a="colAllPhotos" title="Usa os mesmos exemplos e ajustes; a placa é detectada em cada foto">Contar em todas as ${S.photos.length} fotos</button>` : ''}<button class="pbtn" data-a="close">Concluir</button></div>`;
      }
    } else if (S.tool === 'angle') {
      const n = (f.pts || []).length;
      h = step(`Ponto ${n + 1} de 3`) + msg(f.last && !n ? `${f.last}. Meça o próximo ângulo ou escolha outra ferramenta.` : ['Clique num ponto do primeiro lado do ângulo.', 'Agora clique no vértice (a ponta do ângulo).', 'Clique num ponto do segundo lado.'][n],
        'O ângulo é medido entre 0° e 180°. Para corrigir depois, use Mover e selecionar e arraste os pontos.');
    } else if (S.tool === 'profile') {
      h = msg('Trace uma linha sobre a região de interesse.', 'O gráfico da intensidade ao longo da linha aparece no painel de resultados. Útil para ver bordas, bandas e gradientes.');
    } else if (S.tool === 'crop') {
      const ph = S.photos[S.cur];
      h = msg(f.mode === 'level' ? 'Trace uma linha sobre algo que deveria estar reto (borda da régua, da bancada, do papel).' : f.cropBox ? 'Confira a área marcada e clique em Recortar.' : 'Gire, espelhe ou arraste um retângulo para recortar.',
        'A escala é mantida. Mudar a foto apaga as medições já feitas nela.') +
        `<div class="ctl"><button class="gbtn" data-a="rot" data-v="-90" title="Girar 90° para a esquerda">↺ 90°</button><button class="gbtn" data-a="rot" data-v="90" title="Girar 90° para a direita">↻ 90°</button>
         <button class="gbtn" data-a="flip" data-v="h">Espelhar ↔</button><button class="gbtn" data-a="flip" data-v="v">Espelhar ↕</button>
         <button class="gbtn" data-a="level">Endireitar por uma linha</button>
         <label>Girar <input type="number" id="gRotDeg" step="0.1" value="0" style="width:72px">°</label><button class="gbtn" data-a="rotFree">Aplicar</button></div>` +
        `<div class="ctl">${f.cropBox ? '<button class="pbtn" data-a="cropOk">Recortar</button><button class="gbtn" data-a="cropCancel">Cancelar recorte</button>' : ''}${ph && ph.orig ? '<button class="gbtn" data-a="perspUndo">Voltar à foto original</button>' : ''}<button class="gbtn" data-a="close">Concluir</button></div>`;
    } else if (S.tool === 'adjust') {
      const A = S.adj;
      h = msg('Ajuste a imagem para enxergar melhor.', 'Por padrão, muda só o que você vê: as medidas de intensidade continuam usando a foto original. Marque "Usar nas detecções" se quiser que a detecção automática trabalhe com a imagem ajustada (por exemplo, só o canal verde).') +
        `<div class="ctl"><label>Brilho <input type="range" id="gAdjB" min="-100" max="100" value="${A.b}"></label><label>Contraste <input type="range" id="gAdjC" min="-100" max="100" value="${A.c}"></label>
         <button class="gbtn" data-a="adjAuto" class="${A.auto ? 'on' : ''}">${A.auto ? 'Automático ✓' : 'Automático'}</button><button class="gbtn" data-a="adjInv">${A.inv ? 'Inverter ✓' : 'Inverter'}</button></div>
         <div class="ctl"><span class="lbl2">Canal:</span><div class="seg">${[['all', 'Cor'], ['gray', 'Cinza'], ['r', 'Vermelho'], ['g', 'Verde'], ['b', 'Azul']].map(([c2, t]) => `<button data-a="adjCh" data-v="${c2}" class="${A.ch === c2 ? 'on' : ''}">${t}</button>`).join('')}</div>
         <label><input type="checkbox" id="gAdjUse" ${A.use ? 'checked' : ''}> Usar nas detecções</label><button class="gbtn" data-a="adjReset">Restaurar</button><button class="pbtn" data-a="close">Concluir</button></div>`;
    } else if (S.tool === 'coverage') {
      const cnt = S.covResult;
      h = msg(cnt ? `Cobertura: ${nf(cnt.covered / cnt.total * 100, 1)}% da área analisada.` : 'Escolha a área de análise e o que conta como coberto.', 'A parte coberta aparece colorida. Ajuste a sensibilidade até a marcação bater com o que você vê.') +
        `<div class="ctl"><span class="lbl2">Área:</span><div class="seg">${[['whole', 'Foto inteira'], ['rect', 'Retângulo'], ['oval', 'Elipse'], ['free', 'À mão']].map(([m2, t]) => `<button data-a="covRoi" data-v="${m2}" class="${S.covRoi === m2 ? 'on' : ''}">${t}</button>`).join('')}</div></div>
         <div class="ctl"><span class="lbl2">Coberto é:</span><div class="seg">${[['diff', 'Diferente do fundo'], ['dark', 'Mais escuro'], ['light', 'Mais claro'], ['green', 'Verde']].map(([m2, t]) => `<button data-a="covMode" data-v="${m2}" class="${S.covMode === m2 ? 'on' : ''}">${t}</button>`).join('')}</div>
         <label>Sensibilidade <input type="range" id="gCovSens" min="1" max="100" value="${S.covSens}"></label></div>
         <div class="ctl"><label><input type="checkbox" id="gFlat" ${S.flat ? 'checked' : ''}> Corrigir iluminação desigual</label>
         <button class="pbtn" data-a="covOk" ${cnt ? '' : 'disabled'}>Medir cobertura</button>${S.photos.length > 1 ? `<button class="gbtn" data-a="covAll">Medir em todas as ${S.photos.length} fotos</button>` : ''}</div>`;
    } else if (S.tool === 'bands') {
      const o = selObj(), gel = o && o.kind === 'bands' ? o : null;
      h = msg(!gel ? 'Arraste um retângulo em volta da primeira banda (ela será a referência, 100%).' : `Clique no centro de cada outra banda: o retângulo do mesmo tamanho é colocado. ${gel.rects.length} banda${gel.rects.length > 1 ? 's' : ''}.`,
        'O fundo de cada banda é medido numa moldura em volta dela e descontado. Clique de novo numa banda para tirar. A banda amarela é a referência.') +
        `<div class="ctl"><label><input type="checkbox" id="gBandDark" ${S.bandDark ? 'checked' : ''}> Bandas escuras em fundo claro</label>${gel ? '<button class="gbtn" data-a="bandNew">Novo gel</button>' : ''}<button class="pbtn" data-a="close">Concluir</button></div>`;
    } else if (S.tool === 'select') h = msg('Clique numa medição para selecionar. Arraste as pontas das linhas para corrigir.', 'Delete apaga a medição selecionada. Arrastar no vazio move a imagem.');
    if (S.protocol && S.img) {
      const P = S.protocol;
      h = `<div class="proto"><div class="ptop"><b>${esc(P.nome)}</b><button class="gbtn sm" data-a="protoSteps">${S.protoOpen ? 'Esconder passos' : 'Ver passos'}</button>${(P.acoes || []).map(([a2, t]) => `<button class="gbtn sm" data-a="${a2}">${esc(t)}</button>`).join('')}${P.models && S.tool === 'colony' && !(selObj() && selObj().kind === 'colony') ? '<button class="pbtn sm" data-a="protoModels">Usar os exemplos do protocolo</button>' : ''}<button class="gbtn sm" data-a="protoExit">Sair do protocolo</button></div>${S.protoOpen ? `<ol>${(P.passos || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}</div>` + h;
    }
    // no celular as explicações ficam recolhidas atrás do botão "?"
    if (/<em>/.test(h)) h = h.replace('<div class="msg">', '<button class="tips" data-a="tips" title="Mostrar explicação" aria-label="Mostrar explicação">?</button><div class="msg">');
    guide.innerHTML = h;
    bindGuide();
  }
  const selObj = () => S.objs.find((o) => o.id === S.sel);

  function bindGuide() {
    guide.querySelectorAll('[data-a]').forEach((b) => b.onclick = () => action(b.dataset.a, b.dataset.v));
    const on = (id, ev, fn) => { const e = $(id); if (e) e.addEventListener(ev, fn); };
    on('gKnown', 'keydown', (e) => { if (e.key === 'Enter') action('scaleOk'); });
    on('gN', 'keydown', (e) => { if (e.key === 'Enter') action('lenStart'); });
    if ($('gKnown')) setTimeout(() => $('gKnown').select(), 0);
    if ($('gN')) setTimeout(() => $('gN').select(), 0);
    on('gSens', 'input', (e) => { S.sens = +e.target.value; if (S.tool === 'detect') updatePreview(false); });
    on('gSens', 'change', () => { if (S.tool === 'detect') updatePreview(true); });
    on('gFill', 'change', (e) => { S.fill = e.target.checked; const o = selObj(); if (S.tool === 'area' && o && o.seeds) resegment(o, true); });
    on('gExcl', 'change', (e) => { S.excl = e.target.checked; updatePreview(true); });
    on('gRefine', 'change', (e) => { S.refine = e.target.checked; });
    on('gSplit', 'change', (e) => { S.split = e.target.checked; updatePreview(true); });
    on('gMin', 'change', (e) => { const v = Math.max(0, +e.target.value || 0); S.minArea = Math.round(S.scale ? v / (k() * k()) : v); updatePreview(true); });
    on('gBrush', 'input', (e) => { S.brushPx = +e.target.value; render(); });
    const adjSet = () => { S.disp = null; if (S.adj.use) resetAna(); render(); };
    on('gAdjB', 'input', (e) => { S.adj.b = +e.target.value; adjSet(); });
    on('gAdjC', 'input', (e) => { S.adj.c = +e.target.value; adjSet(); });
    on('gAdjUse', 'change', (e) => { S.adj.use = e.target.checked; resetAna(); });
    on('gCovSens', 'input', (e) => { S.covSens = +e.target.value; updateCoverage(false); });
    on('gCovSens', 'change', () => updateCoverage(true));
    on('gFlat', 'change', (e) => { S.flat = e.target.checked; later(() => { resetAna(); if (S.tool === 'coverage') updateCoverage(true); else if (S.tool === 'detect') updatePreview(true); else if (S.tool === 'colony') { const o = selObj(); if (o && o.kind === 'colony') recomputeColonies(o); } }); });
    on('gBandDark', 'change', (e) => { S.bandDark = e.target.checked; const o = selObj(); if (o && o.kind === 'bands') { pushUndo(); o.dark = S.bandDark; } refreshAll(); });
    const colParam = (id, key, cast) => on(id, 'change', (e) => { const o = selObj(); if (o && o.kind === 'colony') { pushUndo(); o.params[key] = cast(e.target); recomputeColonies(o); } });
    colParam('gCTol', 'tol', (t) => +t.value); colParam('gCSize', 'size', (t) => +t.value); colParam('gCShape', 'shape', (t) => +t.value); colParam('gCClu', 'clusters', (t) => t.checked);
    on('gPW', 'input', (e) => { S.flow.w = e.target.value; }); on('gPH', 'input', (e) => { S.flow.h = e.target.value; }); on('gPU', 'change', (e) => { S.flow.u = e.target.value; });
    on('gPH', 'keydown', (e) => { if (e.key === 'Enter') action('perspOk'); });
    if ($('gPW') && !$('gPW').value) setTimeout(() => $('gPW').focus(), 0);
  }

  function action(a, v) {
    const f = S.flow;
    switch (a) {
      case 'goScale': setTool('scale'); break;
      case 'tips': guide.classList.toggle('open'); break;
      case 'role': S.role = v || ''; renderGuide(); break;
      case 'protoSteps': S.protoOpen = !S.protoOpen; renderGuide(); break;
      case 'protoExit': S.protocol = null; S.role = ''; renderGuide(); toast('Protocolo encerrado. Os ajustes continuam como estão.'); break;
      case 'protoModels': { const P = S.protocol; pushUndo(); const n = addObj({ kind: 'colony', models: P.models.slice(), auto: [], removed: [], added: [], roi: f.roi ? { ...f.roi } : null, params: { ...(P.config.colParams || COL_PARAMS()) } }); S.sel = n.id; f.samples = []; recomputeColonies(n); break; }
      case 'gapDetect': later(() => { const m = MM.detectGap(ana(), S.W, S.H); if (!m) { toast('Não encontrei uma fenda nesta foto. Contorne à mão.'); return; } pushUndo(); const prev = S.role; S.role = 'fenda'; const o = addObj({ kind: 'area', method: 'detect', mask: m, poly: null }); S.role = prev; S.sel = o.id; refreshAll(); toast(`${objName(o)}: fenda encontrada. Corrija com Ajustar contorno se precisar.`); }); break;
      case 'gapAll': runBatch('gap'); break;
      case 'rot': transformPhoto((r, W, H) => MM.rotate90(r, W, H, +v > 0), `Foto girada ${v > 0 ? 'para a direita' : 'para a esquerda'}.`); break;
      case 'flip': transformPhoto((r, W, H) => MM.flip(r, W, H, v === 'h'), 'Foto espelhada.'); break;
      case 'level': f.mode = 'level'; f.cropBox = null; renderGuide(); break;
      case 'rotFree': { const dg = parseFloat(String($('gRotDeg').value).replace(',', '.')); if (!dg) { toast('Digite um ângulo diferente de zero.'); return; } transformPhoto((r, W, H) => MM.rotate(r, W, H, dg), `Foto girada ${nf(dg, 1)}°.`); break; }
      case 'cropOk': { const b = f.cropBox; f.cropBox = null; transformPhoto((r, W, H) => MM.crop(r, W, H, b), 'Foto recortada.'); break; }
      case 'cropCancel': f.cropBox = null; renderGuide(); render(); break;
      case 'adjAuto': S.adj.auto = S.adj.auto ? null : autoLevels(); S.disp = null; if (S.adj.use) resetAna(); renderGuide(); render(); break;
      case 'adjInv': S.adj.inv = !S.adj.inv; S.disp = null; if (S.adj.use) resetAna(); renderGuide(); render(); break;
      case 'adjCh': S.adj.ch = v; S.disp = null; if (S.adj.use) resetAna(); renderGuide(); render(); break;
      case 'adjReset': S.adj = { b: 0, c: 0, inv: false, ch: 'all', auto: null, use: false }; S.disp = null; resetAna(); renderGuide(); render(); break;
      case 'covRoi': S.covRoi = v; S.covPoly = null; if (v === 'whole') updateCoverage(true); else { S.preview = null; S.covResult = null; renderGuide(); render(); } break;
      case 'covMode': S.covMode = v; S.covBase = null; updateCoverage(true); break;
      case 'covOk': coverageCommit(); break;
      case 'covAll': runBatch('coverage'); break;
      case 'bandNew': S.sel = null; renderGuide(); break;
      case 'scaleAll': {
        stash(); let n = 0;
        S.photos.forEach((p, i) => { if (i !== S.cur && !(p.canvas)) { p.scale = { ...S.scale, line: null, inherited: false, shared: true }; n++; } });
        S.lastScale = { ...S.scale }; toast(n ? `Escala aplicada a ${n} foto(s). Fotos com perspectiva corrigida mantêm a própria escala.` : 'Nenhuma outra foto para aplicar.'); scheduleSave(); break;
      }
      case 'perspAll': runBatch('perspAll'); break;
      case 'detectAllPhotos': runBatch('detect'); break;
      case 'colAllPhotos': runBatch('colony'); break;
      case 'goEdit': setTool('edit'); break;
      case 'close': setTool(null); break;
      case 'scaleRedo': S.flow = { stage: 'draw' }; renderGuide(); render(); break;
      case 'scaleClear': pushUndo(); S.scale = null; refreshAll(); toast('Escala removida. Resultados em pixels.'); break;
      case 'scaleOk': {
        const known = parseFloat(String($('gKnown').value).replace(',', '.'));
        if (!(known > 0)) { toast('Digite um valor maior que zero.'); return; }
        pushUndo(); S.scale = { ppu: lineLen(f.line) / known, unit: $('gUnit').value, known, line: f.line.slice() }; S.dispUnit = S.scale.unit; S.lastScale = { ...S.scale };
        toast(`Escala definida: 1 ${S.scale.unit} = ${nf(S.scale.ppu, 2)} pixels`); setTool(null); refreshAll(); break;
      }
      case 'mode': S.flow = { mode: v, pts: [] }; S.prefMode = v; if (v === 'magnetic' || v === 'click') later(() => ensureGrad()); renderGuide(); render(); break;
      case 'seed': f.seed = v === 'new' ? null : v; renderGuide(); break;
      case 'brush': f.brush = v; renderGuide(); render(); break;
      case 'detectOk': later(() => {
        const masks = MM.detectAll(ensureDet(), S.W, S.H, detectOpts());
        pushUndo(); for (const m of masks) addObj({ kind: 'area', method: 'detect', mask: m, poly: null });
        toast(`${masks.length} objetos medidos.`); setTool(null); refreshAll();
      }); break;
      case 'lenStart': { const n = Math.max(1, Math.min(500, parseInt($('gN').value) || 1)); S.flow = { stage: 'draw', n, i: 1, done: 0, first: null }; renderGuide(); break; }
      case 'lenStop': S.flow = { stage: 'done', done: f.done }; renderGuide(); render(); break;
      case 'lenMore': S.flow = { stage: 'ask', n: f.n }; renderGuide(); break;
      case 'countNew': S.flow = { obj: null }; renderGuide(); break;
      case 'perspRedo': S.flow = { pts: [] }; renderGuide(); render(); break;
      case 'perspPreset': { // escolhe a orientação pelo formato do quadrilátero marcado
        const q = MM.orderQuad(f.pts), e2 = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
        const wide = e2(q[0], q[1]) + e2(q[3], q[2]) >= e2(q[0], q[3]) + e2(q[1], q[2]);
        const [A, B] = v === 'a4' ? [29.7, 21] : [27.94, 21.59];
        f.w = wide ? A : B; f.h = wide ? B : A; f.u = 'cm'; renderGuide(); break;
      }
      case 'perspOk': {
        const w = parseFloat(String($('gPW').value).replace(',', '.')), hh = parseFloat(String($('gPH').value).replace(',', '.')), u = $('gPU').value;
        if (!(w > 0 && hh > 0)) { toast('Digite a largura e a altura do retângulo.'); return; }
        if (S.objs.length && !confirm('Corrigir a perspectiva muda as coordenadas da foto, então as medições desta foto serão apagadas. Continuar?')) return;
        later(() => {
          const r = MM.rectify(S.rgba, S.W, S.H, MM.orderQuad(f.pts), w, hh);
          if (!r) { toast('Os 4 cantos não formam um retângulo válido. Marque de novo.'); return; }
          const c = document.createElement('canvas'); c.width = r.W; c.height = r.H; c.getContext('2d').putImageData(new ImageData(r.rgba, r.W, r.H), 0, 0);
          const ph = S.photos[S.cur]; if (!ph.orig) ph.orig = S.imgCanvas; ph.canvas = c; ph.imgDirty = true;
          S.objs = []; S.seq = { area: 0, length: 0, lw: 0, count: 0, colony: 0 }; S.undo = []; S.redo = []; S.sel = null;
          S.scale = { ppu: r.ppu, unit: u, known: w, line: [r.rect[0], r.rect[1], r.rect[2], r.rect[1]] }; S.lastScale = { ...S.scale }; S.dispUnit = u;
          S.lastPersp = { quad: MM.orderQuad(f.pts).map((q) => q.slice()), w, h: hh, u, W: S.W, H: S.H };
          setImage(c, null); toast(`Foto corrigida. Escala definida pelo retângulo: 1 ${u} = ${nf(r.ppu, 2)} px.`);
        });
        break;
      }
      case 'perspUndo': {
        const ph = S.photos[S.cur]; if (!ph || !ph.orig) return;
        if (S.objs.length && !confirm('Desfazer a correção apaga as medições desta foto. Continuar?')) return;
        ph.canvas = null; ph.orig = null; ph.imgDirty = true; S.objs = []; S.undo = []; S.redo = []; S.scale = null;
        later(() => { decode(ph).then((c) => { setImage(c, null); toast('Correção desfeita. Defina a escala de novo.'); }); });
        break;
      }
      case 'colRoi': f.mode = 'roi'; renderGuide(); break;
      case 'colRoiCancel': f.mode = null; renderGuide(); break;
      case 'colExample': f.mode = 'example'; renderGuide(); break;
      case 'colExampleCancel': f.mode = null; renderGuide(); break;
      case 'colNew': S.sel = null; S.flow = { roi: null, samples: [] }; detectPlateInto(S.flow, false); renderGuide(); render(); break;
      case 'colPlate': detectPlateInto(f, false); break;
      case 'colNoPlate': { const o = selObj(); if (o && o.kind === 'colony') { pushUndo(); o.roi = null; recomputeColonies(o); } else { f.roi = null; refreshAll(); } break; }
      case 'colGo': colonyCreate(); break;
      case 'colUndoSample': f.samples = f.samples.slice(0, -1); refreshAll(); break;
    }
  }

  function setTool(t) {
    if (!S.img) return;
    if (S.tool === 'edit') S.objs = S.objs.filter((o) => o.kind !== 'area' || o.mask.w > 0);
    S.tool = t; S.preview = null; S.covResult = t === 'coverage' ? S.covResult : null;
    if (t === 'scale') S.flow = { stage: 'draw' };
    else if (t === 'area') { S.flow = { mode: S.prefMode || 'click', pts: [] }; later(() => ensureGrad()); }
    else if (t === 'length' || t === 'lw') S.flow = { stage: 'ask', n: 1 };
    else if (t === 'count') S.flow = { obj: null };
    else if (t === 'persp') S.flow = { pts: [] };
    else if (t === 'angle') S.flow = { pts: [] };
    else if (t === 'crop') S.flow = { cropBox: null };
    else if (t === 'coverage') { S.flow = {}; S.covResult = null; S.covRoi = S.covRoi || 'whole'; if (S.covRoi === 'whole') later(() => updateCoverage(true)); }
    else if (t === 'bands') { S.flow = {}; const o = selObj(); if (!(o && o.kind === 'bands')) S.sel = null; if (S.bandDark == null) S.bandDark = guessDarkBands(); }
    else if (t === 'colony') {
      const o = selObj(); S.flow = { roi: null, samples: [] };
      if (!(o && o.kind === 'colony')) { S.sel = null; detectPlateInto(S.flow, false); }
      later(() => { ensureGrad(); ensureBlur(); });
    }
    else if (t === 'edit') S.flow = { brush: 'brushAdd' };
    else if (t === 'detect') { S.flow = {}; S.previewCount = null; later(() => { ensureDet(); updatePreview(true); }); }
    else S.flow = {};
    document.querySelectorAll('.tool').forEach((b) => { b.classList.toggle('active', b.dataset.tool === t); b.classList.remove('pulse'); if (b.dataset.tool === t && matchMedia('(max-width: 820px)').matches) b.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); });
    cv.style.cursor = !t || t === 'select' ? 'grab' : 'crosshair';
    renderGuide(); render();
  }

  /* ---------- detecção ---------- */
  let prevT;
  function updatePreview(withCount) {
    const det = ensureDet(), t = thresholdFromSens();
    if (!S.preview) { S.preview = document.createElement('canvas'); S.preview.width = S.W; S.preview.height = S.H; S.previewData = S.preview.getContext('2d').createImageData(S.W, S.H); }
    const d = S.previewData.data, img = det.img;
    for (let i = 0, j = 0; i < img.length; i++, j += 4) { if (img[i] > t) d[j + 3] = 0; else { d[j] = 8; d[j + 1] = 14; d[j + 2] = 18; d[j + 3] = 175; } }
    S.preview.getContext('2d').putImageData(S.previewData, 0, 0); render();
    if (withCount) { clearTimeout(prevT); prevT = setTimeout(() => later(() => {
      S.previewCount = MM.detectAll(det, S.W, S.H, { threshold: t, minArea: S.minArea, fillHoles: S.split, excludeEdges: S.excl, split: S.split }).length; if (S.tool === 'detect') renderGuide();
    }), 60); }
  }
  /* ---------- transformar a foto (girar, espelhar, recortar) ---------- */
  function transformPhoto(fn, msgOk) {
    if (S.objs.length && !confirm('Mudar a foto apaga as medições já feitas nela. Continuar?')) return;
    later(() => {
      const r = fn(S.rgba, S.W, S.H), c = canvasFromRGBA(r.W, r.H, r.rgba), ph = S.photos[S.cur];
      const hadRaw = !!ph.gray; if (!ph.orig) ph.orig = true; ph.canvas = c; ph.gray = null; ph.imgDirty = true;
      S.objs = []; S.undo = []; S.redo = []; S.sel = null;
      if (S.scale) S.scale = { ...S.scale, line: null };
      const tool = S.tool; setImage(c, null); setTool(tool);
      toast(msgOk + (hadRaw ? ' As intensidades passam a usar a imagem de 8 bits.' : ''));
    });
  }

  /* ---------- cobertura (%) ---------- */
  S.covMode = 'diff'; S.covSens = 50; S.covRoi = 'whole';
  function covBase() { syncAna(); // imagem 0..255 em que "coberto" é alto, e o limiar de Otsu dela
    if (S.covBase && S.covBase.mode === S.covMode) return S.covBase;
    const a = ana(), N = S.W * S.H; let img;
    if (S.covMode === 'diff') { const d = ensureDet(); S.covBase = { mode: S.covMode, img: d.img, otsu: d.threshold }; return S.covBase; }
    const c = MM.coverageBase(a, S.W, S.H, S.covMode); S.covBase = { mode: S.covMode, img: c.img, otsu: c.threshold }; return S.covBase;
  }
  function updateCoverage(final) {
    if (!S.img) return;
    if (S.covRoi !== 'whole' && !S.covPoly) { S.preview = null; S.covResult = null; renderGuide(); render(); return; }
    const B = covBase(), W = S.W, H = S.H, roi = S.covRoi === 'whole' ? null : MM.rasterPolygon(S.covPoly, W, H);
    // limiar de Otsu calculado só dentro da área analisada (como o ImageJ com uma seleção); a sensibilidade o desloca
    const otsu = roi ? MM.coverageThreshold(B.img, B.mode, roi, W) : B.otsu, t = Math.max(1, Math.min(254, Math.round(otsu * (2 - S.covSens / 50))));
    if (!S.preview || S.preview.width !== W) { S.preview = document.createElement('canvas'); S.preview.width = W; S.preview.height = H; S.previewData = S.preview.getContext('2d').createImageData(W, H); }
    const d = S.previewData.data; let covered = 0, total = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, j = i * 4, inR = !roi || (x >= roi.x && y >= roi.y && x < roi.x + roi.w && y < roi.y + roi.h && roi.data[(y - roi.y) * roi.w + x - roi.x]);
      if (!inR) { d[j] = 0; d[j + 1] = 0; d[j + 2] = 0; d[j + 3] = 140; continue; }
      total++; if (B.img[i] > t) { covered++; d[j] = 53; d[j + 1] = 224; d[j + 2] = 192; d[j + 3] = 130; } else d[j + 3] = 0;
    }
    S.preview.getContext('2d').putImageData(S.previewData, 0, 0);
    S.covResult = { covered, total, t }; if (final) renderGuide(); else { const m2 = guide.querySelector('.msg'); if (m2) m2.firstChild.textContent = `Cobertura: ${nf(covered / total * 100, 1)}% da área analisada.`; } render();
  }
  function coverageCommit() {
    const R = S.covResult; if (!R) return;
    const B = covBase(), W = S.W, H = S.H, roi = S.covRoi === 'whole' ? null : MM.rasterPolygon(S.covPoly, W, H);
    let m = MM.newMask(0, 0, W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (B.img[i] > R.t && (!roi || (x >= roi.x && y >= roi.y && x < roi.x + roi.w && y < roi.y + roi.h && roi.data[(y - roi.y) * roi.w + x - roi.x]))) m.data[i] = 1; }
    m = MM.cropMask(m);
    pushUndo(); const o = addObj({ kind: 'coverage', mask: m, roiPoly: S.covRoi === 'whole' ? null : S.covPoly.map((q) => q.slice()), covered: R.covered, total: R.total, mode: S.covMode });
    S.sel = o.id; S.preview = null; S.covResult = null; toast(`${objName(o)}: ${nf(R.covered / R.total * 100, 1)}% de cobertura.`); refreshAll();
  }
  function guessDarkBands() { const r = S.rgba; let s2 = 0, n = 0; for (let i = 0; i < r.length; i += 40) { s2 += r[i] + r[i + 1] + r[i + 2]; n++; } return s2 / n / 3 > 128; }

  /* ---------- lote: repetir a mesma operação em todas as fotos ---------- */
  const detectOpts = () => ({ threshold: thresholdFromSens(), minArea: S.minArea, fillHoles: S.fill, excludeEdges: S.excl, grad: S.refine ? ensureGrad() : null, split: S.split });
  async function runBatch(kind) {
    const n = S.photos.length, back = S.cur, label = { detect: 'Medindo', colony: 'Contando', perspAll: 'Corrigindo', coverage: 'Medindo cobertura', gap: 'Procurando a fenda' }[kind];
    if (kind === 'perspAll' && !confirm('Isso endireita todas as outras fotos com os mesmos 4 cantos (vale para câmera fixa, na mesma posição). As medições dessas fotos serão apagadas. Continuar?')) return;
    if (kind !== 'perspAll' && !confirm(`Isso ${{ detect: 'mede os objetos', colony: 'conta as colônias', coverage: 'mede a cobertura', gap: 'procura a fenda' }[kind]} em todas as ${n} fotos com os ajustes atuais e acrescenta as medições a cada uma. Continuar?`)) return;
    const covTpl = { roi: S.covRoi, poly: S.covPoly, mode: S.covMode, sens: S.covSens };
    // parâmetros fixados a partir da foto atual
    const minPhys = S.scale ? S.minArea * k() * k() : null, sens = S.sens;
    const col = selObj(), colTpl = kind === 'colony' && col && col.kind === 'colony' ? { models: col.models.slice(), params: { ...col.params }, plate: !!col.roi } : null;
    const P = S.lastPersp; let done = 0, skipped = 0, found = 0;
    setTool(null);
    for (let i = 0; i < n; i++) {
      if (i === back && kind === 'colony') continue;
      if (kind === 'perspAll' && i === back) continue;
      $('busy').textContent = `${label} foto ${i + 1} de ${n}…`;
      await openPhoto(i); busy(true);
      await new Promise((r) => setTimeout(r, 15));
      if (kind === 'perspAll') {
        if (S.W !== P.W || S.H !== P.H) { skipped++; continue; }
        const r = MM.rectify(S.rgba, S.W, S.H, P.quad, P.w, P.h); if (!r) { skipped++; continue; }
        const c = canvasFromRGBA(r.W, r.H, r.rgba), ph = S.photos[i]; ph.orig = true; ph.canvas = c; ph.imgDirty = true;
        S.objs = []; S.undo = []; S.redo = []; S.scale = { ppu: r.ppu, unit: P.u, known: P.w, line: [r.rect[0], r.rect[1], r.rect[2], r.rect[1]] };
        setImage(c, null); done++;
      } else if (kind === 'detect') {
        S.sens = sens; if (minPhys != null && S.scale) S.minArea = Math.max(1, Math.round(minPhys / (k() * k())));
        const masks = MM.detectAll(ensureDet(), S.W, S.H, detectOpts());
        if (masks.length) { pushUndo(); for (const m of masks) addObj({ kind: 'area', method: 'detect', mask: m, poly: null }); }
        found += masks.length; done++;
      } else if (kind === 'coverage') {
        Object.assign(S, { covRoi: covTpl.roi, covPoly: covTpl.poly, covMode: covTpl.mode, covSens: covTpl.sens, covBase: null });
        if (covTpl.roi !== 'whole' && !covTpl.poly) { skipped++; stash(); continue; }
        updateCoverage(false); if (S.covResult) { coverageCommit(); found++; done++; }
      } else if (kind === 'gap') {
        const m = MM.detectGap(ana(), S.W, S.H); if (!m) { skipped++; stash(); continue; }
        pushUndo(); const prev = S.role; S.role = 'fenda'; addObj({ kind: 'area', method: 'detect', mask: m, poly: null }); S.role = prev; found++; done++;
      } else if (kind === 'colony' && colTpl) {
        let roi = null; if (colTpl.plate) { const c = MM.detectPlate(S.rgba, S.W, S.H); if (!c) { skipped++; stash(); continue; } roi = { cx: c.cx, cy: c.cy, rx: c.r, ry: c.r }; }
        const o = addObj({ kind: 'colony', models: colTpl.models, auto: [], removed: [], added: [], roi, params: { ...colTpl.params } });
        o.auto = MM.findColonies(ensureBlur(), S.W, S.H, o.models, { tol: o.params.tol, minF: 1 / o.params.size, maxF: o.params.size, circTol: o.params.shape, clusters: o.params.clusters, roi });
        found += colonyItems(o).reduce((a, it) => a + it.n, 0); done++;
      }
      stash();
    }
    await openPhoto(back); busy(false); $('busy').textContent = 'Processando…';
    toast(kind === 'perspAll' ? `${done} foto(s) corrigida(s)${skipped ? `; ${skipped} com tamanho diferente ficaram como estavam` : ''}.`
      : kind === 'detect' ? `${found} objetos medidos em ${done} fotos. Confira cada foto pelas setas no topo.`
      : kind === 'coverage' ? `Cobertura medida em ${done} fotos${skipped ? ` (${skipped} puladas)` : ''}. Confira pelas setas no topo.`
      : kind === 'gap' ? `Fenda encontrada em ${found} de ${n} fotos. Confira cada uma e corrija com Ajustar contorno se precisar.` : `${found} colônias contadas em ${done} outras fotos${skipped ? ` (${skipped} sem placa foram puladas)` : ''}. Confira cada foto pelas setas no topo.`);
    scheduleSave(true);
  }

  /* ---------- criação de medições ---------- */
  function finishArea(pts, method, box) {
    if (pts.length < 3) return;
    const mask = MM.cropMask(MM.rasterPolygon(pts, S.W, S.H));
    if (!MM.maskCount(mask)) { toast('A região ficou pequena demais. Tente de novo.'); return; }
    pushUndo(); const o = addObj({ kind: 'area', method, mask, poly: pts.map((p) => p.slice()), box: box || null });
    S.sel = o.id; S.flow.last = `${objName(o)} medida: ${fmtArea(measureArea(o).area)}`; refreshAll();
  }
  // Segmenta pelo gradiente (watershed com marcas de objeto e de fundo).
  function segment(seeds) { return MM.segmentSeeds(ensureGrad(), S.W, S.H, seeds.fg, seeds.bg, { fillHoles: S.fill }); }
  function clickDetect(stroke) {
    later(() => {
      const seeds = { fg: [stroke], bg: [] }, m = segment(seeds);
      if (!MM.maskCount(m)) { toast('Não encontrei um objeto aqui. Clique bem dentro dele.'); return; }
      pushUndo(); const o = addObj({ kind: 'area', method: 'detect', mask: m, poly: null, seeds });
      S.sel = o.id; S.flow.last = `${objName(o)} medida: ${fmtArea(measureArea(o).area)}`;
      if (m.w >= S.W - 2 && m.h >= S.H - 2) toast('O contorno pegou a imagem toda. Use Marcar fundo para indicar o que não é objeto.');
      refreshAll();
    });
  }
  function addSeed(o, kind, stroke) {
    later(() => { pushUndo(); o.seeds[kind].push(stroke); resegment(o, false); });
  }
  function resegment(o, withUndo) {
    later(() => {
      if (withUndo) pushUndo();
      o.mask = segment(o.seeds); o.edited = false; o.poly = null;
      S.flow.last = `${objName(o)} medida: ${fmtArea(measureArea(o).area)}`; refreshAll();
    });
  }
  function finishLine(l) {
    const f = S.flow;
    if (S.tool === 'profile') { pushUndo(); const o = addObj({ kind: 'profile', line: l }); S.sel = o.id; refreshAll(); return; }
    if (S.tool === 'crop' && f.mode === 'level') { // a linha traçada passa a ficar horizontal (ou vertical, se estiver mais perto disso)
      let ang = Math.atan2(l[3] - l[1], l[2] - l[0]) * 180 / Math.PI; if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
      if (Math.abs(ang) > 45) ang = ang > 0 ? ang - 90 : ang + 90;
      f.mode = null; transformPhoto((r, W, H) => MM.rotate(r, W, H, -ang), `Foto endireitada (${nf(-ang, 1)}°).`); return;
    }
    if (S.tool === 'scale') { S.flow = { stage: 'value', line: l }; renderGuide(); render(); return; }
    if (S.tool === 'length') { pushUndo(); const o = addObj({ kind: 'length', line: l }); S.sel = o.id; f.done++; }
    else if (S.tool === 'lw') {
      if (!f.first) { f.first = l; renderGuide(); render(); return; }
      pushUndo(); const o = addObj({ kind: 'lw', lines: [f.first, l] }); S.sel = o.id; f.first = null; f.done++;
    }
    f.i++; if (f.i > f.n) S.flow = { stage: 'done', done: f.done, n: f.n };
    refreshAll();
  }

  /* ---------- testes de clique ---------- */
  const distSeg = (px, py, l) => { const dx = l[2] - l[0], dy = l[3] - l[1], L2 = dx * dx + dy * dy; let t = L2 ? ((px - l[0]) * dx + (py - l[1]) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - l[0] - t * dx, py - l[1] - t * dy); };
  function hitHandle(sx, sy) {
    const near = (x, y) => { const [a, b] = toScr(x, y); return Math.hypot(a - sx, b - sy) < 9; };
    for (let i = S.objs.length - 1; i >= 0; i--) {
      const o = S.objs[i], ls = o.kind === 'length' || o.kind === 'profile' ? [o.line] : o.kind === 'lw' ? o.lines : [];
      if (o.kind === 'angle') for (let j = 0; j < 3; j++) if (near(o.pts[j][0], o.pts[j][1])) return { o, l: o.pts[j], e: 0 };
      for (const l of ls) { if (near(l[0], l[1])) return { o, l, e: 0 }; if (near(l[2], l[3])) return { o, l, e: 2 }; }
    }
    if (S.scale && S.scale.line) { const l = S.scale.line; if (near(l[0], l[1])) return { scale: true, l, e: 0 }; if (near(l[2], l[3])) return { scale: true, l, e: 2 }; }
    return null;
  }
  function hitObj(x, y) {
    const tol = 8 / S.view.z;
    for (let i = S.objs.length - 1; i >= 0; i--) {
      const o = S.objs[i];
      if ((o.kind === 'length' || o.kind === 'profile') && distSeg(x, y, o.line) < tol) return o;
      if (o.kind === 'angle' && (distSeg(x, y, [...o.pts[0], ...o.pts[1]]) < tol || distSeg(x, y, [...o.pts[1], ...o.pts[2]]) < tol)) return o;
      if (o.kind === 'bands' && o.rects.some((r) => x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3])) return o;
      if (o.kind === 'lw' && o.lines.some((l) => distSeg(x, y, l) < tol)) return o;
      if (o.kind === 'count' && o.points.some((p) => Math.hypot(p[0] - x, p[1] - y) < tol * 1.3)) return o;
      if (o.kind === 'colony' && colonyItems(o).some((i) => Math.hypot(i.x - x, i.y - y) < i.r + tol)) return o;
    }
    for (let i = S.objs.length - 1; i >= 0; i--) {
      const o = S.objs[i]; if (o.kind !== 'area' && o.kind !== 'coverage') continue; const m = o.mask, ix = Math.floor(x) - m.x, iy = Math.floor(y) - m.y;
      if (ix >= 0 && iy >= 0 && ix < m.w && iy < m.h && m.data[iy * m.w + ix]) return o;
    }
    return null;
  }

  /* ---------- ponteiro ---------- */
  const evPos = (e) => { const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top, [x, y] = toImg(sx, sy); return { sx, sy, x, y, img: [x, y], alt: e.altKey }; };
  const clampImg = (p) => [Math.max(0, Math.min(S.W, p.x)), Math.max(0, Math.min(S.H, p.y))];

  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  // ---- toque: um dedo espera mover 8 px (arrastar) ou soltar (toque); dois dedos = pinça para zoom e mover
  const touches = new Map(); let pinch = null, pendingTouch = null;
  cv.addEventListener('pointerdown', (e) => {
    if (!S.img) return; cv.setPointerCapture(e.pointerId);
    if (e.pointerType === 'touch') {
      touches.set(e.pointerId, evPos(e));
      if (touches.size === 2) { // começa a pinça e cancela o que o primeiro dedo começou
        pendingTouch = null; if (S.drag && S.drag.type !== 'pan') { S.drag = null; S.flow.temp = null; } S.drag = null;
        const [a, b] = [...touches.values()]; pinch = { d0: Math.hypot(a.sx - b.sx, a.sy - b.sy), z0: S.view.z, m0: [(a.sx + b.sx) / 2, (a.sy + b.sy) / 2], ox: S.view.ox, oy: S.view.oy }; render(); return;
      }
      if (touches.size > 2) return;
      pendingTouch = { e: { button: 0, altKey: false, shiftKey: false, pointerType: 'touch' }, p: evPos(e) }; return;
    }
    handleDown(e, evPos(e));
  });
  function handleDown(e, p) {
    const f = S.flow; S.pointer = p;
    const pan = () => { S.drag = { type: 'pan', sx: p.sx, sy: p.sy, ox: S.view.ox, oy: S.view.oy }; cv.style.cursor = 'grabbing'; };
    if (e.button === 1 || e.button === 2 || S.space) return pan();
    if (S.cmp && S.cmp.canvas && Math.abs(p.sx - S.cmp.split * wrap.getBoundingClientRect().width) < 14) { S.drag = { type: 'split' }; return; }
    const t = S.tool;
    if (!t || t === 'select') {
      const h = hitHandle(p.sx, p.sy);
      if (h) { pushUndo(); S.drag = { type: 'handle', h }; if (h.o) S.sel = h.o.id; refreshAll(); return; }
      const o = hitObj(p.x, p.y); if (o) { S.sel = o.id; refreshAll(); return; }
      S.sel = null; refreshAll(); return pan();
    }
    if (t === 'scale' || ((t === 'length' || t === 'lw') && f.stage === 'draw')) {
      const [x, y] = clampImg(p); f.temp = { type: 'line', l: [x, y, x, y] }; S.drag = { type: 'line' }; return;
    }
    if (t === 'area') {
      if (f.mode === 'free') { f.temp = { type: 'free', pts: [clampImg(p)] }; S.drag = { type: 'free' }; }
      else if (f.mode === 'poly') {
        const q = clampImg(p);
        if (f.pts.length >= 3) { const [x0, y0] = toScr(f.pts[0][0], f.pts[0][1]); if (Math.hypot(x0 - p.sx, y0 - p.sy) < 10) { const pts = f.pts; f.pts = []; finishArea(pts, 'poly'); return; } }
        f.pts.push(q); render();
      } else if (f.mode === 'click') {
        if (p.x < 0 || p.y < 0 || p.x >= S.W || p.y >= S.H) return;
        let kind = e.altKey ? 'bg' : e.shiftKey ? 'fg' : (f.seed || 'new');
        const o = selObj(); if (kind !== 'new' && !(o && o.seeds)) kind = 'new';
        f.temp = { type: 'free', pts: [clampImg(p)], erase: kind === 'bg', seed: kind }; S.drag = { type: 'seed', kind };
      } else if (f.mode === 'magnetic') magClick(p);
      else if (f.mode === 'rect' || f.mode === 'oval') { const q = clampImg(p); f.temp = { type: 'box', a: q, b: q, oval: f.mode === 'oval' }; S.drag = { type: 'box', for: 'area' }; }
      return;
    }
    if (t === 'angle') {
      if (p.x < 0 || p.y < 0 || p.x >= S.W || p.y >= S.H) return;
      f.pts = (f.pts || []).concat([clampImg(p)]);
      if (f.pts.length === 3) { pushUndo(); const o = addObj({ kind: 'angle', pts: f.pts }); S.sel = o.id; f.pts = []; f.last = `${objName(o)}: ${nf(MM.angle3(...o.pts), 1)}°`; refreshAll(); } else { renderGuide(); render(); }
      return;
    }
    if (t === 'profile') { const [x, y] = clampImg(p); f.temp = { type: 'line', l: [x, y, x, y] }; S.drag = { type: 'line' }; return; }
    if (t === 'crop') {
      if (f.mode === 'level') { const [x, y] = clampImg(p); f.temp = { type: 'line', l: [x, y, x, y] }; S.drag = { type: 'line' }; return; }
      const q = clampImg(p); f.temp = { type: 'box', a: q, b: q }; S.drag = { type: 'box', for: 'crop' }; return;
    }
    if (t === 'coverage') {
      if (S.covRoi === 'rect' || S.covRoi === 'oval') { const q = clampImg(p); f.temp = { type: 'box', a: q, b: q, oval: S.covRoi === 'oval' }; S.drag = { type: 'box', for: 'coverage' }; }
      else if (S.covRoi === 'free') { f.temp = { type: 'free', pts: [clampImg(p)] }; S.drag = { type: 'free', for: 'coverage' }; }
      return;
    }
    if (t === 'bands') {
      if (p.x < 0 || p.y < 0 || p.x >= S.W || p.y >= S.H) return;
      const o = selObj(), gel = o && o.kind === 'bands' ? o : null;
      if (!gel) { const q = clampImg(p); f.temp = { type: 'box', a: q, b: q }; S.drag = { type: 'box', for: 'bands' }; return; }
      S.drag = { type: 'bandClick', p0: p, gel }; return;
    }
    if (t === 'persp') {
      if (f.pts.length >= 4) return;
      f.pts.push(clampImg(p)); renderGuide(); render(); return;
    }
    if (t === 'colony') {
      const o = selObj(), col = o && o.kind === 'colony' ? o : null, roi = col ? col.roi : f.roi;
      if (f.mode === 'roi') { const [x, y] = clampImg(p); f.temp = { type: 'ellipse', a: [x, y], b: [x, y] }; S.drag = { type: 'ellipse' }; return; }
      if (roi) { // editar a placa: borda = redimensionar, dentro = arrastar para mover (um toque/clique continua marcando)
        const [cx, cy] = toScr(roi.cx, roi.cy), z = S.view.z, rr = Math.hypot((p.sx - cx) / (roi.rx * z), (p.sy - cy) / (roi.ry * z));
        if (Math.abs(rr - 1) * Math.min(roi.rx, roi.ry) * z < 12) { S.drag = { type: 'plateResize', p0: p, roi, col, d0: Math.max(1, Math.hypot(p.sx - cx, p.sy - cy)), rx0: roi.rx, ry0: roi.ry }; return; }
        if (rr < 1) { S.drag = { type: 'platePending', roi, col, p0: p, ox: roi.cx, oy: roi.cy }; return; }
      }
      colonyClick(p); return;
    }
    if (t === 'count') {
      if (p.x < 0 || p.y < 0 || p.x >= S.W || p.y >= S.H) return;
      let o = S.objs.find((x) => x.id === f.obj);
      pushUndo();
      if (!o) { o = addObj({ kind: 'count', points: [] }); f.obj = o.id; }
      const tol = 10 / S.view.z, i = o.points.findIndex((q) => Math.hypot(q[0] - p.x, q[1] - p.y) < tol);
      if (i >= 0) o.points.splice(i, 1); else o.points.push([p.x, p.y]);
      S.sel = o.id; refreshAll(); return;
    }
    if (t === 'edit') {
      const o = selObj();
      if (!o || o.kind !== 'area') { const h = hitObj(p.x, p.y); if (h && h.kind === 'area') { S.sel = h.id; refreshAll(); } else toast('Clique sobre uma área medida.'); return; }
      pushUndo();
      const add = (f.brush === 'brushAdd' || f.brush === 'lassoAdd') !== e.altKey;
      if (f.brush.startsWith('lasso')) { f.temp = { type: 'free', pts: [clampImg(p)], erase: !add }; S.drag = { type: 'lasso', add }; }
      else { S.drag = { type: 'brush', add, last: [p.x, p.y] }; paint(o, p.x, p.y, p.x, p.y, add); }
    }
  }
  // ---------- contorno magnético
  const wireR = () => Math.max(80, Math.min(600, Math.round(380 / S.view.z)));
  function magStart(x, y) { const f = S.flow; f.wire = MM.liveWire(ensureGrad(), S.W, S.H, x, y, wireR()); }
  function magPath(tx, ty) {
    const f = S.flow, a = f.anchors[f.anchors.length - 1];
    return (f.wire && f.wire.path(tx, ty)) || [[a[0] + 0.5, a[1] + 0.5], [tx + 0.5, ty + 0.5]];
  }
  function magClick(p) {
    const f = S.flow, g = ensureGrad(), snapR = Math.max(2, Math.round(5 / S.view.z));
    if (!f.anchors || !f.anchors.length) {
      const [x, y] = MM.snapEdge(g, S.W, S.H, Math.min(S.W - 1, Math.max(0, p.x)), Math.min(S.H - 1, Math.max(0, p.y)), snapR);
      f.anchors = [[x, y]]; f.segs = []; f.prevPath = null; later(() => { magStart(x, y); render(); }); return;
    }
    const [x0, y0] = toScr(f.anchors[0][0] + 0.5, f.anchors[0][1] + 0.5);
    if (f.anchors.length >= 2 && Math.hypot(x0 - p.sx, y0 - p.sy) < 10) return magClose();
    const [x, y] = MM.snapEdge(g, S.W, S.H, Math.min(S.W - 1, Math.max(0, p.x)), Math.min(S.H - 1, Math.max(0, p.y)), snapR);
    f.segs.push(magPath(x, y)); f.anchors.push([x, y]); f.prevPath = null;
    later(() => { magStart(x, y); render(); });
  }
  function magPreview(p) { const f = S.flow; if (!f.anchors || !f.anchors.length) return; f.prevPath = magPath(Math.min(S.W - 1, Math.max(0, Math.round(p.x))), Math.min(S.H - 1, Math.max(0, Math.round(p.y)))); }
  function magClose() {
    const f = S.flow; if (!f.anchors || f.anchors.length < 2) return;
    f.segs.push(magPath(f.anchors[0][0], f.anchors[0][1]));
    const pts = []; for (const sg of f.segs) for (const q of sg) { const l = pts[pts.length - 1]; if (!l || l[0] !== q[0] || l[1] !== q[1]) pts.push(q); }
    f.anchors = []; f.segs = []; f.wire = null; f.prevPath = null;
    finishArea(pts, 'magnetic');
  }
  function magUndo() {
    const f = S.flow; if (!f.anchors || !f.anchors.length) return;
    f.anchors.pop(); f.segs.pop(); f.prevPath = null;
    if (f.anchors.length) { const a = f.anchors[f.anchors.length - 1]; later(() => { magStart(a[0], a[1]); render(); }); } else { f.wire = null; render(); }
  }
  function paint(o, ax, ay, bx, by, add) {
    const r = S.brushPx / S.view.z, st = MM.strokeMask(ax, ay, bx, by, r, S.W, S.H);
    o.mask = MM.combine(o.mask, st, add, S.W, S.H); o.poly = null; o.edited = true; render();
  }
  cv.addEventListener('pointermove', (e) => {
    if (!S.img) return; const p = evPos(e);
    if (e.pointerType === 'touch') {
      if (!touches.has(e.pointerId)) return; touches.set(e.pointerId, p);
      if (pinch && touches.size >= 2) {
        const [a, b] = [...touches.values()], d2 = Math.hypot(a.sx - b.sx, a.sy - b.sy), m = [(a.sx + b.sx) / 2, (a.sy + b.sy) / 2];
        const z = Math.max(0.02, Math.min(40, pinch.z0 * d2 / Math.max(1, pinch.d0))), ix = (pinch.m0[0] - pinch.ox) / pinch.z0, iy = (pinch.m0[1] - pinch.oy) / pinch.z0;
        S.view = { z, ox: m[0] - ix * z, oy: m[1] - iy * z }; render(); return;
      }
      if (pendingTouch) {
        if (Math.hypot(p.sx - pendingTouch.p.sx, p.sy - pendingTouch.p.sy) < 8) return;
        const pt = pendingTouch; pendingTouch = null; handleDown(pt.e, pt.p);
      }
    }
    handleMove(p);
  });
  function handleMove(p) {
    S.pointer = p; const d = S.drag, f = S.flow;
    if (!d && S.tool === 'colony') {
      const o = selObj(), roi = o && o.kind === 'colony' ? o.roi : f.roi; let cur = 'crosshair';
      if (roi && f.mode !== 'roi') { const [cx, cy] = toScr(roi.cx, roi.cy), rr = Math.hypot((p.sx - cx) / (roi.rx * S.view.z), (p.sy - cy) / (roi.ry * S.view.z)); if (Math.abs(rr - 1) * Math.min(roi.rx, roi.ry) * S.view.z < 12) cur = 'nwse-resize'; }
      cv.style.cursor = cur;
    }
    if (!d) { if (S.tool === 'area' && f.mode === 'magnetic' && f.wire) magPreview(p); if (S.tool === 'edit' || S.tool === 'angle' || (S.tool === 'area' && (f.mode === 'poly' || f.mode === 'magnetic'))) render(); return; }
    if (d.type === 'pan') { S.view.ox = d.ox + p.sx - d.sx; S.view.oy = d.oy + p.sy - d.sy; render(); }
    else if (d.type === 'line') { const [x, y] = clampImg(p); f.temp.l[2] = x; f.temp.l[3] = y; render(); }
    else if (d.type === 'ellipse' || d.type === 'box') { f.temp.b = clampImg(p); render(); }
    else if (d.type === 'split') { const r = wrap.getBoundingClientRect(); S.cmp.split = Math.max(0.05, Math.min(0.95, p.sx / r.width)); render(); }
    else if (d.type === 'platePending') { if (Math.hypot(p.sx - d.p0.sx, p.sy - d.p0.sy) > 6) { if (d.col) pushUndo(); d.type = 'plateMove'; } }
    if (d.type === 'plateMove') { d.roi.cx = d.ox + (p.x - d.p0.x); d.roi.cy = d.oy + (p.y - d.p0.y); render(); }
    else if (d.type === 'plateResize') {
      if (!d.started) { if (Math.hypot(p.sx - d.p0.sx, p.sy - d.p0.sy) < 4) return; d.started = true; if (d.col) pushUndo(); }
      const [cx, cy] = toScr(d.roi.cx, d.roi.cy), k2 = Math.max(0.05, Math.hypot(p.sx - cx, p.sy - cy) / d.d0); d.roi.rx = d.rx0 * k2; d.roi.ry = d.ry0 * k2; render();
    }
    else if (d.type === 'free' || d.type === 'lasso' || d.type === 'seed') { const q = clampImg(p), a = f.temp.pts[f.temp.pts.length - 1], [s0, s1] = toScr(a[0], a[1]); if (Math.hypot(s0 - p.sx, s1 - p.sy) > 1.5) { f.temp.pts.push(q); render(); } }
    else if (d.type === 'brush') { const o = selObj(); if (o) { paint(o, d.last[0], d.last[1], p.x, p.y, d.add); d.last = [p.x, p.y]; } }
    else if (d.type === 'handle') {
      const [x, y] = clampImg(p); d.h.l[d.h.e] = x; d.h.l[d.h.e + 1] = y;
      if (d.h.scale) S.scale.ppu = lineLen(S.scale.line) / S.scale.known;
      refreshAll();
    }
  }
  const endDrag = () => {
    const d = S.drag, f = S.flow; S.drag = null; if (!d) return;
    if (d.type === 'pan') cv.style.cursor = !S.tool || S.tool === 'select' ? 'grab' : 'crosshair';
    else if (d.type === 'line') { const l = f.temp.l; f.temp = null; if (lineLen(l) * S.view.z < 4) { toast('Arraste para traçar a linha.'); render(); return; } finishLine(l); }
    else if (d.type === 'split') { /* nada */ }
    else if (d.type === 'box') {
      const { a, b, oval } = f.temp; f.temp = null;
      const x0 = Math.min(a[0], b[0]), y0 = Math.min(a[1], b[1]), w = Math.abs(b[0] - a[0]), h = Math.abs(b[1] - a[1]);
      if (w * S.view.z < 4 || h * S.view.z < 4) { toast('Arraste de um canto ao outro.'); render(); return; }
      const poly = oval ? MM.ovalPolygon(x0, y0, w, h) : [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]];
      if (d.for === 'area') finishArea(poly, oval ? 'oval' : 'rect', [x0, y0, w, h]);
      else if (d.for === 'crop') { f.cropBox = [x0, y0, w, h]; renderGuide(); render(); }
      else if (d.for === 'coverage') { S.covPoly = poly; updateCoverage(true); }
      else if (d.for === 'bands') { pushUndo(); const o = addObj({ kind: 'bands', rects: [[x0, y0, w, h]], dark: S.bandDark }); S.sel = o.id; refreshAll(); }
    }
    else if (d.type === 'bandClick') {
      const g2 = d.gel, q = d.p0, i = g2.rects.findIndex((r) => q.x >= r[0] && q.x <= r[0] + r[2] && q.y >= r[1] && q.y <= r[1] + r[3]);
      pushUndo();
      if (i >= 0) { g2.rects.splice(i, 1); if (!g2.rects.length) { S.objs = S.objs.filter((o) => o !== g2); S.sel = null; } }
      else { const [, , w, h] = g2.rects[0]; g2.rects.push([q.x - w / 2, q.y - h / 2, w, h]); }
      refreshAll();
    }
    else if (d.type === 'free') { const pts = f.temp.pts; f.temp = null; if (pts.length < 3) { render(); return; } if (d.for === 'coverage') { S.covPoly = pts; updateCoverage(true); } else finishArea(pts, 'free'); }
    else if (d.type === 'lasso') { const pts = f.temp.pts; f.temp = null; const o = selObj(); if (o && pts.length >= 3) { o.mask = MM.combine(o.mask, MM.rasterPolygon(pts, S.W, S.H), d.add, S.W, S.H); o.poly = null; o.edited = true; } refreshAll(); }
    else if (d.type === 'brush') refreshAll();
    else if (d.type === 'platePending') colonyClick(d.p0);
    else if (d.type === 'plateResize' && !d.started) colonyClick(d.p0);
    else if (d.type === 'plateMove' || d.type === 'plateResize') { if (d.col) recomputeColonies(d.col); else refreshAll(); }
    else if (d.type === 'ellipse') {
      const { a, b } = f.temp; f.temp = null; f.mode = null;
      const roi = { cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2, rx: Math.abs(b[0] - a[0]) / 2, ry: Math.abs(b[1] - a[1]) / 2 };
      if (roi.rx * S.view.z < 10 || roi.ry * S.view.z < 10) { toast('Arraste de um canto ao outro da placa.'); renderGuide(); render(); return; }
      const o = selObj();
      if (o && o.kind === 'colony') { pushUndo(); o.roi = roi; recomputeColonies(o); } else { f.roi = roi; refreshAll(); }
    }
    else if (d.type === 'seed') {
      const pts = f.temp.pts; f.temp = null;
      if (d.kind === 'new') clickDetect(pts); else { const o = selObj(); if (o && o.seeds) addSeed(o, d.kind, pts); }
      render();
    }
  };
  const onUp = (e) => {
    if (e.pointerType === 'touch') {
      touches.delete(e.pointerId);
      if (pinch) { if (touches.size < 2) { pinch = null; touches.clear(); } return; }
      if (pendingTouch) { const pt = pendingTouch; pendingTouch = null; handleDown(pt.e, pt.p); } // toque simples
    }
    endDrag();
  };
  cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', (e) => { touches.delete(e.pointerId); pendingTouch = null; if (touches.size < 2) pinch = null; endDrag(); });
  cv.addEventListener('pointerleave', () => { S.pointer = null; render(); });
  cv.addEventListener('dblclick', () => { const f = S.flow; if (S.tool === 'area' && f.mode === 'poly' && f.pts.length >= 3) { const pts = f.pts; f.pts = []; finishArea(pts, 'poly'); } else if (S.tool === 'area' && f.mode === 'magnetic') magClose(); });
  cv.addEventListener('wheel', (e) => { if (!S.img) return; e.preventDefault(); const r = cv.getBoundingClientRect(); zoomAt(Math.pow(1.0015, -e.deltaY), e.clientX - r.left, e.clientY - r.top); }, { passive: false });

  document.addEventListener('keydown', (e) => {
    const typing = /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); redo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') { e.preventDefault(); $('file').click(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveProject(); return; }
    if (e.key === 'PageDown' || e.key === 'PageUp') { if (typing) document.activeElement.blur(); }
    if (typing) return;
    const f = S.flow;
    if (e.key === ' ') { S.space = true; e.preventDefault(); }
    else if (e.key === 'Escape') { if (f.temp || (f.pts && f.pts.length) || (f.anchors && f.anchors.length)) { f.temp = null; if (f.pts) f.pts = []; f.anchors = []; f.segs = []; f.wire = null; f.prevPath = null; render(); } else setTool(null); }
    else if (e.key === 'Enter' && S.tool === 'area' && f.mode === 'poly' && f.pts.length >= 3) { const pts = f.pts; f.pts = []; finishArea(pts, 'poly'); }
    else if (e.key === 'Enter' && S.tool === 'area' && f.mode === 'magnetic') magClose();
    else if (e.key === 'Backspace' && S.tool === 'area' && f.mode === 'poly' && f.pts.length) { f.pts.pop(); render(); }
    else if (e.key === 'Backspace' && S.tool === 'area' && f.mode === 'magnetic' && f.anchors && f.anchors.length) magUndo();
    else if (e.key === 'Backspace' && S.tool === 'persp' && f.pts.length) { f.pts.pop(); renderGuide(); render(); }
    else if (e.key === 'Backspace' && S.tool === 'colony' && f.samples && f.samples.length) action('colUndoSample');
    else if ((e.key === 'Delete' || e.key === 'Backspace') && S.sel) { removeObj(S.sel); }
    else if (e.key === 'PageDown') openPhoto(S.cur + 1); else if (e.key === 'PageUp') openPhoto(S.cur - 1);
    else if (e.key === '+' || e.key === '=') zoomAt(1.25); else if (e.key === '-') zoomAt(0.8); else if (e.key === '0') fit();
  });
  document.addEventListener('keyup', (e) => { if (e.key === ' ') S.space = false; });
  const removeObj = (id) => { pushUndo(); S.objs = S.objs.filter((o) => o.id !== id); if (S.sel === id) S.sel = null; if (S.flow.obj === id) S.flow.obj = null; refreshAll(); };

  /* ---------- resultados ---------- */
  function stats(vals) { const n = vals.length; if (!n) return null; const m = vals.reduce((a, b) => a + b, 0) / n; const sd = n > 1 ? Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1)) : 0; return { n, m, sd }; }
  // Referência da cicatrização: área da fenda na primeira foto (na ordem das fotos) do mesmo grupo.
  function gapRef(group) {
    stash();
    for (const p of S.photos) { const o = (p.uid === curUid() ? S.objs : p.objs).find((x) => x.kind === 'area' && x.role === 'fenda' && (x.group || '') === (group || '') && x.mask.w); if (o) return measureArea(o).area; }
    return NaN;
  }
  function tableData(objs = S.objs, scale = S.scale) {
    const u = scale ? unit() : 'px', K = scale ? (1 / scale.ppu) * UF[scale.unit] / UF[unit()] : 1, out = [], isCur = objs === S.objs;
    const areasAll = objs.filter((o) => o.kind === 'area' && o.mask.w), areas = areasAll.filter((o) => o.role !== 'fenda');
    if (areas.length) {
      const showInt = S.measureInt || areas.some((o) => o.role === 'fundo'), bgs = areas.filter((o) => o.role === 'fundo').map((o) => measureArea(o).int).filter(Boolean);
      const bgMean = bgs.length ? bgs.reduce((a, x) => a + x.mean, 0) / bgs.length : NaN, hasRole = areas.some((o) => o.role);
      const short = ['Objeto', `Área ${u}²`, `Perím. ${u}`, `Compr. ${u}`, `Larg. ${u}`, 'Circ.'], cols = ['Objeto', `Área (${u}²)`, `Perímetro (${u})`, `Comprimento (${u})`, `Largura (${u})`, 'Circularidade'];
      if (showInt) { short.push('Média', 'Desvio', 'Mín', 'Máx', 'Dens. int.'); cols.push('Intensidade média', 'Intensidade desvio', 'Intensidade mín.', 'Intensidade máx.', `Densidade integrada (${u}² × intensidade)`); if (bgs.length) { short.push('CTCF'); cols.push('CTCF (dens. int. − área × fundo)'); } }
      if (hasRole) { short.push('Papel'); cols.push('Papel'); }
      short.push('Cor'); cols.push('Cor média');
      out.push({ kind: 'area', title: 'Áreas', short, cols,
        rows: areas.map((o) => {
          const m = measureArea(o), A = m.area * K * K, v = [A, m.perimeter * K, m.feret * K, m.minFeret * K, m.circularity];
          if (showInt) { const it = m.int || {}; v.push(it.mean, it.sd, it.min, it.max, A * it.mean); if (bgs.length) v.push(o.role === 'fundo' ? NaN : A * it.mean - A * bgMean); }
          const row = { o, v, color: m.mean }; if (hasRole) { v.push(NaN); row.text = { [v.length - 1]: o.role === 'fundo' ? 'fundo' : 'objeto' }; } return row;
        }) });
    }
    const gaps = areasAll.filter((o) => o.role === 'fenda');
    if (gaps.length) out.push({ kind: 'gap', title: 'Cicatrização (fenda)', short: ['Objeto', `Área ${u}²`, 'Fechamento %'], cols: ['Objeto', `Área da fenda (${u}²)`, 'Fechamento em relação à 1ª foto do grupo (%)'],
      rows: gaps.map((o) => { const A = measureArea(o).area, A0 = gapRef(o.group); return { o, v: [A * K * K, A0 > 0 ? (A0 - A) / A0 * 100 : NaN] }; }) });
    const lens = objs.filter((o) => o.kind === 'length');
    if (lens.length) out.push({ kind: 'length', title: 'Comprimentos', cols: ['Objeto', `Comprimento (${u})`], rows: lens.map((o) => ({ o, v: [lineLen(o.line) * K] })) });
    const lws = objs.filter((o) => o.kind === 'lw');
    if (lws.length) out.push({ kind: 'lw', title: 'Comprimento × Largura', cols: ['Objeto', `Comprimento (${u})`, `Largura (${u})`, 'C / L'],
      rows: lws.map((o) => { const [a, b] = lwSorted(o), A = lineLen(a) * K, B = lineLen(b) * K; return { o, v: [A, B, B ? A / B : NaN] }; }) });
    const angs = objs.filter((o) => o.kind === 'angle');
    if (angs.length) out.push({ kind: 'angle', title: 'Ângulos', cols: ['Objeto', 'Ângulo (°)'], rows: angs.map((o) => ({ o, v: [MM.angle3(...o.pts)] })) });
    const cnts = objs.filter((o) => o.kind === 'count');
    if (cnts.length) out.push({ kind: 'count', title: 'Contagens', cols: ['Contagem', 'Itens'], rows: cnts.map((o) => ({ o, v: [o.points.length], int: true })) });
    const cols = objs.filter((o) => o.kind === 'colony');
    if (cols.length) out.push({ kind: 'colony', title: 'Colônias', short: ['Placa', 'Colônias', 'Automát.', 'Manuais', `Área méd. ${u}²`], cols: ['Placa', 'Colônias', 'Marcadas automaticamente', 'Adicionadas à mão', `Área média (${u}²)`],
      rows: cols.map((o) => { const it = colonyItems(o), auto = it.filter((i) => i.auto), A = auto.length ? auto.reduce((a, i) => a + i.area / i.n, 0) / auto.length : NaN; return { o, v: [it.reduce((a, i) => a + i.n, 0), auto.reduce((a, i) => a + i.n, 0), it.length - auto.length, A * K * K], intCols: [0, 1, 2] }; }) });
    const covs = objs.filter((o) => o.kind === 'coverage');
    if (covs.length) out.push({ kind: 'coverage', title: 'Cobertura', short: ['Objeto', `Analisada ${u}²`, `Coberta ${u}²`, '%'], cols: ['Objeto', `Área analisada (${u}²)`, `Área coberta (${u}²)`, 'Cobertura (%)'],
      rows: covs.map((o) => ({ o, v: [o.total * K * K, o.covered * K * K, o.covered / o.total * 100] })) });
    const gels = objs.filter((o) => o.kind === 'bands');
    if (gels.length) {
      const rows = [];
      for (const o of gels) {
        if (isCur && o.photoUid === curUid()) o.dens = o.rects.map((rc) => MM.bandDensity(S.rgba, S.W, S.H, rc, o.dark, S.raw));
        (o.dens || []).forEach((d, i) => rows.push({ o, label: `${objName(o)}.${i + 1}`, del: `${o.id}:${i}`, v: [d.density, o.dens[0].density ? d.density / o.dens[0].density * 100 : NaN, d.background] }));
      }
      out.push({ kind: 'bands', title: 'Bandas de gel', short: ['Banda', 'Densidade', 'Relativa %', 'Fundo'], cols: ['Banda', 'Densidade (soma acima do fundo)', 'Relativa à banda 1 (%)', 'Fundo (intensidade)'], rows });
    }
    const profs = objs.filter((o) => o.kind === 'profile');
    if (profs.length) out.push({ kind: 'profile', title: 'Perfis de linha', short: ['Objeto', `Compr. ${u}`, 'Média', 'Mín', 'Máx'], cols: ['Objeto', `Comprimento (${u})`, 'Intensidade média', 'Intensidade mín.', 'Intensidade máx.'],
      rows: profs.map((o) => {
        if (isCur && o.photoUid === curUid()) { const pr = MM.lineProfile(S.rgba, S.W, S.H, o.line, S.raw); o.pvals = pr.values; o.pstep = pr.step; }
        const vs = o.pvals || []; return { o, v: [lineLen(o.line) * K, vs.length ? vs.reduce((a, x) => a + x, 0) / vs.length : NaN, vs.length ? Math.min(...vs) : NaN, vs.length ? Math.max(...vs) : NaN] };
      }) });
    return out;
  }
  function renderResults() {
    const data = tableData(), body = $('resBody');
    // cabeçalho: foto atual e grupo das próximas medições
    $('resSub').textContent = S.img ? (S.photos.length > 1 ? `Foto ${S.cur + 1} de ${S.photos.length}: ${S.name}` : S.name) : '';
    $('groupBar').hidden = !S.img;
    $('groupList').innerHTML = S.groups.map((g) => `<option value="${esc(g)}">`).join('');
    if (document.activeElement !== $('groupIn')) $('groupIn').value = S.group;
    if (!data.length) { $('resCount').textContent = '0'; body.innerHTML = `<div id="resEmpty">${S.img ? 'Suas medições aparecem aqui, com média e desvio padrão de cada coluna.' : 'Abra uma ou várias imagens e escolha uma ferramenta para medir.'}</div>`; return; }
    const showG = S.groups.length > 0 || S.objs.some((o) => o.group);
    const gSel = (o) => `<td class="gcell"><select data-grp="${o.id}" title="Grupo"><option value="">—</option>${S.groups.map((g) => `<option ${o.group === g ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select></td>`;
    body.innerHTML = data.map((sec) => {
      const n = sec.rows[0].v.length;
      const st = [...Array(n)].map((_, i) => stats(sec.rows.map((r) => r.v[i]).filter(Number.isFinite)));
      const cell = (r, v, i) => r.text && r.text[i] != null ? esc(r.text[i]) : (r.int || (r.intCols && r.intCols.includes(i))) ? (Number.isFinite(v) ? String(v) : '—') : fmt(v);
      const extra = sec.rows.some((r) => r.color) ? 1 : 0, pad = '<td></td>'.repeat(extra + (showG ? 1 : 0) + 1);
      return `<div class="sec"><h3>${sec.title}<span>${sec.rows.length} medida${sec.rows.length > 1 ? 's' : ''}</span></h3><table><thead><tr>${(sec.short || sec.cols).map((c, i) => `<th title="${esc(sec.cols[i])}">${esc(c)}</th>`).join('')}${showG ? '<th>Grupo</th>' : ''}<th></th></tr></thead><tbody>` +
        sec.rows.map((r) => `<tr class="row ${r.o.id === S.sel ? 'sel' : ''}" data-id="${r.o.id}"><td><span class="dot" style="background:${r.o.color}"></span>${r.label || objName(r.o)}</td>${r.v.map((v, i) => `<td>${cell(r, v, i)}</td>`).join('')}${r.color ? `<td><span class="sw" title="RGB ${r.color.map((c) => Math.round(c)).join(', ')}" style="background:rgb(${r.color.map(Math.round).join(',')})"></span></td>` : ''}${showG ? gSel(r.o) : ''}<td><button class="del" data-del="${r.del || r.o.id}" title="Apagar">×</button></td></tr>`).join('') +
        (sec.rows.length > 1 ? `<tr class="sum"><td>Média</td>${st.map((x) => `<td>${x ? fmt(x.m) : ''}</td>`).join('')}${pad}</tr><tr class="sum"><td>Desvio</td>${st.map((x) => `<td>${x ? fmt(x.sd) : ''}</td>`).join('')}${pad}</tr>` : '') +
        `</tbody></table></div>`;
    }).join('');
    body.querySelectorAll('tr.row').forEach((tr) => tr.onclick = (e) => { if (e.target.dataset.del || e.target.dataset.grp) return; S.sel = +tr.dataset.id; refreshAll(); });
    body.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => {
      const [id, idx] = String(b.dataset.del).split(':').map(Number), o = S.objs.find((x) => x.id === id);
      if (o && o.kind === 'bands' && Number.isFinite(idx)) { pushUndo(); o.rects.splice(idx, 1); if (!o.rects.length) S.objs = S.objs.filter((x) => x !== o); refreshAll(); } else removeObj(id);
    });
    body.querySelectorAll('[data-grp]').forEach((sl) => { sl.onclick = (e) => e.stopPropagation(); sl.onchange = () => { const o = S.objs.find((x) => x.id === +sl.dataset.grp); if (o) { pushUndo(); o.group = sl.value; refreshAll(); } }; });
    renderPhotoNav();
    $('resCount').textContent = data.reduce((a, sec) => a + sec.rows.length, 0);
    renderChart();
  }
  // Gráfico do objeto selecionado: perfil de linha, ou histograma de intensidade de uma área.
  function renderChart() {
    const o = selObj(), box = $('chartBox'); let pts = null, title = '', xl = '', bars = false;
    if (o && o.kind === 'profile' && o.pvals) { pts = o.pvals.map((v, i) => [i * o.pstep * k(), v]); title = `${objName(o)}: intensidade ao longo da linha`; xl = unit(); }
    else if (o && (o.kind === 'area' || o.kind === 'coverage') && o.mask && o.photoUid === curUid() && (S.measureInt || o.role)) {
      const h = MM.histogram(o.mask, S.rgba, S.W, S.H, S.raw); pts = Array.from(h.h).map((c, i) => [h.lo + (h.hi - h.lo) * i / 255, c]); title = `${objName(o)}: histograma de intensidade`; xl = 'intensidade'; bars = true;
    }
    if (!pts) { box.hidden = true; return; }
    box.hidden = false; $('chartTitle').textContent = title;
    const c = $('chart'), dpr = window.devicePixelRatio || 1, Wc = c.clientWidth || 360, Hc = 150; c.width = Wc * dpr; c.height = Hc * dpr;
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, Wc, Hc);
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = bars ? 0 : Math.min(...ys), y1 = Math.max(...ys);
    const L = 38, R = 8, T = 8, B = 22, X = (x) => L + (x - x0) / Math.max(1e-9, x1 - x0) * (Wc - L - R), Y = (y) => Hc - B - (y - y0) / Math.max(1e-9, y1 - y0) * (Hc - T - B);
    g.strokeStyle = '#3a454b'; g.lineWidth = 1; g.beginPath(); g.moveTo(L, T); g.lineTo(L, Hc - B); g.lineTo(Wc - R, Hc - B); g.stroke();
    g.fillStyle = '#93a19d'; g.font = '11px Bahnschrift, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle';
    g.fillText(fmt(y1), L - 4, T + 4); g.fillText(fmt(y0), L - 4, Hc - B); g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(fmt(x0), L, Hc - B + 4); g.textAlign = 'right'; g.fillText(`${fmt(x1)} ${xl}`, Wc - R, Hc - B + 4);
    g.strokeStyle = o.color; g.fillStyle = o.color; g.lineWidth = 1.5;
    if (bars) { const bw = (Wc - L - R) / pts.length; pts.forEach((q) => g.fillRect(X(q[0]), Y(q[1]), Math.max(1, bw), Hc - B - Y(q[1]))); }
    else { g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(X(q[0]), Y(q[1])) : g.moveTo(X(q[0]), Y(q[1]))); g.stroke(); }
    $('chartCsv').onclick = () => { const csv = [bars ? 'intensidade;pixels' : `distância (${unit()});intensidade`].concat(pts.map((q) => `${num(q[0])};${num(q[1])}`)).join('\r\n'); download(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }), `${baseName()}-${objName(o)}.csv`); };
  }
  const setGroup = (v) => { v = v.trim(); S.group = v; if (v && !S.groups.includes(v)) S.groups.push(v); renderResults(); };
  $('groupIn').addEventListener('change', (e) => setGroup(e.target.value));
  $('groupIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') { setGroup(e.target.value); e.target.blur(); } });
  $('groupAll').onclick = () => { if (!S.objs.length) { toast('Não há medições nesta foto.'); return; } pushUndo(); S.objs.forEach((o) => o.group = S.group); refreshAll(); toast(S.group ? `Todas as medições desta foto agora estão em "${S.group}".` : 'Grupo removido das medições desta foto.'); };
  function refreshAll() {
    const sc = $('scaleChip');
    if (S.scale) { sc.textContent = `Escala: 1 ${S.scale.unit} = ${nf(S.scale.ppu, 2)} px`; sc.classList.add('set'); }
    else { sc.textContent = 'Sem escala — resultados em pixels'; sc.classList.remove('set'); }
    const du = $('dispUnit'); du.disabled = !S.scale; du.innerHTML = S.scale ? unitOpts(unit()) : '<option>px</option>';
    renderResults(); renderGuide(); render();
    if (!$('lookPanel').hidden) syncLook();
    if (S.photos && S.photos.length) scheduleSave();
  }

  /* ---------- exportação ---------- */
  const num = (v, d = 4) => Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '';
  // Planilha "longa": uma linha por medição, com Foto e Grupo, de todas as fotos; depois um resumo por grupo.
  function exportRows() {
    stash();
    const photos = S.photos.length ? S.photos : [];
    const now = new Date();
    const rows = [['MetricMod', `versão ${APP_VERSION}`], ['Análise exportada em', `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`], ['Endereço', AB.url],
      ['Fotos', String(photos.length)], ['Unidade dos resultados', unit()], ['Aviso', AB.notice], []];
    const secs = new Map(); // kind -> {title, cols, rows:[]}
    const colonyList = [];
    photos.forEach((p) => {
      const objs = p.objs; if (!objs.length) return;
      const sc = p.scale, K = sc ? (1 / sc.ppu) * UF[sc.unit] / UF[unit()] : 1;
      for (const sec of tableData(objs, sc)) {
        let t = secs.get(sec.kind);
        if (!t) { t = { title: sec.title, cols: ['Foto', 'Grupo', ...(sec.kind === 'area' ? sec.cols.slice(0, -1).concat(['Cor R', 'Cor G', 'Cor B']) : sec.cols), 'Escala'], rows: [], vals: [] }; secs.set(sec.kind, t); }
        for (const r of sec.rows) {
          t.rows.push([p.name, r.o.group || '', r.label || objName(r.o), ...r.v.map((v, i) => r.text && r.text[i] != null ? r.text[i] : (r.int || (r.intCols && r.intCols.includes(i))) ? (Number.isFinite(v) ? String(v) : '') : num(v)), ...(r.color ? r.color.map((c) => num(c, 1)) : []), sc ? `1 ${sc.unit} = ${num(sc.ppu, 3)} px` : 'pixels']);
          t.vals.push({ g: r.o.group || '(sem grupo)', v: r.v });
        }
      }
      for (const o of objs) if (o.kind === 'colony') for (const it of colonyItems(o)) colonyList.push([p.name, o.group || '', objName(o), num(it.x, 1), num(it.y, 1), String(it.n), it.auto ? num(it.area * K * K) : '', it.auto ? 'automática' : 'manual']);
    });
    for (const t of secs.values()) { rows.push([t.title]); rows.push(t.cols); t.rows.forEach((r) => rows.push(r)); rows.push([]); }
    if (colonyList.length) { rows.push(['Colônias, uma por linha']); rows.push(['Foto', 'Grupo', 'Placa', 'X (px)', 'Y (px)', 'Colônias no ponto', `Área (${unit()}²)`, 'Marcação']); colonyList.forEach((r) => rows.push(r)); rows.push([]); }
    // resumo por grupo
    const groupsUsed = [...new Set([...secs.values()].flatMap((t) => t.vals.map((x) => x.g)))];
    if (groupsUsed.length > 1 || (groupsUsed.length === 1 && groupsUsed[0] !== '(sem grupo)')) {
      rows.push(['Resumo por grupo']);
      for (const t of secs.values()) {
        const names = t.cols.slice(3, 3 + t.vals[0].v.length);
        rows.push([t.title]); rows.push(['Grupo', 'n', ...names.flatMap((c) => [`${c} média`, `${c} desvio`])]);
        for (const g of groupsUsed) {
          const vs = t.vals.filter((x) => x.g === g); if (!vs.length) continue;
          rows.push([g, String(vs.length), ...names.flatMap((_, i) => { const st = stats(vs.map((x) => x.v[i]).filter(Number.isFinite)); return st ? [num(st.m), st.n > 1 ? num(st.sd) : ''] : ['', '']; })]);
        }
        rows.push([]);
      }
    }
    return rows;
  }
  const baseName = () => (S.name || 'imagem').replace(/\.[^.]+$/, '');
  const download = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  const anyObjs = () => S.objs.length || S.photos.some((p) => p.objs.length);
  $('btnCsv').onclick = () => {
    if (!anyObjs()) { toast('Ainda não há medições para exportar.'); return; }
    const csv = exportRows().map((r) => r.map((c) => /[;"\n]/.test(c) ? `"${String(c).replace(/"/g, '""')}"` : c).join(';')).join('\r\n');
    download(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), S.photos.length > 1 ? `metricmod-${S.photos.length}-fotos.csv` : `${baseName()}-medicoes.csv`); toast('Planilha salva na pasta de downloads.');
  };
  $('btnCopy').onclick = async () => {
    if (!anyObjs()) { toast('Ainda não há medições para copiar.'); return; }
    const tsv = exportRows().map((r) => r.join('\t')).join('\n');
    try { await navigator.clipboard.writeText(tsv); } catch { const t = document.createElement('textarea'); t.value = tsv; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
    toast('Tabela copiada. Cole no Excel com Ctrl+V.');
  };
  $('btnPng').onclick = () => {
    if (!S.img) return;
    const c = document.createElement('canvas'); c.width = S.W; c.height = S.H; const g = c.getContext('2d');
    g.drawImage(S.imgCanvas, 0, 0); for (const o of S.objs) if (o.kind === 'area' && o.mask.w) g.drawImage(maskCanvas(o), o.mask.x, o.mask.y);
    const uu = Math.max(1, Math.max(S.W, S.H) / 1100);
    drawOverlays(g, (x, y) => [x, y], uu);
    if (S.style.stamp) { // carimbo: versão, escala e data, para a figura ser rastreável
      const txt = `MetricMod ${APP_VERSION} · ${S.scale ? `1 ${S.scale.unit} = ${nf(S.scale.ppu, 2)} px` : 'sem escala'} · ${new Date().toLocaleDateString('pt-BR')}`;
      g.font = `500 ${11 * uu}px Bahnschrift, "Segoe UI", sans-serif`; const w = g.measureText(txt).width + 12 * uu, h = 18 * uu;
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(6 * uu, S.H - h - 6 * uu, w, h); g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(txt, 12 * uu, S.H - h / 2 - 6 * uu);
    }
    c.toBlob((b) => { download(b, `${baseName()}-marcada.png`); toast('Imagem marcada salva na pasta de downloads.'); });
  };

  /* ---------- abrir imagem ---------- */
  /* ---------- fotos (lote) ---------- */
  S.photos = []; S.cur = -1; S.lastScale = null;
  const isTiff = (f) => /\.tiff?$/i.test(f.name || '') || f.type === 'image/tiff';
  const isHeic = (f) => /\.hei[cf]$/i.test(f.name || '') || /image\/hei[cf]/.test(f.type || '');
  const isProj = (f) => /\.metricmod$/i.test(f.name || '');
  const isImg = (f) => f && (/^image\//.test(f.type) || /\.(jpe?g|png|webp|bmp|gif|avif|tiff?|hei[cf])$/i.test(f.name || ''));
  const newPhoto = (name, file, src, cal, gray) => ({ uid: Math.random().toString(36).slice(2), file, src: src || null, gray: gray || null, name, canvas: null, orig: null, objs: [], seq: { area: 0, length: 0, lw: 0, count: 0, colony: 0 }, undo: [], redo: [], view: null,
    scale: cal ? { ppu: cal.ppu, unit: cal.unit, known: null, line: null, fromFile: cal.source } : null });
  const canvasFromRGBA = (W, H, rgba) => { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').putImageData(new ImageData(rgba, W, H), 0, 0); return c; };
  async function addFiles(list) {
    const all = [...list], proj = all.find(isProj);
    if (proj) { openProject(proj); return; }
    const files = all.filter(isImg).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt', { numeric: true }));
    const skipped = all.length - files.length;
    if (!files.length) { toast('Nenhuma imagem que o MetricMod consiga abrir. Use JPG, PNG, TIFF, WebP, BMP ou HEIC (no Safari).'); return; }
    const start = S.photos.length; busy(true);
    for (const f of files) {
      if (isTiff(f)) {
        try {
          const r = await MM.decodeTIFF(await f.arrayBuffer(), 50);
          r.pages.forEach((pg, k) => S.photos.push(newPhoto(r.pages.length > 1 ? `${f.name} (página ${k + 1})` : f.name, null, canvasFromRGBA(pg.W, pg.H, pg.rgba), pg.cal, pg.gray)));
          if (r.total > r.pages.length) toast(`${f.name} tem ${r.total} páginas; abri as ${r.pages.length} primeiras.`);
          else if (r.pages.some((pg) => pg.bits > 8)) toast(`${f.name} tem ${r.pages[0].bits} bits: a imagem é mostrada com o contraste ajustado do mínimo ao máximo, como no ImageJ.`);
        } catch (e) { toast(`Não consegui abrir ${f.name}: ${e.message}.`); }
      } else S.photos.push(newPhoto(f.name || `imagem colada ${S.photos.length + 1}`, f));
    }
    busy(false);
    if (S.photos.length === start) return;
    openPhoto(start); scheduleSave(true);
    const added = S.photos.length - start;
    if (added > 1) toast(`${added} fotos abertas. Use as setas no topo (ou PageUp/PageDown) para passar de uma para outra.`);
    else if (skipped) toast(`${skipped} arquivo(s) ignorado(s): não são imagens.`);
  }
  function stash() { // guarda o estado da foto atual
    const p = S.photos[S.cur]; if (!p) return;
    Object.assign(p, { objs: S.objs, seq: S.seq, undo: S.undo, redo: S.redo, view: { ...S.view }, scale: S.scale });
  }
  // Lê a foto sem conversão de perfil de cor (valores do arquivo, como o ImageJ); a rotação EXIF do celular é aplicada.
  async function decodeRaw(file) {
    if (!window.createImageBitmap) return null;
    try {
      const bm = await createImageBitmap(file, { colorSpaceConversion: 'none', imageOrientation: 'from-image', premultiplyAlpha: 'none' });
      const c = document.createElement('canvas'); c.width = bm.width; c.height = bm.height; c.getContext('2d').drawImage(bm, 0, 0); bm.close && bm.close(); return c;
    } catch { return null; }
  }
  function decode(p) {
    return new Promise(async (res, rej) => {
      if (p.canvas) return res(p.canvas);
      if (p.src) return res(p.src);
      const raw = await decodeRaw(p.file); if (raw) return res(raw);
      const url = URL.createObjectURL(p.file), img = new Image();
      img.onload = () => { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img, 0, 0); URL.revokeObjectURL(url); res(c); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img')); };
      img.src = url;
    });
  }
  async function openPhoto(i) {
    if (i < 0 || i >= S.photos.length) return;
    stash(); const p = S.photos[i]; busy(true);
    let c; try { c = await decode(p); } catch {
      busy(false);
      toast(isHeic(p.file || {}) ? 'Este navegador não abre fotos HEIC. Abra no Safari, converta para JPG, ou no iPhone use Ajustes > Câmera > Formatos > "Mais compatível".' : `Não foi possível abrir ${p.name}.`);
      return;
    }
    S.cur = i; S.name = p.name; S.objs = p.objs; S.seq = p.seq; S.undo = p.undo; S.redo = p.redo; S.sel = null; S.raw = p.gray || null;
    for (const o of S.objs) if (!o.photoUid) o.photoUid = p.uid;
    S.scale = p.scale || (S.lastScale ? { ...S.lastScale, line: null, inherited: true } : null);
    setImage(c, p.view); busy(false);
    if (!S.scale) document.querySelector('[data-tool=scale]').classList.add('pulse');
    else if (p.scale && p.scale.fromFile && !p.scaleNoted) { p.scaleNoted = true; toast(`Escala lida do arquivo (${p.scale.fromFile}): 1 ${p.scale.unit} = ${nf(p.scale.ppu, 3)} px.`); }
    else if (S.scale.inherited && !p.scale) toast(`Usando a escala da foto anterior (1 ${S.scale.unit} = ${nf(S.scale.ppu, 2)} px). Defina de novo se esta foto foi tirada de outra distância.`);
    renderPhotoNav();
  }
  function setImage(c, view) {
    const g = c.getContext('2d', { willReadFrequently: true });
    Object.assign(S, { img: c, imgCanvas: c, W: c.width, H: c.height, rgba: g.getImageData(0, 0, c.width, c.height).data, det: null, grad: null, blur: null, ana: null, disp: null, covBase: null, covPoly: null, covResult: null });
    const ph = S.photos[S.cur]; S.raw = ph && ph.gray && ph.gray.length === S.W * S.H ? ph.gray : null;
    S.minArea = Math.max(10, Math.round(S.W * S.H * 0.0002));
    $('empty').style.display = 'none'; document.querySelectorAll('.tool').forEach((b) => b.disabled = false);
    updUndo(); setTool(null); if (view) { S.view = { ...view }; render(); } else fit(); refreshAll();
  }
  function renderPhotoNav() {
    const nav = $('photoNav'); nav.hidden = S.photos.length < 2; if (nav.hidden) return;
    if (S.cmp && (S.cmp.idx === S.cur || !S.photos[S.cmp.idx])) S.cmp = null;
    $('btnCmp').classList.toggle('on', !!S.cmp); $('cmpSel').hidden = !S.cmp;
    if (S.cmp) $('cmpSel').innerHTML = S.photos.map((p, i) => i === S.cur ? '' : `<option value="${i}" ${i === S.cmp.idx ? 'selected' : ''}>comparar com: ${esc(p.name)}</option>`).join('');
    $('photoSel').innerHTML = S.photos.map((p, i) => { const n = (i === S.cur ? S.objs : p.objs).length; return `<option value="${i}" ${i === S.cur ? 'selected' : ''}>${i + 1}/${S.photos.length}  ${esc(p.name)}${n ? `  (${n})` : ''}</option>`; }).join('');
    $('photoPrev').disabled = S.cur <= 0; $('photoNext').disabled = S.cur >= S.photos.length - 1;
  }
  $('photoSel').onchange = (e) => openPhoto(+e.target.value);
  $('photoPrev').onclick = () => openPhoto(S.cur - 1); $('photoNext').onclick = () => openPhoto(S.cur + 1);
  const loadFile = (f) => addFiles([f]);
  $('btnOpen').onclick = $('btnOpen2').onclick = () => $('file').click();
  $('file').onchange = (e) => { addFiles(e.target.files); e.target.value = ''; };
  $('folder').onchange = (e) => { addFiles(e.target.files); e.target.value = ''; };
  $('btnFolder').onclick = $('btnFolder2').onclick = () => $('folder').click();
  $('scaleChip').onclick = () => setTool('scale');
  $('dispUnit').onchange = (e) => { S.dispUnit = e.target.value; refreshAll(); };
  $('btnUndo').onclick = undo; $('btnRedo').onclick = redo;
  $('btnZoomIn').onclick = () => zoomAt(1.25); $('btnZoomOut').onclick = () => zoomAt(0.8); $('btnFit').onclick = fit;
  ['dragenter', 'dragover'].forEach((t) => wrap.addEventListener(t, (e) => { e.preventDefault(); $('empty').classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((t) => wrap.addEventListener(t, (e) => { e.preventDefault(); $('empty').classList.remove('drag'); }));
  wrap.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));
  document.addEventListener('paste', (e) => { const it = [...e.clipboardData.items].find((i) => i.type.startsWith('image/')); if (it) loadFile(it.getAsFile()); });
  new ResizeObserver(() => render()).observe(wrap);

  /* ---------- painel de aparência ---------- */
  const look = $('lookPanel'), lb = $('btnLook');
  const syncLook = () => {
    const st = S.style;
    $('lkWidth').value = st.width; $('lkWidthV').textContent = nf(st.width, st.width % 1 ? 1 : 0) + ' px';
    $('lkSize').value = st.size; $('lkSizeV').textContent = st.size + ' px';
    $('lkLegend').value = st.legend; $('lkTags').checked = st.tags; $('lkStamp').checked = st.stamp !== false;
    $('lkSbar').checked = !!st.sbar; $('lkSbarPos').value = st.sbarPos || 'br'; $('lkSbarColor').value = st.sbarColor || 'auto'; $('lkSbarLen').value = st.sbarLen || '';
    $('lkSbarThick').value = st.sbarThick || 1; $('lkSbarText').checked = st.sbarText !== false; $('lkSbarUnit').textContent = S.scale ? unit() : '(defina a escala)';
    $('lkSbarOpts').hidden = !st.sbar; $('lkTagsRow').hidden = st.legend === 'line';
    $('lkDash').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === st.dash));
    const o = selObj();
    $('lkColors').innerHTML = o ? COLORS.concat(['#ffffff', '#ffe600']).map((c) => `<button class="swb ${o.color === c ? 'on' : ''}" data-c="${c}" style="background:${c}" title="${c}"></button>`).join('') + `<input type="color" id="lkCustom" value="${o.color}" title="Outra cor">` : '<em>Selecione uma medição na imagem ou na tabela.</em>';
    $('lkColors').querySelectorAll('[data-c]').forEach((b) => b.onclick = () => setColor(b.dataset.c));
    if ($('lkCustom')) $('lkCustom').oninput = (e) => setColor(e.target.value);
  };
  const setColor = (c) => { const o = selObj(); if (!o) return; pushUndo(); o.color = c; refreshAll(); };
  const setStyle = (k2, v) => { S.style[k2] = v; saveStyle(); syncLook(); render(); };
  lb.onclick = () => { look.hidden = !look.hidden; lb.setAttribute('aria-expanded', String(!look.hidden)); if (!look.hidden) syncLook(); };
  document.addEventListener('pointerdown', (e) => { if (!look.hidden && !$('lookWrap').contains(e.target)) { look.hidden = true; lb.setAttribute('aria-expanded', 'false'); } });
  $('lkWidth').oninput = (e) => setStyle('width', +e.target.value);
  $('lkSize').oninput = (e) => setStyle('size', +e.target.value);
  $('lkLegend').onchange = (e) => setStyle('legend', e.target.value);
  $('lkTags').onchange = (e) => setStyle('tags', e.target.checked);
  $('lkStamp').onchange = (e) => setStyle('stamp', e.target.checked);
  $('lkSbar').onchange = (e) => setStyle('sbar', e.target.checked);
  $('lkSbarPos').onchange = (e) => setStyle('sbarPos', e.target.value);
  $('lkSbarColor').onchange = (e) => setStyle('sbarColor', e.target.value);
  $('lkSbarLen').onchange = (e) => setStyle('sbarLen', Math.max(0, parseFloat(String(e.target.value).replace(',', '.')) || 0));
  $('lkSbarThick').oninput = (e) => setStyle('sbarThick', +e.target.value);
  $('lkSbarText').onchange = (e) => setStyle('sbarText', e.target.checked);
  $('measureInt').onchange = (e) => { S.measureInt = e.target.checked; if (!S.measureInt && S.role === 'fundo') S.role = ''; refreshAll(); };
  $('btnCmp').onclick = () => { if (S.cmp) { S.cmp = null; renderPhotoNav(); render(); return; } openCompare(S.cur + 1 < S.photos.length ? S.cur + 1 : S.cur - 1); };
  $('cmpSel').onchange = (e) => openCompare(+e.target.value);
  async function openCompare(i) {
    const p = S.photos[i]; if (!p || i === S.cur) return;
    try { const c = await decode(p); S.cmp = { idx: i, canvas: c, name: p.name, split: S.cmp ? S.cmp.split : 0.5 }; } catch { toast('Não foi possível abrir essa foto para comparar.'); }
    renderPhotoNav(); render();
  }
  $('lkDash').querySelectorAll('button').forEach((b) => b.onclick = () => setStyle('dash', b.dataset.v));

  /* ---------- projeto: salvar, abrir e salvamento automático ---------- */
  // Formato .metricmod: "MMPROJ1\n" + tamanho do cabeçalho (uint32) + cabeçalho JSON + imagens em sequência.
  const rle = (m) => { const r = []; let cur = 0, n = 0; for (let i = 0; i < m.data.length; i++) { const v = m.data[i] ? 1 : 0; if (v === cur) n++; else { r.push(n); cur = v; n = 1; } } r.push(n); return { x: m.x, y: m.y, w: m.w, h: m.h, rle: r }; };
  const unrle = (o) => { const m = MM.newMask(o.x, o.y, o.w, o.h); let p2 = 0, v = 0; for (const n of o.rle) { if (v) m.data.fill(1, p2, p2 + n); p2 += n; v ^= 1; } return m; };
  const serObj = (o) => { const c = cloneObj(o); if (c.mask) c.mask = rle(c.mask); delete c.edited; return c; };
  const deserObj = (o) => { if (o.mask) o.mask = unrle(o.mask); if (o.id >= idSeq) idSeq = o.id + 1; return o; };
  const canvasBlob = (c) => new Promise((r) => c.toBlob(r, 'image/png'));
  async function photoBlob(p) {
    if (p.canvas) return canvasBlob(p.canvas);      // foto corrigida
    if (p.src) return canvasBlob(p.src);            // TIFF já decodificado
    return p.file;
  }
  function projectHeader() {
    stash();
    return { app: 'MetricMod', version: 1, appVersion: APP_VERSION, saved: new Date().toISOString(), cur: S.cur, group: S.group, groups: S.groups, dispUnit: S.dispUnit, lastScale: S.lastScale, style: S.style,
      measureInt: S.measureInt, protocolId: S.protocol ? S.protocol.id : null,
      photos: S.photos.map((p) => ({ uid: p.uid, name: p.name, corrected: !!(p.canvas || p.orig), scale: p.scale, view: p.view, seq: p.seq, objs: p.objs.map(serObj) })) };
  }
  async function buildProject() {
    const head = projectHeader(), blobs = [];
    for (let i = 0; i < S.photos.length; i++) {
      const p = S.photos[i], b = await photoBlob(p); head.photos[i].type = b.type || 'image/png'; head.photos[i].size = b.size; blobs.push(b);
      if (p.gray) { const gb = new Blob([p.gray.buffer]); head.photos[i].graySize = gb.size; blobs.push(gb); }
    }
    const hj = new TextEncoder().encode(JSON.stringify(head)), len = new Uint8Array(4); new DataView(len.buffer).setUint32(0, hj.length, true);
    return new Blob([new TextEncoder().encode('MMPROJ1\n'), len, hj, ...blobs], { type: 'application/octet-stream' });
  }
  function restoreProject(head, imageBlobs) {
    S.photos = head.photos.map((h, i) => { const p = newPhoto(h.name, imageBlobs[i], null, null, h.gray || null); return Object.assign(p, { uid: h.uid || p.uid, scale: h.scale, view: h.view, seq: h.seq, objs: h.objs.map(deserObj), orig: null, corrected: !!h.corrected }); });
    Object.assign(S, { cur: -1, group: head.group || '', groups: head.groups || [], dispUnit: head.dispUnit, lastScale: head.lastScale, measureInt: !!head.measureInt });
    if (head.style) { Object.assign(S.style, head.style); saveStyle(); }
    if (S.photos.length) openPhoto(Math.max(0, Math.min(S.photos.length - 1, head.cur || 0)));
  }
  async function readProject(file) {
    const buf = await file.arrayBuffer(), dv = new DataView(buf);
    if (new TextDecoder().decode(new Uint8Array(buf, 0, 8)) !== 'MMPROJ1\n') throw new Error('arquivo não é um projeto do MetricMod');
    const hl = dv.getUint32(8, true), head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 12, hl)));
    let off = 12 + hl; const blobs = head.photos.map((h) => { const b = new Blob([buf.slice(off, off + h.size)], { type: h.type }); off += h.size; if (h.graySize) { h.gray = new Float32Array(buf.slice(off, off + h.graySize)); off += h.graySize; } return b; });
    return { head, blobs };
  }
  async function openProject(file) {
    if (S.photos.some((p) => p.objs.length) && !confirm('Abrir o projeto substitui as fotos e medições abertas agora. Continuar?')) return;
    busy(true);
    try {
      const { head, blobs } = await readProject(file); restoreProject(head, blobs);
      toast(head.appVersion && head.appVersion !== APP_VERSION ? `Projeto aberto: ${head.photos.length} foto(s). Ele foi medido na versão ${head.appVersion}; você está usando a ${APP_VERSION}. Medições novas podem ter pequenas diferenças (veja Novidades).` : `Projeto aberto: ${head.photos.length} foto(s).`);
      scheduleSave(true);
    }
    catch (e) { toast(`Não consegui abrir o projeto: ${e.message}.`); }
    busy(false);
  }
  async function saveProject() {
    if (!S.photos.length) { toast('Abra pelo menos uma foto antes de salvar o projeto.'); return; }
    busy(true);
    try {
      const blob = await buildProject(), name = `projeto-metricmod-${new Date().toISOString().slice(0, 10)}.metricmod`;
      if (window.showSaveFilePicker) {
        try {
          const h = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: 'Projeto MetricMod', accept: { 'application/octet-stream': ['.metricmod'] } }] });
          const w = await h.createWritable(); await w.write(blob); await w.close(); toast('Projeto salvo.'); busy(false); return;
        } catch (e) { if (e.name === 'AbortError') { busy(false); return; } }
      }
      download(blob, name); toast('Projeto salvo na pasta de downloads. Para continuar depois, abra esse arquivo no MetricMod.');
    } catch (e) { toast(`Não consegui salvar o projeto: ${e.message}.`); }
    busy(false);
  }
  $('btnSave').onclick = saveProject;

  // salvamento automático no navegador (IndexedDB): imagens uma vez, medições a cada mudança
  const DB = { db: null };
  const idb = () => DB.db || (DB.db = new Promise((res, rej) => { try { const r = indexedDB.open('metricmod', 1); r.onupgradeneeded = () => { r.result.createObjectStore('images'); r.result.createObjectStore('state'); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } }));
  const tx = async (store, mode, fn) => { const db = await idb(); return new Promise((res, rej) => { const t = db.transaction(store, mode), st = t.objectStore(store), r = fn(st); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); }); };
  let saveT = null, saving = false;
  function scheduleSave(soon) { clearTimeout(saveT); saveT = setTimeout(autoSave, soon ? 600 : 2500); }
  async function autoSave() {
    if (saving || !S.photos.length) return; saving = true;
    try {
      for (const p of S.photos) if (!p.storedImg || p.imgDirty) {
        const b = await photoBlob(p); if (b) await tx('images', 'readwrite', (st) => st.put(b, p.uid));
        await tx('images', 'readwrite', (st) => p.gray ? st.put(new Blob([p.gray.buffer]), p.uid + ':g') : st.delete(p.uid + ':g'));
        p.storedImg = true; p.imgDirty = false;
      }
      const head = projectHeader();
      await tx('state', 'readwrite', (st) => st.put(JSON.stringify(head), 'current'));
    } catch (e) { /* armazenamento indisponível ou cheio: o botão Salvar projeto continua funcionando */ }
    saving = false;
  }
  async function clearAutoSave() { try { await tx('state', 'readwrite', (st) => st.clear()); await tx('images', 'readwrite', (st) => st.clear()); } catch (e) { /* ignora */ } }
  async function checkAutoSave() {
    try {
      const raw = await tx('state', 'readonly', (st) => st.get('current')); if (!raw) return;
      const head = JSON.parse(raw); if (!head.photos || !head.photos.length) return;
      const when = new Date(head.saved), n = head.photos.length, nm = head.photos.reduce((a, p) => a + p.objs.length, 0);
      const box = $('resume'); box.hidden = false;
      $('resumeTxt').textContent = `${n} foto${n > 1 ? 's' : ''} e ${nm} ${nm === 1 ? 'medição' : 'medições'}, salvo em ${when.toLocaleDateString('pt-BR')} às ${when.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`;
      $('btnResume').onclick = async () => {
        busy(true);
        const blobs = []; for (const h of head.photos) { blobs.push(await tx('images', 'readonly', (st) => st.get(h.uid))); const gb = await tx('images', 'readonly', (st) => st.get(h.uid + ':g')); if (gb) h.gray = new Float32Array(await gb.arrayBuffer()); }
        if (blobs.some((b) => !b)) { busy(false); toast('Parte das imagens salvas não foi encontrada.'); return; }
        restoreProject(head, blobs); S.photos.forEach((p) => { p.storedImg = true; }); box.hidden = true; busy(false);
      };
      $('btnDiscard').onclick = async () => { await clearAutoSave(); box.hidden = true; toast('Trabalho anterior descartado.'); };
    } catch (e) { /* sem IndexedDB */ }
  }
  checkAutoSave();
  /* ---------- protocolos ---------- */
  const PKEY = 'metricmod.protocols';
  const myProtocols = () => { try { return JSON.parse(localStorage.getItem(PKEY) || '[]'); } catch { return []; } };
  const saveMine = (list) => { try { localStorage.setItem(PKEY, JSON.stringify(list)); return true; } catch { toast('Não foi possível salvar neste navegador (armazenamento cheio ou bloqueado). Exporte o protocolo como arquivo.'); return false; } };
  const toolName = (id) => (TOOLS.find((t) => t.id === id) || {}).name || id;
  function applyProtocol(P) {
    if (!S.img) { toast('Abra uma foto antes de usar um protocolo.'); return; }
    const c = P.config || {};
    for (const key of ['sens', 'split', 'refine', 'fill', 'excl', 'flat', 'measureInt', 'covMode', 'covRoi', 'covSens', 'bandDark']) if (c[key] !== undefined) S[key] = c[key];
    if (c.prefMode) S.prefMode = c.prefMode;
    S.role = c.role || '';
    if (P.scale) { S.scale = { ...P.scale, line: null, fromProtocol: true }; S.lastScale = { ...S.scale }; }
    if (P.unit) S.dispUnit = P.unit;
    if (P.group) { S.group = P.group; if (!S.groups.includes(P.group)) S.groups.push(P.group); }
    resetAna(); S.protocol = P; S.protoOpen = true; $('protoPanel').hidden = true;
    setTool(P.ferramenta || null); refreshAll();
    toast(`Protocolo "${P.nome}" aplicado.${P.scale ? ' A escala do protocolo foi usada.' : ''}`);
  }
  function renderProtoPanel(edit) {
    const body = $('protoBody'), mine = myProtocols();
    if (edit) { // formulário
      const P = edit === 'new' ? { nome: '', descricao: '', ferramenta: S.tool && TOOLS.some((t) => t.id === S.tool) ? S.tool : 'detect', passos: [] } : edit;
      const opts = TOOLS.filter((t) => t.id && !['select', 'edit'].includes(t.id)).map((t) => `<option value="${t.id}" ${t.id === P.ferramenta ? 'selected' : ''}>${esc(t.name)}</option>`).join('');
      const col = selObj() && selObj().kind === 'colony' ? selObj() : null;
      body.innerHTML = `<h3>${edit === 'new' ? 'Criar protocolo' : 'Editar protocolo'}</h3>
        <label class="fld">Nome<input id="pfNome" value="${esc(P.nome)}" placeholder="Ex.: Feijão — lab. de sementes"></label>
        <label class="fld">Para que serve<input id="pfDesc" value="${esc(P.descricao || '')}" placeholder="Uma frase"></label>
        <label class="fld">Ferramenta que abre<select id="pfTool">${opts}</select></label>
        <label class="fld">Passos (um por linha)<textarea id="pfPassos" rows="5" placeholder="Ex.: Fotografe a 30 cm com a régua ao lado">${esc((P.passos || []).join('\n'))}</textarea></label>
        <label class="chk"><input type="checkbox" id="pfCfg" ${edit === 'new' ? 'checked' : ''}> ${edit === 'new' ? 'Guardar os ajustes atuais' : 'Substituir os ajustes guardados pelos atuais'} (sensibilidade, separar encostados, iluminação, intensidade, cobertura, modo de área)</label>
        <label class="chk"><input type="checkbox" id="pfScale" ${P.scale ? 'checked' : ''} ${S.scale ? '' : 'disabled'}> Guardar a escala atual ${S.scale ? `(1 ${S.scale.unit} = ${nf(S.scale.ppu, 2)} px), para fotos tiradas sempre do mesmo jeito` : '(defina a escala antes)'}</label>
        <label class="chk"><input type="checkbox" id="pfModels" ${P.models ? 'checked' : ''} ${col || P.models ? '' : 'disabled'}> Guardar os exemplos de colônias ${col ? `(${col.models.length} da contagem selecionada)` : P.models ? '' : '(selecione uma contagem de colônias antes)'}</label>
        <label class="fld">Grupo padrão (opcional)<input id="pfGroup" value="${esc(P.group || '')}"></label>
        <div class="row"><button class="pbtn" id="pfSave">Salvar protocolo</button><button class="gbtn" id="pfCancel">Cancelar</button></div>
        <p class="ref">Fica salvo neste aparelho, nesta cópia do MetricMod. Para usar em outro aparelho ou passar a colegas, use Exportar.</p>`;
      $('pfCancel').onclick = () => renderProtoPanel();
      $('pfSave').onclick = () => {
        const nome = $('pfNome').value.trim(); if (!nome) { toast('Dê um nome ao protocolo.'); return; }
        const Q = { id: edit !== 'new' && edit.id && !edit.builtin ? edit.id : 'p' + Date.now().toString(36), nome, descricao: $('pfDesc').value.trim(), ferramenta: $('pfTool').value,
          passos: $('pfPassos').value.split('\n').map((x) => x.trim()).filter(Boolean), versao: APP_VERSION, criado: new Date().toISOString() };
        Q.config = $('pfCfg').checked ? captureConfig() : (edit !== 'new' && edit.config ? edit.config : {});
        if ($('pfScale').checked) Q.scale = S.scale ? { ppu: S.scale.ppu, unit: S.scale.unit, known: S.scale.known } : edit.scale;
        if ($('pfModels').checked) Q.models = col ? col.models.map((m) => ({ ...m, outline: undefined })) : edit.models;
        const gp = $('pfGroup').value.trim(); if (gp) Q.group = gp;
        if (S.dispUnit) Q.unit = S.dispUnit;
        const list = myProtocols().filter((x) => x.id !== Q.id); list.push(Q);
        if (saveMine(list)) { toast(`Protocolo "${nome}" salvo.`); renderProtoPanel(); }
      };
      return;
    }
    const card = (P, isMine) => `<div class="pcard"><div><b>${esc(P.nome)}</b><span>${esc(toolName(P.ferramenta))}${P.scale ? ' · com escala' : ''}${P.models ? ' · com exemplos' : ''}</span><p>${esc(P.descricao || '')}</p></div>
      <div class="pbtns"><button class="pbtn" data-use="${esc(P.id)}" data-mine="${isMine ? 1 : 0}">Usar</button>${isMine ? `<button class="gbtn" data-edit="${esc(P.id)}">Editar</button><button class="gbtn" data-exp="${esc(P.id)}">Exportar</button><button class="gbtn" data-delp="${esc(P.id)}">Excluir</button>` : `<button class="gbtn" data-dup="${esc(P.id)}" title="Cria uma cópia sua para editar">Duplicar</button>`}</div></div>`;
    body.innerHTML = `<p>Um protocolo abre a ferramenta certa já configurada e mostra os passos. Use um pronto ou crie o seu.</p>
      <div class="row"><button class="pbtn" id="pNew">Criar protocolo</button><button class="gbtn" id="pImp">Importar arquivo</button></div>
      <h3>Meus protocolos</h3>${mine.length ? mine.map((P) => card(P, true)).join('') : '<p class="ref">Nenhum ainda. Ajuste uma ferramenta do jeito que o seu laboratório usa e clique em Criar protocolo: os ajustes atuais são guardados.</p>'}
      <h3>Prontos</h3>${(window.MM_PROTOCOLS || []).map((P) => card(P, false)).join('')}`;
    $('pNew').onclick = () => renderProtoPanel('new');
    $('pImp').onclick = () => $('protoFile').click();
    const find = (id, m) => (m === '1' || m === true ? myProtocols() : window.MM_PROTOCOLS).find((x) => x.id === id);
    body.querySelectorAll('[data-use]').forEach((b) => b.onclick = () => applyProtocol(find(b.dataset.use, b.dataset.mine)));
    body.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => renderProtoPanel(find(b.dataset.edit, true)));
    body.querySelectorAll('[data-dup]').forEach((b) => b.onclick = () => { const P = find(b.dataset.dup, false); renderProtoPanel({ ...JSON.parse(JSON.stringify(P)), id: null, builtin: true, nome: P.nome + ' (minha versão)' }); });
    body.querySelectorAll('[data-delp]').forEach((b) => b.onclick = () => { const P = find(b.dataset.delp, true); if (confirm(`Excluir o protocolo "${P.nome}" deste aparelho?`)) { saveMine(myProtocols().filter((x) => x.id !== P.id)); renderProtoPanel(); } });
    body.querySelectorAll('[data-exp]').forEach((b) => b.onclick = () => { const P = find(b.dataset.exp, true); download(new Blob([JSON.stringify({ app: 'MetricMod', tipo: 'protocolo', versao: APP_VERSION, protocolo: P }, null, 1)], { type: 'application/json' }), `${P.nome.replace(/[^\wÀ-ÿ -]/g, '').trim() || 'protocolo'}.metricmod-protocolo.json`); });
  }
  function captureConfig() {
    const c = { sens: S.sens, split: !!S.split, refine: S.refine, fill: S.fill, excl: S.excl, flat: !!S.flat, measureInt: !!S.measureInt, covMode: S.covMode, covRoi: S.covRoi, covSens: S.covSens, prefMode: S.prefMode, role: S.role || '', bandDark: S.bandDark };
    const o = selObj(); if (o && o.kind === 'colony') c.colParams = { ...o.params };
    return c;
  }
  $('btnProto').onclick = () => { $('protoPanel').hidden = false; renderProtoPanel(); };
  $('protoClose').onclick = () => { $('protoPanel').hidden = true; };
  $('protoFile').onchange = async (e) => {
    const f2 = e.target.files[0]; e.target.value = ''; if (!f2) return;
    try {
      const j = JSON.parse(await f2.text()), P = j.protocolo || j; if (!P.nome || !P.ferramenta) throw new Error('arquivo não é um protocolo do MetricMod');
      P.id = 'p' + Date.now().toString(36); const list = myProtocols(); list.push(P);
      if (saveMine(list)) { toast(`Protocolo "${P.nome}" importado.`); renderProtoPanel(); }
    } catch (err) { toast(`Não consegui importar: ${err.message}.`); }
  };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('protoPanel').hidden) { $('protoPanel').hidden = true; e.stopImmediatePropagation(); } }, true);

  /* ---------- painel Métodos e citação ---------- */
  const MESES = ['jan.', 'fev.', 'mar.', 'abr.', 'maio', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
  function citations() {
    const d = new Date(), ano = '__YEAR__', acesso = `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
    return {
      abnt: `METRICMOD. <i>MetricMod</i>: medição de imagens científicas. Versão ${APP_VERSION}. [<i>S. l.</i>]: MetricMod, ${ano}. Programa de computador. Disponível em: ${AB.url}. Acesso em: ${acesso}.`,
      apa: `MetricMod. (${ano}). <i>MetricMod: Medição de imagens científicas</i> (Versão ${APP_VERSION}) [Software]. ${AB.url}`,
      metodo: `As medições foram feitas no MetricMod, versão ${APP_VERSION} (${AB.url}). A escala espacial foi definida por um objeto de medida conhecida presente em cada foto. [Descreva aqui as medidas usadas, por exemplo: a área foliar foi obtida pela detecção automática do contorno; o comprimento e a largura, pelos diâmetros de Feret máximo e mínimo.]`,
    };
  }
  function renderAbout(tab) {
    const b = $('aboutBody'); $('aboutVer').textContent = `versão ${APP_VERSION}`;
    document.querySelectorAll('#aboutTabs button').forEach((x) => x.classList.toggle('on', x.dataset.t === tab));
    const notice = `<div class="notice">${AB.notice}</div>`;
    if (tab === 'metodos') b.innerHTML = notice + '<p>Como cada medida é calculada. Use estas descrições e referências na metodologia do seu trabalho.</p>' +
      AB.methods.map((m) => `<h3>${m.t}</h3><p>${m.d}</p>${m.ij ? `<p class="ij">${m.ij}</p>` : ''}${m.r ? `<p class="ref">Referência: ${m.r}</p>` : ''}`).join('');
    else if (tab === 'validacao') b.innerHTML = `<p>${AB.validationNote}</p><table><thead><tr><th>Teste</th><th>Valor de referência</th><th>MetricMod</th><th>Diferença</th></tr></thead><tbody>` +
      AB.validation.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('') + '</tbody></table>';
    else if (tab === 'citar') {
      const c = citations();
      b.innerHTML = '<p>Cite a versão que você usou: ela aparece aqui, no topo do app, na planilha exportada e no projeto salvo.</p>' +
        [['ABNT', 'abnt'], ['APA', 'apa'], ['Texto para a metodologia', 'metodo']].map(([t, k]) => `<h3>${t}</h3><div class="cite" id="cite-${k}">${c[k]}</div><div class="row"><button class="gbtn" data-copy="${k}">Copiar</button></div>`).join('') +
        '<p class="ref">Na referência ABNT, a data de acesso é a de hoje. Ajuste se a análise foi feita em outro dia.</p>';
      b.querySelectorAll('[data-copy]').forEach((x) => x.onclick = async () => {
        const t = $('cite-' + x.dataset.copy).innerText;
        try { await navigator.clipboard.writeText(t); } catch { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
        toast('Copiado.');
      });
    } else if (tab === 'novidades') b.innerHTML = '<div class="row"><button class="gbtn" id="tourAgain">Ver o tutorial de novo</button></div><p>O que mudou em cada versão.</p>' + AB.changelog.map(([v, t]) => `<h3>Versão ${v}${APP_VERSION.startsWith(v) ? ' (atual)' : ''}</h3><p>${t}</p>`).join('');
    else b.innerHTML = notice + AB.credits.map((t) => `<p>${t}</p>`).join('');
    b.scrollTop = 0;
    if ($('tourAgain')) $('tourAgain').onclick = () => { $('about').hidden = true; startTour(); };
  }
  const openAbout = (tab) => { $('about').hidden = false; renderAbout(tab || 'metodos'); };
  $('btnAbout').onclick = () => openAbout('metodos');
  $('verBadge').onclick = (e) => { e.stopPropagation(); openAbout('novidades'); };
  $('aboutClose').onclick = () => { $('about').hidden = true; };
  document.querySelectorAll('#aboutTabs button').forEach((x) => x.onclick = () => renderAbout(x.dataset.t));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('about').hidden) { $('about').hidden = true; e.stopImmediatePropagation(); } }, true);

  /* ---------- fotos de exemplo e tutorial de primeiro uso ---------- */
  $('btnExamples').onclick = async () => {
    const files = await Promise.all((window.MM_EXAMPLES || []).map(async (e) => new File([await (await fetch(e.data)).blob()], e.name, { type: e.data.slice(5, e.data.indexOf(';')) })));
    await addFiles(files); toast('Fotos de exemplo abertas: sementes e folha (régua de 10 cm), placa de colônias, cicatrização (0 h e 24 h) e gel. Passe de uma para outra pelas setas no topo.');
  };
  const TOUR = [
    ['#btnOpen', 'Abra suas fotos', 'Uma ou várias de uma vez, uma pasta inteira, TIFF de microscópio ou um projeto salvo. Para experimentar, use as fotos de exemplo da tela inicial.'],
    ['#btnProto', 'Protocolos', 'Análises prontas, já configuradas e com os passos: sementes, colônias, cobertura, fluorescência, cicatrização, gel. Você também pode criar os seus.'],
    ['[data-tool=scale]', 'Escala primeiro', 'Trace uma linha sobre a régua (ou um objeto de medida conhecida) e informe o valor. Sem escala, os resultados saem em pixels.'],
    ['#tools', 'Ferramentas', 'Cada ferramenta mostra no topo da imagem o que fazer a cada passo. Esc cancela, Ctrl+Z desfaz.'],
    ['#results', 'Resultados', 'As medidas aparecem aqui, com média e desvio. Exporte para o Excel ou salve a imagem marcada.'],
    ['#btnAbout', 'Métodos e citação', 'Como cada medida é calculada, a validação e o texto pronto para citar no seu trabalho.'],
  ];
  let tourI = 0;
  function tourShow() {
    document.querySelectorAll('.tourHi').forEach((x) => x.classList.remove('tourHi'));
    if (tourI >= TOUR.length) { $('tour').hidden = true; try { localStorage.setItem('metricmod.tour', 'ok'); } catch { /* ignora */ } return; }
    const [sel, t, d] = TOUR[tourI], el = document.querySelector(sel), box = $('tourBox');
    $('tour').hidden = false; $('tourTxt').innerHTML = `<b>${t}</b>${d}`; $('tourStep').textContent = `${tourI + 1} de ${TOUR.length}`; $('tourNext').textContent = tourI === TOUR.length - 1 ? 'Começar' : 'Próximo';
    if (!el) { box.style.left = '50%'; box.style.top = '30%'; return; }
    el.classList.add('tourHi'); const r = el.getBoundingClientRect(), bw = Math.min(340, innerWidth - 24);
    let x = r.right + 14, y = r.top; if (x + bw > innerWidth - 12) { x = Math.max(12, Math.min(innerWidth - bw - 12, r.left)); y = r.bottom + 12; }
    if (y + 170 > innerHeight) y = Math.max(12, r.top - 180);
    box.style.left = x + 'px'; box.style.top = Math.max(12, y) + 'px';
  }
  $('tourNext').onclick = () => { tourI++; tourShow(); };
  $('tourSkip').onclick = () => { tourI = TOUR.length; tourShow(); };
  const startTour = () => { tourI = 0; tourShow(); };
  try { if (!localStorage.getItem('metricmod.tour') && !navigator.webdriver) setTimeout(startTour, 600); } catch { /* sem armazenamento */ }

  $('btnRes').onclick = () => document.body.classList.toggle('showRes');
  $('resClose').onclick = () => document.body.classList.remove('showRes');

  /* ---------- app instalável (quando aberto por um endereço https) ---------- */
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; $('btnInstall').hidden = false; });
  $('btnInstall').onclick = async () => { if (!installEvt) return; installEvt.prompt(); const r = await installEvt.userChoice; if (r.outcome === 'accepted') toast('MetricMod instalado. Ele abre pelo ícone, mesmo sem internet.'); installEvt = null; $('btnInstall').hidden = true; };
  window.addEventListener('appinstalled', () => { $('btnInstall').hidden = true; });
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && document.querySelector('link[rel=manifest]')) {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      const ask = (w) => { const b = $('updBar'); b.hidden = false; $('btnUpd').onclick = async () => { await autoSave(); w.postMessage('atualizar'); }; };
      if (reg.waiting && navigator.serviceWorker.controller) ask(reg.waiting);
      reg.addEventListener('updatefound', () => { const w = reg.installing; if (w) w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) ask(w); }); });
      setInterval(() => reg.update().catch(() => {}), 3600e3);
    }).catch(() => {});
    // recarrega só quando uma versão nova substitui a anterior (não na primeira visita)
    let reloading = false; const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloading && hadController) { reloading = true; location.reload(); } });
  }
  // abrir arquivos pelo sistema ("Abrir com > MetricMod") quando instalado no computador
  if ('launchQueue' in window) window.launchQueue.setConsumer(async (lp) => { if (lp.files && lp.files.length) addFiles(await Promise.all(lp.files.map((h) => h.getFile()))); });

  window.MetricMod = { S, loadFile, setTool, action }; // para testes
  refreshAll();
})();
