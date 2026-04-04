---
type: MEMORY
created_at: 02/04/2026
stack: [react, vite, supabase]
tags: [ai, dev, memory, protocol]
---

# Protocolo do Sistema AI ENGINE

## Contexto
- **Sistema:** Base de Conhecimento Obsidian
- **Função:** Memória de Longo Prazo da IA (meu cérebro persistente)
- **Fluxo:** Registro contínuo de aprendizados durante o desenvolvimento do projeto React + Vite + Supabase.

## Descricao
Este protocolo define como eu (a IA) devo estruturar e organizar o conhecimento gerado durante a codificação. 
A relevância reside na criação de uma base de conhecimento autorreferencial que permite:
1. Evitar a repetição de erros.
2. Reutilizar soluções arquiteturais.
3. Manter o contexto do projeto vivo entre diferentes sessões de chat.

## Erro (se existir)
N/A - Este é o arquivo de fundação do sistema.

## Solucao
Implementação de uma estrutura rígida de diretórios e templates:
- `MEMORY/`: Conceitos e regras do sistema.
- `ERROR/`: Logs e causas de erros.
- `SOLUTION/`: Passo-a-passo técnico para resolver problemas.
- `OPTIMIZATION/`: Refatorações e performance.
- `CONTEXT/`: Mapeamento de telas e fluxos.
- `PROMPT/`: Comandos especializados.

## Otimizacao (se aplicavel)
Utilizar o Obsidian para visualização gráfica das conexões entre arquivos (`[[links]]`) e metadados via YAML para filtragem rápida.

## Relacionamentos (OBSIDIAN LINKS)
- [[AI_ENGINE/MEMORY/stack-tecnica.md]] (a ser criado)
- [[AI_ENGINE/PROMPT/guia-codificacao.md]] (a ser criado)

## Codigo
```powershell
# Exemplo de criação de estrutura
"MEMORY", "ERROR", "SOLUTION", "OPTIMIZATION", "CONTEXT", "PROMPT" | ForEach-Object { New-Item -ItemType Directory -Path "AI_ENGINE/$_" -Force }
```

## INSIGHTS DA IA
- **Padroes detectados:** Necessidade de documentação "just-in-time" para evitar perda de contexto.
- **Possiveis melhorias futuras:** Integração com scripts de automação para leitura automática desses arquivos ao iniciar uma nova tarefa.
- **Riscos tecnicos:** Fragmentação da informação se as tags e nomes de arquivos não forem consistentes.
