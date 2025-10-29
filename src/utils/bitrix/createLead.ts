/**
 * Utility for creating leads in Bitrix24
 */

/**
 * Normalizes a phone number to Bitrix24 format
 * - Removes all non-digit characters
 * - Prefixes +55 for 10/11-digit Brazilian numbers without country code
 * - Preserves existing country code if already present
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, "");

  // If 10 or 11 digits and doesn't start with 55, it's a Brazilian number without country code
  if ((digitsOnly.length === 10 || digitsOnly.length === 11) && !digitsOnly.startsWith("55")) {
    return `+55${digitsOnly}`;
  }

  // If starts with 55 and is 12 or 13 digits total, add + prefix
  if (digitsOnly.startsWith("55") && (digitsOnly.length === 12 || digitsOnly.length === 13)) {
    return `+${digitsOnly}`;
  }

  // Otherwise, preserve as-is with + prefix if it has digits
  return digitsOnly ? `+${digitsOnly}` : "";
}

export interface BitrixLeadFields {
  TITLE: string;
  NAME?: string;
  PHONE?: Array<{ VALUE: string; VALUE_TYPE: string }>;
  ASSIGNED_BY_ID?: string | number;
  [key: string]: unknown; // For custom fields like UF_CRM_*
}

export interface CreateLeadParams {
  name: string;
  phone: string;
  assignedById?: string | number;
  customFields?: Record<string, unknown>;
}

/**
 * Builds the fields payload for crm.lead.add request
 */
export function buildLeadFields(params: CreateLeadParams): BitrixLeadFields {
  const normalizedPhone = normalizePhoneNumber(params.phone);

  const fields: BitrixLeadFields = {
    TITLE: params.name || "Lead from MaxCheckin",
    NAME: params.name,
  };

  // Add phone if provided
  if (normalizedPhone) {
    fields.PHONE = [
      {
        VALUE: normalizedPhone,
        VALUE_TYPE: "MOBILE",
      },
    ];
  }

  // Add assigned user if provided
  if (params.assignedById) {
    fields.ASSIGNED_BY_ID = params.assignedById;
  }

  // Add custom fields if provided
  if (params.customFields) {
    Object.assign(fields, params.customFields);
  }

  return fields;
}

/**
 * Sends a request to create a new lead in Bitrix24
 * @param webhookUrl - The Bitrix24 webhook base URL
 * @param params - Lead creation parameters
 * @returns The created lead ID
 */
export async function createLeadInBitrix(
  webhookUrl: string,
  params: CreateLeadParams
): Promise<number> {
  const fields = buildLeadFields(params);

  // Bitrix expects fields as JSON string in application/x-www-form-urlencoded body
  const formData = new URLSearchParams();
  formData.append("fields", JSON.stringify(fields));

  const response = await fetch(`${webhookUrl}/crm.lead.add.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    throw new Error(`Failed to create lead: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.result) {
    throw new Error("Invalid response from Bitrix: missing result");
  }

  return data.result;
}
