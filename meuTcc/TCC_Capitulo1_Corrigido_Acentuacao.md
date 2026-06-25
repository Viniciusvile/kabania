# 1 INTRODUÇÃO

## 1.1 Contextualização do Problema

As empresas prestadoras de serviços que operam em múltiplos turnos — tais como Centrais de Serviços Compartilhados (CSC), operações logísticas e suporte técnico — convivem com um paradoxo silencioso: ainda que adotem metodologias ágeis visuais, como o Kanban, continuam expostas a perdas significativas de produtividade decorrentes do tempo gasto pelos operadores na busca por informação. Manuais corporativos, procedimentos operacionais padrão e regras de negócio frequentemente residem em repositórios desconexos, planilhas avulsas ou exigem o acionamento de supervisores e áreas adjacentes, gerando interrupções que rompem o fluxo de trabalho.

Esse fenômeno, designado nesta pesquisa como **Gargalo Cognitivo**, traduz-se em tempo de espera oculta (*Wait Time*), em desvios de qualidade na execução das tarefas e, sobretudo, em quebras recorrentes de *Service Level Agreements* (SLAs), com consequente exposição a multas contratuais e à corrosão da confiança dos clientes corporativos.

O Kanban tradicional, embora eficaz para dar visibilidade ao fluxo e limitar o trabalho em progresso (WIP), opera de forma passiva: o cartão informa o estado da tarefa, mas não injeta conhecimento operacional no momento da execução. A presente pesquisa parte da premissa de que essa passividade pode — e deve — ser superada pela integração nativa de Inteligência Artificial Generativa ao ciclo de vida do cartão, desde que respaldada por mecanismos sólidos de segurança multilocatário.

## 1.2 Justificativa

Estudos consolidados na literatura de gestão do conhecimento, como o relatório clássico da IDC conduzido por Feldman e Sherman (2004), apontam que trabalhadores do conhecimento e profissionais de suporte gastam entre 15% e 30% do seu tempo de trabalho apenas localizando informações descentralizadas. Quando esse percentual é projetado sobre operações corporativas com centenas de cartões diários, a perda agregada de horas-homem revela um impacto financeiro de grande magnitude.

Por outro lado, a popularização dos *Large Language Models* (LLMs) e das arquiteturas de *Retrieval-Augmented Generation* (RAG), conforme descrito por Lewis et al. (2020), inaugurou uma nova geração de assistentes capazes de transformar texto bruto em prescrições acionáveis. Contudo, sua adoção em ambientes corporativos esbarra em dois desafios críticos: (i) o custo computacional por *tokens* consumidos a cada requisição e (ii) o risco de exposição indevida de dados sensíveis entre clientes em arquiteturas multilocatário.

O Mecanismo Kabania foi concebido para endereçar simultaneamente essas duas frentes, combinando a indexação semântica do conhecimento corporativo por meio de Tags de Autorização Temática com as políticas nativas de *Row Level Security* (RLS) do PostgreSQL, garantindo que o LLM receba apenas o fragmento de conhecimento estritamente autorizado para a empresa do usuário solicitante.

## 1.3 Objetivos

### 1.3.1 Objetivo Geral

Conceber, implementar e validar o Mecanismo Kabania como evolução arquitetural do Kanban Tradicional, demonstrando, por meio de simulação computacional de eventos discretos, sua superioridade na redução do *Cycle Time* e na elevação das taxas de cumprimento de SLAs e de *First Contact Resolution* em operações corporativas multiturno.

### 1.3.2 Objetivos Específicos

*   Caracterizar, com base na literatura especializada, os componentes de tempo (*Wait Time*, *Touch Time*, *Cycle Time* e *Lead Time*) que compoem o ciclo de execução de uma tarefa em um sistema Kanban Tradicional.
*   Projetar a arquitetura lógica do Mecanismo Kabania, descrevendo a sinergia entre o backend Supabase/PostgreSQL, o frontend React/Vite, a camada de RLS e a integração com a API do Google Gemini.
*   Implementar um simulador de eventos discretos em Node.js capaz de gerar amostras estatísticas comparáveis entre o Kanban Tradicional e o Mecanismo Kabania.
*   Mensurar, sobre uma amostra de 100 cartões operacionais, os ganhos relativos nas dimensões de tempo, conformidade de SLA, FCR e consumo de *tokens*.
*   Traduzir os ganhos técnicos em projeções financeiras (ROI), fornecendo argumentos quantitativos para a defesa acadêmica e para a adoção corporativa.

## 1.4 Estrutura do Trabalho

Após esta introdução, o Capítulo 2 apresenta a fundamentação teórica que sustenta a pesquisa. O Capítulo 3 descreve a arquitetura e a modelagem do sistema Kabania. O Capítulo 4 detalha a metodologia de simulação adotada para a validação empírica. O Capítulo 5 expõe e discute os resultados obtidos, com suporte de tabelas e gráficos. O Capítulo 6 traz as considerações finais e os encaminhamentos para trabalhos futuros. Por fim, são apresentadas as Referências e o Apêndice A, contendo o código-fonte integral do simulador.
