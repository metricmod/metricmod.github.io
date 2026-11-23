import fs from 'fs'; import { execSync } from 'child_process';
const MM = (await import('../src/core.js')).default;
const ref = JSON.parse(execSync(`python3 -c "import numpy as np,json;print(json.dumps([np.load('tif/ref.npy').tolist(),np.load('tif/refrgb.npy').tolist()]))"`,{maxBuffer:1e9}).toString());
const [g, rgb] = ref, H = g.length, W = g[0].length;
const cmp = (pg, kind) => { // erro médio contra a referência (8 bits)
  let e = 0, n = 0, mx = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const o = (y * W + x) * 4;
    if (kind === 'rgb') for (let c = 0; c < 3; c++) { const d = Math.abs(pg.rgba[o + c] - rgb[y][x][c]); e += d; n++; mx = Math.max(mx, d); }
    else if (kind === 'gray') { const d = Math.abs(pg.rgba[o] - g[y][x]); e += d; n++; mx = Math.max(mx, d); } }
  return n ? `erro médio ${(e / n).toFixed(2)} máx ${mx}` : '';
};
const files = { 'g8.tif': 'gray', 'g8-lzw.tif': 'gray', 'g8-deflate.tif': 'gray', 'g8-packbits.tif': 'gray', 'rgb.tif': 'rgb', 'rgb-lzw.tif': 'rgb', 'rgb-lzw-pred.tif': 'rgb', 'rgb-tiles.tif': 'rgb', 'planar.tif': 'rgb',
  'g16.tif': 'gray16', 'g16-tiles-zlib.tif': 'gray16', 'f32.tif': 'grayf', 'bin1.tif': '', 'pal.tif': '', 'multi.tif': 'gray', 'imagej-cal.tif': 'gray', 'imagej-pilha.tif': 'gray' };
for (const [f, kind] of Object.entries(files)) {
  try {
    const b = fs.readFileSync('tif/' + f), r = await MM.decodeTIFF(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
    const p = r.pages[0];
    let extra = kind === 'gray' || kind === 'rgb' ? cmp(p, kind) : '';
    if (kind === 'gray16' || kind === 'grayf') { // compara após normalizar min–max da referência
      let mn = 255, mx2 = 0; for (const row of g) for (const v of row) { mn = Math.min(mn, v); mx2 = Math.max(mx2, v); }
      let e = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) e += Math.abs(p.rgba[(y * W + x) * 4] - (g[y][x] - mn) * 255 / (mx2 - mn)); extra = `erro médio ${(e / W / H).toFixed(2)} (após normalizar)`;
    }
    console.log(f.padEnd(20), `${p.W}×${p.H} ${p.bits} bits, ${r.total} pág.`, extra, p.cal ? `escala: ${p.cal.ppu} px/${p.cal.unit} (${p.cal.source})` : '');
  } catch (e) { console.log(f.padEnd(20), 'ERRO', e.message); }
}
