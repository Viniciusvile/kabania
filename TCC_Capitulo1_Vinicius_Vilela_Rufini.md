---
title: "Trabalho de Conclusão de Curso - Etapa 1"
author: "Vinicius Vilela Rufini - RA: g73ech5"
date: "2026"
---

# TEMA DO TRABALHO
**Kabania: Plataforma Inteligente para Gestão Operacional Corporativa utilizando Inteligência Artificial e Gamificação**

---

# 1 INTRODUÇÃO

A administração operacional de empresas e prestadoras de serviços corporativos passou por uma profunda transformação nas últimas décadas. O aumento da complexidade das operações diárias, o trabalho em diferentes turnos e a sofisticação das demandas organizacionais tornaram a gestão de atividades uma tarefa crítica. Modelos tradicionais de administração, que dependem fortemente de processos manuais, planilhas descentralizadas e comunicação fragmentada, têm se mostrado ineficientes, resultando em retrabalho, perda de informações essenciais, altos custos operacionais e falhas no cumprimento de Acordos de Nível de Serviço (SLA - *Service Level Agreement*).

Com a expansão da computação em nuvem e a popularização das aplicações web modernas, o desenvolvimento de sistemas de gestão corporativa integrada tem sido crucial para a automação e otimização dessas rotinas em organizações de diversos setores. Mais recentemente, a incorporação da Inteligência Artificial (IA) generativa nesses sistemas tem aberto possibilidades sem precedentes, como a análise automatizada de grandes volumes de documentos corporativos e a geração de *insights* estratégicos a partir de relatórios diários de operação.

Nesse contexto competitivo e dinâmico, também surge o desafio de engajar e motivar as equipes operacionais. A aplicação de técnicas de gamificação — o uso de mecânicas de jogos corporativos — no ambiente de trabalho tem se destacado como uma solução eficaz para aumentar a produtividade, monitorar a performance e garantir o cumprimento de SLAs de maneira transparente, promovendo uma cultura de alta performance e meritocracia para os colaboradores de diferentes turnos e áreas.

Este Trabalho de Conclusão de Curso (TCC) no curso de Ciência da Computação pela Universidade Paulista (UNIP) apresenta a idealização, o projeto e o desenvolvimento do **Kabania**, uma plataforma web inteligente focada em suprir as lacunas do mercado na gestão operacional. A plataforma integra módulos robustos para gestão de escalas de trabalho (*shifts*), central de serviços interdepartamentais (*Service Center*), portais de clientes B2B e painéis gerenciais, aliando uma arquitetura escalável utilizando tecnologias modernas (React e Supabase) a recursos computacionais avançados de Inteligência Artificial e mecânicas de gamificação de SLAs.


## 1.1 OBJETIVOS

### 1.1.1 Objetivo Geral
Desenvolver uma plataforma web corporativa baseada em nuvem, denominada Kabania, projetada para a gestão integrada e automatizada de rotinas operacionais, escalas de trabalho e central de serviços em empresas de diversos setores, utilizando técnicas modernas de engenharia de software, Inteligência Artificial para a análise de dados processuais e gamificação para impulsionar a performance e a eficiência dos colaboradores.

### 1.1.2 Objetivos Específicos
Para alcançar o objetivo geral proposto, foram estabelecidos os seguintes objetivos específicos:
*   Projetar e arquitetar uma interface frontend reativa e responsiva utilizando o *framework* React.js e a ferramenta de *build* Vite, garantindo uma experiência de usuário (UX) intuitiva e de alta performance.
*   Integrar serviços de *Backend-as-a-Service* (BaaS) através do Supabase, implementando persistência de dados (PostgreSQL), autenticação corporativa segura e controle de acessos (RLS - *Row Level Security*).
*   Desenvolver módulos de gestão operacional flexíveis, como o agendamento logístico de escalas de trabalho (*shifts*), fluxos de atendimento via central de serviços (*Service Center*), e portal para clientes corporativos efetuarem e acompanharem solicitações.
*   Implementar funcionalidades fundamentadas em Inteligência Artificial Generativa para processar, extrair e classificar informações de arquivos corporativos extensos, bem como para enriquecer os painéis analíticos (*Dashboards*) com análises narrativas.
*   Criar um motor lógico de gamificação para avaliação de execução de SLAs alicerçado no banco de dados (*triggers* e *functions* SQL) e em funções de aplicação, parametrizando atribuições de pontuações, recompensas corporativas e níveis baseados em métricas de produtividade das equipes.


## 1.2 JUSTIFICATIVA

O desenvolvimento do sistema Kabania justifica-se tanto pela demanda corporativa transversal por ferramentas que unifiquem operações em companhias de diversos ramos, quanto pela grande relevância acadêmica e técnica perante a Ciência da Computação. 

Sob a ótica mercadológica e empresarial, administradores e gerentes de operação deparam-se habitualmente com gargalos estruturais: escalas de trabalho desalinhadas com a real cobertura de metas, falhas de sincronia entre os times de execução e a constante dificuldade de consolidar indicativos confiáveis. Quando um gestor necessita de métricas de perfomance do seu time logístico ou tenta mensurar o SLA de chamados de tecnologia e auditoria, o processo é comumente burocrático e exaustivo. A solução Kabania propõe a transição definitiva para um ecossistema digital inteligente, modernizando os processos operacionais genéricos e democratizando o acesso da Inteligência Artificial nos corredores corporativos. Ademais, reter talentos e melhorar a rotatividade (*turnover*) é um objetivo crítico para companhias de qualquer segmento; e a introdução pragmática da gamificação associada à prestação de contas dos SLAs traz o aspecto lúdico ao ambiente corporativo como motivador de eficiência e proatividade genuínas.

Sob o escopo acadêmico do curso de Ciência da Computação da UNIP, o projeto compõe o espaço ideal para a aplicação massiva de teorias fundamentais: Arquitetura de Software em Nuvem, Engenharia de Software ágil, modelagem complexa de bancos de dados relacionais para plataformas *multitenant* (múltiplas empresas), integração inteligente e escalonamento de microsserviços via APIs (particularmente LLMs e funções Lambda-like) e formulação algorítmica de pontuação para análise de comportamentos. O escopo técnico abrange a maestria de *Single Page Applications* com gerência de estado (React, Hooks) e governança em infraestrutura *Serverless*, constituindo um desafio acadêmico contemporâneo rico e integral.


## 1.3 METODOLOGIA

Para garantir o sucesso, a escabilidade e a manutenibilidade do sistema Kabania, e para propiciar a correta elaboração desta monografia, a metodologia empregada encontra seu eixo de sustentação nos pilares da Engenharia de Software atual, aliada à instrumentação de pesquisa exploratória.

### 1.3.1 Metodologia de Pesquisa
Partiu-se inicialmente de pesquisas bibliográficas e revisões de literatura através de relatórios técnicos e produções acadêmicas relacionados a metodologias de engajamento humano (Gamificação Corporativa), o impacto da Inteligência Artificial Generativa e de LLMs integrados a sistemas transacionais de negócio (*B2B Software*), além do contínuo estudo das documentações canônicas dos ecossistemas utilizados (*React*, *Supabase/PostgreSQL*, e APIs como as do *Google Generative AI*). Tais embasamentos solidificam a seleção arquitetural e certificam que a modelagem dos procedimentos sistêmicos é feita dentro das melhores condutas da ciência da informação.

### 1.3.2 Metodologia de Desenvolvimento
O processo de desenvolvimento iterativo e contínuo da aplicação web aderiu fielmente a frameworks ágeis inspirados nos fluxos do *Kanban* e do *Scrum*, definindo os seguintes compassos de maturação:
*   **Levantamento de Requisitos Empresariais:** Entendimento abrangente de requisições transversais a diversas indústrias para escalonamento, gestão de atividades, definição de privilégios corporativos e delimitação das entidades do banco de dados (ex. chamados, usuários pontuados, relatórios).
*   **Modelagem, Experiência de Usuário e Arquitetura:** Criação da topologia das rotas frontend e o mapeamento de experiências *(UX/UI Design)* consistentes ao universo *Enterprise*, pautadas em clareza operacional.
*   **Sprints de Codificação Modular:** Esforços fracionados por metas em que módulos foram desenvolvidos sob TypeScript/JavaScript (React). Paralelamente, executavam-se as rotinas complexas da base de dados, estabelecendo-se lógicas encapsuladas (exemplo da procedure `sla_gamification_setup` no PostgreSQL do Supabase).
*   **Validação Analítica e Testes:** Condução de testes ao longo da implementação das automações procedurais (Gamificação por SLAs e geração inteligente de *briefings* via IA), visando tolerar falhas em ambientes de conectividade não linear e aferir a acurácia das narrativas geradas.

Para consolidar as entregas ágeis, recorreu-se a ferramentas como *Git* para versionamento perene do repositório no *GitHub*, em pareamento ao *Vite* propiciando ambientes fluidos e instantâneos de conferência durante as codificações.


## 1.4 ESTRUTURA DO TRABALHO

A fim de proporcionar uma leitura lógica que permeie todas as fases da concepção, do desenvolvimento à conclusão em face dos objetivos propostos, a organização estrutural deste trabalho divide-se em capítulos, conforme enumerados:

**Capítulo 1 – Introdução:** É o presente capítulo, que alicerça o objetivo base do trabalho submetendo a proposta do Kabania ao mercado abrangente, determinando a motivação, as metas pretendidas pela solução acadêmica e as orientações metodológicas adotadas.

**Capítulo 2 – Fundamentação Teórica:** Este capítulo faz a devida corroboração científica e documental. Dedica-se a expor e alinhar de imediato os conceitos sobre *Software* Multilocatário (B2B SaaS), aplicações do *Machine Learning* e das Inteligências Artificiais Generativas na análise de relatórios empresariais, e os preceitos de recompensa extrínseca por meio da Gamificação. Detalha ainda os *frameworks* de construção de aplicações web modernas.

**Capítulo 3 – Análise e Modelagem:** Este fragmento é puramente de arquitetura de *software*, responsável por mapear as integrações e fluxos vitais do Kabania, listando seus requisitos funcionais e as métricas de ranqueamento gamificado. Apresenta o Diagrama de Classes, Entidade-Relacionamentos, e Casos de Uso aplicáveis a diferentes turnos e áreas operacionais, acompanhados de *wireframes* do portal de clientes e painel corporativo.

**Capítulo 4 – Implementação e Desenvolvimento:** Documenta a consolidação arquitetural dissecando passagens significativas do desenvolvimento na prática. Demonstrará *snippets* de código para mecânicas de processamento em tempo real, as avaliações de gamificação dos SLAs rodando via *triggers* e demonstrará como as APIs de IA processam e resumem de forma autônoma os documentos anexados pelo usuário final nos contextos empresariais. Serão mostrados os painéis resultantes em operação.

**Capítulo 5 – Considerações Finais:** Sintetiza os aprendizados em relação ao desenvolvimento do escopo proposto. Ponderam-se os impactos desta arquitetura no contexto corporativo idealizado, e verificam-se a concreticidade do cumprimento da proposta tecnológica somada a considerações para ciclos futuros de melhorias e integrações da plataforma Kabania.  
