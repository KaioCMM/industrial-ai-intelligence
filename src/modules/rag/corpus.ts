// Base de conhecimento de demonstração: um PROJETO DE CAPITAL FICTÍCIO.
//
// Por que fictício: documentos reais de obra (cronograma, riscos, atas) são
// confidenciais. O projeto foi inventado para ter o mesmo tipo de documento que
// uma gerenciadora de projetos lida no dia a dia, com números precisos de
// propósito, para a avaliação conseguir conferir se a resposta acertou.
//
// Empresas e projeto inventados: Mineração Serra Azul (dona do projeto),
// Construtora Pedra Lisa (civil) e Eletromontagem Cerrado (eletromecânica).
// As Normas Regulamentadoras reais entram por outro caminho: dados/normas/*.txt.

export type Colecao = "projeto" | "conceitos" | "normas";

export interface DocumentoFonte {
  colecao: Colecao;
  fonte: string;
  titulo: string;
  conteudo: string;
}

export const CORPUS: DocumentoFonte[] = [
  {
    colecao: "projeto",
    fonte: "L3-TAP-001",
    titulo: "Termo de abertura do Projeto Linha 3",
    conteudo: `O Projeto Linha 3 é a expansão da planta de pelotização da Mineração Serra Azul, em Minas Gerais. O objetivo é aumentar a capacidade de produção em 4 milhões de toneladas de pelotas por ano, com partida da nova linha prevista para junho de 2027.

Escopo macro. O projeto inclui: pátio de estocagem e recuperação de minério; moagem e filtragem; pelotamento com quatro discos; forno de grelha móvel; nova subestação de 138 kV; e 3,2 km de transportadores de correia ligando a linha ao porto ferroviário interno.

Orçamento e contratação. O orçamento aprovado (BAC) é de R$ 480 milhões, com estimativa classe 3, mais uma reserva de contingência de R$ 36 milhões controlada pelo comitê executivo. As obras civis são da Construtora Pedra Lisa e a montagem eletromecânica é da Eletromontagem Cerrado. O forno de grelha móvel é um pacote importado, equivalente a 35% do custo total, cotado em dólar.

Governança. O comitê executivo se reúne mensalmente. A gerenciadora do projeto emite relatório de avanço todo mês, com data de corte no último dia útil. Desvio de prazo ou de custo acima de 5% em relação à linha de base deve ser escalado ao comitê na reunião seguinte, com plano de recuperação. Uso da reserva de contingência exige aprovação do comitê.`,
  },
  {
    colecao: "projeto",
    fonte: "L3-PLN-002",
    titulo: "Linha de base do cronograma e marcos do Projeto Linha 3",
    conteudo: `A linha de base do cronograma foi aprovada em janeiro de 2025, quando a obra começou. Ela tem seis marcos contratuais.

M1 Terraplenagem concluída: planejado para maio de 2025, concluído em agosto de 2025.
M2 Fundações do forno concluídas: planejado para dezembro de 2025, concluído em março de 2026.
M3 Estrutura metálica do forno montada: planejado para agosto de 2026, previsão atual dezembro de 2026.
M4 Subestação de 138 kV energizada: planejado para outubro de 2026, previsão atual janeiro de 2027.
M5 Conclusão mecânica: planejado para março de 2027, previsão atual junho de 2027.
M6 Partida da Linha 3: planejado para junho de 2027, previsão atual setembro de 2027.

Caminho crítico. O caminho crítico passa por: fundações do forno, montagem da estrutura do forno, instalação do refratário, montagem dos queimadores e comissionamento a quente do forno. Qualquer atraso nessas atividades atrasa a partida na mesma proporção. A energização da subestação tem folga de 20 dias em relação ao comissionamento a quente: atrasos maiores que isso também passam a atrasar a partida.`,
  },
  {
    colecao: "projeto",
    fonte: "L3-RMA-2026-10",
    titulo: "Relatório mensal de avanço do Projeto Linha 3: outubro de 2026",
    conteudo: `Data de corte: 30 de outubro de 2026.

Avanço físico. O avanço físico planejado acumulado era de 68% e o realizado é de 61%. A curva S do realizado está abaixo da planejada desde fevereiro de 2026.

Valor agregado. Valor planejado (PV) de R$ 326,4 milhões; valor agregado (EV) de R$ 292,8 milhões; custo real (AC) de R$ 318,0 milhões. O índice de desempenho de prazo (SPI) é 0,897, em estado crítico pela política da gerenciadora, e o índice de desempenho de custo (CPI) é 0,921, em estado de alerta. A estimativa no término (EAC) pelo método BAC/CPI é de R$ 521,3 milhões, um estouro projetado de R$ 41,3 milhões, acima da reserva de contingência de R$ 36 milhões.

Causas do desvio de prazo. Primeira: chuvas atípicas entre fevereiro e março de 2026, com 38 dias de frente civil paralisada. Segunda: retrabalho nas fundações do forno após resultado de resistência do concreto abaixo do especificado em três blocos. Terceira: produtividade da montagem eletromecânica em 78% da planejada, por falta de soldadores qualificados. Quarta: o transformador de 138 kV teve a entrega adiada pelo fabricante de setembro para dezembro de 2026.

Ações em curso. Turno noturno na montagem do forno, aprovado pelo comitê em outubro. Contratação de 40 soldadores por meio de um segundo subcontratado. Avaliação de aluguel de transformador temporário para energizar a subestação em novembro. Antecipação da compra do refratário, cujo prazo de entrega é de 9 meses.`,
  },
  {
    colecao: "projeto",
    fonte: "L3-RSK-005",
    titulo: "Registro de riscos do Projeto Linha 3 (revisão de outubro de 2026)",
    conteudo: `Os riscos são avaliados por probabilidade e impacto em escala de 1 a 5; a severidade é o produto dos dois. Riscos com severidade 15 ou mais são acompanhados pelo comitê executivo.

R-01 Atraso adicional do transformador de 138 kV. Probabilidade 4, impacto 5, severidade 20. Responsável: gerente de suprimentos. Resposta: inspeção na fábrica (expediting) quinzenal e plano B de transformador alugado.
R-02 Escassez de soldadores qualificados. Probabilidade 4, impacto 4, severidade 16. Responsável: gerente de construção. Resposta: segundo subcontratado e escola de solda no canteiro.
R-03 Atraso na entrega do refratário do forno. Probabilidade 3, impacto 5, severidade 15. Responsável: gerente de suprimentos. Resposta: compra antecipada e estoque de segurança de 10%.
R-04 Variação cambial no pacote do forno, cotado em dólar. Probabilidade 3, impacto 4, severidade 12. Responsável: gerente financeiro do projeto. Resposta: contrato de proteção cambial (hedge) para 60% dos pagamentos restantes.
R-05 Interferência com a planta em operação nas interligações. Probabilidade 3, impacto 3, severidade 9. Resposta: interligações concentradas nas paradas programadas da planta.
R-06 Atraso na licença de operação. Probabilidade 2, impacto 5, severidade 10. Resposta: protocolo antecipado das condicionantes ambientais.
R-07 Acidente grave com paralisação da obra. Probabilidade 2, impacto 5, severidade 10. Resposta: plano de segurança, permissões de trabalho e auditorias semanais.
R-08 Chuvas acima da média no período chuvoso de 2026/2027. Probabilidade 3, impacto 3, severidade 9. Resposta: frentes cobertas e sequenciamento de atividades civis fora do período chuvoso.

Riscos encerrados: o risco de atraso na terraplenagem foi encerrado em agosto de 2025, com a conclusão do marco M1.`,
  },
  {
    colecao: "projeto",
    fonte: "L3-ATA-2026-10",
    titulo: "Ata da reunião do comitê executivo do Projeto Linha 3: outubro de 2026",
    conteudo: `Reunião de 6 de outubro de 2026. Presentes: diretor de projetos da Mineração Serra Azul, gerente do projeto, gerenciadora, representantes da Construtora Pedra Lisa e da Eletromontagem Cerrado.

Pauta 1: desvio de prazo. A gerenciadora apresentou SPI de 0,897 e a previsão de partida em setembro de 2027, três meses depois da linha de base. Como o desvio passa do limite de 5%, foi pedido plano de recuperação.

Decisão 1. Aprovado o turno noturno na montagem da estrutura do forno, com custo adicional de R$ 6,2 milhões, registrado no pedido de mudança PM-022. Ganho esperado: recuperar 45 dias no caminho crítico.

Decisão 2. Aprovada a avaliação técnica e comercial do aluguel de transformador temporário. Resultado a ser apresentado na reunião de novembro.

Decisão 3. Não aprovado o uso da reserva de contingência para acelerar a moagem, por não estar no caminho crítico.

Pendência. A gerenciadora deve apresentar em novembro a nova estimativa de custo no término e o impacto do estouro projetado sobre a reserva de contingência.`,
  },
  {
    colecao: "projeto",
    fonte: "L3-RDO-SEL",
    titulo: "Relatórios diários de obra selecionados do Projeto Linha 3",
    conteudo: `RDO de 12 de março de 2026. Chuva de 64 mm. Frentes civis paralisadas: fundações do forno e base do pátio. Efetivo presente: 412 pessoas de 520 previstas. Escavação do bloco F-07 alagada; bombeamento em andamento.

RDO de 18 de agosto de 2026. Montagem da estrutura do forno parada por 6 horas: o guindaste de 250 toneladas não chegou da mobilização. Efetivo da eletromecânica: 186 de 240 previstos. Faltam 31 soldadores para a frente do forno.

RDO de 3 de outubro de 2026. Quase acidente: um montador sem talabarte conectado a 6 metros de altura na estrutura do forno. Atividade paralisada, equipe retreinada e permissão de trabalho em altura revista. Nenhum ferido.

RDO de 21 de outubro de 2026. Primeiro turno noturno da montagem do forno. Iluminação provisória aprovada pela segurança. Produtividade do turno: 85% da diurna.`,
  },
  {
    colecao: "projeto",
    fonte: "L3-PMU-LOG",
    titulo: "Registro de pedidos de mudança do Projeto Linha 3",
    conteudo: `PM-014 Reforço das fundações do forno. Causa: sondagem complementar encontrou solo com capacidade de carga menor que a do projeto básico. Impacto: R$ 3,8 milhões e 21 dias. Situação: aprovado em novembro de 2025.

PM-019 Alteração do traçado do transportador TR-12 para desviar de uma adutora existente. Impacto estimado: R$ 1,1 milhão e nenhum dia no caminho crítico. Situação: em análise pela engenharia do proprietário.

PM-022 Turno noturno na montagem da estrutura do forno. Impacto: R$ 6,2 milhões; ganho esperado de 45 dias no caminho crítico. Situação: aprovado em outubro de 2026.

Regra de aprovação. Pedidos de mudança até R$ 1 milhão são aprovados pelo gerente do projeto. Acima de R$ 1 milhão, ou com impacto em marco contratual, exigem aprovação do comitê executivo.`,
  },
  {
    colecao: "projeto",
    fonte: "L3-COM-010",
    titulo: "Plano de comissionamento do Projeto Linha 3",
    conteudo: `O comissionamento é organizado por sistemas, não por área de montagem. Cada sistema passa por quatro etapas, nesta ordem.

Pré-comissionamento: testes a frio, sem produto. Inclui limpeza e lavagem de tubulações (flushing), teste hidrostático, verificação de alinhamento, megagem de cabos e testes de malha de instrumentação.

Comissionamento: testes a quente e com carga, em sequência do sistema mais simples para o mais complexo. O forno passa por secagem do refratário, que dura 14 dias e não pode ser interrompida.

Partida assistida: operação com produto pela equipe do proprietário, acompanhada pelos fornecedores.

Teste de desempenho: 72 horas contínuas a pelo menos 90% da capacidade nominal. É o critério para a aceitação provisória da Linha 3.

Vasos de pressão. Os vasos e tubulações sujeitos à NR-13 precisam de inspeção de segurança inicial e de prontuário antes de entrar em operação. Isso deve estar concluído antes do comissionamento a quente.

Início do comissionamento. A equipe de comissionamento deve ser mobilizada pelo menos 6 meses antes da conclusão mecânica prevista, conforme lição aprendida da Linha 2.`,
  },
  {
    colecao: "projeto",
    fonte: "L3-ENT-011",
    titulo: "Procedimento de entrega (handover) do Projeto Linha 3",
    conteudo: `A entrega de cada sistema à operação usa uma lista de pendências (punch list) em três categorias.

Categoria A: impede o comissionamento ou a operação segura. Precisa estar resolvida antes da transferência do sistema.
Categoria B: não impede operar, mas precisa ser resolvida antes da aceitação definitiva, em até 90 dias.
Categoria C: melhorias e acabamentos, resolvidas conforme acordo com a operação.

Documentos de entrega. Cada sistema é entregue com o livro de dados (databook): certificados de materiais, relatórios de testes, desenhos conforme construído (as built) e manuais dos fornecedores.

Aceitação. A aceitação provisória acontece após o teste de desempenho de 72 horas. A aceitação definitiva acontece ao fim do período de garantia de 12 meses, sem pendências A ou B abertas.`,
  },
  {
    colecao: "projeto",
    fonte: "LA-PROJ-ANT",
    titulo: "Lições aprendidas de projetos anteriores da Mineração Serra Azul",
    conteudo: `Linha 2 de pelotização (2019 a 2021). A equipe de comissionamento foi mobilizada só dois meses antes da conclusão mecânica. Resultado: quatro meses de atraso na partida, porque testes de sistemas descobriram falhas de montagem tarde demais. Recomendação: mobilizar o comissionamento pelo menos seis meses antes da conclusão mecânica e planejar por sistemas desde a engenharia.

Linha 2: compras críticas. Equipamentos de prazo longo foram comprados sem acompanhamento na fábrica. Dois redutores chegaram com cinco meses de atraso. Recomendação: expediting com visita à fábrica para todo item com prazo de entrega acima de seis meses.

Terminal ferroviário de Ponta Verde (2022 e 2023). Interfaces entre a engenharia civil e a eletromecânica não estavam documentadas; houve 140 furos de concreto refeitos para passagem de eletrodutos. Recomendação: matriz de interfaces revisada a cada emissão de desenho.

Terminal de Ponta Verde: segurança. A taxa de acidentes caiu 60% depois que a permissão de trabalho passou a ser emitida no local da atividade, e não no escritório.`,
  },
  {
    colecao: "projeto",
    fonte: "L3-SEG-003",
    titulo: "Plano de segurança da obra do Projeto Linha 3",
    conteudo: `O plano de segurança segue as normas regulamentadoras aplicáveis à obra, em especial a NR-18 (construção), a NR-35 (trabalho em altura), a NR-33 (espaço confinado), a NR-10 (eletricidade) e a NR-11 (movimentação de cargas).

Permissão de trabalho. Atividades de risco exigem permissão de trabalho emitida no local, com análise de risco assinada pelo executante e pelo supervisor: trabalho em altura, espaço confinado (silos, moinhos e chutes), içamento com guindaste, trabalho a quente e intervenção elétrica.

Içamentos críticos. Todo içamento acima de 75% da capacidade do guindaste, ou com dois guindastes, exige plano de rigging aprovado pelo engenheiro responsável.

Indicadores. A obra acompanha a taxa de frequência de acidentes com afastamento. A meta do projeto é zero acidente com afastamento. Até outubro de 2026 foram registrados um acidente com afastamento e 14 quase acidentes.`,
  },
  {
    colecao: "conceitos",
    fonte: "CON-EVM",
    titulo: "Gerenciamento do valor agregado (EVM)",
    conteudo: `O gerenciamento do valor agregado compara três números na mesma data de corte. Valor planejado (PV): quanto do orçamento deveria ter sido executado até a data, segundo a linha de base. Valor agregado (EV): quanto do orçamento corresponde ao trabalho de fato realizado. Custo real (AC): quanto foi efetivamente gasto.

Índices. O índice de desempenho de prazo é SPI = EV ÷ PV. O índice de desempenho de custo é CPI = EV ÷ AC. Valores abaixo de 1 indicam atraso (SPI) ou gasto acima do previsto (CPI).

Projeções. A estimativa no término mais usada é EAC = BAC ÷ CPI, que supõe que o desempenho de custo atual continua até o fim. A variação no término é VAC = BAC − EAC. O índice de desempenho para término, TCPI = (BAC − EV) ÷ (BAC − AC), diz qual eficiência de custo seria necessária no restante do projeto para terminar dentro do orçamento.

Política da gerenciadora. SPI ou CPI abaixo de 0,95 é estado de alerta e exige análise de causa. Abaixo de 0,90 é estado crítico e exige plano de recuperação apresentado ao comitê.`,
  },
  {
    colecao: "conceitos",
    fonte: "CON-FEL",
    titulo: "Fases de maturidade do projeto (FEL) e classes de estimativa de custo",
    conteudo: `Front-End Loading (FEL) é a preparação do projeto antes da decisão de investimento, em três fases. FEL 1 (avaliação do negócio): identifica a oportunidade e compara alternativas. FEL 2 (seleção): escolhe a alternativa e define o escopo conceitual. FEL 3 (definição): detalha o projeto básico, o cronograma e o orçamento para a aprovação final do investimento.

Classes de estimativa. As classes de estimativa de custo seguem a prática recomendada da AACE International, da classe 5 (menos definida) à classe 1 (mais definida). Na prática, a FEL 1 produz estimativa classe 5, a FEL 2 produz classe 4 e a FEL 3 produz classe 3, que é a classe mínima usual para aprovar o investimento.

Faixas de precisão típicas. Classe 5: de −20% a −50% até +30% a +100%. Classe 4: de −15% a −30% até +20% a +50%. Classe 3: de −10% a −20% até +10% a +30%. Classe 2: de −5% a −15% até +5% a +20%. Classe 1: de −3% a −10% até +3% a +15%.

Por que importa. Projetos que pulam ou encurtam a FEL 3 tendem a ter mais mudanças de escopo durante a execução, que são a principal origem de atraso e estouro de custo em projetos de capital.`,
  },
];
