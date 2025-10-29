/**
 * Custom hook for Bitrix24 lead operations
 * Provides functions to search and create leads in Bitrix24 CRM
 */

import { supabase } from '@/integrations/supabase/client';
import { createLead as createLeadUtil, NewLead, normalizePhone } from '@/utils/bitrix/createLead';

export interface BitrixLead {
  ID: string;
  TITLE?: string;
  NAME?: string;
  PHONE?: Array<{ VALUE: string; VALUE_TYPE: string }>;
  [key: string]: any;
}

/**
 * Gets the active webhook base URL from Supabase
 * @returns Promise with the webhook base URL or null
 */
async function getWebhookBaseUrl(): Promise<string | null> {
  const { data: config } = await supabase
    .from('webhook_config')
    .select('bitrix_webhook_url')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return config?.bitrix_webhook_url || null;
}

/**
 * Searches for leads by phone number using Bitrix24 duplicate detection
 * Falls back to direct lead search if duplicate detection fails
 * @param phone - Phone number to search (will be normalized)
 * @returns Promise with array of matching leads
 */
export async function findLeadsByPhone(phone: string): Promise<BitrixLead[]> {
  const webhookBaseUrl = await getWebhookBaseUrl();
  
  if (!webhookBaseUrl) {
    throw new Error('Webhook URL not configured');
  }
  
  const normalizedPhone = normalizePhone(phone);
  
  if (!normalizedPhone) {
    throw new Error('Invalid phone number');
  }
  
  try {
    // Try using duplicate detection API first
    const duplicateUrl = `${webhookBaseUrl}/crm.duplicate.findbycomm.json`;
    const duplicateParams = new URLSearchParams({
      type: 'PHONE',
      values: JSON.stringify([normalizedPhone]),
      entity_type: 'LEAD',
    });
    
    const duplicateResponse = await fetch(`${duplicateUrl}?${duplicateParams.toString()}`);
    
    if (duplicateResponse.ok) {
      const duplicateData = await duplicateResponse.json();
      
      if (duplicateData.result && duplicateData.result.LEAD && duplicateData.result.LEAD.length > 0) {
        // Get full lead details for each ID
        const leadIds = duplicateData.result.LEAD;
        const leads: BitrixLead[] = [];
        
        // Limit to first 10 results
        const limitedIds = leadIds.slice(0, 10);
        
        for (const leadId of limitedIds) {
          const leadUrl = `${webhookBaseUrl}/crm.lead.get.json`;
          const leadParams = new URLSearchParams({ id: leadId.toString() });
          
          const leadResponse = await fetch(`${leadUrl}?${leadParams.toString()}`);
          
          if (leadResponse.ok) {
            const leadData = await leadResponse.json();
            if (leadData.result) {
              leads.push(leadData.result);
            }
          }
        }
        
        return leads;
      }
    }
  } catch (error) {
    console.warn('Duplicate detection failed, trying fallback search:', error);
  }
  
  // Fallback: Search using crm.lead.list with phone filter
  try {
    const listUrl = `${webhookBaseUrl}/crm.lead.list.json`;
    const listParams = new URLSearchParams({
      filter: JSON.stringify({ PHONE: normalizedPhone }),
      select: JSON.stringify(['*', 'PHONE', 'EMAIL']),
    });
    
    const listResponse = await fetch(`${listUrl}?${listParams.toString()}`);
    
    if (!listResponse.ok) {
      throw new Error('Failed to search leads');
    }
    
    const listData = await listResponse.json();
    
    if (listData.result) {
      // Limit to first 10 results
      return listData.result.slice(0, 10);
    }
    
    return [];
  } catch (error) {
    console.error('Lead search failed:', error);
    throw new Error('Failed to search leads in Bitrix');
  }
}

/**
 * Creates a new lead in Bitrix24 CRM
 * @param newLead - Lead data to create
 * @returns Promise with the created lead data from Bitrix
 */
export async function createLead(newLead: NewLead): Promise<any> {
  const webhookBaseUrl = await getWebhookBaseUrl();
  
  if (!webhookBaseUrl) {
    throw new Error('Webhook URL not configured');
  }
  
  return createLeadUtil(webhookBaseUrl, newLead);
}
