#!/bin/sh
# Roda as comparações do núcleo de cálculo do MetricMod (src/core.js) com o ImageJ e com os valores reais.
# Requer Node 22+ e Python 3 com Pillow e NumPy. Uso: sh rodar-testes.sh  (dentro desta pasta)
# Para regenerar as referências do ImageJ, rode antes as macras .ijm no ImageJ 1.54u (veja LEIA-ME-TESTES.md).
cd "$(dirname "$0")"
for t in test-core.js test-int.js test-perfil.js test-maolivre.js test-cobertura.js test-split.js test-col.js test-persp.js test-new.js test-new2.js; do echo "== $t"; node $t; done
echo "== test-tiff.mjs"; node test-tiff.mjs
echo "== test-png16.mjs"; node test-png16.mjs
if [ -f rel/tif-g16.tif.txt ]; then echo "== test-tiff-ij.mjs"; node test-tiff-ij.mjs; fi
if [ -f rel/g0.txt ]; then echo "== rel/comp.js (cinza, Otsu, gel)"; node rel/comp.js; fi
if [ -f rel/rbD60.txt ]; then echo "== rel/rbtest.js (rolling ball)"; node rel/rbtest.js; fi
