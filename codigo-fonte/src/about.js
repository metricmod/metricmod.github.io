/* MetricMod — conteúdo do painel "Métodos e citação". Texto em HTML simples. */
(function (root) {
  'use strict';
  root.MM_ABOUT = {
    url: 'https://metricmod.github.io/',
    notice: 'Uso em pesquisa e ensino. O MetricMod não é destinado a diagnóstico clínico nem a decisões sobre tratamento de pacientes.',

    // Um bloco por ferramenta: o que é calculado, como, e de onde vem o método.
    methods: [
      { t: 'Escala (calibração espacial)',
        d: 'O usuário traça uma linha sobre um objeto de medida conhecida e informa o valor real. Pixels por unidade = comprimento da linha em pixels ÷ medida real. Todas as medidas são convertidas por esse fator; área usa o fator ao quadrado. A conversão entre unidades (nm a km, polegada, pé) é feita a partir do metro. TIFF salvo pelo ImageJ com escala é aberto já calibrado (campos <i>unit</i> e XResolution).' },
      { t: 'Correção de perspectiva',
        d: 'Os 4 cantos de um retângulo de medida conhecida definem uma homografia (transformação projetiva calculada pelo método da transformação linear direta, com 4 pares de pontos). A foto é reamostrada com interpolação bilinear de modo que o retângulo fique com proporções reais, e a escala passa a ser a do retângulo. Vale para objetos no mesmo plano do retângulo.',
        r: 'Hartley, R.; Zisserman, A. <i>Multiple View Geometry in Computer Vision</i>. 2. ed. Cambridge University Press, 2004.' },
      { t: 'Área desenhada (à mão livre e polígono)',
        d: 'O contorno é convertido em pixels com a regra do ImageJ: um pixel pertence à região quando o seu centro está dentro do contorno. Área = número de pixels × (tamanho do pixel)². Perímetro do polígono = soma dos lados; à mão livre, o traçado é suavizado por média de 3 pontos antes de medir, como no ImageJ.',
        ij: 'Mesma convenção do ImageJ 1.54 (PolygonFiller e PolygonRoi).' },
      { t: 'Área por clique no objeto',
        d: 'A imagem é suavizada (média 3×3) e a força de borda é calculada pelo operador de Sobel em cada canal de cor, usando o maior valor. A partir do ponto clicado, a região cresce absorvendo primeiro os pixels de borda mais fraca. A área em função do nível de borda tem um salto quando a região "vaza" pela borda do objeto; o contorno é a região estável logo antes do maior salto. A posição exata da borda é ajustada por watershed com marcadores, que a coloca onde a borda é mais nítida. Marcas de fundo e de objeto feitas pelo usuário restringem o resultado.',
        r: 'Beucher, S.; Meyer, F. The morphological approach to segmentation: the watershed transformation. In: Dougherty, E. (ed.). <i>Mathematical Morphology in Image Processing</i>. Marcel Dekker, 1993, p. 433–481.' },
      { t: 'Contorno magnético',
        d: 'Entre um ponto e outro clicados, o caminho segue a borda: é o caminho de menor custo (algoritmo de Dijkstra) numa imagem de custo que é baixa onde a borda é forte. O contorno final é medido como uma área desenhada.',
        r: 'Mortensen, E. N.; Barrett, W. A. Intelligent scissors for image composition. <i>Proceedings of SIGGRAPH 95</i>, 1995, p. 191–198.' },
      { t: 'Detectar objetos',
        d: 'A cor do fundo é estimada pela mediana dos pixels da borda da foto. Para cada pixel calcula-se a distância de cor até esse fundo, e o limiar que separa objeto e fundo é escolhido pelo método de Otsu (ajustável pela sensibilidade). Objetos são as regiões conectadas (vizinhança de 8 pixels), com furos opcionalmente preenchidos. Com "Refinar bordas", cada contorno é reposicionado por watershed sobre a força de borda.',
        r: 'Otsu, N. A threshold selection method from gray-level histograms. <i>IEEE Transactions on Systems, Man, and Cybernetics</i>, v. 9, n. 1, p. 62–66, 1979.' },
      { t: 'Separar objetos encostados',
        d: 'Calcula-se, para cada pixel do objeto, a distância até o fundo (mapa de distância por chanfro 3-4). A inundação parte dos pontos mais centrais; quando duas regiões com centros distintos (proeminência de pelo menos 1 pixel) se encontram, o pixel vira linha divisória. É o mesmo princípio do comando Watershed binário do ImageJ.',
        r: 'Borgefors, G. Distance transformations in digital images. <i>Computer Vision, Graphics, and Image Processing</i>, v. 34, p. 344–371, 1986.',
        ij: 'Mesmo resultado do Watershed do ImageJ 1.54 na imagem de teste (18 objetos).' },
      { t: 'Medidas de cada objeto',
        d: '<b>Área</b>: pixels × (tamanho do pixel)². <b>Perímetro</b>: contorno traçado pelas bordas dos pixels, com correção dos cantos (método do ImageJ). <b>Comprimento e largura</b>: diâmetros de Feret máximo e mínimo, calculados sobre o fecho convexo do contorno. <b>Circularidade</b>: 4π × área ÷ perímetro², de 0 a 1 (1 = círculo). <b>Cor média</b>: média de vermelho, verde e azul dos pixels do objeto.',
        ij: 'Área, Feret e Feret mínimo idênticos aos do ImageJ 1.54; perímetro com diferença máxima de 0,15%.' },
      { t: 'Comprimento e Comprimento × Largura',
        d: 'Distância em linha reta entre os pontos marcados. Em Comprimento × Largura, das duas linhas traçadas a maior é o comprimento e a menor, a largura; a razão C/L é calculada.' },
      { t: 'Contagem de colônias',
        d: 'Cada exemplo clicado é contornado como na "Área por clique". Do exemplo são aprendidos: a cor média e a variação de cor no espaço CIE L*a*b* (iluminante D65), a cor do fundo num anel de 3 a 8 pixels em volta, a área e a circularidade. Um pixel é marcado como colônia quando está dentro da tolerância de cor de algum exemplo e mais próximo da cor da colônia do que da cor do fundo. As regiões resultantes são filtradas por tamanho (faixa definida pelos exemplos) e por formato. Regiões grandes e irregulares são tratadas como colônias encostadas e contadas pela área ÷ área típica (marcadas ×2, ×3).' },
      { t: 'Detecção da placa',
        d: 'Transformada de Hough para círculos, com votos na direção do gradiente, numa cópia reduzida da foto. Entre os candidatos, escolhe-se o centro com o círculo mais nítido e, nele, o maior raio com borda forte. Só é aceito um círculo cuja borda aparece em pelo menos 60% da volta.',
        r: 'Kimme, C.; Ballard, D.; Sklansky, J. Finding circles by an array of accumulators. <i>Communications of the ACM</i>, v. 18, n. 2, p. 120–122, 1975.' },
      { t: 'Leitura de imagens',
        d: 'JPG, PNG, WebP, BMP e GIF são lidos pelo navegador. TIFF é lido pelo próprio MetricMod (sem compressão, LZW, PackBits ou Deflate; 1, 8, 16 ou 32 bits; em faixas ou blocos; várias páginas). Imagens de 16 e 32 bits são exibidas com o contraste ajustado do mínimo ao máximo, como no ImageJ; as medidas geométricas não dependem desse ajuste.' },
    ],

    // Testes já feitos (imagens sintéticas com valor real conhecido).
    validation: [
      ['Área, Feret, Feret mínimo (6 formas)', 'ImageJ 1.54u', 'idênticos', ''],
      ['Perímetro e circularidade (6 formas)', 'ImageJ 1.54u', 'até 0,15% e 0,3%', ''],
      ['Polígono com cantos fracionários', '4.812 px (ImageJ)', '4.812 px', '0%'],
      ['Feijões (elipses) por clique, foto com desfoque', 'área geométrica', '+1,1% a +1,4%', 'limiar: +1,5% a +1,9%'],
      ['Objeto com metade da cor do fundo, por clique', '122.485 px', '121.074 px', '−1,2% (limiar: −17,9%)'],
      ['Contorno magnético (feijão)', '16.415 px', '16.622 px', '+1,3%'],
      ['Foto inclinada com correção de perspectiva', '2,565 cm²', '2,598 cm²', '+1,3% (sem correção: +4,5%)'],
      ['Placa com 60 colônias, 3 pares encostados e 15 de outro tipo', '60', '60', 'também com luz irregular'],
      ['Objetos encostados (pares, trios, tamanhos diferentes)', '18 (Watershed do ImageJ)', '18', 'igual'],
      ['Detecção da placa', 'centro (700, 550), raio 494 px', 'centro (700,5, 550,5), raio 501 px', 'raio +1,4%'],
      ['Leitura de TIFF (17 variações)', 'arquivo original', 'pixels idênticos', '0'],
    ],
    validationNote: 'Testes feitos com imagens geradas por computador, em que o valor real é conhecido, e com o ImageJ 1.54u compilado do código-fonte oficial. A validação com amostras reais de laboratório está em andamento e será publicada aqui.',

    credits: [
      'Os algoritmos de medição seguem as convenções do <b>ImageJ 1.54</b> (Wayne Rasband, National Institutes of Health, EUA), que é de domínio público, e foram conferidos contra ele. O MetricMod não contém código do ImageJ e não é afiliado ao NIH nem ao projeto ImageJ.',
      'Referência do ImageJ: Schneider, C. A.; Rasband, W. S.; Eliceiri, K. W. NIH Image to ImageJ: 25 years of image analysis. <i>Nature Methods</i>, v. 9, p. 671–675, 2012.',
      'Os demais métodos estão citados junto de cada ferramenta.',
    ],

    changelog: [
      ['0.6', 'Painel "Métodos e citação" (métodos, validação, créditos, como citar); versão visível no app, na planilha, no projeto e na imagem salva.'],
      ['0.5', 'App instalável (funciona sem internet e se atualiza sozinho); salvar e abrir projeto; salvamento automático; ações em lote; separar objetos encostados; TIFF e HEIC.'],
      ['0.4', 'Placa detectada e editável; contagem de colônias com 3 exemplos; versão para celular.'],
      ['0.3', 'Várias fotos; grupos e tratamentos; correção de perspectiva; contagem de colônias.'],
      ['0.2', 'Contorno por bordas e contorno magnético; aparência das marcações e legenda; tema preto.'],
      ['0.1', 'Primeira versão: escala, área, detecção, comprimento, comprimento × largura, contagem e ajuste de contorno.'],
    ],
  };
})(typeof self !== 'undefined' ? self : this);
