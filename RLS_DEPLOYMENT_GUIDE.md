# Row Level Security (RLS) Migration Deployment Guide

## Overview

This guide provides instructions for deploying the RLS security migration `20251011124422_39fa369b-b021-44c9-a10c-5df6e3d5b0fc.sql` which restricts access to sensitive tables in the MaxCheckin database.

## Pre-Deployment Checklist

- [ ] Review the migration file: `supabase/migrations/20251011124422_39fa369b-b021-44c9-a10c-5df6e3d5b0fc.sql`
- [ ] Review the impact summary: `RLS_MIGRATION_SUMMARY.md`
- [ ] Review the testing instructions: `RLS_TESTING_INSTRUCTIONS.md`
- [ ] Identify all clients that access the affected tables
- [ ] Prepare authentication tokens for all service accounts
- [ ] Schedule deployment during low-traffic period
- [ ] Backup database before deployment
- [ ] Notify team members of the deployment

## Affected Tables

The following tables will require authentication after this migration:

1. **check_ins** - Check-in tracking data
2. **calls** - Call queue management
3. **activity_logs** - System activity logs
4. **check_in_config** - Check-in screen configuration
5. **panel_config** - Panel-specific configuration
6. **custom_fields** - Custom field definitions
7. **panel_layouts** - Panel UI layout configuration

## Deployment Steps

### 1. Backup Database

```bash
# Using Supabase CLI
supabase db dump > backup_before_rls_migration_$(date +%Y%m%d_%H%M%S).sql
```

Or use the Supabase Dashboard to create a backup.

### 2. Deploy Migration

#### Option A: Using Supabase CLI (Recommended)

```bash
# Ensure you're in the project directory
cd /path/to/maxchekin

# Deploy migration
supabase db push

# Or apply specific migration
supabase migration up --include-all
```

#### Option B: Using Supabase Dashboard

1. Go to SQL Editor in Supabase Dashboard
2. Copy the contents of `supabase/migrations/20251011124422_39fa369b-b021-44c9-a10c-5df6e3d5b0fc.sql`
3. Paste and execute the SQL

#### Option C: Using psql

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[PASSWORD]@[PROJECT_REF].supabase.co:5432/postgres"

# Run the migration
\i supabase/migrations/20251011124422_39fa369b-b021-44c9-a10c-5df6e3d5b0fc.sql
```

### 3. Verify Deployment

Run these verification queries to ensure policies are in place:

```sql
-- Check that RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('check_ins', 'calls', 'activity_logs', 'check_in_config', 
                    'panel_config', 'custom_fields', 'panel_layouts')
ORDER BY tablename;
-- All rows should show rowsecurity = true

-- Check that policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('check_ins', 'calls', 'activity_logs', 'check_in_config', 
                    'panel_config', 'custom_fields', 'panel_layouts')
ORDER BY tablename, policyname;
-- Should show new "Authenticated users" and "Admins" policies
```

### 4. Update Application Configuration

Ensure all applications and services have proper authentication configured:

#### Frontend Applications

```typescript
// Ensure Supabase client is initialized with auth
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

// Ensure users are authenticated before accessing data
const { data: session } = await supabase.auth.getSession()
if (!session) {
  // Redirect to login
}
```

#### Backend Services / Webhooks

```typescript
// Use service role key for server-side operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

#### TV Display Screens

If TV displays need to access configuration tables, create a service account:

```sql
-- Create a service user for TV displays (if needed)
-- This should be done via Supabase Auth API or Dashboard
-- Then grant appropriate permissions
```

### 5. Run Tests

Follow the instructions in `RLS_TESTING_INSTRUCTIONS.md` to verify:

- [ ] Unauthenticated access is blocked
- [ ] Authenticated users can view data
- [ ] Authenticated users can insert/update data tables
- [ ] Non-admin users cannot modify configuration
- [ ] Admin users can modify configuration
- [ ] Application functionality works correctly

### 6. Monitor Application

After deployment, monitor for:

- Authentication errors in application logs
- RLS policy violations in Supabase logs
- User reports of access issues
- Performance impact (if any)

```sql
-- Monitor for RLS violations
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%row-level security%'
ORDER BY calls DESC
LIMIT 10;
```

## Rollback Plan

If issues occur, you can rollback by running this SQL:

```sql
-- Rollback script - restore old policies

-- check_ins
DROP POLICY IF EXISTS "Authenticated users can access check_ins" ON public.check_ins;
CREATE POLICY "Anyone can view check_ins" ON public.check_ins FOR SELECT USING (true);
CREATE POLICY "Anyone can create check_ins" ON public.check_ins FOR INSERT WITH CHECK (true);

-- calls
DROP POLICY IF EXISTS "Authenticated users can access calls" ON public.calls;
CREATE POLICY "Anyone can view calls" ON public.calls FOR SELECT USING (true);
CREATE POLICY "Anyone can create calls" ON public.calls FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update calls" ON public.calls FOR UPDATE USING (true);

-- activity_logs
DROP POLICY IF EXISTS "Authenticated users can view activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON public.activity_logs;
CREATE POLICY "Anyone can view activity logs" ON public.activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert activity logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (true);

-- check_in_config
DROP POLICY IF EXISTS "Authenticated users can view check-in config" ON public.check_in_config;
DROP POLICY IF EXISTS "Admins can manage check-in config" ON public.check_in_config;
CREATE POLICY "Anyone can view check-in config" ON public.check_in_config FOR SELECT USING (true);
CREATE POLICY "Admins can update check-in config" ON public.check_in_config FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- panel_config
DROP POLICY IF EXISTS "Authenticated users can view panel configs" ON public.panel_config;
DROP POLICY IF EXISTS "Admins can manage panel configs" ON public.panel_config;
CREATE POLICY "Anyone can view panel configs" ON public.panel_config FOR SELECT USING (true);
CREATE POLICY "Admins can manage panel configs" ON public.panel_config FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- custom_fields
DROP POLICY IF EXISTS "Authenticated users can view custom fields" ON public.custom_fields;
DROP POLICY IF EXISTS "Admins can manage custom fields" ON public.custom_fields;
CREATE POLICY "Anyone can view custom fields" ON public.custom_fields FOR SELECT USING (true);
CREATE POLICY "Admins can manage custom fields" ON public.custom_fields FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- panel_layouts
DROP POLICY IF EXISTS "Authenticated users can view panel layouts" ON public.panel_layouts;
DROP POLICY IF EXISTS "Admins can manage panel layouts" ON public.panel_layouts;
CREATE POLICY "Anyone can view panel layouts" ON public.panel_layouts FOR SELECT USING (true);
CREATE POLICY "Admins can manage panel layouts" ON public.panel_layouts FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

## Post-Deployment Verification

After deployment and testing, verify that:

1. All application features work correctly
2. Authenticated users can access their data
3. Unauthenticated users cannot access sensitive data
4. Admin functions work properly
5. No unexpected errors in logs
6. Performance is acceptable

## Troubleshooting

### Issue: "new row violates row-level security policy"

**Cause:** Client is not authenticated or doesn't have proper permissions

**Solution:**
1. Verify JWT token is being sent with requests
2. Check that token is valid and not expired
3. Verify user has appropriate role in `user_roles` table

### Issue: Admin cannot modify configuration

**Cause:** User doesn't have 'admin' role

**Solution:**
```sql
-- Check user's roles
SELECT * FROM user_roles WHERE user_id = 'USER_UUID';

-- Add admin role if missing
INSERT INTO user_roles (user_id, role)
VALUES ('USER_UUID', 'admin')
ON CONFLICT DO NOTHING;
```

### Issue: Service/Webhook cannot access data

**Cause:** Service is not authenticated

**Solution:**
1. Create a service role account in Supabase Auth
2. Use service role key for backend operations
3. Or use service account JWT token with requests

## Support

For issues or questions:
1. Check `RLS_TESTING_INSTRUCTIONS.md` for testing procedures
2. Review `RLS_MIGRATION_SUMMARY.md` for detailed changes
3. Check Supabase logs for specific error messages
4. Contact the development team

## Documentation References

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- Migration file: `supabase/migrations/20251011124422_39fa369b-b021-44c9-a10c-5df6e3d5b0fc.sql`
