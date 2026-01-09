# Agendados do Dia - Testing Guide

## Testing the Appointment Webhook

### Webhook Endpoint
The appointment webhook is available at:
```
https://[your-supabase-url]/functions/v1/appointment-webhook
```

### Sample Webhook Payload

To test the webhook, send a POST request with the following JSON payload:

```json
{
  "client_name": "Maria Santos",
  "phone": "(11) 99876-5432",
  "bitrix_id": "12345",
  "model_name": "Ana Paula Silva",
  "scheduled_date": "2026-01-10",
  "scheduled_time": "14:30",
  "telemarketing_name": "João da Silva",
  "source": "Scouter",
  "scouter_name": "Carlos Souza",
  "latitude": -23.550520,
  "longitude": -46.633308,
  "project_id": 4
}
```

### Using curl to Test

```bash
curl -X POST \
  https://[your-supabase-url]/functions/v1/appointment-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [your-anon-key]" \
  -d '{
    "client_name": "Maria Santos",
    "phone": "(11) 99876-5432",
    "bitrix_id": "12345",
    "model_name": "Ana Paula Silva",
    "scheduled_date": "2026-01-10",
    "scheduled_time": "14:30",
    "telemarketing_name": "João da Silva",
    "source": "Scouter",
    "scouter_name": "Carlos Souza",
    "latitude": -23.550520,
    "longitude": -46.633308,
    "project_id": 4
  }'
```

### Field Validation

#### Required Fields
- `client_name` (string)
- `phone` (string)
- `bitrix_id` (string)
- `model_name` (string)
- `scheduled_date` (string in YYYY-MM-DD format)
- `scheduled_time` (string in HH:MM format)

#### Optional Fields
- `telemarketing_name` (string)
- `source` (string: "Scouter" or "Meta")
- `scouter_name` (string)
- `latitude` (number)
- `longitude` (number)
- `project_id` (number, defaults to 4 - "Projeto Comercial")

### Expected Response

Success:
```json
{
  "success": true,
  "appointment": {
    "id": "uuid",
    "client_name": "Maria Santos",
    ...
  }
}
```

Error:
```json
{
  "error": "Missing required field: client_name"
}
```

## Using the Appointments Interface

### Accessing the Page
Navigate to `/agendados` in your application or click the calendar icon in the top navigation bar on the check-in page.

### Filtering Appointments
1. **By Date**: Use the date picker to select a specific date
2. **By Time**: Optionally filter by a specific time slot

### Performing Check-in
1. Find the appointment in the list
2. Click the "Fazer Check-in" button
3. The appointment status will update to "Check-in Feito"
4. A check-in record will be created in the database

### Viewing Location
If latitude and longitude are provided, a map will display showing the location where the client was approached by the scouter.

## Database Schema

The appointments are stored in the `appointments` table with the following structure:

```sql
CREATE TABLE appointments (
  id UUID PRIMARY KEY,
  client_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  bitrix_id TEXT NOT NULL,
  model_name TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  scheduled_datetime TIMESTAMP WITH TIME ZONE,
  telemarketing_name TEXT,
  source TEXT CHECK (source IN ('Scouter', 'Meta')),
  scouter_name TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  project_id INTEGER DEFAULT 4,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'checked_in', 'cancelled')),
  checked_in_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## Integration with Bitrix24

To integrate this feature with Bitrix24:

1. Configure a webhook in Bitrix24 to call the appointment webhook endpoint
2. Map the Bitrix24 fields to the expected payload structure
3. Ensure the webhook is triggered when a new appointment is created or scheduled

### Recommended Bitrix24 Workflow
1. When a telemarketing creates an appointment in Bitrix24
2. Bitrix24 triggers a webhook to the appointment-webhook endpoint
3. The appointment is stored in the database
4. The appointment appears in the "Agendados do Dia" interface
5. Reception staff can perform check-in directly from this interface

## Testing Time Handling and Timezone Behavior

### Timezone Context
All times in the appointment system are handled in Brazil/America/Sao_Paulo timezone (UTC-3). The database stores times with timezone awareness using `TIMESTAMP WITH TIME ZONE`.

### Time Format Validation Tests

#### Valid Time Formats
```bash
# Test with single-digit hour (9:00)
curl -X POST https://[your-supabase-url]/functions/v1/appointment-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [your-anon-key]" \
  -d '{
    "client_name": "Test User",
    "phone": "11999999999",
    "bitrix_id": "TEST001",
    "model_name": "Test Model",
    "scheduled_date": "2026-01-10",
    "scheduled_time": "9:00"
  }'

# Test with double-digit hour (14:30)
curl -X POST https://[your-supabase-url]/functions/v1/appointment-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [your-anon-key]" \
  -d '{
    "client_name": "Test User",
    "phone": "11999999999",
    "bitrix_id": "TEST002",
    "model_name": "Test Model",
    "scheduled_date": "2026-01-10",
    "scheduled_time": "14:30"
  }'

# Test with midnight (00:00)
curl -X POST https://[your-supabase-url]/functions/v1/appointment-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [your-anon-key]" \
  -d '{
    "client_name": "Test User",
    "phone": "11999999999",
    "bitrix_id": "TEST003",
    "model_name": "Test Model",
    "scheduled_date": "2026-01-10",
    "scheduled_time": "00:00"
  }'

# Test with late evening (23:59)
curl -X POST https://[your-supabase-url]/functions/v1/appointment-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [your-anon-key]" \
  -d '{
    "client_name": "Test User",
    "phone": "11999999999",
    "bitrix_id": "TEST004",
    "model_name": "Test Model",
    "scheduled_date": "2026-01-10",
    "scheduled_time": "23:59"
  }'
```

#### Invalid Time Formats (Should Fail)
```bash
# Invalid format: seconds included
curl -X POST https://[your-supabase-url]/functions/v1/appointment-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [your-anon-key]" \
  -d '{
    "client_name": "Test User",
    "phone": "11999999999",
    "bitrix_id": "TEST005",
    "model_name": "Test Model",
    "scheduled_date": "2026-01-10",
    "scheduled_time": "14:30:00"
  }'
# Expected error: Invalid time format

# Invalid format: hour > 23
curl -X POST https://[your-supabase-url]/functions/v1/appointment-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [your-anon-key]" \
  -d '{
    "client_name": "Test User",
    "phone": "11999999999",
    "bitrix_id": "TEST006",
    "model_name": "Test Model",
    "scheduled_date": "2026-01-10",
    "scheduled_time": "25:00"
  }'
# Expected error: Invalid time format
```

### Bitrix Query Parameter Tests

The webhook also supports query parameters from Bitrix24 automation:

```bash
# Test with Bitrix query parameters
curl -X GET "https://[your-supabase-url]/functions/v1/appointment-webhook?lead_id=12345&modelo=Test%20Model&event_date=10.01.2026&Hora=10.01.2026%2014:30:00&Telemarketing=João&scouter=Carlos&local=-23.550520,-46.633308&phone=11999999999&client_name=Maria%20Santos" \
  -H "Authorization: Bearer [your-anon-key]"
```

## Testing Commercial Project Integration

### Test Project Field Storage

```bash
# Test with explicit project_id
curl -X POST https://[your-supabase-url]/functions/v1/appointment-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [your-anon-key]" \
  -d '{
    "client_name": "Project Test",
    "phone": "11999999999",
    "bitrix_id": "PROJ001",
    "model_name": "Test Model",
    "scheduled_date": "2026-01-10",
    "scheduled_time": "14:00",
    "project_id": 4
  }'

# Test with default project_id (should default to 4)
curl -X POST https://[your-supabase-url]/functions/v1/appointment-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [your-anon-key]" \
  -d '{
    "client_name": "Default Project Test",
    "phone": "11999999999",
    "bitrix_id": "PROJ002",
    "model_name": "Test Model",
    "scheduled_date": "2026-01-10",
    "scheduled_time": "15:00"
  }'
```

### Test Bitrix Sync During Check-in

1. Create an appointment via webhook (as above)
2. Navigate to `/agendados` in the application
3. Locate the test appointment
4. Click "Fazer Check-in"
5. Check Supabase logs to verify:
   - Log message: `[SCHEDULED-CHECKIN] Syncing project X to Bitrix lead Y`
   - Log message: `[SCHEDULED-CHECKIN] Successfully synced project to Bitrix`
6. Verify in Bitrix24 that the lead has:
   - `PARENT_ID_1120` = 4
   - `UF_CRM_1741215746` = 4
   - `UF_CRM_1755007072212` = timestamp of check-in

### Verify Project Display in UI

1. Navigate to `/agendados`
2. View an appointment card
3. Confirm that the "Projeto: Comercial" badge is displayed
4. Test with different project_id values to see ID display format

## End-to-End Testing Checklist

- [ ] **Webhook Creation**: Successfully create appointment via webhook
- [ ] **Time Validation**: Verify time format validation works correctly
- [ ] **Date Validation**: Verify date format validation works correctly
- [ ] **Project Default**: Confirm project_id defaults to 4 when not provided
- [ ] **Duplicate Prevention**: Create same appointment twice, verify it updates instead of duplicating
- [ ] **Display in UI**: Appointment appears in `/agendados` page
- [ ] **Filter by Date**: Date filter works correctly
- [ ] **Filter by Time**: Time filter works correctly
- [ ] **Check-in Action**: Click "Fazer Check-in" successfully updates status
- [ ] **Bitrix Sync**: Verify project fields are synced to Bitrix during check-in
- [ ] **Project Display**: Confirm project badge displays correctly in UI
- [ ] **Map Display**: If coordinates provided, map displays correctly
- [ ] **Status Badge**: Status badge updates from "Pendente" to "Check-in Feito"
- [ ] **Timezone Logging**: Check logs for timezone handling messages

## Common Issues and Troubleshooting

### Issue: Times appear offset by several hours
**Solution**: This is likely a timezone display issue. Check that:
1. The database stores times with timezone (`TIMESTAMP WITH TIME ZONE`)
2. The application displays times in the correct timezone
3. Logs show: "Timezone handling - Brazil/Sao_Paulo (UTC-3)"

### Issue: Project not syncing to Bitrix
**Solution**: Check:
1. Webhook URL is configured in `webhook_config` table
2. Bitrix API is accessible
3. Check Supabase logs for sync errors
4. Verify Bitrix fields `PARENT_ID_1120` and `UF_CRM_1741215746` exist

### Issue: Appointment not appearing in UI
**Solution**: Verify:
1. Appointment was created successfully (check response)
2. Date filter matches appointment date
3. RLS policies allow authenticated user to view appointments
4. Check browser console for errors

## Performance Testing

### Load Testing
Test webhook performance with multiple concurrent appointments:

```bash
# Create 10 appointments concurrently
for i in {1..10}; do
  curl -X POST https://[your-supabase-url]/functions/v1/appointment-webhook \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer [your-anon-key]" \
    -d "{
      \"client_name\": \"Load Test User $i\",
      \"phone\": \"11999999999\",
      \"bitrix_id\": \"LOAD$i\",
      \"model_name\": \"Test Model\",
      \"scheduled_date\": \"2026-01-10\",
      \"scheduled_time\": \"$(printf "%02d" $((9 + i % 12))):00\"
    }" &
done
wait
```

### Query Performance
```sql
-- Test date filtering performance
EXPLAIN ANALYZE
SELECT * FROM appointments 
WHERE scheduled_date = '2026-01-10'
ORDER BY scheduled_time;

-- Test project filtering performance
EXPLAIN ANALYZE
SELECT * FROM appointments 
WHERE project_id = 4 AND scheduled_date >= CURRENT_DATE
ORDER BY scheduled_datetime;
```

Expected: Query should use indexes and complete in < 10ms for typical datasets.
