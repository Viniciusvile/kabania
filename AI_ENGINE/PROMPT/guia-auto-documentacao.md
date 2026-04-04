---
type: PROMPT
created_at: 02/04/2026
stack: [react, vite, supabase]
tags: [ai, prompt, engine, engineering]
---

# Guia de Engenharia de Prompt para o AI ENGINE

## Contexto
- **Sistema:** Antigravity / Claude-3.5-Sonnet (ou similar)
- **Função:** Como eu devo me comportar para alimentar este sistema.

## Descricao
Para garantir que o `AI_ENGINE` continue útil, cada interação significativa deve ser documentada. Este arquivo serve como um "lembrete" de como gerar os prompts e as saídas.

## Solucao
**Checklist de Documentação:**
1. **Ao resolver um erro:** Criar `ERROR/nome-do-erro.md` e `SOLUTION/solucao-do-erro.md`.
2. **Ao criar uma nova tela:** Criar `CONTEXT/tela-x.md`.
3. **Ao otimizar uma função:** Criar `OPTIMIZATION/refactor-funcao-y.md`.

**Template de Prompt para Auto-Documentação:**
"Gere agora um arquivo para o AI ENGINE na categoria [CATEGORIA] sobre [ASSUNTO], seguindo o padrão rígido de YAML e seções estabelecido."

## Otimizacao (se aplicavel)
- Manter os nomes de arquivos em `kebab-case`.
- Sempre usar links do Obsidian para conectar erros às suas soluções.

## Relacionamentos (OBSIDIAN LINKS)
- [[AI_ENGINE/MEMORY/protocolo-ia-engine.md]]

## Codigo
```markdown
---
type: <CATEGORIA>
created_at: <DATA>
stack: [react, vite, supabase]
tags: [ai, dev, <categoria>]
---
# <TITULO>
...
```

## INSIGHTS DA IA
- **Padroes detectados:** A disciplina na documentação inicial economiza horas de "re-explicação" no futuro.
- **Possiveis melhorias futuras:** Criar um script que faz o scan da pasta `AI_ENGINE` e gera um resumo do status do projeto.
