/**
 * Bitrix CRM Lead Creation Utility (merged)
 *
 * - Provides phone normalization helpers (normalizePhone, normalizePhoneNumber)
 * - Provides payload builders for crm.lead.add
 * - Exposes both createLead (returns Bitrix response object) and createLeadInBitrix (returns created ID)
 * - Accepts both "NewLead" (rich multi-phone shape) and "CreateLeadParams" (simple shape) for backwards compatibility
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
  // allow other custom fields
  [key: string]: unknown;
}

export interface CreateLeadParams {
  name: string;
  phone?: string;
  assignedById?: string | number;
  customFields?: Record<string, unknown>;
  // accept legacy multi-phone to be tolerant
  telefone?: string;
  telefone1?: string;
  telefone2?: string;
  telefone3?: string;
  telefone4?: string;
  [key: string]: unknown;
}

export interface BitrixPhone {
  VALUE: string;
  VALUE_TYPE: string;
}

export interface BitrixLeadFields {
  TITLE?: string;
  NAME?: string;
  UF_CRM_1739563541?: string; // Model name field (was UF_CRM_MODEL_NAME)
  PHONE?: BitrixPhone[];
  UF_CRM_1740000000?: string | number; // Age field (was UF_CRM_AGE)
  ASSIGNED_BY_ID?: string | number;
  SOURCE_ID?: string; // Source field
  PARENT_ID_1120?: string | number; // Project field
  UF_CRM_1741215746?: string | number; // Custom field related to project
  UF_CRM_1744900570916?: string; // Name field
  UF_CRM_LEAD_1732627097745?: string; // Model name field
  [key: string]: unknown;
}

export interface BitrixLeadResponse {
  result?: number;
  error?: string;
  error_description?: string;
  [key: string]: unknown;
}

/**
 * Normalizes a phone number according to Bitrix requirements:
 * - Removes all non-digit characters
 * - Adds +55 prefix for Brazilian numbers (10 or 11 digits without country code)
 * - Preserves existing country code if present (adds + prefix)
 *
 * This function name matches older code expecting normalizePhone.
 */
export function normalizePhone(phone: string): string {
  if (!phone) return "";
  const digitsOnly = String(phone).replace(/\D/g, "");
  if (!digitsOnly) return "";
  // If it already starts with country code 55 and looks proper length, prefix +
  if (digitsOnly.startsWith("55") && digitsOnly.length >= 12) {
    return `+${digitsOnly}`;
  }
  // Brazilian local numbers (10 or 11 digits)
  if ((digitsOnly.length === 10 || digitsOnly.length === 11) && !digitsOnly.startsWith("55")) {
    return `+55${digitsOnly}`;
  }
  // Otherwise preserve with plus prefix
  return `+${digitsOnly}`;
}

/**
 * Alternate normalizer name (matches newer utilities)
 */
export function normalizePhoneNumber(phone: string): string {
  // Delegate to normalizePhone to ensure consistent behavior
  return normalizePhone(phone);
}

/**
 * Collects phones from either NewLead or CreateLeadParams shape.
 * Returns normalized phone strings (no duplicates).
 */
function collectPhones(payload: Record<string, any>): string[] {
  const candidates = [
    payload.telefone,
    payload.telefone1,
    payload.telefone2,
    payload.telefone3,
    payload.telefone4,
    payload.phone,
  ];
  const set = new Set<string>();
  for (const p of candidates) {
    if (!p) continue;
    const n = normalizePhone(String(p));
    if (n) set.add(n);
  }
  return Array.from(set);
}

/**
 * Build Bitrix lead fields given either NewLead or CreateLeadParams
 * Now includes support for loading default field values from lead_creation_config
 */
export async function buildLeadFieldsFromNewLead(
  input: NewLead | CreateLeadParams,
  supabaseClient?: any,
): Promise<BitrixLeadFields> {
  // Defensive check: protect against undefined input
  if (!input) {
    return {
      TITLE: "Novo Lead Recepção",
    };
  }

  // Support both field name sets
  const name = (input as any).nome || (input as any).name || undefined;
  const modelName = (input as any).modelName || (input as any).nome_do_modelo;
  const scouter = (input as any).scouter;
  const idade = (input as any).idade;
  const assigned = (input as any).idSupervisor || (input as any).assignedById;

  const phones = collectPhones(input);

  const fields: BitrixLeadFields = {
    NAME: name,
  };

  // Title: standardized format for reception leads
  if (scouter) {
    fields.TITLE = `NOVO LEAD SCOUTER-${scouter}`;
  } else if (name) {
    fields.TITLE = `Novo Lead Recepção - ${name}`;
  } else {
    fields.TITLE = "Novo Lead Recepção";
  }

  // SOURCE_ID priority: input/code > configuration > default 'CALL'
  // First, check if SOURCE_ID is provided in input
  const inputSourceId = (input as any).SOURCE_ID;
  if (inputSourceId) {
    // Priority 1: Use SOURCE_ID from input/code
    fields.SOURCE_ID = inputSourceId;
  } else {
    // Priority 2: Try to load from configuration (will be set later in config loop)
    // Priority 3: Default to 'CALL' (set at the end if not overridden)
    fields.SOURCE_ID = 'CALL'; // Default value
  }

  // Set other default values (these are always set and never overridden)
  fields.PARENT_ID_1120 = 4;
  fields.UF_CRM_1741215746 = 4;

  // Model name using new field code
  if (modelName) {
    fields.UF_CRM_1739563541 = modelName;
    // Also populate UF_CRM_LEAD_1732627097745 with model name
    fields.UF_CRM_LEAD_1732627097745 = modelName;
  }

  // Always populate UF_CRM_1744900570916 with name if available
  if (name) {
    fields.UF_CRM_1744900570916 = name;
  }

  if (phones.length > 0) {
    fields.PHONE = phones.map((p) => ({ VALUE: p, VALUE_TYPE: "MOBILE" }));
  }

  // Age using new field code
  if (idade !== undefined && idade !== null && idade !== "") {
    fields.UF_CRM_1740000000 = idade;
  }

  if (assigned) {
    fields.ASSIGNED_BY_ID = assigned as string | number;
  }

  // Load configured default fields from lead_creation_config if supabase client is available
  // The lead_creation_config table should have columns: field_name (string), field_value (string), is_active (boolean)
  // SOURCE_ID can be overridden by config (Priority 2) if not already set by input (Priority 1)
  // PARENT_ID_1120 and UF_CRM_1741215746 are never overridden by config
  if (supabaseClient) {
    try {
      const { data: configFields } = await supabaseClient
        .from("lead_creation_config")
        .select("*")
        .eq("is_active", true);

      if (configFields && configFields.length > 0) {
        for (const config of configFields) {
          // Allow SOURCE_ID from config if not provided in input (Priority 2)
          if (config.field_name === "SOURCE_ID" && !inputSourceId && config.field_value) {
            fields.SOURCE_ID = config.field_value;
            continue;
          }
          // Skip overriding PARENT_ID_1120 and UF_CRM_1741215746 as they are always set
          if (config.field_name === "PARENT_ID_1120" || 
              config.field_name === "UF_CRM_1741215746") {
            continue;
          }
          // Skip fields that are always populated from input values
          if (config.field_name === "UF_CRM_1744900570916" || 
              config.field_name === "UF_CRM_LEAD_1732627097745") {
            continue;
          }
          // Apply other configured field values
          if (config.field_value) {
            (fields as any)[config.field_name] = config.field_value;
          }
        }
      }
    } catch (error) {
      console.error("Failed to load lead_creation_config:", error);
      // Continue with default values if loading fails
    }
  }


  // Merge any custom UF_CRM_* present in input.customFields or other keys prefixed with UF_CRM_
  // Allow SOURCE_ID from customFields (Priority 1), skip PARENT_ID_1120 and UF_CRM_1741215746
  if ((input as any).customFields && typeof (input as any).customFields === "object") {
    for (const key of Object.keys((input as any).customFields)) {
      // Allow SOURCE_ID override from customFields (Priority 1)
      if (key === "SOURCE_ID") {
        fields.SOURCE_ID = (input as any).customFields[key];
        continue;
      }
      // Skip PARENT_ID_1120 and UF_CRM_1741215746 as they are always set
      if (key === "PARENT_ID_1120" || key === "UF_CRM_1741215746") {
        continue;
      }
      (fields as any)[key] = (input as any).customFields[key];
    }
  }

  // Allow other UF_CRM_* and PARENT_ID_* fields from input (except protected ones)
  for (const key of Object.keys(input)) {
    // Skip SOURCE_ID as it was already handled above with priority logic
    if (key === "SOURCE_ID") {
      continue;
    }
    // Skip protected fields
    if (key === "PARENT_ID_1120" || key === "UF_CRM_1741215746") {
      continue;
    }
    if (key.startsWith("UF_CRM_") || key.startsWith("PARENT_ID_")) {
      (fields as any)[key] = (input as any)[key];
    }
  }

  return fields;
}

/**
 * Low-level helper: sends crm.lead.add request and returns parsed Bitrix response
 * Now supports async buildLeadFieldsFromNewLead
 */
async function sendCrmLeadAdd(webhookBaseUrl: string, fields: BitrixLeadFields): Promise<BitrixLeadResponse> {
  const url = `${webhookBaseUrl.replace(/\/$/, "")}/crm.lead.add.json`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Failed to create lead in Bitrix: ${resp.status} ${resp.statusText} ${text}`);
  }

  const data = await resp.json().catch(() => ({}));
  return data as BitrixLeadResponse;
}

/**
 * Creates a new lead in Bitrix24 CRM (compatibility function)
 * - This matches older callers expecting createLead(webhookBaseUrl, newLead)
 * - Returns the full Bitrix response object (BitrixLeadResponse)
 * - Now supports optional supabaseClient parameter for loading default field config
 */
export async function createLead(
  webhookBaseUrl: string,
  newLead: NewLead,
  supabaseClient?: any,
): Promise<BitrixLeadResponse> {
  const fields = await buildLeadFieldsFromNewLead(newLead, supabaseClient);
  const data = await sendCrmLeadAdd(webhookBaseUrl, fields);
  // Keep original behavior: throw if no result
  if (!data.result) {
    throw new Error(`Bitrix API error: ${JSON.stringify(data)}`);
  }
  return data;
}

/**
 * Creates a new lead in Bitrix24 CRM (newer simpler API)
 * - This matches callers expecting createLeadInBitrix(webhookBaseUrl, params)
 * - Returns the created lead ID as number
 * - Now supports optional supabaseClient parameter for loading default field config
 */
export async function createLeadInBitrix(
  webhookBaseUrl: string,
  params: CreateLeadParams,
  supabaseClient?: any,
): Promise<number> {
  const fields = await buildLeadFieldsFromNewLead(params, supabaseClient);
  const data = await sendCrmLeadAdd(webhookBaseUrl, fields);
  if (!data.result) {
    throw new Error(`Bitrix API error: ${JSON.stringify(data)}`);
  }
  // In Bitrix responses, result is typically numeric id
  return Number(data.result);
}
