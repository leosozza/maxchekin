# Bitrix Lead Search and Creation

This module provides functionality to search for existing Bitrix leads by phone number and create new leads when none are found.

## Files

### 1. `src/utils/bitrix/createLead.ts`
Utility functions for phone normalization and lead creation:
- `normalizePhoneNumber(phone: string)`: Normalizes phone numbers to Bitrix format (+55 prefix for Brazilian numbers)
- `buildLeadFields(params: CreateLeadParams)`: Builds the fields payload for Bitrix API
- `createLeadInBitrix(webhookUrl: string, params: CreateLeadParams)`: Sends the lead creation request

### 2. `src/hooks/useBitrixLead.ts`
React hook/module for Bitrix lead operations:
- `findLeadsByPhone(phone: string)`: Searches for leads by phone number
  - First attempts `duplicate.findbycomm` API
  - Falls back to `crm.lead.list` + `crm.lead.get` if needed
  - Limits results to first 10 leads
- `createLead(params: CreateLeadParams)`: Creates a new lead in Bitrix24

### 3. `src/components/bitrix/LeadSearchByPhone.tsx`
React component providing UI for lead search and creation:
- Phone input field with DDD (Brazilian area code)
- Search button with loading state
- Results display with "Select" buttons
- Create form when no results are found
- Returns selected lead via `onSelectLead` callback

## Usage Example

```tsx
import LeadSearchByPhone from "@/components/bitrix/LeadSearchByPhone";
import { BitrixLead } from "@/hooks/useBitrixLead";

function MyComponent() {
  const handleSelectLead = (lead: BitrixLead) => {
    console.log("Selected lead:", lead);
    // Process the selected lead...
  };

  return (
    <LeadSearchByPhone onSelectLead={handleSelectLead} />
  );
}
```

## Demo Page

A demo page is available at `/admin/lead-search` showing the component in action. The page is protected by authentication.

## Phone Normalization Rules

- Removes all non-digit characters
- 10 or 11 digits without country code → adds +55 prefix (Brazilian)
- Already has 55 prefix with 12-13 digits → adds + prefix
- Other formats → preserved with + prefix

Examples:
- `(11) 99999-9999` → `+5511999999999`
- `11999999999` → `+5511999999999`
- `5511999999999` → `+5511999999999`

## Bitrix API Integration

The module fetches the webhook URL from the `webhook_config` table in Supabase:
- Queries for active webhook (`is_active = true`)
- Orders by `created_at` descending
- Takes the most recent entry

API calls:
1. `duplicate.findbycomm.json` - First attempt to find duplicates by phone
2. `crm.lead.list.json` - Fallback list search
3. `crm.lead.get.json` - Fetch detailed lead information
4. `crm.lead.add.json` - Create new lead

## Fields

The component returns `BitrixLead` objects with:
- `ID`: Lead identifier
- `TITLE`: Lead title
- `NAME`: Lead name (optional)
- `PHONE`: Array of phone objects with VALUE and VALUE_TYPE
- Additional custom fields as needed
