---
type: MEMORY
created_at: 02/04/2026
stack: [react, vite, supabase, dnd-kit, generative-ai, recharts]
tags: [ai, dev, memory, stack, context]
---

# Configuração da Stack Técnica do Projeto Kabania

## Contexto
- **Sistema:** Frontend React 19 + Vite 7
- **Backend:** Supabase (Auth, DB, Storage)
- **Recursos Adicionais:** Drag-and-Drop, IA Generativa (Google), Visualização de Dados (Recharts), Parsing de Documentos (PDF, DOCX, CSV).

## Descricao
O projeto "Kabania" é uma aplicação React moderna de alta complexidade. A stack inclui bibliotecas para manipulação intensa de dados e documentos, além de integração direta com IA via `@google/generative-ai`.

## Erro (se existir)
N/A

## Solucao
Estrutura base refinada:
- **Core:** React 19 (última versão estável) + Vite 7.
- **Backend:** Supabase SDK v2.
- **IA:** Integração com Google Gemini para processamento cognitivo.
- **Visual:** Recharts para analytics e Lucide para iconografia.
- **Dados:** Mammoth (Word), PapaParse (CSV), PDF.js (PDF).

## Otimizacao (se aplicavel)
- **Modularização:** Criar serviços específicos para cada tipo de arquivo (PDF, DOCX, CSV) para evitar bundle size excessivo.
- **Lazy Loading:** Essencial para componentes de IA e Recharts.

## Relacionamentos (OBSIDIAN LINKS)
- [[AI_ENGINE/MEMORY/protocolo-ia-engine.md]]
- [[AI_ENGINE/CONTEXT/dependencias-principais.md]]

## Codigo
```json
{
  "dependencies": {
    "@google/generative-ai": "^0.24.1",
    "@supabase/supabase-js": "^2.99.1",
    "react": "^19.2.0",
    "recharts": "^3.8.0"
  }
}
```

## INSIGHTS DA IA
- **Padroes detectados:** Foco em processamento de documentos e inteligência artificial local/nuvem.
- **Possiveis melhorias futuras:** Implementar um "Document Processor" unificado que detecte o tipo de arquivo e use a lib correta.
- **Riscos tecnicos:** Complexidade de dependências pode gerar conflitos de versão no futuro (ex: React 19 vs libs legadas).
