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
  "longitude": -46.633308
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
    "longitude": -46.633308
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
