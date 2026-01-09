# Agendados do Dia - Feature Implementation Summary

## Overview
The "Agendados do Dia" (Day Appointments) feature has been successfully implemented to allow reception staff to view, filter, and manage scheduled appointments with direct check-in capability.

## Components Delivered

### 1. Database Layer
**File**: `supabase/migrations/20260109145921_create_appointments_table.sql`

The `appointments` table stores all appointment data with the following key features:
- Auto-computed `scheduled_datetime` field combining date and time
- Indexes on date, datetime, status, and Bitrix ID for performance
- Row Level Security policies requiring authentication
- Auto-updating timestamp trigger

**Key Fields**:
- Client info: `client_name`, `phone`, `bitrix_id`
- Model: `model_name`
- Schedule: `scheduled_date`, `scheduled_time`, `scheduled_datetime`
- Team: `telemarketing_name`, `scouter_name`
- Source: `source` (Scouter/Meta)
- Location: `latitude`, `longitude`
- Project: `project_id` (defaults to 4 for "Projeto Comercial")
- Status: `status` (pending/checked_in/cancelled)

**Recent Updates (January 9, 2026)**:
- Added `project_id` field to track commercial project (PARENT_ID_1120 in Bitrix)
- Enhanced timezone logging for debugging time handling issues
- Improved Bitrix synchronization during check-in to include project fields

### 2. Backend - Webhook Endpoint
**File**: `supabase/functions/appointment-webhook/index.ts`

**Endpoint**: `https://[your-supabase-url]/functions/v1/appointment-webhook`

Receives appointment data from Bitrix24 with:
- Required field validation
- Time format validation (accepts H:MM or HH:MM)
- Date format validation (YYYY-MM-DD)
- Source enum validation (Scouter/Meta)
- Project ID support (defaults to 4 for "Projeto Comercial")
- Timezone awareness (Brazil/America/Sao_Paulo - UTC-3)
- Enhanced logging for time conversion debugging
- Comprehensive error messages
- CORS support

**Timezone Handling**:
All times are assumed to be in Brazil/Sao_Paulo timezone (UTC-3). The database stores times with timezone awareness using `TIMESTAMP WITH TIME ZONE`, ensuring correct time representation across different client locations.

### 3. Frontend - Appointments Interface
**File**: `src/pages/ScheduledAppointments.tsx`

**Route**: `/agendados`

**Features**:
- **Filtering**: By date (required) and time (optional)
- **Display**: Detailed appointment cards with all information
- **Map**: OpenStreetMap integration showing approach location
- **Actions**: Direct check-in button for pending appointments
- **Status**: Color-coded badges (pending/checked-in/cancelled)
- **Responsive**: Mobile and desktop optimized

### 4. Navigation Integration
**Modified Files**: 
- `src/pages/CheckInNew.tsx` - Added calendar icon button
- `src/App.tsx` - Added route

**Access Points**:
- Calendar icon in top navigation bar of check-in page
- Direct URL: `/agendados`
- Back button to return to check-in

### 5. Type System
**File**: `src/integrations/supabase/types.ts`

Complete TypeScript types for appointments table ensuring type safety across the application.

## Deployment Steps

### 1. Database Migration
```bash
# The migration will be applied automatically on next Supabase deployment
# Or manually apply:
supabase db push
```

### 2. Deploy Edge Function
```bash
# Deploy the appointment webhook function
supabase functions deploy appointment-webhook
```

### 3. Configure Environment
Ensure the following environment variables are set in Supabase:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### 4. Deploy Frontend
```bash
# Build and deploy the frontend application
npm run build
# Deploy to your hosting provider
```

## Bitrix24 Integration

### Setting up the Webhook in Bitrix24

1. **Create Automation Rule**:
   - Trigger: When appointment is created/scheduled
   - Action: Send HTTP request

2. **Configure HTTP Request**:
   - Method: POST
   - URL: `https://[your-supabase-url]/functions/v1/appointment-webhook`
   - Headers:
     ```
     Content-Type: application/json
     Authorization: Bearer [your-supabase-anon-key]
     ```

3. **Field Mapping**:
   Map Bitrix24 fields to the payload structure:
   ```json
   {
     "client_name": "{{LEAD.NAME}}",
     "phone": "{{LEAD.PHONE}}",
     "bitrix_id": "{{LEAD.ID}}",
     "model_name": "{{LEAD.UF_CRM_MODEL_NAME}}",
     "scheduled_date": "{{LEAD.UF_CRM_SCHEDULED_DATE}}",
     "scheduled_time": "{{LEAD.UF_CRM_SCHEDULED_TIME}}",
     "telemarketing_name": "{{LEAD.UF_CRM_TELEMARKETING}}",
     "source": "{{LEAD.UF_CRM_SOURCE}}",
     "scouter_name": "{{LEAD.UF_CRM_SCOUTER}}",
     "latitude": "{{LEAD.UF_CRM_LATITUDE}}",
     "longitude": "{{LEAD.UF_CRM_LONGITUDE}}"
   }
   ```

4. **Test the Integration**:
   - Create a test appointment in Bitrix24
   - Verify webhook is triggered
   - Check appointment appears in the "Agendados do Dia" interface

## Usage Guide

### For Reception Staff

1. **Accessing Appointments**:
   - Click the calendar icon (📅) in the top navigation bar
   - Or navigate to `/agendados`

2. **Viewing Today's Appointments**:
   - Page loads with today's date by default
   - All appointments for the selected date are displayed

3. **Filtering**:
   - **By Date**: Click the date field to select a different date
   - **By Time**: Optionally enter a specific time to filter

4. **Appointment Information**:
   Each card shows:
   - Client name and phone
   - Model name
   - Bitrix ID
   - Scheduled date and time
   - Telemarketing responsible
   - Source (Scouter/Meta)
   - Scouter name
   - Location on map (when available)
   - Current status

5. **Performing Check-in**:
   - Locate the appointment
   - Click "Fazer Check-in" button
   - Confirmation toast will appear
   - Status updates to "Check-in Feito"
   - Entry is created in check-ins table

6. **Viewing Location**:
   - If coordinates are provided, a map shows the approach location
   - Click markers for more information
   - Useful for understanding where the client was approached

### For Administrators

1. **Monitoring**:
   - Check Supabase logs for webhook activity
   - Monitor appointment creation and check-ins
   - Review any validation errors

2. **Troubleshooting**:
   - Check webhook logs in Supabase Functions
   - Verify Bitrix24 field mapping
   - Ensure date/time formats are correct

3. **Data Access**:
   - Query `appointments` table in Supabase
   - Export data for reporting
   - Analyze check-in patterns

## API Documentation

### Webhook Payload

**Required Fields**:
```typescript
{
  client_name: string;      // Client name
  phone: string;            // Phone with area code
  bitrix_id: string;        // Bitrix lead ID
  model_name: string;       // Model name
  scheduled_date: string;   // Format: YYYY-MM-DD
  scheduled_time: string;   // Format: H:MM or HH:MM
}
```

**Optional Fields**:
```typescript
{
  telemarketing_name?: string;  // Telemarketing agent name
  source?: "Scouter" | "Meta";  // Lead source
  scouter_name?: string;        // Scouter name
  latitude?: number;            // Location latitude
  longitude?: number;           // Location longitude
  project_id?: number;          // Project ID (defaults to 4 - Projeto Comercial)
}
```

**Bitrix Field Mapping**:
- `project_id` corresponds to `PARENT_ID_1120` in Bitrix
- Default value is 4, representing "Projeto Comercial"
- This field is synced back to Bitrix during check-in

**Response**:
```typescript
// Success (200)
{
  success: true;
  appointment: { /* appointment object */ }
}

// Error (400/500)
{
  error: string;  // Error message
}
```

## Testing

See `docs/AGENDADOS_TESTING.md` for detailed testing instructions including:
- Sample webhook payloads
- curl command examples
- Field validation rules
- Integration testing steps

## Maintenance

### Regular Tasks
- Monitor webhook success rate
- Review failed appointments
- Clean up old appointments (consider adding retention policy)
- Update map tiles if needed (currently using OpenStreetMap)

### Future Enhancements (Optional)
- Add appointment cancellation workflow
- Export appointments to PDF/Excel
- Send SMS reminders
- Bulk check-in functionality
- Appointment statistics dashboard
- Filter by source, scouter, or telemarketing
- Calendar view mode

## Support

For issues or questions:
1. Check Supabase logs for errors
2. Review `docs/AGENDADOS_TESTING.md` for testing steps
3. Verify Bitrix24 webhook configuration
4. Check browser console for frontend errors

## Dependencies

- **Leaflet**: ^1.9.4 (map functionality)
- **React-Leaflet**: ^4.2.1 (React bindings for Leaflet)
- **@types/leaflet**: Latest (TypeScript types)
- **date-fns**: ^3.6.0 (date formatting)

All dependencies are properly installed and included in `package.json`.

## Security Notes

- Row Level Security is enabled on appointments table
- Only authenticated users can access appointments
- Webhook uses Supabase service role key
- Input validation prevents injection attacks
- CORS headers configured for security

## Performance

- Database indexes ensure fast queries
- Filters reduce data transferred
- Map loads only when coordinates available
- Responsive design minimizes re-renders

---

**Status**: ✅ Production Ready
**Version**: 1.0.0
**Last Updated**: January 9, 2026
