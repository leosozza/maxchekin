# Row Level Security (RLS) Testing Instructions

## Overview
This document provides comprehensive instructions for testing the Row Level Security (RLS) policies implemented in migration `20251011124422_39fa369b-b021-44c9-a10c-5df6e3d5b0fc.sql`.

## Prerequisites
- Supabase project with the migration applied
- At least two test users:
  - One with 'admin' role
  - One without any role (regular authenticated user)
- Access to Supabase SQL Editor or `psql` client

## Setup Test Users

### 1. Create Test Users in Supabase Auth
```sql
-- These users should be created via Supabase Auth UI or API
-- For testing, you'll need their UUIDs
```

### 2. Assign Admin Role to First User
```sql
-- Replace 'USER_UUID_HERE' with the actual UUID from auth.users
INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_UUID_HERE', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

## Test Cases

### Test 1: Unauthenticated Access (Should FAIL)

Test that unauthenticated users cannot access sensitive tables.

```sql
-- These queries should fail with permission denied errors when run as anon
-- You can test this using Supabase client with no auth token

-- Attempt to view check_ins
SELECT * FROM public.check_ins;
-- Expected: ERROR: new row violates row-level security policy

-- Attempt to view calls
SELECT * FROM public.calls;
-- Expected: ERROR: new row violates row-level security policy

-- Attempt to view activity_logs
SELECT * FROM public.activity_logs;
-- Expected: ERROR: new row violates row-level security policy

-- Attempt to view configurations
SELECT * FROM public.check_in_config;
-- Expected: ERROR: new row violates row-level security policy

SELECT * FROM public.panel_config;
-- Expected: ERROR: new row violates row-level security policy

SELECT * FROM public.custom_fields;
-- Expected: ERROR: new row violates row-level security policy

-- Attempt to view panel layouts
SELECT * FROM public.panel_layouts;
-- Expected: ERROR: new row violates row-level security policy
```

### Test 2: Authenticated Non-Admin User

Test that authenticated users can view data but cannot modify configuration.

#### 2.1: View Access (Should SUCCEED)
```sql
-- Login as authenticated user (non-admin)
-- Set JWT in SQL Editor or use Supabase client with auth token

-- View check_ins
SELECT * FROM public.check_ins;
-- Expected: SUCCESS (returns data)

-- View calls
SELECT * FROM public.calls;
-- Expected: SUCCESS (returns data)

-- View activity_logs
SELECT * FROM public.activity_logs;
-- Expected: SUCCESS (returns data)

-- View configurations
SELECT * FROM public.check_in_config;
-- Expected: SUCCESS (returns data)

SELECT * FROM public.panel_config;
-- Expected: SUCCESS (returns data)

SELECT * FROM public.custom_fields;
-- Expected: SUCCESS (returns data)

-- View panel layouts
SELECT * FROM public.panel_layouts;
-- Expected: SUCCESS (returns data)
```

#### 2.2: Write Access to Data Tables (Should SUCCEED)
```sql
-- Insert check-in
INSERT INTO public.check_ins (lead_id, model_name)
VALUES ('TEST-001', 'Test Model');
-- Expected: SUCCESS

-- Insert call
INSERT INTO public.calls (lead_id, model_name, status)
VALUES ('TEST-002', 'Test Model 2', 'waiting');
-- Expected: SUCCESS

-- Update call
UPDATE public.calls 
SET status = 'completed' 
WHERE lead_id = 'TEST-002';
-- Expected: SUCCESS

-- Insert activity log
INSERT INTO public.activity_logs (event_type, severity, message)
VALUES ('test', 'info', 'Test message');
-- Expected: SUCCESS
```

#### 2.3: Write Access to Configuration Tables (Should FAIL)
```sql
-- Attempt to update check_in_config
UPDATE public.check_in_config
SET welcome_message = 'Unauthorized change';
-- Expected: ERROR: new row violates row-level security policy

-- Attempt to insert panel_config
INSERT INTO public.panel_config (panel_id, bitrix_webhook_url)
VALUES (gen_random_uuid(), 'https://example.com/webhook');
-- Expected: ERROR: new row violates row-level security policy

-- Attempt to update custom_fields
UPDATE public.custom_fields
SET field_label = 'Hacked'
WHERE field_key = 'model_name';
-- Expected: ERROR: new row violates row-level security policy

-- Attempt to delete custom_fields
DELETE FROM public.custom_fields
WHERE field_key = 'model_name';
-- Expected: ERROR: new row violates row-level security policy

-- Attempt to update panel_layouts
UPDATE public.panel_layouts
SET orientation = 'portrait';
-- Expected: ERROR: new row violates row-level security policy

-- Attempt to delete panel_layouts
DELETE FROM public.panel_layouts;
-- Expected: ERROR: new row violates row-level security policy
```

### Test 3: Authenticated Admin User

Test that admin users have full access to all tables including configuration.

#### 3.1: View Access (Should SUCCEED)
```sql
-- Login as admin user
-- Same queries as Test 2.1
-- All should succeed
```

#### 3.2: Write Access to Data Tables (Should SUCCEED)
```sql
-- Same queries as Test 2.2
-- All should succeed
```

#### 3.3: Write Access to Configuration Tables (Should SUCCEED)
```sql
-- Update check_in_config
UPDATE public.check_in_config
SET welcome_message = 'Admin authorized change'
WHERE id IS NOT NULL;
-- Expected: SUCCESS

-- Insert panel_config
INSERT INTO public.panel_config (panel_id, bitrix_webhook_url)
SELECT id, 'https://example.com/webhook-admin'
FROM public.panels
LIMIT 1
ON CONFLICT (panel_id) DO UPDATE 
SET bitrix_webhook_url = EXCLUDED.bitrix_webhook_url;
-- Expected: SUCCESS

-- Update custom_fields
UPDATE public.custom_fields
SET field_label = 'Admin Updated Label'
WHERE field_key = 'responsible';
-- Expected: SUCCESS

-- Update panel_layouts
UPDATE public.panel_layouts
SET orientation = 'portrait'
WHERE id IN (SELECT id FROM public.panel_layouts LIMIT 1);
-- Expected: SUCCESS

-- Delete test records (cleanup)
DELETE FROM public.check_ins WHERE lead_id LIKE 'TEST-%';
DELETE FROM public.calls WHERE lead_id LIKE 'TEST-%';
DELETE FROM public.activity_logs WHERE event_type = 'test';
-- Expected: SUCCESS
```

### Test 4: Verify auth.uid() Check

Test that the policies properly check for authenticated users.

```sql
-- As authenticated user, verify that auth.uid() is not null
SELECT auth.uid();
-- Expected: Returns a UUID (your user ID)

-- As unauthenticated, verify that auth.uid() is null
-- (Run without auth token)
SELECT auth.uid();
-- Expected: Returns NULL
```

### Test 5: Verify has_role() Function

Test the has_role() function used in admin policies.

```sql
-- As admin user
SELECT public.has_role(auth.uid(), 'admin');
-- Expected: true

-- As non-admin user
SELECT public.has_role(auth.uid(), 'admin');
-- Expected: false

-- As unauthenticated user (will fail to execute due to RLS)
SELECT public.has_role(auth.uid(), 'admin');
-- Expected: NULL or error
```

## Testing via Supabase Client (JavaScript/TypeScript)

### Setup
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseAnonKey = 'YOUR_ANON_KEY'

const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Test Unauthenticated Access
```typescript
// Should fail - no auth
const { data, error } = await supabase
  .from('check_ins')
  .select('*')

console.log('Error:', error) // Should show permission denied
```

### Test Authenticated Access
```typescript
// Login first
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'password'
})

// Should succeed - authenticated
const { data, error } = await supabase
  .from('check_ins')
  .select('*')

console.log('Data:', data) // Should return check-ins
```

### Test Non-Admin Configuration Access
```typescript
// Logged in as non-admin user

// Can view
const { data: viewData, error: viewError } = await supabase
  .from('check_in_config')
  .select('*')
console.log('View works:', !viewError)

// Cannot update
const { data: updateData, error: updateError } = await supabase
  .from('check_in_config')
  .update({ welcome_message: 'Hacked' })
  .eq('id', 'some-id')
console.log('Update fails:', updateError !== null)
```

### Test Admin Configuration Access
```typescript
// Logged in as admin user

// Can view
const { data: viewData, error: viewError } = await supabase
  .from('check_in_config')
  .select('*')
console.log('View works:', !viewError)

// Can update
const { data: updateData, error: updateError } = await supabase
  .from('check_in_config')
  .update({ welcome_message: 'Admin change' })
  .eq('id', 'some-id')
console.log('Update works:', !updateError)
```

## Verification Checklist

- [ ] Unauthenticated users cannot access any sensitive tables
- [ ] Authenticated non-admin users can view all tables
- [ ] Authenticated non-admin users can insert/update data tables (check_ins, calls, activity_logs)
- [ ] Authenticated non-admin users cannot modify configuration tables
- [ ] Admin users can view all tables
- [ ] Admin users can modify all tables including configuration
- [ ] auth.uid() returns proper values (UUID for authenticated, NULL for unauthenticated)
- [ ] has_role() function returns correct boolean values
- [ ] Application UI still works correctly with authenticated users
- [ ] No existing functionality is broken

## Common Issues and Troubleshooting

### Issue: "permission denied for table X"
**Solution:** User is not authenticated. Ensure JWT token is set correctly.

### Issue: Admin cannot modify configuration
**Solution:** Verify user has admin role in user_roles table:
```sql
SELECT * FROM public.user_roles WHERE user_id = auth.uid();
```

### Issue: RLS policies not applying
**Solution:** Verify RLS is enabled:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### Issue: Application breaks after migration
**Solution:** Check application is passing authentication headers with all requests to Supabase.

## Rollback Instructions

If issues occur, you can rollback by dropping the new policies and recreating the old ones:

```sql
-- Drop new policies
DROP POLICY IF EXISTS "Authenticated users can access check_ins" ON public.check_ins;
DROP POLICY IF EXISTS "Authenticated users can access calls" ON public.calls;
DROP POLICY IF EXISTS "Authenticated users can view activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Authenticated users can view check-in config" ON public.check_in_config;
DROP POLICY IF EXISTS "Admins can manage check-in config" ON public.check_in_config;
DROP POLICY IF EXISTS "Authenticated users can view panel configs" ON public.panel_config;
DROP POLICY IF EXISTS "Admins can manage panel configs" ON public.panel_config;
DROP POLICY IF EXISTS "Authenticated users can view custom fields" ON public.custom_fields;
DROP POLICY IF EXISTS "Admins can manage custom fields" ON public.custom_fields;

-- Recreate old policies (from previous migrations)
-- See original migration files for exact policy definitions
```

## Notes

- All tests should be performed in a development/staging environment first
- Production testing should be done during low-traffic periods
- Monitor application logs for RLS-related errors after deployment
- Ensure all service accounts/API keys used by webhooks are properly authenticated

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security#policies)
- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
