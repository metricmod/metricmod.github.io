/* MetricMod — protocolos prontos. Cada um escolhe a ferramenta, aplica ajustes e mostra os passos.
   config: campos do estado do app (sens, split, refine, fill, excl, flat, measureInt, covMode, covRoi, prefMode, role, bandDark, colParams). */
(function (root) {
  'use strict';
  root.MM_PROTOCOLS = [
    { id: 'sementes', nome: 'Sementes e grãos', ferramenta: 'detect',
      descricao: 'Mede área, comprimento, largura, circularidade e cor de cada semente ou grão, separando os que estão encostados.',
      config: { split: true, refine: true, fill: true, excl: true },
      passos: ['Defina a escala com a régua ou o objeto de referência da foto.', 'Confira a marcação colorida; se pegar fundo ou faltar parte, ajuste a sensibilidade.', 'Clique em Medir. Com várias fotos, use Medir em todas as fotos.', 'Confira cada foto pelas setas no topo e exporte a planilha.'] },
    { id: 'colonias', nome: 'Contagem de colônias', ferramenta: 'colony',
      descricao: 'Conta colônias numa placa de Petri a partir de 3 exemplos, incluindo colônias encostadas.',
      config: { colParams: { tol: 2.5, size: 3, shape: 0.2, clusters: true } },
      passos: ['Confira se a placa (círculo amarelo) foi encontrada; arraste para centralizar ou puxe a borda.', 'Clique em 3 colônias típicas, de tamanhos e tons diferentes.', 'Apague marcações erradas e acrescente as que faltaram com um clique.', 'Com várias placas, use Contar em todas as fotos.'] },
    { id: 'folha', nome: 'Área foliar', ferramenta: 'area',
      descricao: 'Área, perímetro, comprimento e largura de folhas fotografadas sobre fundo claro.',
      config: { prefMode: 'click', fill: true },
      passos: ['Defina a escala.', 'Clique dentro de cada folha: o contorno para na borda.', 'Se o contorno vazar, use Marcar fundo; se faltar parte, Marcar objeto.', 'Para muitas folhas na mesma foto, use Detectar objetos.'] },
    { id: 'cobertura', nome: 'Porcentagem de cobertura', ferramenta: 'coverage',
      descricao: 'Fração da área coberta: biofilme, coloração, cobertura vegetal, colonização, área de lesão.',
      config: { covMode: 'diff', covRoi: 'whole' },
      passos: ['Escolha a área de análise: a foto inteira ou uma região desenhada.', 'Escolha o que conta como coberto (diferente do fundo, mais escuro, mais claro ou verde).', 'Ajuste a sensibilidade até a parte colorida bater com o que você vê.', 'Clique em Medir cobertura; com várias fotos, use Medir em todas as fotos.'] },
    { id: 'ctcf', nome: 'Fluorescência de células (CTCF)', ferramenta: 'area',
      descricao: 'Fluorescência total corrigida de cada célula: densidade integrada − área × média do fundo.',
      config: { measureInt: true, prefMode: 'free', role: '' },
      passos: ['Use a imagem original do microscópio (TIFF, se possível), sem ajustes de brilho.', 'Contorne cada célula (À mão ou Clicar no objeto).', 'Troque "Marcando" para Fundo e marque 1 a 3 regiões sem células (Retângulo).', 'A coluna CTCF aparece na tabela de resultados.'] },
    { id: 'cicatrizacao', nome: 'Cicatrização (scratch assay)', ferramenta: 'area',
      descricao: 'Área da fenda em cada tempo e porcentagem de fechamento em relação ao tempo 0.',
      config: { prefMode: 'free', role: 'fenda' },
      acoes: [['gapDetect', 'Detectar a fenda nesta foto'], ['gapAll', 'Detectar em todas as fotos']],
      passos: ['Abra as fotos de um mesmo poço juntas, nomeadas na ordem dos tempos (ex.: 00h, 12h, 24h).', 'Use um grupo por poço ou condição: a 1ª foto de cada grupo é o tempo 0.', 'Clique em Detectar a fenda (ou contorne à mão). Corrija com Ajustar contorno se precisar.', 'A tabela Cicatrização mostra a área e o fechamento (%).'] },
    { id: 'bandas', nome: 'Bandas de gel e Western blot', ferramenta: 'bands',
      descricao: 'Densidade de cada banda, descontando o fundo local, relativa à banda de referência.',
      config: {},
      passos: ['Use a imagem original do gel, sem ajustes de contraste.', 'Arraste um retângulo em volta da banda de referência.', 'Clique no centro de cada outra banda para colocar retângulos do mesmo tamanho.', 'Confira se "Bandas escuras em fundo claro" está certo para o seu gel.'] },
  ];
})(typeof self !== 'undefined' ? self : this);
