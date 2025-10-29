import { supabase } from "@/integrations/supabase/client";
import { normalizePhoneNumber, createLeadInBitrix, CreateLeadParams } from "@/utils/bitrix/createLead";

export interface BitrixLead {
  ID: string;
  TITLE: string;
  NAME?: string;
  PHONE?: Array<{ VALUE: string; VALUE_TYPE: string }>;
  [key: string]: unknown;
}

/**
 * Gets the active webhook URL from the database
 */
async function getWebhookUrl(): Promise<string> {
  const { data: config } = await supabase
    .from("webhook_config")
    .select("bitrix_webhook_url")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!config?.bitrix_webhook_url) {
    throw new Error("Webhook URL not configured");
  }

  return config.bitrix_webhook_url;
}

/**
 * Finds leads by phone number using Bitrix24 API
 * First attempts duplicate.findbycomm, then falls back to crm.lead.list + crm.lead.get
 * @param phone - Phone number to search (will be normalized)
 * @returns Array of matching leads
 */
export async function findLeadsByPhone(phone: string): Promise<BitrixLead[]> {
  const webhookUrl = await getWebhookUrl();
  const normalizedPhone = normalizePhoneNumber(phone);

  if (!normalizedPhone) {
    return [];
  }

  try {
    // First attempt: duplicate.findbycomm
    const findByCommUrl = `${webhookUrl}/duplicate.findbycomm.json?entity_type=LEAD&type=PHONE&values[]=${encodeURIComponent(normalizedPhone)}`;
    const findByCommResponse = await fetch(findByCommUrl);

    if (findByCommResponse.ok) {
      const findByCommData = await findByCommResponse.json();
      
      // Check if we got IDs back
      if (findByCommData.result && findByCommData.result.length > 0) {
        // If result contains IDs, fetch the lead details
        const leadIds = findByCommData.result;
        const leads: BitrixLead[] = [];

        // Limit to first 10 results to avoid too many calls
        const idsToFetch = leadIds.slice(0, 10);
        
        for (const leadId of idsToFetch) {
          try {
            const getLeadUrl = `${webhookUrl}/crm.lead.get.json?id=${leadId}`;
            const getLeadResponse = await fetch(getLeadUrl);
            
            if (getLeadResponse.ok) {
              const getLeadData = await getLeadResponse.json();
              if (getLeadData.result) {
                leads.push(getLeadData.result);
              }
            }
          } catch (error) {
            console.error(`Failed to fetch lead ${leadId}:`, error);
          }
        }

        if (leads.length > 0) {
          return leads;
        }
      }
    }
  } catch (error) {
    console.warn("duplicate.findbycomm failed, falling back to crm.lead.list:", error);
  }

  // Fallback: crm.lead.list with phone filter
  try {
    const listUrl = `${webhookUrl}/crm.lead.list.json`;
    const formData = new URLSearchParams();
    formData.append("filter[PHONE]", normalizedPhone);
    formData.append("select[]", "ID");
    formData.append("select[]", "TITLE");
    formData.append("select[]", "NAME");

    const listResponse = await fetch(listUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!listResponse.ok) {
      throw new Error(`crm.lead.list failed: ${listResponse.statusText}`);
    }

    const listData = await listResponse.json();

    if (listData.result && listData.result.length > 0) {
      // Limit to first 10 results
      const leadsFromList = listData.result.slice(0, 10);
      const detailedLeads: BitrixLead[] = [];

      for (const lead of leadsFromList) {
        try {
          const getLeadUrl = `${webhookUrl}/crm.lead.get.json?id=${lead.ID}`;
          const getLeadResponse = await fetch(getLeadUrl);
          
          if (getLeadResponse.ok) {
            const getLeadData = await getLeadResponse.json();
            if (getLeadData.result) {
              detailedLeads.push(getLeadData.result);
            }
          }
        } catch (error) {
          console.error(`Failed to fetch lead details for ${lead.ID}:`, error);
          // Use the basic info from list if get fails
          detailedLeads.push(lead);
        }
      }

      return detailedLeads;
    }

    return [];
  } catch (error) {
    console.error("Failed to search leads by phone:", error);
    throw new Error("Failed to search leads in Bitrix24");
  }
}

/**
 * Creates a new lead in Bitrix24
 * @param params - Lead creation parameters
 * @returns The created lead ID
 */
export async function createLead(params: CreateLeadParams): Promise<number> {
  const webhookUrl = await getWebhookUrl();
  return createLeadInBitrix(webhookUrl, params);
}
