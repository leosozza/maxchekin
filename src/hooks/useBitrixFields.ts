import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * HOOK PARA BUSCAR CAMPOS DO BITRIX24
 * 
 * FLUXO DE CARREGAMENTO:
 * 1. Verifica se o usuário está autenticado (supabase.auth.getSession())
 * 2. Se NÃO AUTENTICADO:
 *    - Retorna erro solicitando login
 * 3. Se AUTENTICADO:
 *    - Busca o webhook ativo do banco (webhook_config)
 *    - Se houver erro de permissão (401/403), retorna mensagem clara
 *    - Busca os campos do Bitrix24 via API
 * 4. Todos os passos são logados com prefixo [BITRIX-FIELDS]
 * 
 * CACHE:
 * - Os campos são cacheados por 5 minutos (staleTime)
 * - Em caso de erro, tenta 2 vezes antes de desistir (retry: 2)
 */

interface BitrixField {
  name: string;
  title: string;
  type: string;
}

export function useBitrixFields() {
  return useQuery({
    queryKey: ["bitrix-fields"],
    queryFn: async () => {
      console.log("[BITRIX-FIELDS] Iniciando busca de campos do Bitrix...");
      
      // Verificar se há sessão de usuário autenticado antes de buscar do banco
      console.log("[BITRIX-FIELDS] Verificando autenticação do usuário...");
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("[BITRIX-FIELDS] Erro ao verificar sessão:", sessionError);
        throw new Error("Erro ao verificar autenticação. Faça login novamente.");
      }
      
      if (!sessionData?.session) {
        console.error("[BITRIX-FIELDS] Usuário não autenticado");
        throw new Error("Faça login para carregar os campos do Bitrix24.");
      }
      
      console.log("[BITRIX-FIELDS] Usuário autenticado, buscando webhook...");
      
      // Get webhook URL from database
      const { data: config, error: configError } = await supabase
        .from("webhook_config")
        .select("bitrix_webhook_url")
        .eq("is_active", true)
        .maybeSingle();

      if (configError) {
        console.error("[BITRIX-FIELDS] Erro ao buscar webhook:", configError);
        
        // Verificar se é erro de permissão (401/403)
        const errorMessage = configError.message || "";
        const isPermissionError = errorMessage.includes("401") || 
                                  errorMessage.includes("403") || 
                                  errorMessage.includes("permission") ||
                                  errorMessage.includes("denied");
        
        if (isPermissionError) {
          throw new Error("Você não tem permissão para acessar a configuração do webhook. Entre em contato com o administrador.");
        }
        
        throw new Error("Erro ao carregar configuração do webhook.");
      }

      if (!config?.bitrix_webhook_url) {
        console.error("[BITRIX-FIELDS] Webhook URL não configurado");
        throw new Error("Webhook URL não configurado. Configure em Admin → Webhooks.");
      }

      console.log("[BITRIX-FIELDS] Webhook encontrado, buscando campos do Bitrix24...");
      
      // Fetch fields from Bitrix24
      const response = await fetch(
        `${config.bitrix_webhook_url}/crm.lead.fields.json`
      );

      if (!response.ok) {
        console.error("[BITRIX-FIELDS] Erro na API do Bitrix24:", response.status);
        throw new Error(`Falha ao buscar campos do Bitrix24 (Status: ${response.status})`);
      }

      const data = await response.json();

      if (!data.result) {
        console.error("[BITRIX-FIELDS] Resposta inválida do Bitrix24");
        throw new Error("Resposta inválida do Bitrix24");
      }

      // Transform to array of fields
      const fields: BitrixField[] = Object.entries(data.result).map(
        ([name, field]: [string, any]) => ({
          name,
          title: field.formLabel || field.listLabel || name,
          type: field.type || "string",
        })
      );

      console.log("[BITRIX-FIELDS] Campos carregados com sucesso:", fields.length, "campos");
      return fields;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2,
  });
}
