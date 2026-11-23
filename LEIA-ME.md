# MetricMod — versão 0.7.2

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
   - **Área → Retângulo / Elipse**: arraste para medir uma região retangular ou oval.
   - **Ângulo**: três cliques (ponta, vértice, ponta).
   - **Porcentagem de cobertura**: % da área (ou de uma região desenhada) coberta por planta, tecido, biofilme etc.
   - **Bandas (gel / Western blot)**: arraste um retângulo em cada banda; mostra a densidade com fundo descontado
     e o valor relativo à primeira banda. Use a imagem original (PNG/TIFF), não JPG.
   - **Perfil de intensidade**: trace uma linha e veja o gráfico do brilho ao longo dela (exporta CSV).
   - **Recortar e girar**: girar 90°, espelhar, nivelar por uma linha (horizonte), recortar.
   - **Ajustar imagem**: brilho, contraste, inverter, canal de cor, ajuste automático e corrigir iluminação irregular.
     A correção de iluminação é o rolling ball do ImageJ e não é usada na contagem de colônias. Os ajustes mudam só a visualização; marque "Usar na detecção" para a detecção usar a imagem ajustada. A medição de cor/intensidade
     usa sempre a foto original.
   - **Medir intensidade** (caixa nos resultados): acrescenta média, desvio, mínimo, máximo, IntDen, RawIntDen e CTCF às áreas
     (como no ImageJ). Para CTCF, marque uma área como "fundo" na coluna Papel.
   - **Comparar** (botão no topo, com 2+ fotos): duas fotos lado a lado com divisória arrastável.
   - **Barra de escala** (Aparência): barra com o tamanho real na imagem salva; escolha posição, cor e tamanho.
4. **Protocolos** (primeiro botão da barra): abrem a ferramenta já configurada e mostram os passos. Prontos: sementes e grãos,
   contagem de colônias, área foliar, porcentagem de cobertura, fluorescência (CTCF), cicatrização (scratch assay, com detecção
   automática da fenda e % de fechamento em relação à primeira foto do grupo) e bandas de gel.
   **Criar protocolo**: ajuste a ferramenta do seu jeito e salve com nome, descrição e passos. Fica guardado neste navegador,
   nesta cópia do programa. "Exportar" gera um arquivo `.metricmod-protocolo.json` para levar para outro computador ou passar
   ao grupo; "Importar arquivo" traz de volta. Os prontos podem ser duplicados e editados.
5. **Em lote** (quando há várias fotos):
   - "Usar esta escala em todas as fotos" (aparece depois de definir a escala).
   - "Corrigir as outras fotos do mesmo jeito": mesma correção de perspectiva, para câmera fixa na mesma posição.
   - Em Detectar objetos: "Medir em todas as fotos", com os mesmos ajustes.
   - Em Porcentagem de cobertura e Cicatrização: "Em todas as fotos".
   - Em Contar colônias: "Contar em todas as fotos", com os mesmos exemplos; a placa é detectada em cada foto.
6. **Grupo** (painel de resultados): digite o grupo/tratamento antes de medir (ex.: "Tratamento A") e as próximas medições
   entram nele. "Aplicar à foto" coloca todas as medições da foto no grupo. Também dá para trocar o grupo em cada linha.
7. **Aparência**: espessura e tipo de linha (contínua, tracejada, pontilhada), tamanho do texto, cor da medição selecionada
   e posição da legenda (junto da marcação ou em um dos quatro cantos da imagem). Vale também para a imagem salva.
8. **Resultados em**: escolha µm, mm, cm, dm, m, km, polegada ou pé; tudo é convertido.
9. **Exportar para Excel**, **Copiar tabela** ou **Salvar imagem marcada**. A planilha traz todas as fotos,
   uma linha por medição com Foto, Grupo e Escala, a lista de colônias com posição e área, e um resumo por grupo (n, média, desvio).

**Primeira vez?** "Usar fotos de exemplo" abre 5 fotos de treino (sementes com régua, placa, cicatrização 0 h e 24 h, gel),
e um tutorial curto aparece no primeiro uso (dá para rever na aba Novidades do botão i).

**No celular**: abra o mesmo arquivo no navegador do celular. As ferramentas ficam na barra de baixo, os resultados no botão
"Resultados" no topo, e o "?" mostra a explicação de cada passo. Um dedo toca e arrasta; dois dedos dão zoom e movem a imagem.

**Métodos e citação** (botão **i** no topo, ou clique no número da versão): como cada medida é calculada, com as
referências científicas; resultados da validação; texto pronto para citar (ABNT e APA) e para a metodologia; novidades
de cada versão. A versão também vai na planilha exportada, no projeto salvo e, opcionalmente, como carimbo na imagem salva.
Uso em pesquisa e ensino; não destinado a diagnóstico clínico.

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

Teste de intensidade: média, IntDen e desvio idênticos ao ImageJ. Ângulo, retângulo e elipse conferidos com valores exatos.
Cicatrização (imagens de teste): fenda detectada com erro de −2,8% e −0,4%. Gel: proporção 1 : 2,006 : 0,501 : 1,505 para 1 : 2 : 0,5 : 1,5.
Corrigir iluminação: mesmo algoritmo do Subtract Background (rolling ball) do ImageJ, com resultado idêntico pixel a pixel.

## Pastas
- `site/` — versão instalável (PWA) para publicar; veja PUBLICAR.md.
- `codigo-fonte/` — código para continuar o desenvolvimento (`build.sh` gera o MetricMod.html e a pasta site).
- `docs/imagej-comandos.tsv` — as 511 funções do ImageJ, para escolher as próximas.

## Licença
Código aberto sob a licença MIT (arquivo LICENSE). Os métodos de medição seguem o ImageJ, que é de domínio público.
