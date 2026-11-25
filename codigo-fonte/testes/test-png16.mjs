// PNG de 16 bits em cinza (normal e entrelaçado, com filtros): valores lidos pelo MetricMod × ImageJ 1.54u (ij-png.ijm).
import fs from 'fs'; const MM = (await import('../src/core.js')).default;
for (const f of ['g16.png', 'g16-inter.png']) {
  const b = fs.readFileSync('png/' + f), p = await MM.decodePNG16(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  const ref = fs.readFileSync(`png/ij-${f}.txt`, 'utf8').trim().split('\n').flatMap((l) => l.split('\t').map(Number));
  let d = 0; for (let i = 0; i < ref.length; i++) if (p.gray[i] !== ref[i]) d++;
  console.log(`${f}: ${p.W}×${p.H}, ${p.bits} bits, valores diferentes do ImageJ: ${d} de ${ref.length}`);
}
const n = await MM.decodePNG16(fs.readFileSync('png/rgb.png').buffer); console.log('PNG colorido de 8 bits fica com o navegador:', n === null);
