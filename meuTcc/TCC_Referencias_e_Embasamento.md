# Embasamento Teórico e Referências Bibliográficas para a Banca Avaliadora

---

## 1. Nota Explicativa para o Orientador e Banca

Para assegurar a integridade científica deste Trabalho de Conclusão de Curso (TCC), ressalta-se que os dados e ganhos comparativos da **"Função Kabania"** apresentados na tese não provêm de achismos casuais, mas da aplicação formal de **Modelagem e Simulação de Eventos Discretos (Discrete-Event Simulation - DES)**. 

Os tempos de ociosidade (*Wait Time*), gargalos informacionais e aceleração assistida por IA foram parametrizados com base em métricas consolidadas na literatura de **Engenharia de Software de Processos**, **Pesquisa Operacional** e **Arquitetura de Sistemas Distribuídos**, conforme fundamentado nas referências a seguir.

---

## 2. Eixo 1: Gestão de Fluxo, Kanban e Latência Operacional

A premissa de que o Kanban tradicional acumula "Tempos de Espera Ocultos" (*Wait Time*) quando o trabalhador busca informações externas fundamenta-se nas teorias do fluxo enxuto e no custo do atraso (*Cost of Delay*).

*   **ANDERSON, David J.** *Kanban: Successful Evolutionary Change for Your Technology Business*. Sequim: Blue Hole Press, 2010.
    *   *Aplicação no TCC:* Define matematicamente os conceitos de *Lead Time*, *Cycle Time* e a importância de eliminar interrupções para manter a fluidez do sistema *Pull*.
*   **REINERTSEN, Donald G.** *The Principles of Product Development Flow: Second Generation Lean Product Development*. Redondo Beach: Celeritas Publishing, 2009.
    *   *Aplicação no TCC:* Embasamento central para demonstrar que filas invisíveis de informação e latência de decisão causam um impacto econômico devastador nas operações corporativas, justificando o ganho de velocidade injetado pelo Kabania.

---

## 3. Eixo 2: O Custo da Busca por Informação (O "Gargalo Cognitivo")

A parametrização de que um operador gasta em média de 30 a 50 minutos buscando manuais, POPs ou aguardando suporte no modelo tradicional deriva de relatórios globais sobre a ineficiência do acesso à informação corporativa.

*   **FELDMAN, Susan; SHERMAN, Chris.** *The High Cost of Not Finding Information*. IDC White Paper, 2004.
    *   *Aplicação no TCC:* Estudo clássico de mercado demonstrando que trabalhadores do conhecimento ou de suporte despendem cerca de **15% a 30% do seu tempo de trabalho** apenas procurando informações descentralizadas. Este dado ancora perfeitamente a simulação do tempo desperdiçado no "Sistema A" (Kanban comum).
*   **CHOO, Chun Wei.** *A organização do conhecimento: como as organizações usam a informação para criar significado, construir conhecimento e tomar decisões*. São Paulo: Senac, 2003.
    *   *Aplicação no TCC:* Sustenta teoricamente o conceito de que a entrega autônoma do conhecimento na interface de trabalho (como a IA faz no cartão) transforma a tomada de decisão operacional.

---

## 4. Eixo 3: Inteligência Artificial Generativa e Contextualização (RAG)

A mecânica de utilizar as **TAGS de Autorização** para recortar o contexto e injetar roteiros cirúrgicos na tarefa sem incorrer em alucinações segue o estado da arte das arquiteturas de IA baseadas em recuperação de dados.

*   **LEWIS, Patrick et al.** *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*. Em: Advances in Neural Information Processing Systems (NeurIPS), v. 33, p. 9459-9474, 2020.
    *   *Aplicação no TCC:* Artigo seminal que introduziu o paradigma **RAG**. Referência obrigatória para explicar à banca como o Kabania extrai a informação do banco de dados antes de compor o *prompt* enviado ao LLM, otimizando o consumo de *tokens* e garantindo precisão.
*   **MIN, Sewon et al.** *Rethinking the Role of Demonstrations: What Makes In-Context Learning Work?* Em: Proceedings of the 2022 Conference on Empirical Methods in Natural Language Processing (EMNLP), 2022.
    *   *Aplicação no TCC:* Demonstra que a qualidade e a estrita delimitação semântica do contexto fornecido ao modelo (viabilizada pelas TAGS do Kabania) são os fatores determinantes para o sucesso das respostas geradas.

---

## 5. Eixo 4: Segurança Multilocatário (Multi-tenancy) e Row Level Security (RLS)

O isolamento semântico que garante que a IA consulte exclusivamente os dados autorizados da empresa do usuário, sem risco de vazamento entre clientes B2B, é lastreado nos padrões canônicos de segurança relacional.

*   **POSTGRESQL GLOBAL DEVELOPMENT GROUP.** *PostgreSQL Documentation: Row Security Policies*. Disponível na documentação oficial do kernel do PostgreSQL.
    *   *Aplicação no TCC:* Referência técnica oficial comprovando que o **RLS** atua na camada mais profunda do mecanismo de banco de dados, filtrando as tuplas da tabela `knowledge_base` de forma transparente e impenetrável antes da montagem do *payload* de IA.
*   **CHONG, Frederick; CARRARO, Gianpaolo.** *Architecture Strategies for Catching the Long Tail: Multi-Tenant SaaS Architecture*. Microsoft Corporation, 2006.
    *   *Aplicação no TCC:* A literatura-base sobre isolamento de dados em softwares corporativos fornecidos como serviço (B2B SaaS).

---

## 6. Eixo 5: Validação Metodológica via Simulação Computacional

Para justificar a criação do script Node.js (`simulador_performance_tcc.js`) como ferramenta de validação da tese perante a banca, apoia-se na teoria de modelagem estocástica de sistemas.

*   **BANKS, Jerry et al.** *Discrete-Event System Simulation*. 5. ed. Upper Saddle River: Pearson, 2010.
    *   *Aplicação no TCC:* Referência máxima sobre como construir modelos de simulação computacional baseados em eventos discretos para prever o comportamento de sistemas de software e provar ganhos de eficiência em filas de atendimento antes da implantação física em larga escala.

---

## 7. Como Utilizar este Documento no TCC
1.  **Na Introdução/Metodologia:** Cite o livro de **Banks (2010)** para explicar que a validação empírica adotou simulação computacional de eventos discretos.
2.  **Na Fundamentação Teórica:** Insira as referências de **Anderson (2010)** e o estudo da **IDC (Feldman, 2004)** para justificar a ineficiência do tempo de busca manual nas organizações.
3.  **Na Arquitetura do Sistema:** Apresente o artigo de **Lewis et al. (2020)** para descrever a mecânica de RAG otimizado por RLS.
