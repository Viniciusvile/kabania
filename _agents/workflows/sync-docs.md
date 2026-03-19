---
description: Sincronização automática de documentação modular no Obsidian após mudanças no código.
---

// turbo-all
# Workflow: Sincronização de Documentação Viva

Este workflow deve ser executado por qualquer agente da Antigravity/Ralph após a implementação de novas funcionalidades, mudanças no banco de dados ou otimizações de design.

## Passo a Passo

1. **Analisar as Mudanças**: Identifique quais ecossistemas foram afetados (Segurança, Design, Módulos ou IA).
2. **Atualizar Obsidian (Código -> Notas)**:
   Execute o script de sincronização técnica para gerar novos Snapshots:
   ```bash
   node scripts/kabania_to_obsidian.js
   ```
3. **Atualizar Base de Conhecimento (Notas -> Supabase)**:
   Execute o script de upload para treinar o cérebro do sistema com os novos dados:
   ```bash
   node scripts/obsidian_to_kabania.js
   ```
4. **Verificar Notas**: Certifique-se de que os novos Snapshots Técnicos foram anexados corretamente na pasta `TEste/teste/`.

> [!IMPORTANT]
> Nunca termine uma tarefa de implementação sem rodar este ciclo de sincronização. A documentação deve ser a "Verdade Técnica" do projeto.
