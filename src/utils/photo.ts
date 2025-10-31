// Helper to build the URL for the Supabase Edge Function
// Uses the same convention already present in Webhooks.tsx

// Default Bitrix photo field
const DEFAULT_PHOTO_FIELD = "UF_CRM_LEAD_1733231445171";

export function getLeadPhotoUrl(leadId: string | number, fieldName = DEFAULT_PHOTO_FIELD) {
  const base = import.meta.env.VITE_SUPABASE_URL;
  const root = (base || "").replace(/\/$/, "");
  const url = new URL(`${root}/functions/v1/lead-photo`);
  url.searchParams.set("leadId", String(leadId));
  if (fieldName) url.searchParams.set("fieldName", fieldName);
  return url.toString();
}
