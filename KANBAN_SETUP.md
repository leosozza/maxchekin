# KanbanBoard Setup Instructions

## Current Status

The KanbanBoard component has been **temporarily disabled** in `src/App.tsx` due to missing dependencies that were causing a white screen error.

## What Was Fixed

1. ✅ **Removed KanbanBoard import** from `src/App.tsx` to restore application functionality
2. ✅ **Added required dependencies** to `package.json`:
   - `@dnd-kit/core@^6.1.0`
   - `@dnd-kit/sortable@^8.0.0`
3. ✅ **Verified migration files** are ready to run:
   - `supabase/migrations/20251030_182920_kanban.sql`
   - `supabase/migrations/20251030_183000_kanban.sql`

## How to Re-enable KanbanBoard

Once you're ready to use the KanbanBoard feature, follow these steps:

### Step 1: Install Dependencies

If you haven't already, install the new dependencies:

```bash
npm install
```

This will install `@dnd-kit/core` and `@dnd-kit/sortable` which are now in package.json.

### Step 2: Run Database Migrations

Apply the kanban migrations to your Supabase database:

```bash
# Using Supabase CLI
supabase db push

# Or apply manually through Supabase dashboard
# Execute the following migration files in order:
# 1. supabase/migrations/20251030_182920_kanban.sql
# 2. supabase/migrations/20251030_183000_kanban.sql
```

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

### Migration 20251030_182920_kanban.sql

Creates basic kanban tables:
- `kanban_boards` - Board container table
- `kanban_cards` - Individual cards within boards
- `kanban_comments` - Comments on cards

### Migration 20251030_183000_kanban.sql

Creates the full kanban system with:
- `kanban_stages` - Column/stage definitions with positions
- `kanban_cards` - Cards linked to leads and stages
- `kanban_events` - Audit trail for card movements
- `kanban_stage_users` - User permissions per stage
- RLS policies for security
- Automatic card creation trigger on check-ins
- Realtime subscriptions for live updates

## Notes

- The KanbanBoard component is fully implemented and ready to use once migrations are applied
- The component uses drag-and-drop functionality via @dnd-kit libraries
- Cards are automatically created when check-ins occur (via database trigger)
- The system integrates with your existing panels for notifications
