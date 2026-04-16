---
tags: [negócio, inventário, estoque, sku, transações]
status: ativo
complexidade: média
ecossistema: negócio
---

# 📦 Módulo de Inventário

← Voltar ao [[NEG - Hub de Negócio]]

**Componentes:** `InventoryModule.jsx`, `InventoryList.jsx`, `InventoryTransactions.jsx`
**Tabelas:** `inventory`, `inventory_transactions`

---

## Propósito de Negócio

Gerencia o estoque de insumos, materiais e produtos da empresa. Rastreia entradas, saídas, alertas de estoque mínimo e histórico completo de movimentações.

---

## Entidades do Domínio

### Item de Inventário (`inventory`)
```
- Nome do item
- SKU (código único)
- Quantidade atual
- Unidade de medida (un, kg, L, cx...)
- Quantidade mínima (threshold de alerta)
- Localização (prateleira, depósito...)
- Categoria/grupo
```

### Transação (`inventory_transactions`)
```
- Item relacionado
- Tipo: entrada | saída | ajuste | transferência
- Quantidade (positiva = entrada, negativa = saída)
- Motivo/descrição
- Usuário responsável
- Timestamp
```

---

## Regras de Negócio

### Alerta de Estoque Baixo
```javascript
// Condição de alerta:
if (item.quantity <= item.min_quantity) {
  notificationService.createNotification(
    userId,
    'low_stock',
    `Estoque baixo: ${item.name} (${item.quantity} ${item.unit})`,
    { item_id: item.id }
  );
}
```

### Integridade de Estoque
- Quantidade nunca pode ser negativa
- Ajustes de inventário requerem justificativa
- Todo movimento é registrado em `inventory_transactions` (auditória)

### SKU Único
- SKU deve ser único por empresa (não globalmente)
- Sistema sugere SKU baseado no nome ao criar

---

## Tipos de Movimentação

| Tipo | Efeito | Quem usa |
|------|--------|---------|
| `entrada` | +quantidade | Recebimento de fornecedor |
| `saída` | -quantidade | Uso/consumo |
| `ajuste` | ±quantidade | Correção de inventário |
| `transferência` | move entre locais | Gestão interna |

---

## Fluxo de Movimentação

```
Admin registra movimentação
         │
         ▼
Validação: quantidade final >= 0?
         │
    ✅ Sim               ❌ Não
    │                    │
    ▼                    ▼
Atualiza quantity    Erro: "Quantidade
em inventory         insuficiente"
    │
    ▼
Insere em
inventory_transactions
    │
    ▼
Verifica alerta
de estoque mínimo
    │
    ▼
historyService.logAction()
```

---

## Importação de Inventário

Suporta importação via CSV (`fileProcessingService.js`):

```csv
nome,sku,quantidade,unidade,min_quantidade,localizacao
Luva P,LUV-P-001,500,cx,50,Almoxarifado A
Luva M,LUV-M-001,300,cx,50,Almoxarifado A
```

---

## Relatórios Disponíveis

| Relatório | Descrição |
|-----------|-----------|
| Itens abaixo do mínimo | Lista crítica de reposição |
| Histórico de movimentações | Todas as transações por período |
| Inventário por categoria | Agrupado por grupo/tipo |
| Consumo médio mensal | `AVG(saídas_mensais)` por item |
| Valor total em estoque | `SUM(quantidade * custo_unitário)` |

---

## Permissões

| Ação | Admin | Member |
|------|-------|--------|
| Ver inventário | ✅ | ✅ |
| Registrar movimentação | ✅ | ✅ |
| Criar/editar item | ✅ | ❌ |
| Deletar item | ✅ | ❌ |
| Importar CSV | ✅ | ❌ |

---

*Conectado a: [[NEG - Hub de Negócio]] | [[NEG - Sistema de Auditoria]]*
