# Kanban CRM Implementation Guide

## Overview
This document describes the Kanban CRM implementation - a Trello-style board integrated with the call panel system.

## Implementation Date
October 31, 2025

## Features Implemented

### 1. Database Migration (20251031_kanban_crm.sql)
**Location**: `supabase/migrations/20251031_kanban_crm.sql`

**Features**:
- ✅ Idempotent migration (can be run multiple times safely)
- ✅ Four main tables created:
  - `kanban_stages`: Columns/stages with panel integration
  - `kanban_cards`: Cards linked to leads and stages
  - `kanban_events`: Complete audit trail
  - `kanban_stage_users`: User permissions per stage
- ✅ Row Level Security (RLS) policies for all tables
- ✅ Realtime subscriptions enabled
- ✅ Seed data for initial stages (Check-in realizado, Atendimento Produtor, etc.)
- ✅ Automatic card creation trigger on check-in
- ✅ Panel integration via `panel_id` foreign key

**Security**:
- Authenticated users can read all data
- Only admins can manage stages and stage-user assignments
- Operators and admins can manage cards and create events

**Tables Schema**:

```sql
kanban_stages (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  position int NOT NULL,
  panel_id uuid NULL REFERENCES panels(id),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz,
  updated_at timestamptz
)

kanban_cards (
  id uuid PRIMARY KEY,
  lead_id text NOT NULL,
  model_name text,
  responsible text,
  stage_id uuid NOT NULL REFERENCES kanban_stages(id),
  position int NOT NULL,
  created_at timestamptz,
  updated_at timestamptz
)

kanban_events (
  id uuid PRIMARY KEY,
  lead_id text NOT NULL,
  from_stage_id uuid REFERENCES kanban_stages(id),
  to_stage_id uuid REFERENCES kanban_stages(id),
  method text CHECK (method IN ('kanban','checkin')),
  by_user uuid,
  created_at timestamptz
)

kanban_stage_users (
  stage_id uuid REFERENCES kanban_stages(id),
  user_id uuid NOT NULL,
  PRIMARY KEY (stage_id, user_id)
)
```

### 2. App.tsx Structure
**Location**: `src/App.tsx`

**Status**: ✅ Already correctly implemented

The Kanban route is properly nested within the AdminLayout:
```typescript
<Route path="/admin" element={<AdminLayout />}>
  {/* Other admin routes */}
  <Route path="kanban" element={<KanbanBoard />} />
</Route>
```

**Access URL**: `/admin/kanban`

### 3. KanbanBoard Component
**Location**: `src/pages/admin/KanbanBoard.tsx`

**New Features**:
- ✅ **"Chamar agora" (Call now) button** on each card
  - Inserts directly into `calls` table without moving the card
  - Only works if current stage has a `panel_id` configured
  - Creates audit event in `kanban_events`
  
- ✅ **Drag-and-drop functionality** using @dnd-kit
  - Drag cards within same stage to reorder
  - Drag cards between stages to move
  - Automatic position reindexing
  
- ✅ **Panel integration**
  - When card is moved to a stage with `panel_id`, automatically creates call
  - Panel receives realtime notification
  - Source is marked as 'kanban' for tracking

**Key Functions**:
```typescript
// Move card between stages (with panel integration)
moveCardToStage(card, toStageId, toIndex, byMethod)

// Call lead immediately without moving
handleCallNow(card)
```

### 4. Dashboard Filters
**Location**: `src/pages/admin/Dashboard.tsx`

**Status**: ✅ Already correctly implemented

The `applyFilters` function correctly calls `loadDaily()` and the "Aplicar" button uses `onClick={applyFilters}`.

### 5. SOURCE_ID Priority Logic
**Location**: `src/utils/bitrix/createLead.ts`

**Implementation**: ✅ Complete

**Priority Order**:
1. **Priority 1**: Input/Code
   - `newLead.SOURCE_ID`
   - `customFields.SOURCE_ID`
   
2. **Priority 2**: Configuration
   - `lead_creation_config` table with `field_name = 'SOURCE_ID'`
   
3. **Priority 3**: Default
   - `'UC_SJ3VW5''`

**Example Usage**:
```typescript
// Priority 1: Explicit SOURCE_ID in payload
await createLead({ 
  nome: "João Silva",
  SOURCE_ID: 'CUSTOM_SOURCE'  // This takes precedence
});

// Priority 3: No SOURCE_ID provided, uses default 'CALL'
await createLead({ 
  nome: "Maria Santos"
});
```

**Protected Fields**:
- `PARENT_ID_1120`: Always set to `4`, never overridden
- `UF_CRM_1741215746`: Always set to `4`, never overridden

### 6. Check-in Flow Integration
**Location**: `src/pages/CheckInNew.tsx`

**Changes**:
- ✅ Added `SOURCE_ID: 'UC_SJ3VW5'` to payload when creating leads in reception flow
- This ensures all leads created from check-in have proper source tracking

**Code**:
```typescript
const response = await createLead({
  ...newLeadData,
  SOURCE_ID: 'CALL'  // Added for check-in reception flow
});
```

## Integration Flow

### Check-in to Kanban Flow
1. User completes check-in → Lead is created in Bitrix
2. Check-in record inserted into `check_ins` table
3. Trigger `trg_kanban_add_card_on_checkin` fires
4. Card automatically created in default stage (is_default = true)
5. Card appears in Kanban board

### Kanban to Panel Flow
1. User drags card to new stage OR clicks "Chamar agora"
2. If stage has `panel_id`:
   - Record inserted into `calls` table
   - Panel receives realtime notification
   - Lead is called on the panel
3. Event logged in `kanban_events` for audit

## Usage Instructions

### For Admins

#### Setting up Stages with Panels
1. Go to `/admin/kanban`
2. Each stage can be linked to a panel:
   - Click the ⚙️ (Settings) icon on a stage
   - Select a panel from available panels
   - Save configuration

#### Creating New Stages
1. Click "Nova Etapa" button
2. Enter stage name
3. Stage is created at the end of the board

### For Operators

#### Moving Leads Between Stages
- **Drag and drop**: Click and drag a card to a new stage
- Cards automatically reorder by position

#### Calling a Lead
- Click the 📞 "Chamar" button on any card
- If the current stage has a panel configured, the lead will be called
- The card stays in its current stage

## Database Maintenance

### Viewing Audit Trail
```sql
SELECT 
  ke.lead_id,
  fs.name as from_stage,
  ts.name as to_stage,
  ke.method,
  ke.created_at
FROM kanban_events ke
LEFT JOIN kanban_stages fs ON fs.id = ke.from_stage_id
LEFT JOIN kanban_stages ts ON ts.id = ke.to_stage_id
ORDER BY ke.created_at DESC
LIMIT 100;
```

### Checking Stage Configuration
```sql
SELECT 
  ks.name as stage_name,
  ks.position,
  ks.is_default,
  p.name as panel_name,
  COUNT(kc.id) as card_count
FROM kanban_stages ks
LEFT JOIN panels p ON p.id = ks.panel_id
LEFT JOIN kanban_cards kc ON kc.stage_id = ks.id
GROUP BY ks.id, ks.name, ks.position, ks.is_default, p.name
ORDER BY ks.position;
```

## Troubleshooting

### Cards Not Creating on Check-in
1. Check if trigger exists:
   ```sql
   SELECT * FROM pg_trigger 
   WHERE tgname = 'trg_kanban_add_card_on_checkin';
   ```

2. Verify default stage exists:
   ```sql
   SELECT * FROM kanban_stages WHERE is_default = true;
   ```

3. Check trigger function logs in Supabase dashboard

### Panel Not Receiving Calls
1. Verify stage has `panel_id` configured
2. Check `calls` table for inserted records
3. Verify panel has realtime enabled
4. Check panel is active (`is_active = true`)

### Permissions Issues
1. Verify user roles in `user_roles` table
2. Check RLS policies are enabled
3. Test with admin user first

## Technical Notes

### Performance Considerations
- Indexes created on:
  - `kanban_cards.stage_id` (for filtering by stage)
  - `kanban_cards.lead_id` (for lead lookups)
  - `kanban_events.lead_id` (for audit queries)
  - `kanban_events.created_at` (for time-based queries)

### Realtime Subscriptions
All kanban tables are added to the `supabase_realtime` publication, enabling:
- Live card updates when moved
- Real-time stage changes
- Instant event notifications

### Migration Safety
The migration is designed to be idempotent:
- Tables are created with `IF NOT EXISTS`
- Policies are dropped and recreated
- Trigger is dropped and recreated
- Seed data only inserted if tables are empty

## Future Enhancements

### Planned Features
- [ ] Card filtering by responsible user
- [ ] Card search by lead ID or name
- [ ] Stage color customization
- [ ] Card priority/urgency flags
- [ ] Time tracking per stage
- [ ] SLA/deadline warnings
- [ ] Bulk card operations
- [ ] Export/report generation

### Integration Possibilities
- [ ] Webhook notifications on stage changes
- [ ] Integration with Bitrix CRM activities
- [ ] Automated stage progression based on rules
- [ ] SMS/Email notifications per stage

## Build and Test

### Build Status
✅ Build succeeds without errors
```bash
npm run build
# ✓ built in 8.76s
```

### Lint Status
⚠️ Pre-existing lint warnings remain (not related to this implementation)

### Manual Testing Checklist
- [ ] Create new stage
- [ ] Drag card within stage
- [ ] Drag card between stages
- [ ] Click "Chamar agora" button
- [ ] Verify panel receives call
- [ ] Complete check-in and verify card creation
- [ ] Check audit events in database
- [ ] Test with different user roles

## Dependencies
- `@dnd-kit/core@^6.1.0` - Drag and drop functionality
- `@dnd-kit/sortable@^8.0.0` - Sortable lists for cards

## Related Files
- Migration: `supabase/migrations/20251031_kanban_crm.sql`
- Component: `src/pages/admin/KanbanBoard.tsx`
- Lead Creation: `src/utils/bitrix/createLead.ts`
- Check-in Flow: `src/pages/CheckInNew.tsx`
- Routes: `src/App.tsx`

## Support
For issues or questions, contact the development team or refer to the main README.md
