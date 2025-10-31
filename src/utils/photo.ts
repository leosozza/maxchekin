// Helper to build the URL for the Supabase Edge Function
// Uses the same convention already present in Webhooks.tsx

// Default Bitrix photo field
export const DEFAULT_PHOTO_FIELD = "UF_CRM_LEAD_1733231445171";

/**
 * Monta a URL pública da Edge Function que proxy-a a foto do Lead no Bitrix.
 * - leadId: ID do lead no Bitrix
 * - fieldName: nome do campo customizado (default: DEFAULT_PHOTO_FIELD)
 */
export function getLeadPhotoUrl(
  leadId: string | number,
  fieldName: string = DEFAULT_PHOTO_FIELD
): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;

  if (!base || typeof base !== "string") {
    console.error("[PHOTO] VITE_SUPABASE_URL not configured");
    return ""; // fallback seguro: evita gerar uma URL inválida
  }

  const root = base.replace(/\/$/, "");
  const url = new URL(`${root}/functions/v1/lead-photo`);
  url.searchParams.set("leadId", String(leadId));
  if (fieldName) url.searchParams.set("fieldName", fieldName);
  return url.toString();
}