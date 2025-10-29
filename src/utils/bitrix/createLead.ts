/**
 * Bitrix24 Lead Creation Utilities
 * 
 * This module provides functions to create leads in Bitrix24 CRM
 * with proper phone normalization and field mapping.
 */

export interface PhoneField {
  VALUE: string;
  VALUE_TYPE: string;
}

export interface NewLead {
  nome?: string;
  nomeDoModelo?: string;
  telefone1?: string;
  telefone2?: string;
  telefone3?: string;
  telefone4?: string;
  idade?: string | number;
  scouter?: string;
  idSupervisor?: string | number;
}

export interface LeadFields {
  NAME?: string;
  UF_CRM_MODEL_NAME?: string;
  PHONE?: PhoneField[];
  UF_CRM_AGE?: string | number;
  TITLE?: string;
  ASSIGNED_BY_ID?: string | number;
}

/**
 * Normalizes a phone number for Brazilian format
 * Adds +55 prefix for 10/11-digit numbers without country code
 * Preserves existing country codes
 */
function normalizePhone(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If already has Brazilian country code (starts with 55 and has 12-13 digits)
  // We check that it's followed by valid Brazilian area codes (starting with 1-9)
  if (cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)) {
    const areaCodeDigit = cleaned.charAt(2);
    if (areaCodeDigit >= '1' && areaCodeDigit <= '9') {
      return '+' + cleaned;
    }
  }
  
  // If it's a 10 or 11 digit Brazilian number, add +55
  if (cleaned.length === 10 || cleaned.length === 11) {
    return '+55' + cleaned;
  }
  
  // For other formats with country code, add + if not present
  if (cleaned.length > 11) {
    return '+' + cleaned;
  }
  
  // Return cleaned number for anything else
  return cleaned;
}

/**
 * Builds the lead fields object from the new lead data
 * Maps application fields to Bitrix24 CRM fields
 */
export function buildLeadFields(newLead: NewLead): LeadFields {
  const fields: LeadFields = {};
  
  // Map name
  if (newLead.nome) {
    fields.NAME = newLead.nome;
  }
  
  // Map model name to custom field
  if (newLead.nomeDoModelo) {
    fields.UF_CRM_MODEL_NAME = newLead.nomeDoModelo;
  }
  
  // Build phone array from telefone1 through telefone4
  const phones: PhoneField[] = [];
  const phoneFields = ['telefone1', 'telefone2', 'telefone3', 'telefone4'] as const;
  
  phoneFields.forEach((fieldName) => {
    const phoneValue = newLead[fieldName];
    if (phoneValue) {
      const normalizedPhone = normalizePhone(phoneValue);
      if (normalizedPhone) {
        phones.push({
          VALUE: normalizedPhone,
          VALUE_TYPE: 'MOBILE'
        });
      }
    }
  });
  
  if (phones.length > 0) {
    fields.PHONE = phones;
  }
  
  // Map age to custom field
  if (newLead.idade !== undefined && newLead.idade !== null && newLead.idade !== '') {
    fields.UF_CRM_AGE = newLead.idade;
  }
  
  // Build title with scouter if provided
  if (newLead.scouter) {
    fields.TITLE = `NOVO LEAD SCOUTER-${newLead.scouter}`;
  }
  
  // Map supervisor ID
  if (newLead.idSupervisor !== undefined && newLead.idSupervisor !== null && newLead.idSupervisor !== '') {
    fields.ASSIGNED_BY_ID = newLead.idSupervisor;
  }
  
  return fields;
}

export interface BitrixApiResponse {
  result?: number; // Lead ID when successful
  time?: {
    start: number;
    finish: number;
    duration: number;
    processing: number;
    date_start: string;
    date_finish: string;
  };
  error?: string;
  error_description?: string;
}

/**
 * Creates a new lead in Bitrix24 CRM
 * 
 * @param webhookBaseUrl - Base URL for Bitrix24 webhook (e.g., https://yourcompany.bitrix24.com/rest/123/abc123)
 * @param newLead - Lead data to create
 * @returns Response from Bitrix24 API containing the lead ID if successful
 */
export async function createLead(webhookBaseUrl: string, newLead: NewLead): Promise<BitrixApiResponse> {
  if (!webhookBaseUrl) {
    throw new Error('Webhook base URL is required');
  }
  
  // Build the lead fields
  const fields = buildLeadFields(newLead);
  
  // Prepare the request URL
  const url = `${webhookBaseUrl}/crm.lead.add.json`;
  
  // Prepare form-encoded body
  const formBody = new URLSearchParams();
  formBody.append('fields', JSON.stringify(fields));
  
  // Send POST request
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody.toString(),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create lead: ${response.status} - ${errorText}`);
  }
  
  let data: BitrixApiResponse;
  try {
    data = await response.json();
  } catch (parseError) {
    throw new Error(`Failed to parse Bitrix24 response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
  }
  
  if (data.error) {
    throw new Error(`Bitrix24 error: ${data.error_description || data.error}`);
  }
  
  return data;
}
