// Compara a leitura de TIFF de 1, 16 e 32 bits e com paleta com a do ImageJ 1.54u (gerada por ij-tiff.ijm).
import fs from 'fs'; import { execSync } from 'child_process';
const MM = (await import('../src/core.js')).default;
const txt = (f) => fs.readFileSync(f, 'utf8').trim().split('\n').map((l) => l.split('\t').map(Number)).flat();
const png = (f) => new Uint8Array(execSync(`python3 -c "from PIL import Image;import sys;sys.stdout.buffer.write(Image.open('${f}').convert('RGBA').tobytes())"`, { maxBuffer: 1e8 }));
for (const f of ['g16.tif', 'g16-tiles-zlib.tif', 'f32.tif', 'bin1.tif', 'pal.tif']) {
  const b = fs.readFileSync('tif/' + f), p = (await MM.decodeTIFF(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength))).pages[0];
  const rf = `rel/tif-${f === 'g16-tiles-zlib.tif' ? 'g16.tif' : f}`;
  // 32 bits: o ImageJ grava os valores exatos em formato bruto (float de 32 bits, big-endian)
  const ref = fs.existsSync(rf + '.raw') ? (() => { const r = fs.readFileSync(rf + '.raw'), dv = new DataView(r.buffer, r.byteOffset, r.byteLength), a = new Float32Array(r.length / 4); for (let i = 0; i < a.length; i++) a[i] = dv.getFloat32(i * 4, false); return a; })() : txt(rf + '.txt'); let d = 0, mx = 0;
  if (p.gray) { for (let i = 0; i < ref.length; i++) { const e = Math.abs(p.gray[i] - ref[i]); if (e > 0) d++; mx = Math.max(mx, e); }
    console.log(f.padEnd(20), `valores originais (${p.bits} bits): ${d} diferentes de ${ref.length}, maior diferença ${mx}`); }
  if (fs.existsSync(`rel/tif-${f}.png`)) { const r = png(`rel/tif-${f}.png`); let d2 = 0; for (let i = 0; i < r.length; i++) if ((i & 3) !== 3 && r[i] !== p.rgba[i]) d2++;
    console.log(f.padEnd(20), `cores exibidas: ${d2} valores diferentes de ${r.length / 4 * 3}`); }
}
