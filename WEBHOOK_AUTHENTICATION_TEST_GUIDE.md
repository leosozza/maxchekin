# Guia de Teste - Fluxo de Autenticação do Webhook

Este documento descreve como testar o novo fluxo de autenticação para carregamento do webhook.

## Alterações Implementadas

### 1. CheckInNew.tsx
- ✅ Verificação de autenticação antes de buscar webhook do banco
- ✅ Mensagens amigáveis para usuários não autenticados
- ✅ Tratamento explícito de erros 401/403
- ✅ Preservação do cache em caso de erros
- ✅ Logs detalhados para debug

### 2. useBitrixFields.ts
- ✅ Verificação de autenticação antes de buscar webhook
- ✅ Tratamento de erros de permissão
- ✅ Logs detalhados para debug

## Cenários de Teste

### Cenário 1: Usuário Autenticado com Webhook Configurado ✅

**Passos:**
1. Faça login no sistema (Admin → Login)
2. Configure o webhook em Admin → Webhooks
3. Acesse a página de Check-in (/checkin-new)

**Resultado Esperado:**
- Console mostra: `[CHECK-IN] Verificando autenticação do usuário...`
- Console mostra: `[CHECK-IN] Usuário autenticado, buscando webhook do banco...`
- Console mostra: `[CHECK-IN] Webhook URL carregada do banco: https://...`
- Webhook é salvo no localStorage
- Scanner QR inicia normalmente
- Nenhum erro exibido ao usuário

**Logs Esperados:**
```
[CHECK-IN] Buscando webhook config...
[CHECK-IN] Webhook carregado do cache: https://...
[CHECK-IN] Verificando autenticação do usuário...
[CHECK-IN] Usuário autenticado, buscando webhook do banco...
[CHECK-IN] Webhook URL carregada do banco: https://...
[CHECK-IN] Configurações carregadas com sucesso
```

---

### Cenário 2: Usuário Não Autenticado SEM Cache ❌→ℹ️

**Passos:**
1. Certifique-se de estar deslogado
2. Limpe o localStorage: `localStorage.clear()`
3. Acesse a página de Check-in (/checkin-new)

**Resultado Esperado:**
- Console mostra: `[CHECK-IN] Verificando autenticação do usuário...`
- Console mostra: `[CHECK-IN] Usuário não autenticado - usando cache se disponível`
- Toast aparece com mensagem: **"Login necessário - Faça login para carregar o webhook do servidor."**
- Scanner não inicia (sem webhook)

**Logs Esperados:**
```
[CHECK-IN] Buscando webhook config...
[CHECK-IN] Verificando autenticação do usuário...
[CHECK-IN] Usuário não autenticado - usando cache se disponível
```

---

### Cenário 3: Usuário Não Autenticado COM Cache ℹ️→✅

**Passos:**
1. Certifique-se de estar deslogado
2. Garanta que há um webhook no cache: `localStorage.setItem('maxcheckin_webhook_url', 'https://...')`
3. Acesse a página de Check-in (/checkin-new)

**Resultado Esperado:**
- Console mostra: `[CHECK-IN] Webhook carregado do cache: https://...`
- Console mostra: `[CHECK-IN] Usuário não autenticado - usando cache se disponível`
- Console mostra: `[CHECK-IN] Usando webhook do cache (usuário não autenticado)`
- **NENHUM toast de erro** (funciona com cache)
- Scanner inicia usando o webhook do cache

**Logs Esperados:**
```
[CHECK-IN] Buscando webhook config...
[CHECK-IN] Webhook carregado do cache: https://...
[CHECK-IN] Verificando autenticação do usuário...
[CHECK-IN] Usuário não autenticado - usando cache se disponível
[CHECK-IN] Usando webhook do cache (usuário não autenticado)
[CHECK-IN] Configurações carregadas com sucesso
```

---

### Cenário 4: Usuário Autenticado SEM Permissão (RLS) 🔒

**Passos:**
1. Faça login com um usuário SEM permissão para acessar webhook_config
2. Acesse a página de Check-in (/checkin-new)

**Resultado Esperado:**
- Console mostra erro: `[CHECK-IN] Erro de permissão detectado`
- Toast aparece com mensagem: **"Sem permissão - Você não tem permissão para acessar a configuração do webhook. Entre em contato com o administrador."**
- Se houver cache, ele é mantido e usado
- Scanner pode funcionar com cache se disponível

**Logs Esperados:**
```
[CHECK-IN] Buscando webhook config...
[CHECK-IN] Webhook carregado do cache: https://... (se disponível)
[CHECK-IN] Verificando autenticação do usuário...
[CHECK-IN] Usuário autenticado, buscando webhook do banco...
[CHECK-IN] Erro ao buscar webhook: [detalhes do erro]
[CHECK-IN] Erro de permissão detectado
[CHECK-IN] Mantendo webhook do cache após erro (se disponível)
```

---

### Cenário 5: Webhook Não Encontrado no Banco (mas existe no cache) 🔄

**Passos:**
1. Faça login como admin
2. Desative ou delete todos os webhooks ativos no banco
3. Garanta que há um webhook no cache
4. Acesse a página de Check-in (/checkin-new)

**Resultado Esperado:**
- Console mostra: `[CHECK-IN] Nenhum webhook ativo encontrado no banco!`
- Console mostra: `[CHECK-IN] Mantendo webhook do cache (nenhum webhook ativo no banco)`
- **Cache NÃO é limpo**
- Scanner funciona com o webhook do cache
- Apenas um log warning, sem toast de erro

**Logs Esperados:**
```
[CHECK-IN] Buscando webhook config...
[CHECK-IN] Webhook carregado do cache: https://...
[CHECK-IN] Verificando autenticação do usuário...
[CHECK-IN] Usuário autenticado, buscando webhook do banco...
[CHECK-IN] Nenhum webhook ativo encontrado no banco!
[CHECK-IN] Mantendo webhook do cache (nenhum webhook ativo no banco)
```

---

### Cenário 6: useBitrixFields com Usuário Não Autenticado

**Passos:**
1. Certifique-se de estar deslogado
2. Acesse Admin → Field Mapping (ou qualquer página que use useBitrixFields)
3. Abra o modal de detecção de campos

**Resultado Esperado:**
- Console mostra: `[BITRIX-FIELDS] Usuário não autenticado`
- Mensagem de erro: **"Faça login para carregar os campos do Bitrix24."**
- Lista de campos não carrega

---

### Cenário 7: useBitrixFields com Erro de Permissão

**Passos:**
1. Faça login com usuário SEM permissão para webhook_config
2. Acesse Admin → Field Mapping
3. Tente abrir o modal de detecção de campos

**Resultado Esperado:**
- Console mostra: `[BITRIX-FIELDS] Erro ao buscar webhook: [erro]`
- Mensagem de erro: **"Você não tem permissão para acessar a configuração do webhook. Entre em contato com o administrador."**
- Lista de campos não carrega

---

## Verificação de Logs

Todos os logs devem estar presentes no console do navegador (F12 → Console):

### Prefixos de Log:
- `[CHECK-IN]` - Logs da página CheckInNew
- `[BITRIX-FIELDS]` - Logs do hook useBitrixFields

### Tipos de Log:
- `console.log()` - Informações normais (verde/preto)
- `console.warn()` - Avisos não críticos (amarelo)
- `console.error()` - Erros (vermelho)

---

## Cache (localStorage)

O webhook é armazenado em: `maxcheckin_webhook_url`

### Comandos úteis no Console:

```javascript
// Ver webhook no cache
localStorage.getItem('maxcheckin_webhook_url')

// Definir webhook no cache manualmente
localStorage.setItem('maxcheckin_webhook_url', 'https://your-bitrix.bitrix24.com.br/rest/123/abc')

// Limpar cache
localStorage.removeItem('maxcheckin_webhook_url')

// Limpar todo o cache
localStorage.clear()
```

---

## Comportamento Esperado do Cache

### ✅ NUNCA limpa o cache:
- Quando usuário não está autenticado
- Quando há erro de permissão (401/403)
- Quando webhook não é encontrado no banco
- Quando ocorre exceção na busca

### ✅ Atualiza o cache:
- Quando usuário autenticado busca webhook com sucesso
- Quando novo webhook é salvo em Admin → Webhooks

### ✅ Usa o cache:
- Como fallback quando não consegue buscar do banco
- Quando usuário não está autenticado
- Primeira carga antes de buscar do banco (otimização)

---

## Checklist de Validação Final

- [ ] Usuário autenticado carrega webhook normalmente
- [ ] Usuário não autenticado vê mensagem "Faça login"
- [ ] Usuário não autenticado com cache funciona normalmente
- [ ] Erro 401/403 mostra mensagem de permissão clara
- [ ] Cache nunca é apagado incorretamente
- [ ] Todos os logs aparecem com prefixos corretos
- [ ] Toast messages são amigáveis e claras
- [ ] Build passa sem erros: `npm run build`
- [ ] Sem novos erros de lint nos arquivos alterados

---

## Arquivos Modificados

1. `src/pages/CheckInNew.tsx`
   - Função `loadWebhookConfig()` reescrita
   - Documentação do fluxo adicionada no topo

2. `src/hooks/useBitrixFields.ts`
   - Verificação de autenticação adicionada
   - Tratamento de erros melhorado
   - Documentação adicionada

---

## Observações Importantes

⚠️ **RLS (Row Level Security)**
Este projeto usa RLS para proteger dados sensíveis. A tabela `webhook_config` requer autenticação para leitura. Este é o comportamento esperado e correto.

⚠️ **Cache Strategy**
O cache serve como fallback e otimização, mas a fonte de verdade é sempre o banco de dados. Para usuários autenticados, sempre busca do banco e atualiza o cache.

⚠️ **PWA Support**
Como este é um PWA, o localStorage persiste mesmo quando offline, garantindo que o webhook funcione mesmo sem conexão (para usuários que já carregaram uma vez).
