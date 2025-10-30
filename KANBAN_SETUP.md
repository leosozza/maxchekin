# KanbanBoard Setup Instructions

## Current Status

The KanbanBoard component has been **temporarily disabled** in `src/App.tsx` due to missing dependencies that were causing a white screen error.

## What Was Fixed

1. ✅ **Removed KanbanBoard import** from `src/App.tsx` to restore application functionality
2. ✅ **Added required dependencies** to `package.json`:
   - `@dnd-kit/core@^6.1.0`
   - `@dnd-kit/sortable@^8.0.0`
3. ✅ **Verified migration files** are ready to run:
   - `supabase/migrations/20251030_183000_kanban.sql` (main migration - USE THIS ONE)
   - ⚠️ `supabase/migrations/20251030_182920_kanban.sql` (older schema - conflicts with the main migration)

## How to Re-enable KanbanBoard

Once you're ready to use the KanbanBoard feature, follow these steps:

### Step 1: Install Dependencies

If you haven't already, install the new dependencies:

```bash
npm install
```

This will install `@dnd-kit/core` and `@dnd-kit/sortable` which are now in package.json.

### Step 2: Run Database Migrations

⚠️ **Important:** There are two migration files but they have conflicting schemas. The KanbanBoard component requires the schema from `20251030_183000_kanban.sql`.

**Recommended approach:** Only apply the main migration:

```bash
# Using Supabase CLI - it will run migrations in chronological order
# You may need to skip or remove the first kanban migration (20251030_182920_kanban.sql)
# as it conflicts with the second one

# Option 1: Apply only the main migration manually
# Execute the SQL from: supabase/migrations/20251030_183000_kanban.sql
# through the Supabase dashboard SQL editor

# Option 2: Rename/remove the conflicting migration first
mv supabase/migrations/20251030_182920_kanban.sql supabase/migrations/20251030_182920_kanban.sql.backup
supabase db push
```

**Migration conflict details:**
- `20251030_182920_kanban.sql` creates tables: `kanban_boards`, `kanban_cards` (with board_id), `kanban_comments`
- `20251030_183000_kanban.sql` creates tables: `kanban_stages`, `kanban_cards` (with stage_id, lead_id), `kanban_events`, `kanban_stage_users`
- Both migrations try to create `kanban_cards` table with different schemas
- The KanbanBoard component expects the schema from the second migration

### Step 3: Re-enable KanbanBoard in App.tsx

Edit `src/App.tsx` and uncomment the KanbanBoard import and route:

```typescript
import React from 'react';
import { Route } from 'react-router-dom';
import KanbanBoard from './pages/admin/KanbanBoard'; // Uncomment this line

// Other imports...

const App = () => {
    return (
        <div>
            {/* Other routes... */}
            <Route path="kanban" element={<KanbanBoard />} /> {/* Uncomment this line */}
        </div>
    );
};

export default App;
```

### Step 4: Verify the Build

Test that everything works:

```bash
npm run build
```

The build should complete successfully without errors.

## Migration Details

### ⚠️ Migration Conflict Warning

There are two kanban migration files in the repository with conflicting schemas:

### Migration 20251030_182920_kanban.sql (Older - Not Compatible)

This migration creates:
- `kanban_boards` - Board container table
- `kanban_cards` - Cards with `board_id`, `title`, `description`
- `kanban_comments` - Comments on cards

**This schema is NOT compatible with the current KanbanBoard component.**

### Migration 20251030_183000_kanban.sql (Current - Required)

This migration creates the full kanban system that the KanbanBoard component expects:
- `kanban_stages` - Column/stage definitions with positions (replaces boards concept)
- `kanban_cards` - Cards linked to leads and stages (different schema from first migration)
- `kanban_events` - Audit trail for card movements
- `kanban_stage_users` - User permissions per stage
- RLS policies for security
- Automatic card creation trigger on check-ins
- Realtime subscriptions for live updates

**Use this migration - it matches the KanbanBoard implementation.**

## Notes

- The KanbanBoard component is fully implemented and ready to use once migrations are applied
- The component uses drag-and-drop functionality via @dnd-kit libraries
- Cards are automatically created when check-ins occur (via database trigger)
- The system integrates with your existing panels for notifications
