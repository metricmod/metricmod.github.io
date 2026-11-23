/* MetricMod — núcleo de cálculo.
   Algoritmos seguem as convenções do ImageJ 1.54 (domínio público):
   - pixel (x,y) ocupa o quadrado [x,x+1)×[y,y+1); polígono preenche pixels cujo centro está dentro (PolygonFiller)
   - contorno traçado pelas bordas dos pixels, 8-conectado (Wand.traceEdge)
   - perímetro traçado com correção de cantos (PolygonRoi.getTracedPerimeter)
   - Feret máximo/mínimo sobre o fecho convexo (Roi.getFeretValues)
   - limiar de Otsu (AutoThresholder.Otsu)
   Máscaras: {x, y, w, h, data: Uint8Array(w*h)} em coordenadas da imagem. */
(function (root) {
  'use strict';
  const MM = {};

  /* ---------- Máscaras ---------- */
  MM.newMask = (x, y, w, h) => ({ x, y, w, h, data: new Uint8Array(Math.max(0, w * h)) });

  MM.maskCount = (m) => { let n = 0; const d = m.data; for (let i = 0; i < d.length; i++) n += d[i] ? 1 : 0; return n; };

  // Garante que a máscara cubra o retângulo [x0,x1)×[y0,y1), limitado à imagem.
  MM.ensureBounds = (m, x0, y0, x1, y1, W, H) => {
    x0 = Math.max(0, Math.min(x0, m.x)); y0 = Math.max(0, Math.min(y0, m.y));
    x1 = Math.min(W, Math.max(x1, m.x + m.w)); y1 = Math.min(H, Math.max(y1, m.y + m.h));
    if (x0 === m.x && y0 === m.y && x1 === m.x + m.w && y1 === m.y + m.h) return m;
    const n = MM.newMask(x0, y0, x1 - x0, y1 - y0);
    for (let j = 0; j < m.h; j++) n.data.set(m.data.subarray(j * m.w, (j + 1) * m.w), (j + m.y - y0) * n.w + (m.x - x0));
    return n;
  };

  // Recorta a máscara ao menor retângulo com pixels ligados.
  MM.cropMask = (m) => {
    let x0 = m.w, y0 = m.h, x1 = -1, y1 = -1;
    for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) if (m.data[j * m.w + i]) {
      if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j;
    }
    if (x1 < 0) return MM.newMask(m.x, m.y, 0, 0);
    const n = MM.newMask(m.x + x0, m.y + y0, x1 - x0 + 1, y1 - y0 + 1);
    for (let j = 0; j < n.h; j++) n.data.set(m.data.subarray((j + y0) * m.w + x0, (j + y0) * m.w + x1 + 1), j * n.w);
    return n;
  };

  MM.cloneMask = (m) => ({ x: m.x, y: m.y, w: m.w, h: m.h, data: m.data.slice() });

  /* ---------- Rasterização de polígono (regra do centro do pixel) ---------- */
  MM.rasterPolygon = (pts, W, H) => {
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (const p of pts) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); }
    const x0 = Math.max(0, Math.floor(minx)), y0 = Math.max(0, Math.floor(miny));
    const x1 = Math.min(W, Math.ceil(maxx) + 1), y1 = Math.min(H, Math.ceil(maxy) + 1);
    const m = MM.newMask(x0, y0, Math.max(0, x1 - x0), Math.max(0, y1 - y0));
    const n = pts.length, xs = [];
    for (let y = y0; y < y1; y++) {
      const yc = y + 0.5; xs.length = 0;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi <= yc) !== (yj <= yc)) xs.push(xi + (yc - yi) * (xj - xi) / (yj - yi));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        // mesma regra de desempate do ImageJ (PolygonFiller): primeiro pixel = (int)(x + 0,5 + 1e-8)
        const a = Math.max(x0, Math.floor(xs[k] + 0.5 + 1e-8)), b = Math.min(x1, Math.floor(xs[k + 1] + 0.5 + 1e-8));
        for (let x = a; x < b; x++) m.data[(y - y0) * m.w + (x - x0)] = 1;
      }
    }
    return m;
  };

  // Combina 'src' em 'dst' (add=true liga, add=false apaga). Retorna nova máscara recortada.
  MM.combine = (dst, src, add, W, H) => {
    let m = add ? MM.ensureBounds(dst, src.x, src.y, src.x + src.w, src.y + src.h, W, H) : MM.cloneMask(dst);
    for (let j = 0; j < src.h; j++) {
      const yy = src.y + j - m.y; if (yy < 0 || yy >= m.h) continue;
      for (let i = 0; i < src.w; i++) {
        if (!src.data[j * src.w + i]) continue;
        const xx = src.x + i - m.x; if (xx < 0 || xx >= m.w) continue;
        m.data[yy * m.w + xx] = add ? 1 : 0;
      }
    }
    return MM.cropMask(m);
  };

  // Pincel: segmento grosso de (ax,ay) até (bx,by) com raio r.
  MM.strokeMask = (ax, ay, bx, by, r, W, H) => {
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - r)), y0 = Math.max(0, Math.floor(Math.min(ay, by) - r));
    const x1 = Math.min(W, Math.ceil(Math.max(ax, bx) + r) + 1), y1 = Math.min(H, Math.ceil(Math.max(ay, by) + r) + 1);
    const m = MM.newMask(x0, y0, Math.max(0, x1 - x0), Math.max(0, y1 - y0));
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy, r2 = r * r;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const px = x + 0.5, py = y + 0.5;
      let t = L2 ? ((px - ax) * dx + (py - ay) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t));
      const ex = px - (ax + t * dx), ey = py - (ay + t * dy);
      if (ex * ex + ey * ey <= r2) m.data[(y - y0) * m.w + (x - x0)] = 1;
    }
    return m;
  };

  /* ---------- Preenchimento de furos ---------- */
  MM.fillHoles = (m) => {
    const w = m.w + 2, h = m.h + 2, out = new Uint8Array(w * h), stack = [0];
    const inM = (i, j) => i >= 1 && j >= 1 && i <= m.w && j <= m.h && m.data[(j - 1) * m.w + (i - 1)];
    out[0] = 1;
    while (stack.length) {
      const p = stack.pop(), i = p % w, j = (p / w) | 0;
      const nb = [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]];
      for (const [a, b] of nb) {
        if (a < 0 || b < 0 || a >= w || b >= h) continue;
        const q = b * w + a; if (out[q] || inM(a, b)) continue;
        out[q] = 1; stack.push(q);
      }
    }
    const n = MM.cloneMask(m);
    for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) if (!out[(j + 1) * w + i + 1]) n.data[j * m.w + i] = 1;
    return n;
  };

  /* ---------- Componentes conectados (8-conectado) ---------- */
  MM.label = (bin, w, h) => {
    const lab = new Int32Array(w * h), comps = []; let next = 0; const stack = [];
    for (let s = 0; s < w * h; s++) {
      if (!bin[s] || lab[s]) continue;
      next++; let area = 0, x0 = w, y0 = h, x1 = 0, y1 = 0, edge = false;
      lab[s] = next; stack.push(s);
      while (stack.length) {
        const p = stack.pop(), x = p % w, y = (p / w) | 0; area++;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edge = true;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const a = x + dx, b = y + dy; if (a < 0 || b < 0 || a >= w || b >= h) continue;
          const q = b * w + a; if (bin[q] && !lab[q]) { lab[q] = next; stack.push(q); }
        }
      }
      comps.push({ label: next, area, x0, y0, x1, y1, edge, start: s });
    }
    return { lab, comps };
  };

  MM.maskFromLabel = (lab, w, c) => {
    const m = MM.newMask(c.x0, c.y0, c.x1 - c.x0 + 1, c.y1 - c.y0 + 1);
    for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) if (lab[(j + c.y0) * w + i + c.x0] === c.label) m.data[j * m.w + i] = 1;
    return m;
  };

  /* ---------- Contorno (porta do Wand.traceEdge, 8-conectado) ---------- */
  // inside(x,y) testa o pixel; vértice (x,y) é o canto superior esquerdo do pixel (x,y).
  MM.traceEdge = (inside, startX, startY) => {
    const xs = [], ys = [];
    const ins = (x, y, d) => {
      switch (d & 3) { case 0: return inside(x, y); case 1: return inside(x, y - 1); case 2: return inside(x - 1, y - 1); default: return inside(x - 1, y); }
    };
    // como Wand.traceEdge do ImageJ: começa subindo se o pixel de partida é de dentro; descendo, se é de fora
    let startDirection = 1; if (!inside(startX, startY)) { startDirection = 3; startY++; }
    let x = startX, y = startY, direction = startDirection, guard = 0;
    do {
      let nd = direction + 1;
      do { if (ins(x, y, nd)) break; nd--; } while (nd >= direction);
      if (nd !== direction) { xs.push(x); ys.push(y); }
      switch (nd & 3) { case 0: x++; break; case 1: y--; break; case 2: x--; break; case 3: y++; break; }
      direction = nd;
      if (++guard > 1e7) break;
    } while (x !== startX || y !== startY || (direction & 3) !== startDirection);
    if (xs.length && xs[0] !== x) { xs.push(x); ys.push(y); }
    return xs.map((v, i) => [v, ys[i]]);
  };

  // Contornos externos de todos os componentes da máscara, em coordenadas da imagem.
  MM.outlines = (m) => {
    const { lab, comps } = MM.label(m.data, m.w, m.h), res = [];
    for (const c of comps) {
      const inside = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && lab[y * m.w + x] === c.label;
      // Como o Analyze Particles do ImageJ (Wand.autoOutline): a partir do primeiro pixel do componente na ordem de
      // varredura, anda para a direita até sair do objeto e começa o contorno nessa borda.
      let sx = c.start % m.w; const sy = (c.start / m.w) | 0; do sx++; while (inside(sx, sy));
      const poly = MM.traceEdge(inside, sx, sy);
      res.push({ poly: poly.map(([x, y]) => [x + m.x, y + m.y]), area: c.area });
    }
    return res;
  };

  MM.tracedPerimeter = (pts) => {
    const n = pts.length; if (n < 4) return 0;
    let sumdx = 0, sumdy = 0, nCorners = 0;
    let dx1 = pts[0][0] - pts[n - 1][0], dy1 = pts[0][1] - pts[n - 1][1];
    let side1 = Math.abs(dx1) + Math.abs(dy1), corner = false;
    for (let i = 0; i < n; i++) {
      const ni = (i + 1) % n, dx2 = pts[ni][0] - pts[i][0], dy2 = pts[ni][1] - pts[i][1];
      sumdx += Math.abs(dx1); sumdy += Math.abs(dy1);
      const side2 = Math.abs(dx2) + Math.abs(dy2);
      if (side1 > 1 || !corner) { corner = true; nCorners++; } else corner = false;
      dx1 = dx2; dy1 = dy2; side1 = side2;
    }
    return sumdx + sumdy - nCorners * (2 - Math.SQRT2);
  };

  // Comprimento de polígono/linha. smooth=true: traçado à mão livre, calculado como no ImageJ 1.54
  // (PolygonRoi.getSmoothedLineLength / getSmoothedPerimeter: média móvel de 3 pontos ao longo da linha aberta,
  // mais o segmento de fechamento sem suavização).
  MM.polyLength = (pts, closed, smooth) => {
    const n = pts.length, d = (dx, dy) => Math.sqrt(dx * dx + dy * dy);
    if (smooth && n > 2) {
      const X = (i) => pts[i][0], Y = (i) => pts[i][1];
      let L = d((X(0) + X(1) + X(2)) / 3 - X(0), (Y(0) + Y(1) + Y(2)) / 3 - Y(0));
      for (let i = 1; i < n - 2; i++) L += d((X(i + 2) - X(i - 1)) / 3, (Y(i + 2) - Y(i - 1)) / 3);
      L += d(X(n - 1) - (X(n - 3) + X(n - 2) + X(n - 1)) / 3, Y(n - 1) - (Y(n - 3) + Y(n - 2) + Y(n - 1)) / 3);
      if (closed) L += d(X(n - 1) - X(0), Y(n - 1) - Y(0));
      return L;
    }
    let L = 0; for (let i = 1; i < n; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (closed && n > 2) L += Math.hypot(pts[0][0] - pts[n - 1][0], pts[0][1] - pts[n - 1][1]);
    return L;
  };

  /* ---------- Fecho convexo e Feret ---------- */
  MM.convexHull = (pts) => {
    const p = pts.map((q) => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const u = []; for (let i = 0; i < p.length; i++) if (!i || p[i][0] !== p[i - 1][0] || p[i][1] !== p[i - 1][1]) u.push(p[i]);
    if (u.length < 3) return u;
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], hi = [];
    for (const q of u) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = u.length - 1; i >= 0; i--) { const q = u[i]; while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
    hi.pop(); lo.pop(); return lo.concat(hi);
  };

  // Retorna diâmetros em pixels + extremidades para desenhar.
  MM.feret = (hull) => {
    const n = hull.length;
    if (n === 0) return { max: 0, min: 0, angle: 0, maxLine: null, minLine: null };
    let d2 = 0, p1 = 0, p2 = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const dx = hull[i][0] - hull[j][0], dy = hull[i][1] - hull[j][1], s = dx * dx + dy * dy;
      if (s > d2) { d2 = s; p1 = i; p2 = j; }
    }
    if (hull[p1][0] > hull[p2][0]) [p1, p2] = [p2, p1];
    let angle = Math.atan2(hull[p1][1] - hull[p2][1], hull[p2][0] - hull[p1][0]) * 180 / Math.PI; if (angle < 0) angle += 180;
    let min = n < 3 ? 0 : Infinity, minLine = null;
    if (n >= 3) {
      // casco no sentido anti-horário matemático (y para baixo => horário na tela); usar |dist|
      for (let i = 0; i < n; i++) {
        const a = hull[(i + n - 1) % n], b = hull[i];
        let nx = b[1] - a[1], ny = a[0] - b[0]; const L = Math.hypot(nx, ny); if (!L) continue; nx /= L; ny /= L;
        let md = 0, mp = null;
        for (let j = 0; j < n; j++) { const d = Math.abs((hull[j][0] - b[0]) * nx + (hull[j][1] - b[1]) * ny); if (d > md) { md = d; mp = hull[j]; } }
        if (md < min) {
          min = md;
          const s = (mp[0] - b[0]) * nx + (mp[1] - b[1]) * ny;
          minLine = [mp[0], mp[1], mp[0] - nx * s, mp[1] - ny * s];
        }
      }
    }
    return { max: Math.sqrt(d2), min, angle, maxLine: [hull[p1][0], hull[p1][1], hull[p2][0], hull[p2][1]], minLine };
  };

  /* ---------- Medição de uma máscara ---------- */
  // rgba: Uint8ClampedArray da imagem W×H. Retorna valores em pixels.
  MM.measureMask = (m, rgba, W) => {
    let n = 0, sr = 0, sg = 0, sb = 0, cx = 0, cy = 0;
    for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) {
      if (!m.data[j * m.w + i]) continue;
      const x = m.x + i, y = m.y + j, k = (y * W + x) * 4; n++;
      if (rgba) { sr += rgba[k]; sg += rgba[k + 1]; sb += rgba[k + 2]; }
      cx += x + 0.5; cy += y + 0.5;
    }
    const outs = MM.outlines(m);
    let perim = 0; const all = [];
    for (const o of outs) { perim += MM.tracedPerimeter(o.poly); for (const p of o.poly) all.push(p); }
    const hull = MM.convexHull(all), f = MM.feret(hull);
    const circ = perim > 0 ? Math.min(1, 4 * Math.PI * n / (perim * perim)) : 0;
    return {
      area: n, perimeter: perim, feret: f.max, minFeret: f.min, feretAngle: f.angle, maxLine: f.maxLine, minLine: f.minLine,
      circularity: circ, centroid: n ? [cx / n, cy / n] : [0, 0], mean: n ? [sr / n, sg / n, sb / n] : [0, 0, 0],
      outlines: outs.map((o) => o.poly), parts: outs.length,
    };
  };

  /* ---------- Limiar ---------- */
  MM.otsu = (hist) => {
    let N = 0; for (const v of hist) N += v; if (!N) return 0;
    const L = hist.length, cnh = new Float64Array(L), mean = new Float64Array(L);
    cnh[0] = hist[0] / N;
    for (let i = 1; i < L; i++) { cnh[i] = cnh[i - 1] + hist[i] / N; mean[i] = mean[i - 1] + i * hist[i] / N; }
    const tm = mean[L - 1]; let best = 0, t = 0;
    for (let i = 0; i < L; i++) { let b = tm * cnh[i] - mean[i]; b *= b / (cnh[i] * (1 - cnh[i])); if (best < b) { best = b; t = i; } }
    return t;
  };

  // Imagem de "diferença do fundo": distância de cor de cada pixel à cor do fundo
  // (mediana dos pixels da borda). Funciona para objeto escuro em fundo claro e vice-versa.
  MM.backgroundDistance = (rgba, W, H) => {
    const br = [], bg = [], bb = [];
    const push = (x, y) => { const k = (y * W + x) * 4; br.push(rgba[k]); bg.push(rgba[k + 1]); bb.push(rgba[k + 2]); };
    const step = Math.max(1, Math.floor((W + H) / 2000));
    for (let x = 0; x < W; x += step) { push(x, 0); push(x, H - 1); }
    for (let y = 0; y < H; y += step) { push(0, y); push(W - 1, y); }
    const med = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
    const bc = [med(br), med(bg), med(bb)];
    const dist = new Float32Array(W * H); let mx = 0;
    for (let i = 0, k = 0; i < W * H; i++, k += 4) {
      const dr = rgba[k] - bc[0], dg = rgba[k + 1] - bc[1], db = rgba[k + 2] - bc[2];
      const d = Math.sqrt(dr * dr + dg * dg + db * db); dist[i] = d; if (d > mx) mx = d;
    }
    const out = new Uint8Array(W * H), hist = new Array(256).fill(0), s = mx > 0 ? 255 / mx : 0;
    for (let i = 0; i < W * H; i++) { const v = Math.round(dist[i] * s); out[i] = v; hist[v]++; }
    return { img: out, hist, bgColor: bc, threshold: MM.otsu(hist) };
  };

  // Detecta todos os objetos: limiar sobre a imagem de diferença do fundo.
  MM.detectAll = (det, W, H, opts) => {
    const t = opts.threshold, minArea = opts.minArea || 1;
    let bin = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) bin[i] = det.img[i] > t ? 1 : 0;
    // separa objetos encostados sobre a máscara sem preencher furos (como o Watershed do ImageJ):
    // os vãos entre objetos encostados ajudam a achar a divisão; furos de cada objeto são preenchidos depois
    if (opts.split) bin = MM.splitTouching(bin, W, H, opts.splitTol || 1);
    let lab, comps;
    if (opts.grad) { // bordas refinadas pelo gradiente
      const rf = MM.refineDetect(opts.grad, W, H, bin, opts.erode || 2, opts.band || Math.max(8, Math.round(Math.max(W, H) * 0.03))); lab = rf.lab;
      for (let i = 0; i < W * H; i++) if (lab[i] === rf.BG) lab[i] = 0;
      const b2 = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) b2[i] = lab[i] ? 1 : 0;
      // componentes por rótulo do watershed (objetos encostados ficam separados se os núcleos forem distintos)
      comps = []; const bb = new Map();
      for (let i = 0; i < W * H; i++) { const L = lab[i]; if (!L) continue; const x = i % W, y = (i / W) | 0; let c = bb.get(L);
        if (!c) { c = { label: L, area: 0, x0: x, y0: y, x1: x, y1: y, edge: false }; bb.set(L, c); comps.push(c); }
        c.area++; if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y > c.y1) c.y1 = y; if (x === 0 || y === 0 || x === W - 1 || y === H - 1) c.edge = true; }
    } else ({ lab, comps } = MM.label(bin, W, H));
    const masks = [];
    for (const c of comps) {
      if (c.area < minArea) continue;
      if (opts.excludeEdges && c.edge) continue;
      let m = MM.maskFromLabel(lab, W, c);
      if (opts.fillHoles) m = MM.fillHoles(m);
      masks.push(m);
    }
    return masks;
  };

  // Detecta o objeto sob o clique (componente que contém o pixel).
  MM.detectAt = (det, W, H, px, py, opts) => {
    const t = opts.threshold, seedObj = det.img[py * W + px] > t;
    if (!seedObj) return null;
    const vis = new Uint8Array(W * H), stack = [py * W + px]; vis[py * W + px] = 1;
    let x0 = px, y0 = py, x1 = px, y1 = py; const pix = [];
    while (stack.length) {
      const p = stack.pop(), x = p % W, y = (p / W) | 0; pix.push(p);
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const a = x + dx, b = y + dy; if (a < 0 || b < 0 || a >= W || b >= H) continue;
        const q = b * W + a; if (!vis[q] && det.img[q] > t) { vis[q] = 1; stack.push(q); }
      }
    }
    let m = MM.newMask(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    for (const p of pix) m.data[((p / W) | 0) * m.w - y0 * m.w + (p % W) - x0] = 1;
    if (opts.fillHoles) m = MM.fillHoles(m);
    return m;
  };

  /* ---------- Bordas: gradiente de cor ---------- */
  // Suaviza (caixa 3×3) e calcula Sobel por canal; usa o maior canal.
  // Resultado normalizado para 0..255 (percentil 99,5 = 255).
  MM.gradient = (rgba, W, H) => {
    const N = W * H, ch = [new Float32Array(N), new Float32Array(N), new Float32Array(N)];
    for (let i = 0, k = 0; i < N; i++, k += 4) { ch[0][i] = rgba[k]; ch[1][i] = rgba[k + 1]; ch[2][i] = rgba[k + 2]; }
    const tmp = new Float32Array(N);
    const box = (a) => {
      for (let y = 0; y < H; y++) { const o = y * W; for (let x = 0; x < W; x++) { const l = x ? x - 1 : 0, r = x < W - 1 ? x + 1 : x; tmp[o + x] = (a[o + l] + a[o + x] + a[o + r]) / 3; } }
      for (let y = 0; y < H; y++) { const u = (y ? y - 1 : 0) * W, d = (y < H - 1 ? y + 1 : y) * W, o = y * W; for (let x = 0; x < W; x++) a[o + x] = (tmp[u + x] + tmp[o + x] + tmp[d + x]) / 3; }
    };
    for (const a of ch) box(a);
    const g = new Float32Array(N);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x; let best = 0;
      for (const a of ch) {
        const gx = a[i - W + 1] + 2 * a[i + 1] + a[i + W + 1] - a[i - W - 1] - 2 * a[i - 1] - a[i + W - 1];
        const gy = a[i + W - 1] + 2 * a[i + W] + a[i + W + 1] - a[i - W - 1] - 2 * a[i - W] - a[i - W + 1];
        const m = gx * gx + gy * gy; if (m > best) best = m;
      }
      g[i] = Math.sqrt(best);
    }
    // escala com raiz quadrada sobre o máximo: bordas fortes não saturam (sem platôs) e bordas fracas mantêm resolução
    let mx = 0; for (let i = 0; i < N; i++) if (g[i] > mx) mx = g[i];
    const out = new Uint8Array(N), s = mx > 0 ? 1 / mx : 0;
    for (let i = 0; i < N; i++) out[i] = Math.round(255 * Math.sqrt(g[i] * s));
    return out;
  };

  /* ---------- Watershed com marcadores (inundação por níveis) ---------- */
  // grad: Uint8Array; lab: Int32Array com marcadores (>0) e 0 = desconhecido. Preenche lab in-place.
  MM.watershed = (grad, W, H, lab) => {
    const N = W * H, inQ = new Uint8Array(N), B = []; for (let i = 0; i < 256; i++) B.push([]);
    const push = (q, lvl) => { inQ[q] = 1; B[lvl].push(q); };
    for (let p = 0; p < N; p++) {
      if (!lab[p]) continue; const x = p % W;
      if (x > 0 && !lab[p - 1] && !inQ[p - 1]) push(p - 1, grad[p - 1]);
      if (x < W - 1 && !lab[p + 1] && !inQ[p + 1]) push(p + 1, grad[p + 1]);
      if (p >= W && !lab[p - W] && !inQ[p - W]) push(p - W, grad[p - W]);
      if (p < N - W && !lab[p + W] && !inQ[p + W]) push(p + W, grad[p + W]);
    }
    for (let lvl = 0; lvl < 256; lvl++) {
      const b = B[lvl];
      for (let qi = 0; qi < b.length; qi++) {
        const p = b[qi], x = p % W; let L = 0;
        if (x > 0 && lab[p - 1]) L = lab[p - 1]; else if (x < W - 1 && lab[p + 1]) L = lab[p + 1]; else if (p >= W && lab[p - W]) L = lab[p - W]; else if (p < N - W && lab[p + W]) L = lab[p + W];
        lab[p] = L;
        const nb = (q) => { if (!lab[q] && !inQ[q]) push(q, grad[q] > lvl ? grad[q] : lvl); };
        if (x > 0) nb(p - 1); if (x < W - 1) nb(p + 1); if (p >= W) nb(p - W); if (p < N - W) nb(p + W);
      }
      B[lvl] = null;
    }
    return lab;
  };

  // Desenha marcadores (traços com raio r) num Int32Array de uma janela.
  const stampStrokes = (lab, w, h, ox, oy, strokes, r, val) => {
    for (const s of strokes) {
      const pts = s.length === 1 ? [s[0], s[0]] : s;
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
        for (let t = 0; t <= n; t++) {
          const cx = ax + (bx - ax) * t / n - ox, cy = ay + (by - ay) * t / n - oy;
          for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
            if (dx * dx + dy * dy > r * r) continue; const x = Math.floor(cx + dx), y = Math.floor(cy + dy);
            if (x >= 0 && y >= 0 && x < w && y < h) lab[y * w + x] = val;
          }
        }
      }
    }
  };

  // Segmenta um objeto a partir de marcas. A região cresce a partir das marcas de objeto,
  // absorvendo primeiro os pixels de borda mais fraca (inundação mínimo-máxima). A área A(L)
  // em função do nível de borda L tem um salto enorme quando a região "vaza" pela borda do objeto;
  // o contorno é a região logo antes do maior salto relativo. Marcas de fundo limitam L por cima
  // (o fundo nunca entra) e marcas extras de objeto limitam por baixo (precisam estar dentro).
  MM.segmentSeeds = (grad, W, H, fg, bg, opts = {}) => {
    const N = W * H, lev = new Uint8Array(N).fill(255), seen = new Uint8Array(N), B = []; for (let i = 0; i < 256; i++) B.push([]);
    const fgL = new Int32Array(N), bgL = new Int32Array(N);
    stampStrokes(fgL, W, H, 0, 0, fg, opts.r || 2, 1); stampStrokes(bgL, W, H, 0, 0, bg, opts.r || 2, 1);
    const hist = new Float64Array(256); let bgLevel = 256, fgTotal = 0, fgSeen = 0, fgLevel = 0;
    for (let p = 0; p < N; p++) if (fgL[p]) fgTotal++;
    // semente = primeiro traço de objeto
    const first = new Int32Array(N); stampStrokes(first, W, H, 0, 0, [fg[0]], opts.r || 2, 1);
    for (let p = 0; p < N; p++) if (first[p] && !bgL[p]) { seen[p] = 1; B[0].push(p); }
    for (let L = 0; L < 256; L++) {
      const b = B[L];
      for (let qi = 0; qi < b.length; qi++) {
        const p = b[qi]; lev[p] = L; hist[L]++;
        if (bgL[p] && L < bgLevel) bgLevel = L;
        if (fgL[p]) { fgSeen++; if (fgSeen === fgTotal) fgLevel = L; }
        const x = p % W;
        const nb = (q) => { if (seen[q]) return; seen[q] = 1; const g = grad[q] > L ? grad[q] : L; B[g].push(q); };
        if (x > 0) nb(p - 1); if (x < W - 1) nb(p + 1); if (p >= W) nb(p - W); if (p < N - W) nb(p + W);
      }
      B[L] = null;
    }
    const A = new Float64Array(256); let acc = 0; for (let L = 0; L < 256; L++) { acc += hist[L]; A[L] = acc; }
    const minA = opts.minArea || 9, lo = fgLevel, hi = Math.min(254, bgLevel - 1);
    // escolhe o nível com região estável (área quase constante por vários níveis) seguida de um salto grande
    let best = -1, bestS = 0, bestR = 0;
    for (let L = lo; L <= hi; L++) {
      if (A[L] < minA) continue; const r = A[L + 1] / A[L]; if (r < 1.3) continue;
      let l = L; while (l > 0 && A[l - 1] >= 0.85 * A[L]) l--;
      const sc = (L - l + 1) * Math.log(r);
      if (sc > bestS) { bestS = sc; best = L; bestR = r; }
    }
    if (best < 0) best = Math.max(lo, Math.min(hi, 254));
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let p = 0; p < N; p++) if (seen[p] && lev[p] <= best) { const x = p % W, y = (p / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return MM.newMask(0, 0, 0, 0);
    // borda exata: watershed numa faixa de ±3 px em volta da região divide a crista do gradiente
    const R = 4, wx0 = Math.max(0, x0 - R), wy0 = Math.max(0, y0 - R), wx1 = Math.min(W, x1 + R + 1), wy1 = Math.min(H, y1 + R + 1);
    const w = wx1 - wx0, h = wy1 - wy0, inR = new Uint8Array(w * h);
    for (let y = wy0; y < wy1; y++) for (let x = wx0; x < wx1; x++) { const p = y * W + x; if (seen[p] && lev[p] <= best) inR[(y - wy0) * w + x - wx0] = 1; }
    const dIn = MM.distanceTo(inR, w, h, 0), dOut = MM.distanceTo(inR, w, h, 1), lab = new Int32Array(w * h), g = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) lab[i] = inR[i] ? (dIn[i] > 1.5 ? 1 : 0) : (dOut[i] > 2.5 ? 2 : 0);
    for (let j = 0; j < h; j++) g.set(grad.subarray((j + wy0) * W + wx0, (j + wy0) * W + wx1), j * w);
    for (let i = 0; i < w * h; i++) if (bgL[(((i / w) | 0) + wy0) * W + (i % w) + wx0]) lab[i] = 2;
    MM.watershed(g, w, h, lab);
    let m = MM.newMask(wx0, wy0, w, h);
    for (let i = 0; i < w * h; i++) m.data[i] = lab[i] === 1 ? 1 : 0;
    m = MM.cropMask(m);
    if (opts.fillHoles) m = MM.fillHoles(m);
    return m;
  };

  // Distância (chanfro 3-4 ≈ euclidiana/3) até o pixel mais próximo com bin==val.
  MM.distanceTo = (bin, W, H, val) => {
    const N = W * H, d = new Float32Array(N), BIG = 1e9;
    for (let i = 0; i < N; i++) d[i] = bin[i] === val ? 0 : BIG;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; let v = d[i]; if (!v) continue;
      if (x > 0) v = Math.min(v, d[i - 1] + 3); if (y > 0) { v = Math.min(v, d[i - W] + 3); if (x > 0) v = Math.min(v, d[i - W - 1] + 4); if (x < W - 1) v = Math.min(v, d[i - W + 1] + 4); } d[i] = v; }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; let v = d[i]; if (!v) continue;
      if (x < W - 1) v = Math.min(v, d[i + 1] + 3); if (y < H - 1) { v = Math.min(v, d[i + W] + 3); if (x < W - 1) v = Math.min(v, d[i + W + 1] + 4); if (x > 0) v = Math.min(v, d[i + W - 1] + 4); } d[i] = v; }
    for (let i = 0; i < N; i++) d[i] /= 3;
    return d;
  };

  // Refina objetos de um limiar: núcleos (erodidos) viram marcadores de objeto e só o fundo
  // distante (> band px) vira marcador de fundo; o watershed põe a borda onde o gradiente é máximo,
  // recuperando partes do objeto parecidas com o fundo que o limiar perdeu.
  MM.refineDetect = (grad, W, H, bin, r, band) => {
    const N = W * H, din = MM.distanceTo(bin, W, H, 0), dout = MM.distanceTo(bin, W, H, 1);
    const core = new Uint8Array(N); for (let i = 0; i < N; i++) core[i] = din[i] > r ? 1 : 0;
    const { lab: cl, comps } = MM.label(core, W, H);
    const BG = comps.length + 1, lab = new Int32Array(N);
    for (let i = 0; i < N; i++) lab[i] = cl[i] ? cl[i] : (dout[i] > band ? BG : 0);
    MM.watershed(grad, W, H, lab);
    return { lab, BG, n: comps.length };
  };

  /* ---------- Contorno magnético (livewire / tesoura inteligente) ---------- */
  // Dijkstra numa janela em torno da âncora; custo baixo sobre bordas fortes.
  MM.liveWire = (grad, W, H, ax, ay, R) => {
    const x0 = Math.max(0, ax - R), y0 = Math.max(0, ay - R), x1 = Math.min(W - 1, ax + R), y1 = Math.min(H - 1, ay + R);
    const w = x1 - x0 + 1, h = y1 - y0 + 1, n = w * h;
    const dist = new Float32Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), done = new Uint8Array(n);
    const cost = (i) => { const gx = grad[(((i / w) | 0) + y0) * W + (i % w) + x0]; return 1 - gx / 256 * 0.97; };
    // heap binário
    const hk = new Float32Array(n * 4 + 8), hv = new Int32Array(n * 4 + 8); let hs = 0;
    const hpush = (key, v) => { let i = hs++; hk[i] = key; hv[i] = v; while (i) { const p = (i - 1) >> 1; if (hk[p] <= hk[i]) break; [hk[p], hk[i]] = [hk[i], hk[p]]; [hv[p], hv[i]] = [hv[i], hv[p]]; i = p; } };
    const hpop = () => { const v = hv[0]; hs--; hk[0] = hk[hs]; hv[0] = hv[hs]; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < hs && hk[l] < hk[m]) m = l; if (r < hs && hk[r] < hk[m]) m = r; if (m === i) break; [hk[m], hk[i]] = [hk[i], hk[m]]; [hv[m], hv[i]] = [hv[i], hv[m]]; i = m; } return v; };
    const s = (ay - y0) * w + (ax - x0); dist[s] = 0; hpush(0, s);
    while (hs) {
      const p = hpop(); if (done[p]) continue; done[p] = 1; const px = p % w, py = (p / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const qx = px + dx, qy = py + dy; if (qx < 0 || qy < 0 || qx >= w || qy >= h) continue;
        const q = qy * w + qx; if (done[q]) continue;
        const d = dist[p] + cost(q) * (dx && dy ? Math.SQRT2 : 1);
        if (d < dist[q] && hs < hk.length - 1) { dist[q] = d; prev[q] = p; hpush(d, q); }
      }
    }
    return {
      x0, y0, w, h,
      path(tx, ty) { // caminho da âncora até (tx,ty), em centros de pixel
        tx = Math.round(tx); ty = Math.round(ty);
        if (tx < x0 || ty < y0 || tx > x1 || ty > y1) return null;
        const out = []; let q = (ty - y0) * w + (tx - x0), guard = 0;
        while (q >= 0 && guard++ < n) { out.push([(q % w) + x0 + 0.5, ((q / w) | 0) + y0 + 0.5]); q = prev[q]; }
        return out.reverse();
      },
    };
  };
  // Procura o pixel de maior gradiente perto de (x,y) — ajuda a colocar a âncora na borda.
  MM.snapEdge = (grad, W, H, x, y, r) => {
    let bx = Math.round(x), by = Math.round(y), bv = -1;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const xx = Math.round(x) + dx, yy = Math.round(y) + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const v = grad[yy * W + xx] - 0.5 * Math.hypot(dx, dy); if (v > bv) { bv = v; bx = xx; by = yy; }
    }
    return [bx, by];
  };

  /* ---------- Perspectiva (homografia) ---------- */
  // H tal que [x',y',w]ᵀ = H·[x,y,1]ᵀ leva src[i] → dst[i] (4 pares).
  MM.homography = (src, dst) => {
    const A = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = src[i], [u, v] = dst[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
    }
    for (let c = 0; c < 8; c++) { // eliminação de Gauss com pivoteamento
      let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      [A[c], A[p]] = [A[p], A[c]]; const d = A[c][c]; if (Math.abs(d) < 1e-12) return null;
      for (let k = c; k < 9; k++) A[c][k] /= d;
      for (let r = 0; r < 8; r++) if (r !== c) { const f = A[r][c]; if (f) for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k]; }
    }
    const h = A.map((r) => r[8]); return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
  };
  MM.applyH = (H, x, y) => { const w = H[6] * x + H[7] * y + H[8]; return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w]; };
  // Ordena 4 pontos: sup. esquerdo, sup. direito, inf. direito, inf. esquerdo.
  MM.orderQuad = (pts) => {
    const c = pts.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4], [0, 0]);
    const s = pts.slice().sort((a, b) => Math.atan2(a[1] - c[1], a[0] - c[0]) - Math.atan2(b[1] - c[1], b[0] - c[0]));
    let k = 0; for (let i = 1; i < 4; i++) if (s[i][0] + s[i][1] < s[k][0] + s[k][1]) k = i;
    return [0, 1, 2, 3].map((i) => s[(k + i) % 4]);
  };
  // Endireita a imagem: o quadrilátero 'quad' (ordenado) vira um retângulo realW×realH.
  // Retorna {rgba, W, H, ppu, rect:[x0,y0,x1,y1]} com ppu = pixels por unidade.
  MM.rectify = (rgba, W, H, quad, realW, realH, maxPixels) => {
    const e = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ppu = Math.max((e(quad[0], quad[1]) + e(quad[3], quad[2])) / 2 / realW, (e(quad[0], quad[3]) + e(quad[1], quad[2])) / 2 / realH);
    const rw = realW * ppu, rh = realH * ppu, rect = [[0, 0], [rw, 0], [rw, rh], [0, rh]];
    const Hf = MM.homography(quad, rect), Hi = MM.homography(rect, quad); if (!Hf || !Hi) return null;
    // extensão da imagem inteira no plano corrigido, limitada a 3× o lado maior do retângulo além dele
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    for (const [x, y] of [[0, 0], [W, 0], [W, H], [0, H]]) { const [u, v] = MM.applyH(Hf, x, y); bx0 = Math.min(bx0, u); by0 = Math.min(by0, v); bx1 = Math.max(bx1, u); by1 = Math.max(by1, v); }
    const Lm = Math.max(rw, rh) * 3; bx0 = Math.max(bx0, -Lm); by0 = Math.max(by0, -Lm); bx1 = Math.min(bx1, rw + Lm); by1 = Math.min(by1, rh + Lm);
    let s = 1; const area = (bx1 - bx0) * (by1 - by0), lim = maxPixels || W * H * 1.5; if (area > lim) s = Math.sqrt(lim / area);
    const oW = Math.max(1, Math.round((bx1 - bx0) * s)), oH = Math.max(1, Math.round((by1 - by0) * s)), out = new Uint8ClampedArray(oW * oH * 4);
    for (let j = 0; j < oH; j++) for (let i = 0; i < oW; i++) {
      const u = (i + 0.5) / s + bx0, v = (j + 0.5) / s + by0, w = Hi[6] * u + Hi[7] * v + Hi[8];
      const x = (Hi[0] * u + Hi[1] * v + Hi[2]) / w - 0.5, y = (Hi[3] * u + Hi[4] * v + Hi[5]) / w - 0.5, o = (j * oW + i) * 4;
      if (x < -0.5 || y < -0.5 || x > W - 0.5 || y > H - 0.5) { out[o] = out[o + 1] = out[o + 2] = 0; out[o + 3] = 255; continue; }
      const x0 = Math.max(0, Math.min(W - 1, Math.floor(x))), y0 = Math.max(0, Math.min(H - 1, Math.floor(y))), x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(H - 1, y0 + 1);
      const fx = Math.max(0, Math.min(1, x - x0)), fy = Math.max(0, Math.min(1, y - y0));
      for (let c = 0; c < 3; c++) {
        const a = rgba[(y0 * W + x0) * 4 + c], b = rgba[(y0 * W + x1) * 4 + c], d = rgba[(y1 * W + x0) * 4 + c], f = rgba[(y1 * W + x1) * 4 + c];
        out[o + c] = (a * (1 - fx) + b * fx) * (1 - fy) + (d * (1 - fx) + f * fx) * fy;
      }
      out[o + 3] = 255;
    }
    return { rgba: out, W: oW, H: oH, ppu: ppu * s, rect: [-bx0 * s, -by0 * s, (rw - bx0) * s, (rh - by0) * s] };
  };

  /* ---------- Cor (CIE Lab) ---------- */
  let LAB = null; // tabela para cores com 5 bits por canal
  MM.labLUT = () => {
    if (LAB) return LAB; LAB = new Float32Array(32768 * 3);
    const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const f = (t) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
    for (let i = 0; i < 32768; i++) {
      const r = lin(((i >> 10) & 31) * 255 / 31), g = lin(((i >> 5) & 31) * 255 / 31), b = lin((i & 31) * 255 / 31);
      const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
      const fx = f(X), fy = f(Y), fz = f(Z); LAB[i * 3] = 116 * fy - 16; LAB[i * 3 + 1] = 500 * (fx - fy); LAB[i * 3 + 2] = 200 * (fy - fz);
    }
    return LAB;
  };
  MM.rgbToLab = (r, g, b) => { const L = MM.labLUT(), i = ((r >> 3) << 10 | (g >> 3) << 5 | (b >> 3)) * 3; return [L[i], L[i + 1], L[i + 2]]; };
  // Média 3×3 da imagem (reduz ruído antes de comparar cores).
  MM.blurRGBA = (rgba, W, H) => {
    const out = new Uint8ClampedArray(rgba.length);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= H) continue; for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx < 0 || xx >= W) continue; const k = (yy * W + xx) * 4; r += rgba[k]; g += rgba[k + 1]; b += rgba[k + 2]; n++; } }
      const o = (y * W + x) * 4; out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = 255;
    }
    return out;
  };

  /* ---------- Colônias: aprende com exemplos e encontra as parecidas ---------- */
  // Modelo de um exemplo: cor média (Lab), espalhamento de cor, área e circularidade.
  MM.colonyModel = (rgbaB, W, mask, H) => {
    const T = MM.labLUT(), labs = [];
    for (let j = 0; j < mask.h; j++) for (let i = 0; i < mask.w; i++) if (mask.data[j * mask.w + i]) {
      const k = ((j + mask.y) * W + i + mask.x) * 4, q = ((rgbaB[k] >> 3) << 10 | (rgbaB[k + 1] >> 3) << 5 | (rgbaB[k + 2] >> 3)) * 3;
      labs.push([T[q], T[q + 1], T[q + 2]]);
    }
    const n = labs.length || 1, mean = [0, 1, 2].map((c) => labs.reduce((a, l) => a + l[c], 0) / n);
    const d = labs.map((l) => Math.hypot(l[0] - mean[0], l[1] - mean[1], l[2] - mean[2])).sort((a, b) => a - b);
    const m = MM.measureMask(mask, null, W);
    // cor do fundo: anel de 3 a 8 px em volta do exemplo
    let bgm = null;
    if (H) {
      const R = 8, x0 = Math.max(0, mask.x - R), y0 = Math.max(0, mask.y - R), x1 = Math.min(W, mask.x + mask.w + R), y1 = Math.min(H, mask.y + mask.h + R);
      const w = x1 - x0, h = y1 - y0, inn = new Uint8Array(w * h);
      for (let j = 0; j < mask.h; j++) for (let i = 0; i < mask.w; i++) if (mask.data[j * mask.w + i]) inn[(j + mask.y - y0) * w + i + mask.x - x0] = 1;
      const dd = MM.distanceTo(inn, w, h, 1), acc = [0, 0, 0]; let n2 = 0;
      for (let i = 0; i < w * h; i++) if (dd[i] >= 3 && dd[i] <= 8) {
        const k = ((((i / w) | 0) + y0) * W + (i % w) + x0) * 4, q = ((rgbaB[k] >> 3) << 10 | (rgbaB[k + 1] >> 3) << 5 | (rgbaB[k + 2] >> 3)) * 3;
        acc[0] += T[q]; acc[1] += T[q + 1]; acc[2] += T[q + 2]; n2++;
      }
      if (n2) bgm = acc.map((v) => v / n2);
    }
    return { mean, bg: bgm, spread: (d[Math.floor(d.length * 0.9)] || 0) + 4, area: m.area, circ: m.circularity };
  };
  // opts: tol (×espalhamento), minF/maxF (faixa de tamanho em relação ao exemplo), circTol, clusters, roi {cx,cy,rx,ry}
  MM.findColonies = (rgbaB, W, H, models, opts) => {
    const T = MM.labLUT(), N = W * H, bin = new Uint8Array(N), roi = opts.roi;
    let x0 = 0, y0 = 0, x1 = W, y1 = H;
    if (roi) { x0 = Math.max(0, Math.floor(roi.cx - roi.rx)); x1 = Math.min(W, Math.ceil(roi.cx + roi.rx)); y0 = Math.max(0, Math.floor(roi.cy - roi.ry)); y1 = Math.min(H, Math.ceil(roi.cy + roi.ry)); }
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      if (roi) { const u = (x + 0.5 - roi.cx) / roi.rx, v = (y + 0.5 - roi.cy) / roi.ry; if (u * u + v * v > 1) continue; }
      const k = (y * W + x) * 4, q = ((rgbaB[k] >> 3) << 10 | (rgbaB[k + 1] >> 3) << 5 | (rgbaB[k + 2] >> 3)) * 3;
      for (const m of models) {
        const dc = Math.hypot(T[q] - m.mean[0], T[q + 1] - m.mean[1], T[q + 2] - m.mean[2]);
        if (dc > m.spread * opts.tol) continue;
        if (m.bg && dc >= Math.hypot(T[q] - m.bg[0], T[q + 1] - m.bg[1], T[q + 2] - m.bg[2])) continue; // mais parecido com o fundo
        bin[y * W + x] = 1; break;
      }
    }
    const A = models.reduce((a, m) => a + m.area, 0) / models.length, C = Math.min(...models.map((m) => m.circ));
    const Amin = Math.min(...models.map((m) => m.area)), Amax = Math.max(...models.map((m) => m.area));
    const { lab, comps } = MM.label(bin, W, H), cand = [];
    for (const c of comps) {
      if (c.area < Math.max(3, Amin * opts.minF)) continue;
      let m = MM.maskFromLabel(lab, W, c); m = MM.fillHoles(m);
      const area = MM.maskCount(m), r = MM.measureMask(m, null, W);
      if (area > Amax * 40) continue; // região grande demais (borda da placa, reflexo)
      cand.push({ x: r.centroid[0], y: r.centroid[1], area, circ: area > 30 ? r.circularity : 1 });
    }
    // redondas dentro da faixa de tamanho = colônias isoladas
    const round = (c) => c.circ >= C - opts.circTol;
    const singles = cand.filter((c) => round(c) && c.area <= Amax * opts.maxF);
    const sa = singles.map((c) => c.area).sort((a, b) => a - b), Amed = sa.length ? sa[sa.length >> 1] : A;
    const items = [];
    for (const c of cand) {
      let n = 1;
      if (round(c)) { if (c.area > Amax * opts.maxF) { if (!opts.clusters) continue; n = Math.max(2, Math.round(c.area / Amed)); } }
      else if (c.area >= 1.4 * Amed) { if (opts.clusters) n = Math.max(2, Math.round(c.area / Amed)); } // aglomerado irregular
      else if (c.circ < C - 2 * opts.circTol) continue; // forma estranha e pequena: não é colônia
      items.push({ x: c.x, y: c.y, area: c.area, n, r: Math.sqrt(c.area / Math.PI), auto: true });
    }
    return items;
  };

  /* ---------- Separar objetos encostados (watershed pelo mapa de distância, como o "Watershed" do ImageJ) ---------- */
  // Inunda do centro para a borda; quando duas regiões com picos significativos (proeminência ≥ tol px) se encontram,
  // o pixel vira linha divisória (fundo). Retorna nova imagem binária.
  MM.splitTouching = (bin, W, H, tol = 1, rel = 0) => {
    const N = W * H, dist = MM.distanceTo(bin, W, H, 0);
    let maxK = 0; const key = new Int32Array(N);
    for (let i = 0; i < N; i++) if (bin[i]) { key[i] = Math.round(dist[i] * 3); if (key[i] > maxK) maxK = key[i]; }
    const count = new Int32Array(maxK + 2); for (let i = 0; i < N; i++) if (bin[i]) count[key[i]]++;
    const start = new Int32Array(maxK + 2); for (let k = maxK - 1; k >= 0; k--) start[k] = start[k + 1] + count[k + 1];
    const order = new Int32Array(start[0] + count[0]), pos = start.slice();
    for (let i = 0; i < N; i++) if (bin[i]) order[pos[key[i]]++] = i; // decrescente por distância
    const parent = new Int32Array(N).fill(-1), peak = new Float32Array(N), LINE = -2;
    const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
    const out = bin.slice(), roots = [];
    for (let oi = 0; oi < order.length; oi++) {
      const p = order[oi], x = p % W, y = (p / W) | 0, d = dist[p]; roots.length = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const q = yy * W + xx; if (parent[q] < 0) continue; const r = find(q); if (!roots.includes(r)) roots.push(r);
      }
      if (!roots.length) { parent[p] = p; peak[p] = d; continue; }
      const sig = roots.filter((r) => peak[r] - d >= Math.max(tol, rel * peak[r])); // proeminência mínima: absoluta e relativa ao tamanho
      if (sig.length >= 2) { parent[p] = LINE; out[p] = 0; continue; }
      let best = roots[0]; for (const r of roots) if (peak[r] > peak[best]) best = r;
      for (const r of roots) if (r !== best) parent[r] = best;
      parent[p] = best;
    }
    return out;
  };

  /* ---------- Leitor de TIFF ---------- */
  // Baseline + LZW, PackBits, Deflate; 1/8/16/32 bits (inteiro ou float); cinza, RGB(A), paleta; faixas ou blocos;
  // várias páginas. Lê a escala gravada pelo ImageJ (unit=… + XResolution) ou em centímetros.
  // Retorna Promise<{pages:[{W,H,rgba,cal,bits}], total}>. maxPages limita quantas páginas decodificar.
  MM.decodeTIFF = async (buf, maxPages = 20) => {
    const dv = new DataView(buf), le = dv.getUint16(0) === 0x4949;
    if (!le && dv.getUint16(0) !== 0x4d4d) throw new Error('não é TIFF');
    const magic = dv.getUint16(2, le); if (magic === 43) throw new Error('BigTIFF ainda não é suportado'); if (magic !== 42) throw new Error('não é TIFF');
    const SZ = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };
    const readVal = (type, off) => { switch (type) { case 3: return dv.getUint16(off, le); case 4: return dv.getUint32(off, le); case 8: return dv.getInt16(off, le); case 9: return dv.getInt32(off, le); case 5: return dv.getUint32(off, le) / (dv.getUint32(off + 4, le) || 1); case 10: return dv.getInt32(off, le) / (dv.getInt32(off + 4, le) || 1); case 11: return dv.getFloat32(off, le); case 12: return dv.getFloat64(off, le); default: return dv.getUint8(off); } };
    const ifds = []; let off = dv.getUint32(4, le), total = 0; const seen = new Set();
    while (off && off < buf.byteLength && !seen.has(off)) {
      seen.add(off); total++;
      const n = dv.getUint16(off, le), tags = {};
      for (let i = 0; i < n; i++) {
        const e = off + 2 + i * 12, tag = dv.getUint16(e, le), type = dv.getUint16(e + 2, le), cnt = dv.getUint32(e + 4, le), sz = (SZ[type] || 1) * cnt;
        const vo = sz <= 4 ? e + 8 : dv.getUint32(e + 8, le);
        if (type === 2) { let t = ''; for (let k = 0; k < cnt - 1 && vo + k < buf.byteLength; k++) t += String.fromCharCode(dv.getUint8(vo + k)); tags[tag] = t; }
        else { const a = []; for (let k = 0; k < Math.min(cnt, 1 << 22); k++) a.push(readVal(type, vo + k * (SZ[type] || 1))); tags[tag] = a; }
      }
      if (ifds.length < maxPages) ifds.push(tags);
      off = dv.getUint32(off + 2 + n * 12, le);
    }
    const lzw = (src) => { // LZW do TIFF (código MSB primeiro, troca de tamanho antecipada)
      const out = []; let dict = [], bits = 9, pos = 0, prev = null;
      const reset = () => { dict = []; for (let i = 0; i < 256; i++) dict.push([i]); dict.push(null, null); bits = 9; };
      const read = () => { let v = 0; for (let i = 0; i < bits; i++) { const byte = src[(pos + i) >> 3]; v = (v << 1) | (((byte === undefined ? 0 : byte) >> (7 - ((pos + i) & 7))) & 1); } pos += bits; return v; };
      reset();
      while ((pos + bits) <= src.length * 8) {
        const c = read(); if (c === 257) break;
        if (c === 256) { reset(); prev = null; continue; }
        let ent; if (c < dict.length && dict[c]) ent = dict[c]; else if (prev) ent = prev.concat([prev[0]]); else break;
        for (const b of ent) out.push(b);
        if (prev) dict.push(prev.concat([ent[0]]));
        prev = ent;
        if (dict.length + 1 >= (1 << bits) && bits < 12) bits++;
      }
      return Uint8Array.from(out);
    };
    const packbits = (src) => { const out = []; let i = 0; while (i < src.length) { const n = (src[i] << 24) >> 24; i++; if (n >= 0) { for (let k = 0; k <= n; k++) out.push(src[i++]); } else if (n !== -128) { const v = src[i++]; for (let k = 0; k < 1 - n; k++) out.push(v); } } return Uint8Array.from(out); };
    const inflate = async (src) => { const ds = new DecompressionStream('deflate'); const w = ds.writable.getWriter(); w.write(src); w.close(); return new Uint8Array(await new Response(ds.readable).arrayBuffer()); };
    const pages = [];
    for (const t of ifds) {
      const W = t[256][0], H = t[257][0], bpsA = t[258] || [1], bps = bpsA[0], spp = (t[277] || [1])[0], comp = (t[259] || [1])[0];
      const photo = (t[262] || [1])[0], planar = (t[284] || [1])[0], pred = (t[317] || [1])[0], fmt = (t[339] || [1])[0];
      if (![1, 5, 8, 32946, 32773].includes(comp)) throw new Error(comp === 7 ? 'TIFF com compressão JPEG ainda não é suportado' : `TIFF com compressão ${comp} não suportada`);
      const tiled = !!t[322], tw = tiled ? t[322][0] : W, th = tiled ? t[323][0] : (t[278] || [H])[0];
      const offs = tiled ? t[324] : t[273], cnts = tiled ? t[325] : t[279];
      const Bps = Math.max(1, bps / 8), planes = planar === 2 ? spp : 1, sppPlane = planar === 2 ? 1 : spp;
      const raw = new Float64Array(W * H * spp); // valores originais
      const per = Math.ceil(W / tw) * (tiled ? Math.ceil(H / th) : 1), chunksPerPlane = tiled ? per : Math.ceil(H / th);
      for (let ci = 0; ci < offs.length; ci++) {
        let src = new Uint8Array(buf, offs[ci], Math.min(cnts[ci], buf.byteLength - offs[ci]));
        if (comp === 5) src = lzw(src); else if (comp === 8 || comp === 32946) src = await inflate(src); else if (comp === 32773) src = packbits(src);
        const plane = Math.floor(ci / chunksPerPlane), k = ci % chunksPerPlane;
        const x0 = tiled ? (k % Math.ceil(W / tw)) * tw : 0, y0 = tiled ? Math.floor(k / Math.ceil(W / tw)) * th : k * th;
        const cw = tiled ? tw : W, ch = Math.min(th, H - y0), rowBytes = bps === 1 ? Math.ceil(cw * sppPlane / 8) : cw * sppPlane * Bps;
        const sdv = new DataView(src.buffer, src.byteOffset, src.byteLength);
        for (let y = 0; y < ch && y0 + y < H; y++) {
          const prevRow = new Float64Array(sppPlane);
          for (let x = 0; x < cw; x++) for (let c = 0; c < sppPlane; c++) {
            let v; const o = y * rowBytes + (x * sppPlane + c) * Bps;
            if (bps === 1) { const bi = y * rowBytes * 8 + x; v = (src[bi >> 3] >> (7 - (bi & 7))) & 1; }
            else if (o + Bps > src.length) v = 0;
            else if (bps === 8) v = fmt === 2 ? sdv.getInt8(o) : src[o];
            else if (bps === 16) v = fmt === 2 ? sdv.getInt16(o, le) : sdv.getUint16(o, le);
            else if (bps === 32) v = fmt === 3 ? sdv.getFloat32(o, le) : fmt === 2 ? sdv.getInt32(o, le) : sdv.getUint32(o, le);
            else if (bps === 64) v = sdv.getFloat64(o, le); else v = src[o];
            if (pred === 2 && x > 0 && fmt !== 3) { v = v + prevRow[c]; if (bps === 8) v &= 255; else if (bps === 16) v &= 65535; }
            prevRow[c] = v;
            const X = x0 + x, Y = y0 + y; if (X >= W) continue;
            raw[(Y * W + X) * spp + (planar === 2 ? plane : c)] = v;
          }
        }
      }
      // para 8 bits de exibição: 8 bits direto; demais pelo mínimo–máximo (como o ImageJ mostra)
      let mn = Infinity, mx = -Infinity; const colorCh = Math.min(spp, 3);
      if (bps !== 8 || fmt === 3) for (let i = 0; i < W * H; i++) for (let c = 0; c < colorCh; c++) { const v = raw[i * spp + c]; if (Number.isFinite(v)) { if (v < mn) mn = v; if (v > mx) mx = v; } }
      const sc = (v) => (bps === 8 && fmt !== 3) ? v : bps === 1 ? v * 255 : (mx > mn ? (v - mn) * 255 / (mx - mn) : 0);
      const rgba = new Uint8ClampedArray(W * H * 4), cmap = t[320];
      for (let i = 0; i < W * H; i++) {
        const o = i * 4;
        if (photo === 3 && cmap) { const v = raw[i * spp], n = 1 << bps; rgba[o] = cmap[v] >> 8; rgba[o + 1] = cmap[n + v] >> 8; rgba[o + 2] = cmap[2 * n + v] >> 8; }
        else if (spp >= 3) for (let c = 0; c < 3; c++) rgba[o + c] = sc(raw[i * spp + c]);
        else { let g = sc(raw[i * spp]); if (photo === 0) g = 255 - g; rgba[o] = rgba[o + 1] = rgba[o + 2] = g; }
        rgba[o + 3] = 255;
      }
      // calibração
      let cal = null; const desc = typeof t[270] === 'string' ? t[270] : '';
      const xr = t[282] ? t[282][0] : 0, ru = t[296] ? t[296][0] : 2;
      const um = /unit=([^\n\r]+)/.exec(desc), U = { micron: 'µm', um: 'µm', 'µm': 'µm', 'μm': 'µm', microns: 'µm', nm: 'nm', mm: 'mm', cm: 'cm', m: 'm', meter: 'm', inch: 'pol', km: 'km' };
      if (um && xr > 0) { const u = U[um[1].trim().replace(/\\/g, '').toLowerCase()]; if (u) cal = { ppu: xr, unit: u, source: 'ImageJ' }; }
      else if (ru === 3 && xr > 0) cal = { ppu: xr, unit: 'cm', source: 'TIFF' };
      let gray = null; // valores originais para medir intensidade (cinza de 16/32 bits, ou 8 bits)
      if (spp === 1 && photo !== 3) { gray = new Float32Array(W * H); for (let i = 0; i < W * H; i++) gray[i] = bps === 1 ? rgba[i * 4] : photo === 0 && bps === 8 ? 255 - raw[i] : raw[i]; } // 1 bit vira 0/255, como no ImageJ
      pages.push({ W, H, rgba, cal, bits: bps, gray });
    }
    return { pages, total };
  };

  /* ---------- Intensidade (como o ImageJ: cinza de RGB = (R+G+B)/3, sem pesos) ---------- */
  // raw: Float32Array opcional com os valores originais (TIFF de 16/32 bits); senão usa a cor.
  MM.grayAt = (rgba, raw, i) => raw ? raw[i] : Math.floor((rgba[i * 4] + rgba[i * 4 + 1] + rgba[i * 4 + 2]) / 3 + 0.5); // arredonda como o ImageJ
  MM.intensityStats = (m, rgba, W, raw) => {
    let n = 0, s = 0, s2 = 0, mn = Infinity, mx = -Infinity;
    for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) {
      if (!m.data[j * m.w + i]) continue;
      const v = MM.grayAt(rgba, raw, (j + m.y) * W + i + m.x); n++; s += v; s2 += v * v; if (v < mn) mn = v; if (v > mx) mx = v;
    }
    const mean = n ? s / n : NaN, sd = n > 1 ? Math.sqrt(Math.max(0, (s2 - s * s / n) / (n - 1))) : 0;
    return { n, mean, sd, min: n ? mn : NaN, max: n ? mx : NaN, rawIntDen: s };
  };
  // Histograma de cinza de uma máscara (ou da imagem inteira se m == null), em 256 classes.
  MM.histogram = (m, rgba, W, H, raw) => {
    const h = new Float64Array(256); let lo = 0, hi = 255;
    if (raw) { lo = Infinity; hi = -Infinity; for (let i = 0; i < W * H; i++) { if (raw[i] < lo) lo = raw[i]; if (raw[i] > hi) hi = raw[i]; } if (hi <= lo) hi = lo + 1; }
    const add = (i) => { const v = MM.grayAt(rgba, raw, i); h[Math.max(0, Math.min(255, Math.floor((v - lo) / (hi - lo) * 255.999)))]++; };
    if (m) { for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) if (m.data[j * m.w + i]) add((j + m.y) * W + i + m.x); }
    else for (let i = 0; i < W * H; i++) add(i);
    return { h, lo, hi };
  };
  // Perfil de intensidade ao longo de uma linha (amostras a cada 1 px, interpolação bilinear).
  MM.lineProfile = (rgba, W, H, l, raw) => {
    const L = Math.hypot(l[2] - l[0], l[3] - l[1]), n = Math.max(2, Math.round(L) + 1), out = [];
    // como o ImageJ no perfil: em cor, (R + G + B) / 3 sem arredondar; coordenada inteira = canto do pixel (no ImageJ, centro)
    const g = (x, y) => { const i = y * W + x; return raw ? raw[i] : (rgba[i * 4] + rgba[i * 4 + 1] + rgba[i * 4 + 2]) / 3; };
    for (let k = 0; k < n; k++) {
      const t = k / (n - 1), x = l[0] + (l[2] - l[0]) * t - 0.5, y = l[1] + (l[3] - l[1]) * t - 0.5;
      const x0 = Math.max(0, Math.min(W - 1, Math.floor(x))), y0 = Math.max(0, Math.min(H - 1, Math.floor(y))), x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(H - 1, y0 + 1);
      const fx = Math.max(0, Math.min(1, x - x0)), fy = Math.max(0, Math.min(1, y - y0));
      out.push((g(x0, y0) * (1 - fx) + g(x1, y0) * fx) * (1 - fy) + (g(x0, y1) * (1 - fx) + g(x1, y1) * fx) * fy);
    }
    return { values: out, step: L / (n - 1) };
  };
  // Perímetro da elipse (fórmula de Ramanujan, a mesma do ImageJ para seleções ovais).
  MM.ovalPerimeter = (w, h) => { const a = w / 2, b = h / 2; return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b))); };
  MM.ovalPolygon = (x, y, w, h, n) => { n = n || Math.max(180, Math.ceil(Math.PI * (w + h) / 2)); /* ~1 vértice a cada 2 px de contorno */ const pts = []; for (let k = 0; k < n; k++) { const t = 2 * Math.PI * k / n; pts.push([x + w / 2 + w / 2 * Math.cos(t), y + h / 2 + h / 2 * Math.sin(t)]); } return pts; };
  MM.angle3 = (a, v, b) => { const a1 = Math.atan2(a[1] - v[1], a[0] - v[0]), a2 = Math.atan2(b[1] - v[1], b[0] - v[0]); let d = Math.abs(a1 - a2) * 180 / Math.PI; if (d > 180) d = 360 - d; return d; };
  // Comprimento "redondo" para a barra de escala: 1, 2 ou 5 × 10^k, perto do alvo.
  MM.niceLength = (target) => { if (!(target > 0)) return 1; const e = Math.pow(10, Math.floor(Math.log10(target))), f = target / e; return (f >= 5 ? 5 : f >= 2 ? 2 : 1) * e; };

  /* ---------- Correção de iluminação desigual (subtrair fundo) ---------- */
  // Estima o fundo numa cópia reduzida: filtro de máximo (fundo claro) ou mínimo (fundo escuro) com raio ~ objeto,
  // suavização e ampliação. Fundo claro: divide (campo plano); fundo escuro: subtrai. Retorna nova imagem RGBA.
  /* ---------- Subtrair fundo: rolling ball do ImageJ ----------
     Tradução fiel de ij/plugin/filter/BackgroundSubtracter.java (ImageJ 1.54u, domínio público; algoritmo de
     Sternberg, 1983), com a mesma aritmética em float (Math.fround) para dar os mesmos valores.
     Opções equivalentes às padrão do comando Process › Subtract Background: rolling ball (não paraboloide),
     com suavização prévia 3×3. Em RGB, cada canal é tratado separadamente (opção "Separate colors"). */
  const f32 = Math.fround;
  const rbBall = (radius) => {
    let sf, trim;
    if (radius <= 10) { sf = 1; trim = 24; } else if (radius <= 30) { sf = 2; trim = 24; } else if (radius <= 100) { sf = 4; trim = 32; } else { sf = 8; trim = 40; }
    let r = radius / sf; if (r < 1) r = 1;
    const rsq = r * r, xtrim = Math.trunc(Math.trunc(trim * r) / 100), half = Math.round(r - xtrim), width = 2 * half + 1, data = new Float32Array(width * width);
    for (let y = 0, p = 0; y < width; y++) for (let x = 0; x < width; x++, p++) { const xv = x - half, yv = y - half, t = rsq - xv * xv - yv * yv; data[p] = t > 0 ? Math.sqrt(t) : 0; }
    return { data, width, sf };
  };
  const rbFilter3 = (px, len, p0, inc) => { // média de 3 (filter3, tipo MEAN)
    const third = f32(0.333333333); let v3 = px[p0], v2 = v3, v1;
    for (let i = 0, p = p0; i < len; i++, p += inc) { v1 = v2; v2 = v3; if (i < len - 1) v3 = px[p + inc]; const m = f32(f32(f32(v1 + v2) + v3) * third); if (!Number.isNaN(m)) px[p] = m; }
  };
  const rbShrink = (px, W, H, sf) => {
    const sw = Math.trunc((W + sf - 1) / sf), sh = Math.trunc((H + sf - 1) / sf), s = new Float32Array(sw * sh);
    for (let ys = 0; ys < sh; ys++) for (let xs = 0; xs < sw; xs++) {
      let mn = 3.4028234663852886e38;
      for (let j = 0, y = sf * ys; j < sf && y < H; j++, y++) for (let k = 0, x = sf * xs; k < sf && x < W; k++, x++) { const v = px[x + y * W]; if (v < mn) mn = v; }
      s[xs + ys * sw] = mn;
    }
    return { s, sw, sh };
  };
  const rbRoll = (ball, px, W, H) => {
    const zB = ball.data, bw = ball.width, rad = bw >> 1, cache = new Float32Array(W * bw), NEG = -3.4028234663852886e38;
    for (let y = -rad; y < H + rad; y++) {
      const nw = (y + rad) % bw, nr = y + rad;
      if (nr < H) { cache.set(px.subarray(nr * W, nr * W + W), nw * W); px.fill(NEG, nr * W, nr * W + W); }
      let y0 = y - rad; if (y0 < 0) y0 = 0; const yB0 = y0 - y + rad; let ye = y + rad; if (ye >= H) ye = H - 1;
      for (let x = -rad; x < W + rad; x++) {
        let z = 3.4028234663852886e38, x0 = x - rad; if (x0 < 0) x0 = 0; const xB0 = x0 - x + rad; let xe = x + rad; if (xe >= W) xe = W - 1;
        for (let yp = y0, yb = yB0; yp <= ye; yp++, yb++) { let cp = (yp % bw) * W + x0; for (let xp = x0, bp = xB0 + yb * bw; xp <= xe; xp++, cp++, bp++) { const zr = f32(cache[cp] - zB[bp]); if (z > zr) z = zr; } }
        for (let yp = y0, yb = yB0; yp <= ye; yp++, yb++) for (let xp = x0, p = xp + yp * W, bp = xB0 + yb * bw; xp <= xe; xp++, p++, bp++) { const zm = f32(z + zB[bp]); if (px[p] < zm) px[p] = zm; }
      }
    }
  };
  const rbInterp = (len, slen, sf) => {
    const idx = new Int32Array(len), w = new Float32Array(len);
    for (let i = 0; i < len; i++) { let si = Math.trunc((i - Math.trunc(sf / 2)) / sf); if (si >= slen - 1) si = slen - 2; idx[i] = si; const d = f32(f32(f32(i + 0.5) / sf) - f32(si + 0.5)); w[i] = f32(1 - d); }
    return { idx, w };
  };
  const rbEnlarge = (s, sw, sh, px, W, H, sf) => {
    const X = rbInterp(W, sw, sf), Y = rbInterp(H, sh, sf); let l0 = new Float32Array(W), l1 = new Float32Array(W);
    const fill = (line, base) => { for (let x = 0; x < W; x++) line[x] = f32(f32(s[base + X.idx[x]] * X.w[x]) + f32(s[base + X.idx[x] + 1] * f32(1 - X.w[x]))); };
    fill(l1, 0); let ys0 = -1;
    for (let y = 0; y < H; y++) {
      if (ys0 < Y.idx[y]) { const t = l0; l0 = l1; l1 = t; ys0++; fill(l1, (Y.idx[y] + 1) * sw); }
      const wt = Y.w[y]; for (let x = 0, p = y * W; x < W; x++, p++) px[p] = f32(f32(l0[x] * wt) + f32(l1[x] * f32(1 - wt)));
    }
  };
  // Fundo de um canal (Float32Array, alterado no lugar e devolvido): igual a rollingBallFloatBackground do ImageJ.
  MM.rollingBallBackground = (px, W, H, radius, light, presmooth = true) => {
    const ball = rbBall(radius);
    if (light) for (let i = 0; i < px.length; i++) px[i] = -px[i];
    if (presmooth) { for (let y = 0; y < H; y++) rbFilter3(px, W, y * W, 1); for (let x = 0; x < W; x++) rbFilter3(px, H, x, W); }
    if (ball.sf > 1) { const { s, sw, sh } = rbShrink(px, W, H, ball.sf); rbRoll(ball, s, sw, sh); rbEnlarge(s, sw, sh, px, W, H, ball.sf); } else rbRoll(ball, px, W, H);
    if (light) for (let i = 0; i < px.length; i++) px[i] = -px[i];
    return px;
  };
  // Subtrai o fundo de uma imagem de 8 bits por canal; como o ImageJ (ByteProcessor/ColorProcessor).
  MM.subtractBackground8 = (vals, bg, light) => {
    const off = light ? 255.5 : 0.5, out = new Uint8ClampedArray(vals.length);
    for (let p = 0; p < vals.length; p++) { let v = f32(f32(vals[p] - bg[p]) + off); if (v < 0) v = 0; if (v > 255) v = 255; out[p] = Math.trunc(v); }
    return out;
  };
  // RGBA inteira, canal por canal ("Separate colors"). Fundo claro ou escuro decidido pela borda da foto.
  MM.isLightBackground = (rgba, W, H) => {
    const lum = []; const step = Math.max(1, Math.floor((W + H) / 2000));
    for (let x = 0; x < W; x += step) for (const y of [0, H - 1]) { const k = (y * W + x) * 4; lum.push(rgba[k] + rgba[k + 1] + rgba[k + 2]); }
    for (let y = 0; y < H; y += step) for (const x of [0, W - 1]) { const k = (y * W + x) * 4; lum.push(rgba[k] + rgba[k + 1] + rgba[k + 2]); }
    lum.sort((a, b) => a - b); return lum[lum.length >> 1] / 3 > 110;
  };
  MM.subtractBackgroundRGBA = (rgba, W, H, radius, light) => {
    if (light === undefined) light = MM.isLightBackground(rgba, W, H);
    const out = new Uint8ClampedArray(rgba.length), N = W * H, ch = new Float32Array(N), v = new Uint8Array(N);
    for (let c = 0; c < 3; c++) {
      for (let i = 0; i < N; i++) { v[i] = rgba[i * 4 + c]; ch[i] = v[i]; }
      const r = MM.subtractBackground8(v, MM.rollingBallBackground(ch, W, H, radius, light), light);
      for (let i = 0; i < N; i++) out[i * 4 + c] = r[i];
    }
    for (let i = 0; i < N; i++) out[i * 4 + 3] = 255;
    return out;
  };

  /* ---------- Fenda de cicatrização (scratch assay) ---------- */
  // A fenda é a região lisa (pouca textura) entre as camadas de células: desvio padrão local de cinza,
  // limiar de Otsu, maior região lisa que não seja só a borda; furos preenchidos.
  MM.detectGap = (rgba, W, H, win) => {
    const N = W * H, g = new Float32Array(N); for (let i = 0; i < N; i++) g[i] = (rgba[i * 4] + rgba[i * 4 + 1] + rgba[i * 4 + 2]) / 3;
    const r = win || Math.max(4, Math.round(Math.max(W, H) / 120));
    const I = new Float64Array((W + 1) * (H + 1)), I2 = new Float64Array((W + 1) * (H + 1));
    for (let y = 0; y < H; y++) { let s = 0, s2 = 0; for (let x = 0; x < W; x++) { const v = g[y * W + x]; s += v; s2 += v * v; I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + s; I2[(y + 1) * (W + 1) + x + 1] = I2[y * (W + 1) + x + 1] + s2; } }
    const sd = new Float32Array(N); let mx = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(W, x + r + 1), y0 = Math.max(0, y - r), y1 = Math.min(H, y + r + 1), n = (x1 - x0) * (y1 - y0);
      const S1 = I[y1 * (W + 1) + x1] - I[y0 * (W + 1) + x1] - I[y1 * (W + 1) + x0] + I[y0 * (W + 1) + x0], S2 = I2[y1 * (W + 1) + x1] - I2[y0 * (W + 1) + x1] - I2[y1 * (W + 1) + x0] + I2[y0 * (W + 1) + x0];
      const v = Math.sqrt(Math.max(0, S2 / n - (S1 / n) ** 2)); sd[y * W + x] = v; if (v > mx) mx = v;
    }
    const hist = new Array(256).fill(0), q = new Uint8Array(N); for (let i = 0; i < N; i++) { q[i] = Math.min(255, Math.round(sd[i] / (mx || 1) * 255)); hist[q[i]]++; }
    const t = MM.otsu(hist), bin = new Uint8Array(N); for (let i = 0; i < N; i++) bin[i] = q[i] <= t ? 1 : 0;
    const { lab, comps } = MM.label(bin, W, H); if (!comps.length) return null;
    comps.sort((a, b) => b.area - a.area); const c = comps[0];
    if (c.area < N * 0.01) return null;
    // refinamento da borda: a janela grande "invade" a fenda; numa faixa de ±(r+2) px em volta da borda,
    // cada pixel é reclassificado com uma janela pequena (raio 2)
    const core = new Uint8Array(N); for (let i = 0; i < N; i++) core[i] = lab[i] === c.label ? 1 : 0;
    const din = MM.distanceTo(core, W, H, 0), dout = MM.distanceTo(core, W, H, 1), band = (i) => din[i] <= 2 || (dout[i] > 0 && dout[i] <= r + 2);
    const sd2 = new Float32Array(N), r2 = 2, bh = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (!band(i) && !(core[i] && din[i] > r + 3)) continue;
      const x0 = Math.max(0, x - r2), x1 = Math.min(W, x + r2 + 1), y0 = Math.max(0, y - r2), y1 = Math.min(H, y + r2 + 1), n = (x1 - x0) * (y1 - y0);
      const S1 = I[y1 * (W + 1) + x1] - I[y0 * (W + 1) + x1] - I[y1 * (W + 1) + x0] + I[y0 * (W + 1) + x0], S2 = I2[y1 * (W + 1) + x1] - I2[y0 * (W + 1) + x1] - I2[y1 * (W + 1) + x0] + I2[y0 * (W + 1) + x0];
      sd2[i] = Math.sqrt(Math.max(0, S2 / n - (S1 / n) ** 2));
    }
    // limiar: entre a textura típica da fenda (núcleo) e a das células (fora da faixa)
    const inG = [], outC = [];
    for (let i = 0; i < N; i += 3) { if (core[i] && din[i] > r + 3) inG.push(sd2[i]); }
    for (let i = 0; i < N; i += 3) if (!core[i] && dout[i] > r + 3) { const x = i % W, y = (i / W) | 0, x0 = Math.max(0, x - r2), x1 = Math.min(W, x + r2 + 1), y0 = Math.max(0, y - r2), y1 = Math.min(H, y + r2 + 1), n = (x1 - x0) * (y1 - y0);
      const S1 = I[y1 * (W + 1) + x1] - I[y0 * (W + 1) + x1] - I[y1 * (W + 1) + x0] + I[y0 * (W + 1) + x0], S2 = I2[y1 * (W + 1) + x1] - I2[y0 * (W + 1) + x1] - I2[y1 * (W + 1) + x0] + I2[y0 * (W + 1) + x0]; outC.push(Math.sqrt(Math.max(0, S2 / n - (S1 / n) ** 2))); }
    const med = (a) => { a.sort((p, q) => p - q); return a.length ? a[a.length >> 1] : 0; };
    const T2 = (med(inG) + med(outC)) / 2, fin = new Uint8Array(N);
    for (let i = 0; i < N; i++) fin[i] = band(i) ? (sd2[i] <= T2 ? 1 : 0) : core[i];
    // abertura leve (remove pontinhos lisos entre as células) e a região ligada ao núcleo
    const op = MM.distanceTo(fin, W, H, 0); for (let i = 0; i < N; i++) if (fin[i] && op[i] < 1.5 && !core[i]) fin[i] = 0;
    const { lab: l2, comps: c2 } = MM.label(fin, W, H); c2.sort((a, b) => b.area - a.area);
    // a janela pequena ainda avança cerca de r2 px na fenda: devolve essa faixa
    const keep = new Uint8Array(N); for (let i = 0; i < N; i++) keep[i] = l2[i] === c2[0].label ? 1 : 0;
    const dk = MM.distanceTo(keep, W, H, 1); for (let i = 0; i < N; i++) if (!keep[i] && dk[i] <= r2) keep[i] = 1;
    const { lab: l3, comps: c3 } = MM.label(keep, W, H); c3.sort((a, b) => b.area - a.area);
    const res = MM.fillHoles(MM.maskFromLabel(l3, W, c3[0])), n = MM.maskCount(res);
    // fenda de verdade: atravessa a foto de uma borda à outra e ocupa entre 3% e 60% dela
    const spans = res.h >= H * 0.8 || res.w >= W * 0.8;
    if (!spans || n < N * 0.03 || n > N * 0.6) return null;
    return res;
  };

  /* ---------- Bandas de gel: densidade da banda menos o fundo local ---------- */
  // rect = [x, y, w, h]. Fundo = média aparada dos pixels da moldura de 2 px em volta do retângulo.
  // dark=true: bandas escuras em fundo claro (inverte). Retorna densidade (soma de sinal acima do fundo) e fundo.
  MM.bandDensity = (rgba, W, H, rect, dark, raw) => {
    const [x0, y0, w, h] = rect.map(Math.round), ring = [];
    const val = (x, y) => { const v = MM.grayAt(rgba, raw, y * W + x); return dark ? 255 - v : v; };
    for (let y = y0 - 2; y < y0 + h + 2; y++) for (let x = x0 - 2; x < x0 + w + 2; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      if (x >= x0 && x < x0 + w && y >= y0 && y < y0 + h) continue; ring.push(val(x, y));
    }
    // fundo = média aparada da moldura (sem os 25% mais baixos e mais altos): não dá saltos de nível inteiro como a mediana
    ring.sort((a, b) => a - b); const q0 = Math.floor(ring.length * 0.25), q1 = Math.max(q0 + 1, Math.ceil(ring.length * 0.75));
    let bs = 0; for (let i = q0; i < q1; i++) bs += ring[i]; const bg = ring.length ? bs / (q1 - q0) : 0;
    // soma com sinal: o ruído abaixo do fundo compensa o de cima (sem viés)
    let s = 0, n = 0; for (let y = Math.max(0, y0); y < Math.min(H, y0 + h); y++) for (let x = Math.max(0, x0); x < Math.min(W, x0 + w); x++) { s += val(x, y) - bg; n++; }
    return { density: s, background: bg, pixels: n };
  };

  /* ---------- Transformações da foto ---------- */
  MM.rotate90 = (rgba, W, H, cw) => { const o = new Uint8ClampedArray(rgba.length); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const nx = cw ? H - 1 - y : y, ny = cw ? x : W - 1 - x, s = (y * W + x) * 4, d = (ny * H + nx) * 4; o[d] = rgba[s]; o[d + 1] = rgba[s + 1]; o[d + 2] = rgba[s + 2]; o[d + 3] = 255; } return { rgba: o, W: H, H: W }; };
  MM.flip = (rgba, W, H, horiz) => { const o = new Uint8ClampedArray(rgba.length); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const sx = horiz ? W - 1 - x : x, sy = horiz ? y : H - 1 - y, s = (sy * W + sx) * 4, d = (y * W + x) * 4; o[d] = rgba[s]; o[d + 1] = rgba[s + 1]; o[d + 2] = rgba[s + 2]; o[d + 3] = 255; } return { rgba: o, W, H }; };
  MM.crop = (rgba, W, H, r) => { const x0 = Math.max(0, Math.round(r[0])), y0 = Math.max(0, Math.round(r[1])), w = Math.min(W - x0, Math.round(r[2])), h = Math.min(H - y0, Math.round(r[3])), o = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) o.set(rgba.subarray(((y + y0) * W + x0) * 4, ((y + y0) * W + x0 + w) * 4), y * w * 4); return { rgba: o, W: w, H: h }; };
  // Rotação livre (graus, sentido horário), bilinear, aumentando a área para não cortar; cantos pretos.
  MM.rotate = (rgba, W, H, deg) => {
    const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), nW = Math.ceil(Math.abs(W * c) + Math.abs(H * s)), nH = Math.ceil(Math.abs(W * s) + Math.abs(H * c));
    const o = new Uint8ClampedArray(nW * nH * 4), cx = W / 2, cy = H / 2, ncx = nW / 2, ncy = nH / 2;
    for (let y = 0; y < nH; y++) for (let x = 0; x < nW; x++) {
      const dx = x + 0.5 - ncx, dy = y + 0.5 - ncy, sx = c * dx + s * dy + cx - 0.5, sy = -s * dx + c * dy + cy - 0.5, d = (y * nW + x) * 4; o[d + 3] = 255;
      if (sx < -0.5 || sy < -0.5 || sx > W - 0.5 || sy > H - 0.5) continue;
      const x0 = Math.max(0, Math.min(W - 1, Math.floor(sx))), y0 = Math.max(0, Math.min(H - 1, Math.floor(sy))), x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(H - 1, y0 + 1), fx = Math.max(0, Math.min(1, sx - x0)), fy = Math.max(0, Math.min(1, sy - y0));
      for (let k = 0; k < 3; k++) o[d + k] = (rgba[(y0 * W + x0) * 4 + k] * (1 - fx) + rgba[(y0 * W + x1) * 4 + k] * fx) * (1 - fy) + (rgba[(y1 * W + x0) * 4 + k] * (1 - fx) + rgba[(y1 * W + x1) * 4 + k] * fx) * fy;
    }
    return { rgba: o, W: nW, H: nH };
  };

  /* ---------- Placa: maior círculo da foto ---------- */
  // Hough de círculos por direção do gradiente numa cópia reduzida (~500 px). Retorna {cx, cy, r} ou null.
  MM.detectPlate = (rgba, W, H) => {
    const f = Math.max(1, Math.ceil(Math.max(W, H) / 500)), w = Math.floor(W / f), h = Math.floor(H / f);
    if (w < 40 || h < 40) return null;
    const gray = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s2 = 0; for (let j = 0; j < f; j++) for (let i = 0; i < f; i++) { const k = ((y * f + j) * W + x * f + i) * 4; s2 += 0.299 * rgba[k] + 0.587 * rgba[k + 1] + 0.114 * rgba[k + 2]; }
      gray[y * w + x] = s2 / (f * f);
    }
    const g2 = new Float32Array(w * h); // suavização
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { let s2 = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) s2 += gray[(y + j) * w + x + i]; g2[y * w + x] = s2 / 9; }
    const gx = new Float32Array(w * h), gy = new Float32Array(w * h), mag = new Float32Array(w * h);
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
      const i = y * w + x;
      gx[i] = g2[i - w + 1] + 2 * g2[i + 1] + g2[i + w + 1] - g2[i - w - 1] - 2 * g2[i - 1] - g2[i + w - 1];
      gy[i] = g2[i + w - 1] + 2 * g2[i + w] + g2[i + w + 1] - g2[i - w - 1] - 2 * g2[i - w] - g2[i - w + 1];
      mag[i] = Math.hypot(gx[i], gy[i]);
    }
    const sorted = Array.from(mag).filter((v) => v > 0).sort((a, b) => a - b);
    const thr = Math.max(20, sorted[Math.floor(sorted.length * 0.9)] || 0);
    const edges = []; for (let i = 0; i < w * h; i++) if (mag[i] > thr) edges.push(i);
    const rMin = Math.round(Math.min(w, h) * 0.15), rMax = Math.round(Math.max(w, h) * 0.55);
    const acc = new Float32Array(w * h);
    for (const i of edges) {
      const x = i % w, y = (i / w) | 0, dx = gx[i] / mag[i], dy = gy[i] / mag[i];
      for (let r = rMin; r <= rMax; r++) for (const sg of [1, -1]) {
        const cx = Math.round(x + sg * r * dx), cy = Math.round(y + sg * r * dy);
        if (cx >= 0 && cy >= 0 && cx < w && cy < h) acc[cy * w + cx]++;
      }
    }
    const sm = new Float32Array(w * h);
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) { let s2 = 0; for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) s2 += acc[(y + j) * w + x + i]; sm[y * w + x] = s2; }
    // até 6 picos separados
    const peaks = [], used = new Uint8Array(w * h);
    for (let k = 0; k < 6; k++) {
      let b = -1, bv = 0; for (let i = 0; i < w * h; i++) if (!used[i] && sm[i] > bv) { bv = sm[i]; b = i; }
      if (b < 0) break; peaks.push(b); const bx = b % w, by = (b / w) | 0, R = Math.round(Math.min(w, h) * 0.05);
      for (let y = Math.max(0, by - R); y < Math.min(h, by + R); y++) for (let x = Math.max(0, bx - R); x < Math.min(w, bx + R); x++) used[y * w + x] = 1;
    }
    let best = null;
    for (const c of peaks) {
      const cx = c % w, cy = (c / w) | 0, hist = new Float32Array(rMax + 3);
      for (const i of edges) {
        const x = i % w, y = (i / w) | 0, d = Math.hypot(x - cx, y - cy); if (d < rMin - 1 || d > rMax + 1) continue;
        const cs = Math.abs(((x - cx) * gx[i] + (y - cy) * gy[i]) / (d * mag[i])); if (cs < 0.85) continue;
        hist[Math.round(d)]++;
      }
      const sup = (r) => (hist[r - 1] + hist[r] + hist[r + 1]) / (2 * Math.PI * r); // fração da circunferência com borda
      let mx = 0; for (let r = rMin; r <= rMax; r++) mx = Math.max(mx, sup(r));
      if (mx < 0.7) continue; // sem círculo nítido: não é placa
      let rr = 0; for (let r = rMax; r >= rMin; r--) if (sup(r) >= Math.max(0.35, 0.6 * mx)) { rr = r; break; } // o maior círculo forte
      // cobertura angular: a borda precisa aparecer em volta do círculo, não num trecho só
      const bins = new Uint8Array(36); let inside = 0;
      for (const i of edges) { const x = i % w, y = (i / w) | 0, d = Math.hypot(x - cx, y - cy); if (Math.abs(d - rr) > 2) continue; bins[Math.floor(((Math.atan2(y - cy, x - cx) + Math.PI) / (2 * Math.PI)) * 36) % 36] = 1; }
      let cov = 0; for (let b = 0; b < 36; b++) { const a = (b + 0.5) / 36 * 2 * Math.PI - Math.PI, px = cx + rr * Math.cos(a), py = cy + rr * Math.sin(a); if (px >= 0 && py >= 0 && px < w && py < h) { inside++; cov += bins[b]; } }
      if (!inside || cov / inside < 0.6) continue;
      if (!best || mx > best.score) best = { cx, cy, r: rr, score: mx }; // centro com o círculo mais nítido
    }
    if (!best) return null;
    return { cx: (best.cx + 0.5) * f, cy: (best.cy + 0.5) * f, r: best.r * f };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MM; else root.MM = MM;
})(typeof self !== 'undefined' ? self : this);
