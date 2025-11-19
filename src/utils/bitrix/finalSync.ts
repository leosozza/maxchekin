/**
 * Bitrix Final Sync Utility
 * 
 * Sincroniza dados finais do MaxCheckin de volta para o Bitrix
 * quando o lead completa todo o fluxo interno de atendimento.
 * 
 * Funcionalidades:
 * - Atualiza STATUS_ID do lead
 * - Registra timestamps de cada etapa
 * - Envia métricas de tempo por etapa
 * - Sincroniza log de salas utilizadas
 * - Anexa fotos/arquivos se necessário
 */

import { supabase } from '@/integrations/supabase/client';

export interface StageTimestamp {
  stage_name: string;
  entered_at: string;
  duration_seconds?: number;
}

export interface FinalSyncData {
  lead_id: string;
  status_id?: string; // Ex: 'COMPLETED', 'MATERIAL_DELIVERED'
  stage_timestamps: StageTimestamp[];
  room_log?: Record<string, string>; // { "Etapa": "Sala X" }
  total_duration_seconds?: number;
  notes?: string;
  attachments?: string[]; // URLs de fotos/arquivos
}

/**
 * Busca histórico completo de movimentações de um lead no Kanban
 * NOTA: Funcionalidade Kanban foi removida - retorna array vazio
 */
export async function getLeadKanbanHistory(leadId: string): Promise<StageTimestamp[]> {
  console.warn('[SYNC-FINAL] Kanban removido - getLeadKanbanHistory retorna vazio');
  return [];
}

/**
 * Busca informações da sala por etapa (se disponível)
 * TODO: Implementar quando adicionar campo 'room' em kanban_cards/kanban_events
 */
export async function getLeadRoomLog(leadId: string): Promise<Record<string, string>> {
  // Placeholder - retorna vazio até adicionar funcionalidade de sala
  // Futura implementação: buscar sala de cada etapa quando disponível
  return {};
}

/**
 * Sincroniza dados finais para o Bitrix
 */
export async function syncFinalToBitrix(
  webhookUrl: string,
  syncData: FinalSyncData
): Promise<void> {
  if (!webhookUrl) {
    throw new Error('Webhook URL não configurada');
  }

  console.log('[SYNC-FINAL] Iniciando sincronização final para lead:', syncData.lead_id);

  // Montar campos customizados do Bitrix
  const fields: Record<string, any> = {};

  // STATUS_ID final (se fornecido)
  if (syncData.status_id) {
    fields.STATUS_ID = syncData.status_id;
  }

  // Timestamps por etapa (campos customizados)
  // Formato: UF_CRM_XXXX_STAGE_NAME_AT
  syncData.stage_timestamps.forEach((stage) => {
    // Normalizar nome da etapa para campo
    const fieldName = normalizeStageNameForField(stage.stage_name);
    
    // Campo de timestamp
    fields[`UF_CRM_${fieldName}_AT`] = stage.entered_at;
    
    // Campo de duração em segundos
    if (stage.duration_seconds !== undefined) {
      fields[`UF_CRM_${fieldName}_DURATION`] = stage.duration_seconds;
    }
  });

  // Duração total
  if (syncData.total_duration_seconds) {
    fields.UF_CRM_TOTAL_DURATION = syncData.total_duration_seconds;
  }

  // Log de salas (JSON serializado)
  if (syncData.room_log && Object.keys(syncData.room_log).length > 0) {
    fields.UF_CRM_ROOM_LOG = JSON.stringify(syncData.room_log);
  }

  // Durações por etapa (JSON serializado)
  const durations: Record<string, number> = {};
  syncData.stage_timestamps.forEach((stage) => {
    if (stage.duration_seconds !== undefined) {
      durations[stage.stage_name] = stage.duration_seconds;
    }
  });
  if (Object.keys(durations).length > 0) {
    fields.UF_CRM_STAGE_DURATIONS = JSON.stringify(durations);
  }

  // Observações/notas
  if (syncData.notes) {
    fields.UF_CRM_CHECKIN_NOTES = syncData.notes;
  }

  // Data/hora de conclusão do fluxo
  fields.UF_CRM_FLOW_COMPLETED_AT = new Date().toISOString();

  console.log('[SYNC-FINAL] Campos a sincronizar:', fields);

  // Fazer chamada ao Bitrix
  try {
    const response = await fetch(`${webhookUrl}/crm.lead.update.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: syncData.lead_id,
        fields: fields,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bitrix API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.result) {
      throw new Error(`Bitrix update failed: ${JSON.stringify(data)}`);
    }

    console.log('[SYNC-FINAL] Sincronização concluída com sucesso:', data);

    // TODO: Future enhancement - attachment synchronization
    // if (syncData.attachments && syncData.attachments.length > 0) {
    //   await syncAttachmentsToBitrix(webhookUrl, syncData.lead_id, syncData.attachments);
    // }

  } catch (error) {
    console.error('[SYNC-FINAL] Erro ao sincronizar:', error);
    throw error;
  }
}

/**
 * Normaliza nome da etapa para usar como parte de nome de campo
 * Ex: "Check-in realizado" → "CHECKIN_REALIZADO"
 */
function normalizeStageNameForField(stageName: string): string {
  return stageName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Sincroniza anexos/fotos para o Bitrix
 * TODO: Implementar upload de arquivos via disk.file.upload
 */
async function syncAttachmentsToBitrix(
  webhookUrl: string,
  leadId: string,
  attachments: string[]
): Promise<void> {
  console.log('[SYNC-FINAL] TODO: Sincronizar anexos:', attachments);
  // Implementação futura:
  // 1. Para cada attachment, fazer upload via disk.file.upload
  // 2. Vincular arquivo ao lead via crm.lead.userfield.set
}

/**
 * Função helper para sincronizar um lead ao final do fluxo
 * Busca todos os dados necessários e envia para o Bitrix
 */
export async function performFinalSync(
  leadId: string,
  statusId?: string,
  notes?: string
): Promise<void> {
  // Buscar webhook URL
  const { data: config, error: configError } = await supabase
    .from('webhook_config')
    .select('bitrix_webhook_url')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (configError) {
    throw new Error(`Erro ao buscar configuração de webhook: ${configError.message}`);
  }

  const webhookUrl = config?.bitrix_webhook_url;
  if (!webhookUrl) {
    throw new Error('Webhook URL não configurada. Configure em Admin → Webhooks.');
  }

  // Buscar histórico completo
  const stageTimestamps = await getLeadKanbanHistory(leadId);
  
  // Calcular duração total
  const totalDuration = stageTimestamps.reduce(
    (sum, stage) => sum + (stage.duration_seconds || 0),
    0
  );

  // Buscar log de salas
  const roomLog = await getLeadRoomLog(leadId);

  // Montar dados de sincronização
  const syncData: FinalSyncData = {
    lead_id: leadId,
    status_id: statusId,
    stage_timestamps: stageTimestamps,
    room_log: roomLog,
    total_duration_seconds: totalDuration,
    notes: notes,
  };

  // Executar sincronização
  await syncFinalToBitrix(webhookUrl, syncData);
}
