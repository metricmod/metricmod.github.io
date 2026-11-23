# Testes de validação do MetricMod

Tudo o que está nos relatórios e no artigo pode ser repetido com os arquivos desta pasta.

## Software de referência
ImageJ 1.54u compilado do código-fonte oficial (github.com/imagej/ImageJ, commit a376e43, 23/10/2026),
executado sem interface por `RunMacro` (`ij.IJ.runMacroFile`). Qualquer ImageJ 1.54u dá os mesmos números.

## Macros do ImageJ (geram as referências)
| Macro | Gera | Usado por |
|---|---|---|
| `gen.ijm` | `shapes.txt`, `ij_particles.csv`, `ij_poly.csv` (6 formas e polígono fracionário) | `test-core.js` |
| `ij-intensidade.ijm` | `ij_int.csv` (intensidade de 3 regiões e ângulo) | `test-int.js` |
| `rel/comp.ijm` | `rel/g*.txt`, `rel/otsu_ij.csv`, `rel/gel_ij.csv` | `rel/comp.js` |
| `rel/rb.ijm`, `rel/rb2.ijm` | `rel/rb*.txt`, `rel/rbRGB*.png` (Subtract Background) | `rel/rbtest.js`, `rel/ilum.js` |
| `ij-perfil.ijm` | `ij_perfil.csv` (perfil de 3 linhas e histogramas) | `test-perfil.js` |
| `ij-maolivre.ijm` | `ij_maolivre.csv` (seleção e linha à mão livre; pontos em `maolivre.json`, `linhalivre.json`) | `test-maolivre.js` |
| `ij-tiff.ijm` | `rel/tif-*` (TIFF de 1, 16 e 32 bits e paleta lidos pelo ImageJ) | `test-tiff-ij.mjs` |
| `rel/col.ijm` | `rel/col_ij.csv` (contagem com Analyze Particles) | relatório, Tabela 8 |

Os arquivos `.txt` grandes (imagens em texto) não vão no repositório: rode as macros para gerá-los.

## Imagens de teste e valores reais
Imagens sintéticas, geradas por computador, com o valor real registrado no momento da geração:

| Imagem | Valor real |
|---|---|
| `shapes.txt` (gerada pela macro) | formas desenhadas pelo próprio ImageJ |
| `foto-teste.png` | régua de 10 cm, sementes e folha; regiões de intensidade em `test-int.js` |
| `placa.jpg`, `placa-luz.jpg` | 60 colônias do tipo-alvo (3 pares encostados) e 15 de outro tipo; placa com centro (700; 550) e raio externo 494,5 px (`placa.json`, `placa-ex.json` = exemplos clicados) |
| `fenda.png`, `fenda2.png` | área da fenda em pixels: `fenda.txt` (72 167) e `fenda2.txt` (54 000) |
| `gel.png` | 4 bandas com quantidade de tinta na proporção 1 : 2 : 0,5 : 1,5 |
| `foto-inclinada.jpg` | objeto de 2,565 cm² fotografado em ângulo; cantos do retângulo em `incl.json` |
| `encostados.png`, `encostados-ruido.png` | objetos encostados (o ImageJ separa 18) |
| `dificil.png` | objeto com metade quase da cor do fundo: 122 485 px |
| `tif/` | 17 variações de TIFF; referência de pixels em `tif/ref.npy` e `tif/refrgb.npy` |

## Testes de interface
Os arquivos `e2e*.py` e `smoke.py` usam Playwright (Python) com Google Chrome sobre `dist/MetricMod.html`;
os caminhos absolutos no início de cada arquivo devem ser ajustados à sua máquina.
