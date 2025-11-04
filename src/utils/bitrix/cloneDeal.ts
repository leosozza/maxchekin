/**
 * Bitrix Deal Cloning Utilities
 * 
 * Handles cloning of Bitrix deals for multi-model check-ins
 */

import { supabase } from '@/integrations/supabase/client';

export interface BitrixDeal {
  ID: string;
  TITLE: string;
  CATEGORY_ID: string;
  STAGE_ID: string;
  CONTACT_ID: string | string[];
  ASSIGNED_BY_ID: string;
  [key: string]: unknown;
}

/**
 * Fetches active webhook URL from configuration
 */
async function getWebhookUrl(): Promise<string> {
  const { data, error } = await supabase
    .from('webhook_config')
    .select('bitrix_webhook_url')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[CLONE-DEAL] Error fetching webhook config:', error);
    throw new Error(`Erro ao buscar configuração de webhook: ${error.message}`);
  }

  const webhookUrl = data?.bitrix_webhook_url;
  if (!webhookUrl) {
    throw new Error('Webhook URL não configurada. Configure em Admin → Webhooks.');
  }

  return webhookUrl;
}

/**
 * Gets a deal by ID from Bitrix
 * @param dealId - The Bitrix deal ID
 * @returns Deal data with all fields
 */
export async function getDealById(dealId: string): Promise<BitrixDeal> {
  console.log('[CLONE-DEAL] Fetching deal:', dealId);

  const webhookUrl = await getWebhookUrl();

  try {
    const response = await fetch(`${webhookUrl}/crm.deal.get.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: dealId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CLONE-DEAL] Bitrix API error:', errorText);
      throw new Error(`Erro na API do Bitrix (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (!data.result) {
      console.error('[CLONE-DEAL] Deal not found:', data);
      throw new Error('Negócio não encontrado no Bitrix');
    }

    console.log('[CLONE-DEAL] Deal fetched successfully:', data.result);
    return data.result as BitrixDeal;
  } catch (error) {
    console.error('[CLONE-DEAL] Error fetching deal:', error);
    throw error;
  }
}

/**
 * Clones a deal for a new model (multi-model check-in)
 * @param originalDealId - ID of the original deal to clone
 * @param newModelName - Name of the new model
 * @param leadId - ID of the lead to link
 * @returns New deal ID
 */
export async function cloneDealForNewModel(
  originalDealId: string,
  newModelName: string,
  leadId: string
): Promise<string> {
  console.log('[CLONE-DEAL] Cloning deal for new model:', { originalDealId, newModelName, leadId });

  const webhookUrl = await getWebhookUrl();

  // Step 1: Get original deal
  const originalDeal = await getDealById(originalDealId);

  // Step 2: Build fields for new deal
  const fields: Record<string, unknown> = {
    TITLE: `Check-in • ${newModelName}`,
    CATEGORY_ID: originalDeal.CATEGORY_ID,
    STAGE_ID: originalDeal.STAGE_ID,
    CONTACT_ID: originalDeal.CONTACT_ID,
    ASSIGNED_BY_ID: originalDeal.ASSIGNED_BY_ID,
    UF_CRM_1744324532: leadId, // Link to lead
    UF_CRM_6748E09939008: newModelName, // Model name
  };

  // Copy other UF_CRM_* fields (excluding read-only and specific ones)
  const excludedFields = [
    'ID', 'DATE_CREATE', 'DATE_MODIFY', 'CREATED_BY', 'MODIFY_BY',
    'UF_CRM_1762265571', // Don't copy original deal ID field
    'UF_CRM_6748E09939008', // Model name - already set
    'UF_CRM_1744324532', // Lead ID - already set
  ];

  Object.keys(originalDeal).forEach(key => {
    if (key.startsWith('UF_CRM_') && !excludedFields.includes(key)) {
      fields[key] = originalDeal[key];
    }
  });

  console.log('[CLONE-DEAL] Creating new deal with fields:', fields);

  // Step 3: Create new deal
  try {
    const response = await fetch(`${webhookUrl}/crm.deal.add.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CLONE-DEAL] Bitrix API error:', errorText);
      throw new Error(`Erro ao criar novo negócio (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (!data.result) {
      console.error('[CLONE-DEAL] Failed to create deal:', data);
      throw new Error('Falha ao criar novo negócio no Bitrix');
    }

    const newDealId = String(data.result);
    console.log('[CLONE-DEAL] Deal cloned successfully, new ID:', newDealId);

    return newDealId;
  } catch (error) {
    console.error('[CLONE-DEAL] Error creating deal:', error);
    throw error;
  }
}

/**
 * Gets the deal ID from a lead's UF_CRM_1762265571 field
 * @param leadId - The lead ID
 * @returns Deal ID or null if not found
 */
export async function getDealIdFromLead(leadId: string): Promise<string | null> {
  console.log('[CLONE-DEAL] Getting deal ID from lead:', leadId);

  const webhookUrl = await getWebhookUrl();

  try {
    const response = await fetch(`${webhookUrl}/crm.lead.get.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: leadId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CLONE-DEAL] Bitrix API error:', errorText);
      return null;
    }

    const data = await response.json();

    if (!data.result) {
      console.error('[CLONE-DEAL] Lead not found:', data);
      return null;
    }

    const dealId = data.result.UF_CRM_1762265571;
    
    if (!dealId || (Array.isArray(dealId) && dealId.length === 0)) {
      console.log('[CLONE-DEAL] No deal ID found in lead');
      return null;
    }

    // Handle array response
    const finalDealId = Array.isArray(dealId) ? dealId[0] : dealId;
    console.log('[CLONE-DEAL] Deal ID from lead:', finalDealId);

    return String(finalDealId);
  } catch (error) {
    console.error('[CLONE-DEAL] Error fetching deal ID from lead:', error);
    return null;
  }
}
