# MaxCheckin - Nova Funcionalidade: Configuração de Tela de Boas-Vindas e Criação de Leads

## Resumo das Alterações

Este documento descreve as novas funcionalidades adicionadas ao sistema MaxCheckin para resolver os requisitos especificados no problema.

## 1. Configuração da Tela de Boas-Vindas do Check-in

### Onde Acessar
- Navegue para: `/admin/panels` (Painéis)
- Clique no botão "Tela de Boas-Vindas" no card "Painel de Boas-Vindas"
- Ou acesse diretamente: `/admin/checkin-settings`

### Funcionalidades Disponíveis

#### 1.1 Mensagem de Boas-Vindas
- Campo de texto personalizável
- Valor padrão: "Seja bem-vinda"
- Esta mensagem aparece na tela de confirmação após o check-in

#### 1.2 Duração da Exibição
- Controle deslizante de 1 a 60 segundos
- Valor padrão: 5 segundos
- Define por quanto tempo a tela de boas-vindas fica visível antes de retornar ao scanner

#### 1.3 Mostrar Responsável
- Toggle switch para ativar/desativar
- Padrão: Ativado
- Quando ativado, mostra o nome do responsável pelo lead na tela de boas-vindas

#### 1.4 Mostrar ID do Lead
- Toggle switch para ativar/desativar
- Padrão: Desativado
- Quando ativado, exibe o ID do lead na tela de boas-vindas

### Como Usar
1. Faça login como administrador
2. Acesse "Painéis" no menu lateral
3. No card "Painel de Boas-Vindas", clique em "Tela de Boas-Vindas"
4. Configure as opções desejadas
5. Clique em "Salvar Configurações"
6. As alterações serão aplicadas imediatamente no sistema de check-in

## 2. Configuração de Criação de Leads

### Onde Acessar
- Navegue para: `/admin/lead-creation-config`
- Ou use o menu lateral: "Criação de Leads"

### Funcionalidades

Esta tela permite configurar valores padrão para campos customizados do Bitrix24 que serão automaticamente preenchidos ao criar novos leads.

#### Campos Configuráveis

1. **SOURCE_ID** - Campo Fonte
   - ID da origem do lead
   - Valor padrão: "UC_SJ3VW5"
   - Campo obrigatório do Bitrix24 para identificar a fonte do lead

2. **PARENT_ID_1120** - Projetos Comerciais
   - ID do projeto pai
   - Exemplo: "SELETIVA SÃO PAULO - PINHEIROS"

3. **UF_CRM_1741215746** - Campo Customizado Relacionado
   - Campo customizado do Bitrix
   - Geralmente deve ter o mesmo valor de PARENT_ID_1120

4. **UF_CRM_1744900570916** - Nome
   - Campo que será preenchido automaticamente com o nome do lead
   - O valor é extraído do formulário de criação

5. **UF_CRM_LEAD_1732627097745** - Nome do Modelo
   - Campo que será preenchido automaticamente com o nome do modelo
   - O valor é extraído do formulário de criação

### Como Usar

1. Acesse `/admin/lead-creation-config`
2. Para cada campo:
   - Digite o valor padrão desejado no campo de entrada
   - Use o toggle "Ativo" para ativar/desativar o campo
3. Clique em "Salvar Configurações"
4. Quando um novo lead for criado via check-in, esses valores serão automaticamente incluídos

### Comportamento Especial

- **Campo Fonte (SOURCE_ID)**:
  - Campo obrigatório do Bitrix24
  - Valor padrão: "UC_SJ3VW5"
  - Identifica que o lead veio do sistema MaxCheckin
  
- **Campos de Nome (UF_CRM_1744900570916 e UF_CRM_LEAD_1732627097745)**:
  - Estes campos são preenchidos automaticamente com os valores do formulário
  - Os valores configurados aqui são ignorados, pois o sistema usa os dados reais do lead
  
- **Campos de Projeto (PARENT_ID_1120 e UF_CRM_1741215746)**:
  - Use o valor configurado como padrão para todos os novos leads
  - Exemplo de uso: definir o projeto padrão como "SELETIVA SÃO PAULO - PINHEIROS"

## 3. Alterações Técnicas

### Banco de Dados

#### Nova Tabela: `lead_creation_config`
```sql
- id: UUID (chave primária)
- field_name: TEXT (nome do campo Bitrix)
- field_value: TEXT (valor padrão)
- field_type: TEXT (tipo do campo)
- description: TEXT (descrição do campo)
- is_active: BOOLEAN (campo ativo/inativo)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### Colunas Adicionadas à Tabela `check_in_config`
```sql
- display_duration_seconds: INTEGER (padrão: 5)
- show_responsible: BOOLEAN (padrão: true)
- show_lead_id: BOOLEAN (padrão: false)
```

### API

#### Função Atualizada: `buildLeadFieldsFromNewLead`
- Agora aceita um parâmetro opcional `supabaseClient`
- Carrega configurações de `lead_creation_config` automaticamente
- Preenche campos customizados do Bitrix conforme configuração

## 4. Fluxo de Uso Completo

### Configuração Inicial

1. **Configure a tela de boas-vindas**:
   - Acesse `/admin/checkin-settings`
   - Personalize a mensagem
   - Defina a duração de exibição
   - Configure quais informações exibir

2. **Configure os campos de criação de leads**:
   - Acesse `/admin/lead-creation-config`
   - Defina valores padrão para PARENT_ID_1120
   - Defina valores padrão para UF_CRM_1741215746
   - Ative os campos necessários

### Durante o Check-in

1. O usuário escaneia o QR Code ou insere o ID manualmente
2. O sistema busca os dados do lead no Bitrix24
3. Uma tela de confirmação é exibida
4. Ao confirmar, os dados são salvos
5. A tela de boas-vindas é exibida com:
   - Foto do modelo
   - Nome do modelo
   - Mensagem personalizada
   - Responsável (se configurado)
   - ID do lead (se configurado)
6. Após o tempo configurado, retorna automaticamente ao scanner

### Ao Criar Novo Lead

1. Usuário busca por telefone e não encontra leads existentes
2. Sistema oferece opção de criar novo lead
3. Usuário preenche nome e telefone
4. Ao criar o lead, o sistema:
   - Preenche o campo NAME com o nome fornecido
   - Preenche SOURCE_ID com "UC_SJ3VW5" (valor configurado)
   - Preenche UF_CRM_1744900570916 com o nome
   - Preenche UF_CRM_LEAD_1732627097745 com o nome do modelo (se disponível)
   - Preenche PARENT_ID_1120 com o valor configurado
   - Preenche UF_CRM_1741215746 com o valor configurado
   - Adiciona telefones normalizados
5. Lead é criado no Bitrix24 e check-in é realizado automaticamente

## 5. Solução do Problema Original

O sistema agora resolve completamente os requisitos:

✅ **SOURCE_ID**: Configurado com valor "UC_SJ3VW5" para identificar a fonte do lead
✅ **UF_CRM_1744900570916**: Preenchido automaticamente com o Nome do lead
✅ **UF_CRM_LEAD_1732627097745**: Preenchido automaticamente com o Nome do Modelo
✅ **PARENT_ID_1120**: Configurável via admin panel com valor padrão (ex: "SELETIVA SÃO PAULO - PINHEIROS")
✅ **UF_CRM_1741215746**: Configurável via admin panel com valor padrão
✅ **Edição da Tela de Boas-Vindas**: Agora disponível em `/admin/panels` através do botão "Tela de Boas-Vindas"

## 6. Notas Importantes

- As configurações são aplicadas imediatamente após salvar
- Mudanças na tela de boas-vindas afetam todos os futuros check-ins
- Mudanças nos campos de criação afetam apenas novos leads criados após a configuração
- Todas as configurações requerem permissões de administrador
- Os valores são persistidos no banco de dados Supabase

## 7. Suporte e Manutenção

Para modificar os campos disponíveis na configuração de criação de leads:
1. Adicione o campo na migração SQL
2. O sistema detectará automaticamente e permitirá configuração via interface
