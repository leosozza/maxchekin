/**
 * Bitrix Lead Update Utility
 * 
 * Updates lead data in Bitrix CRM using crm.lead.update API
 */

import { supabase } from '@/integrations/supabase/client';

// Default photo field from Bitrix CRM configuration
const DEFAULT_BITRIX_PHOTO_FIELD = 'UF_CRM_1745431662';

export interface UpdateLeadData {
  lead_id: string;
  name?: string;
  responsible?: string;
  photo?: string;
}

/**
 * Updates a lead in Bitrix CRM
 * @param leadData - Lead data to update
 * @returns Updated lead ID or throws error
 */
export async function updateLead(leadData: UpdateLeadData): Promise<{ success: boolean; lead_id: string }> {
  const { lead_id, name, responsible, photo } = leadData;

  if (!lead_id) {
    throw new Error('lead_id is required for update');
  }

  console.log('[UPDATE-LEAD] Updating lead in Bitrix:', lead_id);

  // Fetch webhook URL from configuration
  const { data: config, error: configError } = await supabase
    .from('webhook_config')
    .select('bitrix_webhook_url')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (configError) {
    console.error('[UPDATE-LEAD] Error fetching webhook config:', configError);
    throw new Error(`Erro ao buscar configuração de webhook: ${configError.message}`);
  }

  const webhookUrl = config?.bitrix_webhook_url;
  if (!webhookUrl) {
    throw new Error('Webhook URL não configurada. Configure em Admin → Webhooks.');
  }

  // Build fields object for Bitrix
  const fields: Record<string, string | number | boolean> = {};

  // Map standard fields
  if (name !== undefined) {
    fields.NAME = name;
    // Update both NAME and TITLE to ensure consistency across Bitrix CRM interface
    // NAME is displayed in list views, TITLE is shown in detail views
    fields.TITLE = name;
  }

  if (responsible !== undefined) {
    fields.ASSIGNED_BY_ID = responsible;
  }

  if (photo !== undefined) {
    const photoFieldName = await getPhotoFieldName();
    fields[photoFieldName] = photo;
  }

  console.log('[UPDATE-LEAD] Fields to update:', fields);

  // Make API call to Bitrix
  try {
    const response = await fetch(`${webhookUrl}/crm.lead.update.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: lead_id,
        fields: fields,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[UPDATE-LEAD] Bitrix API error:', errorText);
      throw new Error(`Erro na API do Bitrix (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (!data.result) {
      console.error('[UPDATE-LEAD] Bitrix update failed:', data);
      throw new Error(`Falha ao atualizar lead: ${JSON.stringify(data)}`);
    }

    console.log('[UPDATE-LEAD] Lead updated successfully:', data);

    return {
      success: true,
      lead_id: lead_id,
    };
  } catch (error) {
    console.error('[UPDATE-LEAD] Error updating lead:', error);
    throw error;
  }
}

/**
 * Helper function to get the photo field name from configuration
 */
async function getPhotoFieldName(): Promise<string> {
  try {
    const { data: fields } = await supabase
      .from('bitrix_field_mapping')
      .select('bitrix_field_code')
      .eq('field_name', 'photo')
      .maybeSingle();

    return fields?.bitrix_field_code || DEFAULT_BITRIX_PHOTO_FIELD;
  } catch (error) {
    console.error('[UPDATE-LEAD] Error fetching photo field name:', error);
    return DEFAULT_BITRIX_PHOTO_FIELD;
  }
}
