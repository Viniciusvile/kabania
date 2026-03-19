# 🧠 Guia de Uso do Cérebro (Thematic Scoping)

Este documento estabelece as regras para o uso otimizado da base de conhecimento do Kabania pela IA. O objetivo é reduzir o custo de tokens e aumentar a precisão focando apenas nos Hubs relevantes.

## 🛠️ Hubs Disponíveis
1.  **operacional**: Escalas, Atividades, Colaboradores e Ambientes.
2.  **corporativo**: Projetos Kanban, Clientes (CRM) e Relatórios.
3.  **inteligencia**: Engine Gemini, RAG e Base de Conhecimento.

## 📜 Regras para o Assistente (Antigravity/Claude/Amp)

Sempre que realizar uma tarefa, identifique o tema predominante e limite sua pesquisa:

### 1. Se estiver trabalhando em Kanban ou Relatórios:
- **Priorize**: `Hub_Corporativo.md`, `Kabania_Modulos_e_Funcionalidades.md`.
- **Ignore**: Detalhes técnicos de `ShiftsModule.jsx` se não houver cruzamento direto.

### 2. Se estiver trabalhando em Escalas ou Atividades:
- **Priorize**: `Hub_Operacional.md`, `Kabania_Ecossistema_Integrado.md`.
- **Limitação**: Não carregue informações de CRM a menos que precise de dados de um cliente específico vinculado.

### 3. Se estiver trabalhando em IA ou Knowledge Base:
- **Priorize**: `Hub_Inteligencia.md`, `Kabania_Inteligencia_Artificial.md`.

## ⚙️ Regras para o Código (`geminiService.js`)
As funções de IA devem sempre passar o `hub` para a função `getAuthorizedTags`:
- `analyzeProductivity` -> hub: `corporativo`
- `predictDemand` -> hub: `operacional`
- `analyzeServiceRequest` -> hub: `operacional`

---
*Este guia é fundamental para manter o sistema econômico e assertivo.*
