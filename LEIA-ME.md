# MetricMod — versão 0.5.2

Abra **MetricMod.html** com dois cliques (Chrome ou Edge). Funciona sem internet e sem instalar nada.
Versão instalável publicada em **https://metricmod.github.io/** (veja PUBLICAR.md).

## Como usar
1. **Abrir imagens**: uma ou várias fotos de uma vez, ou o botão de pasta para abrir uma pasta inteira. Também dá para arrastar ou colar (Ctrl+V).
   Formatos: JPG, PNG, WebP, BMP, **TIFF** (8/16/32 bits, LZW, Deflate, PackBits, em faixas ou blocos, várias páginas)
   e **HEIC** no Safari. TIFF salvo pelo ImageJ com escala já abre calibrado.
   **Salvar projeto** (ícone de disquete ou Ctrl+S) guarda fotos e medições num arquivo `.metricmod` para continuar
   depois. Além disso, o trabalho é salvo sozinho no navegador: ao abrir de novo, aparece "Continuar de onde parou".
   Com várias fotos, use as setas no topo ou PageUp/PageDown. Cada foto guarda as próprias medições.
2. **Escala**: trace uma linha sobre a régua e digite quanto ela mede. As próximas fotos usam a mesma escala até você definir outra.
   **Corrigir perspectiva**: se a foto foi tirada inclinada, clique nos 4 cantos de um retângulo de medida conhecida
   (folha A4, cartão, quadrado de referência), informe largura e altura, e a foto é endireitada com a escala já definida.
3. Escolha a medição na barra à esquerda e siga a instrução que aparece no topo:
   - **Área → Clicar no objeto**: o contorno para na borda mais nítida entre o objeto e o fundo (não depende só da cor).
     Se entrar fundo, use **Marcar fundo** (ou Alt+clique) sobre a parte errada; se faltar parte, **Marcar objeto** (ou Shift+clique).
   - **Área → Contorno magnético**: clique num ponto da borda e vá clicando ao redor; a linha gruda na borda. Enter fecha.
   - **Área → Contornar à mão** ou **Polígono**: desenho livre.
   - **Detectar objetos**: encontra e mede todos os objetos da foto de uma vez; "Refinar bordas" ajusta cada contorno à borda nítida;
     "Separar objetos encostados" divide grãos ou sementes que se tocam (mesmo método do Watershed do ImageJ).
   - **Comprimento**: informe quantos objetos; uma linha por objeto.
   - **Comprimento × Largura**: informe quantos objetos; duas linhas por objeto. A maior vira comprimento, a menor, largura.
   - **Contagem**: clique em cada item.
   - **Contar colônias**: a placa (o maior círculo da foto) é encontrada sozinha. Arraste dentro dela para centralizar
     e puxe a borda (quadradinhos amarelos) para ajustar o tamanho. Depois clique em 3 colônias de referência, de preferência
     com tamanhos e tons diferentes: o programa junta as características das três e marca todas as parecidas.
     Clique numa marcação errada para apagar, ou num ponto vazio para adicionar. Colônias encostadas aparecem como ×2, ×3.
     Mexer na placa ou nos controles refaz a contagem. "Adicionar outro exemplo" ensina mais um tipo de colônia.
   - **Ajustar contorno**: pincel/laço para completar o que faltou, borracha/laço para apagar o que passou (Alt inverte).
   - **Mover e selecionar**: arraste as pontas das linhas para corrigir.
4. **Em lote** (quando há várias fotos):
   - "Usar esta escala em todas as fotos" (aparece depois de definir a escala).
   - "Corrigir as outras fotos do mesmo jeito": mesma correção de perspectiva, para câmera fixa na mesma posição.
   - Em Detectar objetos: "Medir em todas as fotos", com os mesmos ajustes.
   - Em Contar colônias: "Contar em todas as fotos", com os mesmos exemplos; a placa é detectada em cada foto.
5. **Grupo** (painel de resultados): digite o grupo/tratamento antes de medir (ex.: "Tratamento A") e as próximas medições
   entram nele. "Aplicar à foto" coloca todas as medições da foto no grupo. Também dá para trocar o grupo em cada linha.
6. **Aparência**: espessura e tipo de linha (contínua, tracejada, pontilhada), tamanho do texto, cor da medição selecionada
   e posição da legenda (junto da marcação ou em um dos quatro cantos da imagem). Vale também para a imagem salva.
7. **Resultados em**: escolha µm, mm, cm, dm, m, km, polegada ou pé; tudo é convertido.
8. **Exportar para Excel**, **Copiar tabela** ou **Salvar imagem marcada**. A planilha traz todas as fotos,
   uma linha por medição com Foto, Grupo e Escala, a lista de colônias com posição e área, e um resumo por grupo (n, média, desvio).

**No celular**: abra o mesmo arquivo no navegador do celular. As ferramentas ficam na barra de baixo, os resultados no botão
"Resultados" no topo, e o "?" mostra a explicação de cada passo. Um dedo toca e arrasta; dois dedos dão zoom e movem a imagem.

Atalhos: roda do mouse = zoom · botão direito ou Espaço + arrastar = mover a imagem · Ctrl+Z / Ctrl+Y · Delete apaga a medição selecionada · Esc cancela · 0 ajusta à janela.

## Precisão
Os cálculos seguem os algoritmos do ImageJ 1.54u e foram conferidos contra ele:
área, Feret (comprimento) e Feret mínimo (largura) idênticos; perímetro com diferença máxima de 0,15%.
Nas áreas, "Comprimento" e "Largura" são o maior e o menor diâmetro (Feret), como no ImageJ.

Teste de objetos encostados: 18 objetos, o mesmo resultado do Watershed do ImageJ na mesma imagem.
Teste de TIFF: 17 variações (compressões, 1 a 32 bits, blocos, paleta, várias páginas) lidas idênticas à referência.

Teste de colônias (placa com 60 colônias, 3 pares encostados e 15 colônias de outro tipo, com e sem iluminação irregular): 60 de 60.
Teste de perspectiva (foto inclinada): erro na área caiu de 4,5% para 1,3%, igual à foto tirada de frente.

Teste de contorno (objeto com metade quase da cor do fundo): método por cor errava −17,9%; clique no objeto erra −0,03%.

## Pastas
- `site/` — versão instalável (PWA) para publicar; veja PUBLICAR.md.
- `codigo-fonte/` — código para continuar o desenvolvimento (`build.sh` gera o MetricMod.html e a pasta site).
- `docs/imagej-comandos.tsv` — as 511 funções do ImageJ, para escolher as próximas.
