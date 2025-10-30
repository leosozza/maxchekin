/**
 * Custom hook for Bitrix24 lead operations
 * - Exposes findLeadsByPhone(phone) and createLead(newLead)
 * - Keeps compatibility with different shapes of utils in utils/bitrix/createLead
 * - Uses Supabase to fetch the active webhook URL
 */

import { supabase } from '@/integrations/supabase/client';
import * as createLeadUtils from '@/utils/bitrix/createLead';

export interface BitrixLead {
  ID: string;
  TITLE?: string;
  NAME?: string;
  PHONE?: Array<{ VALUE: string; VALUE_TYPE: string }>;
  [key: string]: unknown;
}

/**
 * Get active webhook URL from DB (throws if not configured)
 */
async function getWebhookUrl(): Promise<string> {
  const { data: config, error } = await supabase
    .from('webhook_config')
    .select('bitrix_webhook_url')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Supabase error when reading webhook_config:', error);
  }

  const url = config?.bitrix_webhook_url;
  if (!url) {
    throw new Error('Webhook URL not configured');
  }
  return url;
}

// Normalizer: support both normalizePhone and normalizePhoneNumber exports
const normalizePhone: (p: string) => string | null =
  (createLeadUtils as any).normalizePhone ||
  (createLeadUtils as any).normalizePhoneNumber ||
  ((p: string) => {
    const s = String(p || '').trim();
    return s ? s : null;
  });

/**
 * Finds leads by phone:
 * - Attempts duplicate detection first (crm.duplicate.findbycomm with POST JSON)
 * - If it returns IDs, fetch full lead details (crm.lead.get)
 * - Fallback to crm.lead.list with PHONE filter, then fetch details
 * - Returns an array of BitrixLead (limited to first 10)
 */
export async function findLeadsByPhone(phone: string): Promise<BitrixLead[]> {
  const webhookUrl = await getWebhookUrl();
  const normalized = normalizePhone(phone);
  if (!normalized) {
    return [];
  }

  // Try duplicate detection API first with POST JSON (preferential method)
  try {
    const duplicateUrl = `${webhookUrl.replace(/\/$/, "")}/crm.duplicate.findbycomm.json`;
    
    const resp = await fetch(duplicateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        entity_type: "LEAD",
        type: "PHONE",
        values: [normalized],
      }),
    });

    if (resp.ok) {
      const data = await resp.json();

      // Handle different result shapes:
      // - { result: { LEAD: [ids...] } }
      // - { result: [ids...] }
      const leadIds =
        (data?.result?.LEAD && Array.isArray(data.result.LEAD) && data.result.LEAD) ||
        (Array.isArray(data?.result) && data.result) ||
        null;

      if (leadIds && leadIds.length > 0) {
        const idsToFetch = leadIds.slice(0, 10);
        const leads: BitrixLead[] = [];

        for (const id of idsToFetch) {
          try {
            const getUrl = `${webhookUrl}/crm.lead.get.json?id=${encodeURIComponent(id.toString())}`;
            const getResp = await fetch(getUrl);
            if (!getResp.ok) continue;
            const getData = await getResp.json();
            if (getData?.result) leads.push(getData.result);
          } catch (err) {
            console.error(`Failed to fetch lead ${id}:`, err);
          }
        }

        if (leads.length > 0) return leads;
      }
    }
  } catch (err) {
    console.warn('crm.duplicate.findbycomm failed, falling back to crm.lead.list:', err);
  }

  // Fallback: crm.lead.list with PHONE filter (use POST form data)
  try {
    const listUrl = `${webhookUrl}/crm.lead.list.json`;
    const form = new URLSearchParams();
    // Add filter[PHONE] because many Bitrix installations accept that shape
    form.append('filter[PHONE]', normalized);
    // request a minimal select and then fetch details; safer to request ID, TITLE, NAME
    form.append('select[]', 'ID');
    form.append('select[]', 'TITLE');
    form.append('select[]', 'NAME');

    const listResp = await fetch(listUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    if (!listResp.ok) {
      throw new Error(`crm.lead.list failed: ${listResp.statusText}`);
    }

    const listData = await listResp.json();
    const results = Array.isArray(listData?.result) ? listData.result.slice(0, 10) : [];

    if (results.length === 0) return [];

    // Try to fetch detailed info for each found lead
    const detailed: BitrixLead[] = [];
    for (const r of results) {
      const id = r?.ID || r;
      try {
        const getUrl = `${webhookUrl}/crm.lead.get.json?id=${encodeURIComponent(id.toString())}`;
        const getResp = await fetch(getUrl);
        if (!getResp.ok) {
          // if get fails, push the basic info from list
          detailed.push(r as BitrixLead);
          continue;
        }
        const getData = await getResp.json();
        if (getData?.result) detailed.push(getData.result);
        else detailed.push(r as BitrixLead);
      } catch (err) {
        console.error(`Failed to fetch lead details for ${id}:`, err);
        detailed.push(r as BitrixLead);
      }
    }

    return detailed;
  } catch (err) {
    console.error('Lead search failed:', err);
    throw new Error('Failed to search leads in Bitrix');
  }
}

/**
 * Creates a lead in Bitrix. This wrapper tries to support different helper implementations exported from utils/bitrix/createLead.
 * It expects one of these patterns to exist:
 * - createLead(webhookUrl, newLead) -> returns object or { result: id }
 * - createLeadInBitrix(webhookUrl, params) -> returns id
 * - createLeadUtil(webhookUrl, newLead) -> older naming
 *
 * The wrapper returns whatever underlying util returns (keeps compatibility).
 */
export async function createLead(newLead: any): Promise<any> {
  const webhookUrl = await getWebhookUrl();

  // Prefer named exports in order of commonality
  const candidates: Array<((...args: any[]) => Promise<any>) | undefined> = [
    (createLeadUtils as any).createLead,
    (createLeadUtils as any).createLeadInBitrix,
    (createLeadUtils as any).createLeadUtil,
    (createLeadUtils as any).create, // fallback name
  ];

  const fn = candidates.find(Boolean);

  if (!fn) {
    throw new Error(
      'No createLead function found in utils/bitrix/createLead. Expected export named createLead or createLeadInBitrix.'
    );
  }

  // Many helper implementations expect (webhookBaseUrl, payload)
  try {
    return await fn.call(null, webhookUrl, newLead, supabase);
  } catch (err) {
    // If underlying util expects only payload and uses internal webhook config, try calling with only newLead
    try {
      return await fn.call(null, newLead);
    } catch (err2) {
      console.error('createLead wrapper failed calling underlying function:', err, err2);
      throw new Error('Failed to create lead in Bitrix');
    }
  }
}