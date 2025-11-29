# Supabase Setup Guide

## Overview

This project uses Supabase for:
- **Database**: PostgreSQL with PostGIS for location data
- **Authentication**: Built-in auth with JWT tokens
- **Realtime**: WebSocket subscriptions for live updates
- **Row Level Security**: Automatic data isolation per user

---

## Quick Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose:
   - **Organization**: Your organization
   - **Project Name**: `sos-emergency-app`
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
4. Wait for project to be provisioned (~2 minutes)

### 2. Get Project Credentials

Once your project is ready:

1. Go to **Project Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (keep secret!)

3. Add to your `.env` file:
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Run Database Migration

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to **SQL Editor** in Supabase Dashboard
2. Click **New Query**
3. Copy entire contents of `migrations/20251129_initial_schema.sql`
4. Paste into query editor
5. Click **Run** (or Cmd/Ctrl + Enter)
6. Verify tables created: Go to **Table Editor**

#### Option B: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migration
supabase db push

# Or apply specific migration
supabase db execute -f database/supabase/migrations/20251129_initial_schema.sql
```

### 4. Verify Setup

Check these in Supabase Dashboard:

**Tables** (should see 8 tables):
- ✅ emergency_contacts
- ✅ emergencies
- ✅ locations
- ✅ ai_assessments
- ✅ messages
- ✅ notifications
- ✅ audit_log
- ✅ user_profiles

**Extensions** (Database → Extensions):
- ✅ postgis
- ✅ uuid-ossp

**RLS Policies** (Authentication → Policies):
- ✅ Each table should have 2-4 policies

**Realtime** (Database → Replication):
- ✅ emergencies (enabled)
- ✅ locations (enabled)
- ✅ messages (enabled)
- ✅ notifications (enabled)

---

## Configuration

### Email Templates

Customize auth emails:

1. Go to **Authentication** → **Email Templates**
2. Edit templates for:
   - Confirm signup
   - Invite user
   - Magic link
   - Change email
   - Reset password

### URL Configuration

Set redirect URLs:

1. Go to **Authentication** → **URL Configuration**
2. Set:
   - **Site URL**: `http://localhost:3000` (dev) or `https://yourapp.com` (prod)
   - **Redirect URLs**: Add:
     - `http://localhost:3000/auth/callback`
     - `https://yourapp.com/auth/callback`

### Auth Providers

Enable additional providers (optional):

1. Go to **Authentication** → **Providers**
2. Enable providers:
   - **Email** (default, enabled)
   - **Google** (optional)
   - **Apple** (optional)
   - **Phone** (optional)

---

## Database Schema

### Tables Overview

| Table | Description | RLS Enabled |
|-------|-------------|-------------|
| **emergency_contacts** | User's emergency contacts | ✅ Yes |
| **emergencies** | Emergency sessions | ✅ Yes |
| **locations** | Location tracking (PostGIS) | ✅ Yes |
| **ai_assessments** | AI multi-agent outputs | ✅ Yes |
| **messages** | Two-way communication | ✅ Yes |
| **notifications** | Notification logs | ✅ Yes |
| **audit_log** | Security audit trail | ✅ Yes |
| **user_profiles** | Extended user data | ✅ Yes |

### Row Level Security (RLS)

All tables have RLS policies that automatically:
- Filter data to only show user's own records
- Prevent users from accessing other users' data
- Work seamlessly with Supabase Auth

**Example**: User can only see their own emergencies
```sql
CREATE POLICY "Users can view their own emergencies"
  ON emergencies FOR SELECT
  USING (auth.uid() = user_id);
```

### PostGIS Integration

Location data uses PostGIS for:
- Spatial indexing (fast queries)
- Geographic distance calculations
- Geofencing capabilities

**Automatic geometry creation**:
When you insert a location with lat/lng, the `geom` column is automatically populated.

```sql
-- Insert location (geom is auto-created)
INSERT INTO locations (emergency_id, latitude, longitude)
VALUES ('uuid', 40.7128, -74.0060);
```

### Realtime Subscriptions

Enabled for live updates on:
- **emergencies**: New emergency triggers
- **locations**: Location updates during emergency
- **messages**: New messages in emergency thread
- **notifications**: Notification status changes

**Client-side subscription**:
```javascript
const channel = supabase
  .channel('emergency_updates')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'emergencies'
  }, (payload) => {
    console.log('New emergency!', payload);
  })
  .subscribe();
```

---

## Security

### Row Level Security (RLS)

**All tables require RLS policies.** Without RLS:
- ❌ Users could see all data (security breach)
- ❌ No data isolation between users

**With RLS** (current setup):
- ✅ Each user sees only their data
- ✅ Enforced at database level
- ✅ Cannot be bypassed from client

### API Keys

**Two types of keys**:

1. **anon (public) key**:
   - ✅ Safe to use in client-side code
   - ✅ Respects RLS policies
   - ✅ User can only access their own data

2. **service_role key**:
   - ❌ NEVER expose to client
   - ❌ Bypasses RLS policies
   - ✅ Use only in backend/server code

### Best Practices

1. **Never commit keys to Git**
   - Use `.env` files (in `.gitignore`)
   - Use environment variables in production

2. **Validate user input**
   - Use Postgres CHECK constraints
   - Validate in application code too

3. **Audit logging**
   - All critical actions logged to `audit_log` table
   - Track IP address and user agent

4. **Regular backups**
   - Supabase auto-backups daily (free tier: 7 days)
   - Enable point-in-time recovery (paid tiers)

---

## Usage Examples

### Backend (Node.js)

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Create emergency
const { data, error } = await supabase
  .from('emergencies')
  .insert({
    description: 'Severe chest pain',
    emergency_type: 'medical',
    severity: 5
  })
  .select()
  .single();

// Get user's emergencies
const { data: emergencies } = await supabase
  .from('emergencies')
  .select(`
    *,
    locations(*),
    ai_assessments(*),
    messages(*)
  `)
  .order('triggered_at', { ascending: false });
```

### Frontend (React/Vue)

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    data: {
      full_name: 'John Doe',
      phone: '+1234567890'
    }
  }
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Subscribe to realtime updates
supabase
  .channel('emergencies')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'emergencies'
  }, (payload) => {
    console.log('New emergency:', payload.new);
  })
  .subscribe();
```

---

## Troubleshooting

### Migration fails

**Problem**: Error running migration
**Solution**:
1. Check extensions are enabled: `postgis`, `uuid-ossp`
2. Run in SQL Editor (better error messages)
3. Check for syntax errors

### RLS blocking queries

**Problem**: Query returns empty even though data exists
**Solution**:
1. Verify user is authenticated
2. Check RLS policies with:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'emergencies';
   ```
3. Use service_role key for testing (backend only)

### Realtime not working

**Problem**: Not receiving realtime updates
**Solution**:
1. Check table is added to publication:
   ```sql
   SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
   ```
2. Verify channel subscription is active
3. Check browser console for WebSocket errors

### PostGIS queries slow

**Problem**: Location queries taking too long
**Solution**:
1. Verify GIST index exists:
   ```sql
   \d locations
   -- Should show: idx_locations_geom GIST (geom)
   ```
2. Use geography type (not geometry)
3. Add `LIMIT` to large queries

---

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostGIS with Supabase](https://supabase.com/docs/guides/database/extensions/postgis)
- [Realtime Guide](https://supabase.com/docs/guides/realtime)

---

## Support

- **Supabase Discord**: [discord.supabase.com](https://discord.supabase.com)
- **GitHub Issues**: [github.com/supabase/supabase](https://github.com/supabase/supabase)
- **Documentation**: [supabase.com/docs](https://supabase.com/docs)

---

**Last Updated**: 2025-11-29
**Schema Version**: 20251129_initial_schema
**Supabase Version**: Compatible with all plans (Free, Pro, Enterprise)
