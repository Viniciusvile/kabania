# 📅 Configuração da Integração com Calendários Externos

## 🔧 Pré-requisitos

### Google Calendar API
1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a **Google Calendar API**
4. Configure a tela de consentimento OAuth
5. Crie credenciais OAuth 2.0
6. Adicione URIs de redirecionamento:
   - `http://localhost:5173/auth/google/callback` (desenvolvimento)
   - `https://yourdomain.com/auth/google/callback` (produção)

### Microsoft Outlook API
1. Acesse o [Azure Portal](https://portal.azure.com/)
2. Registre uma nova aplicação
3. Adicione permissões: `Calendars.ReadWrite`
4. Configure redirect URIs

## ⚙️ Variáveis de Ambiente

Adicione ao seu arquivo `.env`:

```env
# Google OAuth
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_GOOGLE_CLIENT_SECRET=your-google-client-secret

# Microsoft OAuth  
VITE_OUTLOOK_CLIENT_ID=your-outlook-client-id
VITE_OUTLOOK_CLIENT_SECRET=your-outlook-client-secret
VITE_OUTLOOK_TENANT_ID=your-tenant-id
```

## 🗄️ Configuração do Banco de Dados

Execute o script SQL em seu banco Supabase:

```bash
# Conecte-se ao dashboard do Supabase
# Vá para SQL Editor e execute:
\i database/calendar_integrations_setup.sql
```

## 🚀 Uso

### Para Administradores:
1. Acesse as configurações da empresa
2. Vá para "Calendários" no menu lateral
3. Configure Google Calendar e/ou Outlook
4. Defina direção e intervalo de sincronização

### Para Usuários:
1. Crie ou edite atividades
2. Marque "Sincronizar com calendário"
3. As atividades serão automaticamente sincronizadas

## 🐛 Solução de Problemas

### Erro de Autenticação
- Verifique se as variáveis de ambiente estão corretas
- Confirme se as redirect URIs estão configuradas nos providers
- Verifique se o pop-up não está sendo bloqueado

### Erro de Permissões
- Certifique-se de que o usuário tem permissão de administrador
- Verifique as políticas RLS no Supabase

### Sincronização Falhando
- Verifique a conexão com a internet
- Confirme se as APIs estão ativadas nos providers

## 🔒 Segurança

- Tokens são armazenados com criptografia no banco
- RLS (Row Level Security) protege dados por empresa
- Refresh tokens são usados para renovação automática
- Tokens expiram automaticamente

## 📊 Monitoramento

- Logs de sincronização são salvos no `historyService`
- Status de conexão é exibido em tempo real
- Erros são registrados no console para debugging

---

**Nota**: Para produção, recomenda-se implementar um backend para lidar com o fluxo OAuth e proteger client secrets.