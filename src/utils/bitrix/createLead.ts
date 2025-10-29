/**
 * Bitrix CRM Lead Creation Utility
 * Normalizes phone numbers and creates leads via Bitrix24 REST API
 */

export interface NewLead {
  nome: string;
  nome_do_modelo?: string;
  modelName?: string;
  telefone?: string;
  telefone1?: string;
  telefone2?: string;
  telefone3?: string;
  telefone4?: string;
  idade?: string | number;
  scouter?: string;
  idSupervisor?: string | number;
}

export interface BitrixPhone {
  VALUE: string;
  VALUE_TYPE: string;
}

export interface BitrixLeadFields {
  TITLE?: string;
  NAME?: string;
  UF_CRM_MODEL_NAME?: string;
  PHONE?: BitrixPhone[];
  UF_CRM_AGE?: string | number;
  ASSIGNED_BY_ID?: string | number;
}

/**
 * Normalizes a phone number according to Bitrix requirements:
 * - Removes all non-digit characters
 * - Adds +55 prefix for Brazilian numbers (10 or 11 digits without country code)
 * - Preserves existing country code if present
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (!digitsOnly) return '';
  
  // If already has country code (starts with 55 and has more than 11 digits)
  if (digitsOnly.startsWith('55') && digitsOnly.length > 11) {
    return `+${digitsOnly}`;
  }
  
  // If it's a Brazilian number without country code (10 or 11 digits)
  if (digitsOnly.length === 10 || digitsOnly.length === 11) {
    return `+55${digitsOnly}`;
  }
  
  // For other formats, preserve as is with + prefix
  return `+${digitsOnly}`;
}

export interface BitrixLeadResponse {
  result?: number;
  error?: string;
  error_description?: string;
  [key: string]: unknown;
}

/**
 * Creates a new lead in Bitrix24 CRM
 * @param webhookBaseUrl - Base URL for Bitrix24 webhook (e.g., https://yourcompany.bitrix24.com/rest/1/abc123/)
 * @param newLead - Lead data to create
 * @returns Promise with the Bitrix24 API response
 */
export async function createLead(
  webhookBaseUrl: string,
  newLead: NewLead
): Promise<BitrixLeadResponse> {
  // Build phone array from available phone fields
  const phones: BitrixPhone[] = [];
  
  const phoneFields = [
    newLead.telefone,
    newLead.telefone1,
    newLead.telefone2,
    newLead.telefone3,
    newLead.telefone4,
  ];
  
  phoneFields.forEach((phone) => {
    if (phone) {
      const normalized = normalizePhone(phone);
      if (normalized) {
        phones.push({
          VALUE: normalized,
          VALUE_TYPE: 'MOBILE',
        });
      }
    }
  });
  
  // Build fields object for Bitrix API
  const fields: BitrixLeadFields = {
    NAME: newLead.nome,
  };
  
  // Add title with scouter info if available
  if (newLead.scouter) {
    fields.TITLE = `NOVO LEAD SCOUTER-${newLead.scouter}`;
  }
  
  // Add model name (try both field names)
  const modelName = newLead.modelName || newLead.nome_do_modelo;
  if (modelName) {
    fields.UF_CRM_MODEL_NAME = modelName;
  }
  
  // Add phones if any
  if (phones.length > 0) {
    fields.PHONE = phones;
  }
  
  // Add age if provided
  if (newLead.idade) {
    fields.UF_CRM_AGE = newLead.idade;
  }
  
  // Add assigned user (supervisor) if provided
  if (newLead.idSupervisor) {
    fields.ASSIGNED_BY_ID = newLead.idSupervisor;
  }
  
  // Make API call to Bitrix24
  const url = `${webhookBaseUrl}/crm.lead.add.json`;
  
  // Bitrix24 expects fields as JSON string in form-urlencoded format
  const formData = new URLSearchParams();
  formData.append('fields', JSON.stringify(fields));
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create lead in Bitrix: ${errorText}`);
  }
  
  const data = await response.json();
  
  if (!data.result) {
    throw new Error(`Bitrix API error: ${JSON.stringify(data)}`);
  }
  
  return data;
}
