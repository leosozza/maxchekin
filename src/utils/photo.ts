// Helper to build the URL for the Supabase Edge Function
// Uses the same convention already present in Webhooks.tsx
export function getLeadPhotoUrl(leadId: string | number, fieldName = "UF_CRM_LEAD_1733231445171") {
  const base = (import.meta as any).env?.VITE_SUPABASE_URL as string;
  const root = (base || "").replace(/\/$/, "");
  const url = new URL(`${root}/functions/v1/lead-photo`);
  url.searchParams.set("leadId", String(leadId));
  if (fieldName) url.searchParams.set("fieldName", fieldName);
  return url.toString();
}
