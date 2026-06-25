# Roteiro de Apresentação: Sistema Kabania (TCC)

Este roteiro organiza os pontos de destaque técnicos, arquiteturais e conceituais da plataforma **Kabania** para apresentações acadêmicas e bancas de avaliação.

---

## 1. O Conceito e Visão Geral do Sistema
O **Kabania** é uma plataforma corporativa web baseada em nuvem para gestão operacional de alta performance. Ele foi idealizado para resolver dores reais de empresas prestadoras de serviços que operam em múltiplos turnos e sofrem com a descentralização de dados, planilhas isoladas e quebra de SLAs.

Em vez de focar apenas no básico de um sistema de tarefas (CRUD), o Kabania funde **Gestão Logística de Escalas (Shifts)**, **Central de Serviços Interdepartamentais** e **Inteligência Artificial Generativa** em um único ecossistema reativo e visualmente imersivo.

---

## 2. O Grande Diferencial Inovador: A Base de Conhecimento que Responde ao Kanban
O principal trunfo técnico e diferencial inovador do Kabania é a sua **Base de Conhecimento Dinâmica integrada ativamente ao fluxo Kanban** através da IA do Gemini.

Em sistemas tradicionais, uma base de conhecimento é passiva (o usuário precisa sair da tela de trabalho para pesquisar e ler manuais longos). No Kabania, a arquitetura inverte esse paradigma por meio do mecanismo de **Scoping Temático Autônomo**:

* **Controle de Acesso por Tags RLS:** Cada instrução ou artigo da empresa cadastrado no Supabase gera "Tags de Autorização Temática" estritamente vinculadas ao ID corporativo.
* **Assistência Ativa nos Cartões:** Quando o usuário interage com um cartão no Kanban ou faz uma pergunta operacional na interface, a IA consulta em tempo real o contexto temático autorizado para aquela companhia.
* **Desobstrução e Respostas Instantâneas:** A IA atua ativamente gerando orientações curtas e diretas para a tarefa específica, estimando o esforço técnico de cartões, detectando gargalos críticos em colunas saturadas e recomendando estratégias de foco imediato (*swarming* ou reuniões de alinhamento) para destravar itens parados.

---

## 3. Arquitetura e Pilha Tecnológica (Tech Stack)

A plataforma adota o padrão de arquitetura desacoplada (SPA + BaaS), priorizando a fluidez visual com suporte nativo a respostas instantâneas em tempo real.

### Linguagens e Frameworks de Desenvolvimento
* **JavaScript / JSX (React.js + Vite):** Motor de toda a reatividade e modularização da interface. A ferramenta Vite garante um empacotamento otimizado com substituição estática ultrarrápida de variáveis de ambiente.
* **CSS Premium (Vanilla CSS):** O projeto dispensa frameworks genéricos para adotar um design system próprio e altamente sofisticado. O uso de CSS puro permite total liberdade para aplicar efeitos de *Glassmorphism*, gradientes imersivos, temas escuros elegantes e micro-animações de engajamento.
* **SQL (PostgreSQL):** Linguagem relacional robusta utilizada no backend para modelagem de alta integridade, automação via *stored procedures* e definição de **RLS (Row Level Security)** para isolamento absoluto de locatários (*multi-tenancy*).

### Infraestrutura Moderna em Nuvem

* **Vercel (Edge Network):** Distribui a aplicação estática com latência mínima mundialmente. Permite a configuração nativa de Proxies Reversos (Rewrites) no arquivo `vercel.json` para rotear chamadas de API como primeira parte, blindando a autenticação contra bloqueadores de anúncios e navegadores rígidos.
* **Supabase (BaaS PostgreSQL):** Fornece banco de dados relacional escalável, sistema de autenticação corporativo com suporte a Google SSO integrado e respostas ultrarrápidas para alimentar o cérebro da Inteligência Artificial.

---

## 4. Sugestão de Fechamento para a Apresentação
> "O Kabania comprova que é possível elevar a gestão operacional diária ao estado da arte. Ao unir uma interface visualmente deslumbrante na Vercel a um backend corporativo seguro no Supabase, e ao inovar transformando a Base de Conhecimento em um agente ativo que responde e resolve o Kanban em tempo real, entregamos uma solução completa, escalável e alinhada com o futuro da automação corporativa."
