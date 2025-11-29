# Supabase Integration Guide

## Overview

The SOS Emergency App now uses **Supabase** for:
- ✅ **Database**: PostgreSQL 15 with PostGIS for location data
- ✅ **Authentication**: Built-in auth with email/password (+ social providers)
- ✅ **Realtime**: WebSocket subscriptions for live emergency updates
- ✅ **Row Level Security**: Automatic data isolation per user
- ✅ **Storage**: File uploads (future: emergency photos/videos)

**Benefits**:
- No need to manage PostgreSQL server
- Built-in authentication (no custom JWT code)
- Realtime subscriptions out of the box
- Free tier: 500MB database, unlimited API requests
- Automatic backups and scaling

---

## Quick Start

### 1. Create Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign in with GitHub
3. Click **"New Project"**
4. Fill in:
   - **Name**: `sos-emergency-app`
   - **Database Password**: Generate strong password (save it!)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free (perfect for development)
5. Click **"Create new project"**
6. Wait ~2 minutes for provisioning

### 2. Run Database Migration

Once project is ready:

1. Go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Open file: `database/supabase/migrations/20251129_initial_schema.sql`
4. Copy entire contents
5. Paste into Supabase SQL Editor
6. Click **"Run"** (or Cmd/Ctrl + Enter)
7. Verify success (should see "Success. No rows returned")

### 3. Verify Tables Created

1. Go to **Table Editor** (left sidebar)
2. You should see 8 tables:
   - ✅ emergency_contacts
   - ✅ emergencies
   - ✅ locations (with PostGIS support)
   - ✅ ai_assessments
   - ✅ messages
   - ✅ notifications
   - ✅ audit_log
   - ✅ user_profiles

### 4. Get API Credentials

1. Go to **Project Settings** → **API** (gear icon, left sidebar)
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public** key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role** key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

3. Update your `.env` file:
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5. Test Connection

```bash
# Start services
docker-compose up -d

# Check logs
docker-compose logs node-backend

# Should see:
# ✅ Supabase connection successful
# ✅ Supabase Admin client initialized
```

---

## Architecture

### Before (PostgreSQL + Custom Auth)

```
Node.js Backend
    ├── Sequelize (ORM)
    ├── bcrypt (password hashing)
    ├── jsonwebtoken (JWT generation)
    └── Custom auth logic
        ↓
Self-hosted PostgreSQL
    └── Manual schema management
```

### After (Supabase)

```
Node.js Backend
    └── @supabase/supabase-js
        ↓
Supabase (Managed Service)
    ├── PostgreSQL 15 + PostGIS
    ├── Built-in Auth (JWT)
    ├── Realtime (WebSocket)
    ├── Row Level Security
    └── Storage (file uploads)
```

---

## Authentication

### Sign Up

```javascript
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Backend API endpoint
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, full_name, phone } = req.body;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        phone
      }
    }
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  // User profile automatically created via trigger
  res.json({ user: data.user });
});
```

### Sign In

```javascript
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Return session with access_token
  res.json({
    user: data.user,
    session: data.session
  });
});
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
  password: 'securepassword123',
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
  password: 'securepassword123'
});

// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Sign out
await supabase.auth.signOut();
```

---

## Database Operations

### Insert Emergency

```javascript
const { createAuthenticatedClient } = require('./config/supabase');

app.post('/api/emergency/trigger', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const userClient = createAuthenticatedClient(token);

  const { data, error } = await userClient
    .from('emergencies')
    .insert({
      description: req.body.description,
      emergency_type: 'medical',
      severity: 5,
      status: 'active'
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});
```

### Get User's Emergencies

```javascript
app.get('/api/emergency', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const userClient = createAuthenticatedClient(token);

  const { data, error } = await userClient
    .from('emergencies')
    .select(`
      *,
      locations(*),
      ai_assessments(*),
      messages(*)
    `)
    .order('triggered_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});
```

---

## Realtime Subscriptions

### Backend (Socket.IO Integration)

```javascript
const { supabase } = require('./config/supabase');

// Subscribe to new emergencies
const emergencyChannel = supabase
  .channel('db-changes')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'emergencies'
  }, (payload) => {
    console.log('New emergency:', payload.new);

    // Broadcast to Socket.IO
    io.emit('emergency_triggered', payload.new);
  })
  .subscribe();

// Subscribe to location updates
const locationChannel = supabase
  .channel('location-changes')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'locations'
  }, (payload) => {
    // Broadcast to emergency room
    io.to(`emergency_${payload.new.emergency_id}`)
      .emit('location_updated', payload.new);
  })
  .subscribe();
```

### Frontend (Direct Supabase Realtime)

```javascript
// Subscribe to emergencies for specific user
const channel = supabase
  .channel('user_emergencies')
  .on('postgres_changes', {
    event: '*', // INSERT, UPDATE, DELETE
    schema: 'public',
    table: 'emergencies',
    filter: `user_id=eq.${user.id}`
  }, (payload) => {
    if (payload.eventType === 'INSERT') {
      console.log('New emergency:', payload.new);
    } else if (payload.eventType === 'UPDATE') {
      console.log('Emergency updated:', payload.new);
    }
  })
  .subscribe();
```

---

## Row Level Security (RLS)

All tables have RLS policies that automatically filter data by user.

### Example: Emergencies Table

```sql
-- Users can only see their own emergencies
CREATE POLICY "Users can view their own emergencies"
  ON emergencies FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only create emergencies for themselves
CREATE POLICY "Users can create their own emergencies"
  ON emergencies FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**What this means**:
- User A cannot see User B's emergencies
- Enforced at database level (cannot be bypassed from client)
- Works automatically with Supabase Auth

---

## PostGIS Location Queries

### Find Nearest Hospitals

```javascript
// Find hospitals within 5km of emergency location
const { data } = await supabase.rpc('find_nearby_hospitals', {
  emergency_lat: 40.7128,
  emergency_lng: -74.0060,
  radius_km: 5
});
```

**SQL Function** (add to migration):
```sql
CREATE OR REPLACE FUNCTION find_nearby_hospitals(
  emergency_lat DECIMAL,
  emergency_lng DECIMAL,
  radius_km DECIMAL
)
RETURNS TABLE (
  name TEXT,
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.name,
    ST_Distance(
      ST_SetSRID(ST_MakePoint(emergency_lng, emergency_lat), 4326)::geography,
      h.location
    ) / 1000 AS distance_km
  FROM hospitals h
  WHERE ST_DWithin(
    ST_SetSRID(ST_MakePoint(emergency_lng, emergency_lat), 4326)::geography,
    h.location,
    radius_km * 1000
  )
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;
```

---

## Security Best Practices

### 1. API Keys

**✅ DO**:
- Use `anon` key in frontend/client code
- Use `service_role` key only in backend (never expose)
- Store keys in `.env` (never commit to Git)

**❌ DON'T**:
- Hardcode keys in source code
- Expose `service_role` key to frontend
- Commit `.env` to version control

### 2. Row Level Security

**Always enable RLS**:
```sql
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
```

**Create policies**:
```sql
CREATE POLICY "policy_name"
  ON your_table
  FOR SELECT
  USING (auth.uid() = user_id);
```

### 3. Input Validation

```javascript
// Validate user input
const { error } = await supabase
  .from('emergencies')
  .insert({
    description: req.body.description.slice(0, 1000), // Limit length
    severity: Math.min(5, Math.max(1, req.body.severity)) // Clamp 1-5
  });
```

---

## Troubleshooting

### "JWT expired" error

**Cause**: Access token expired (default: 1 hour)
**Solution**: Refresh token

```javascript
const { data, error } = await supabase.auth.refreshSession();
```

### RLS blocking queries

**Cause**: RLS policy not matching user
**Solution**: Check policy with service_role key

```javascript
// Use admin client to bypass RLS (debugging only)
const { data } = await supabaseAdmin
  .from('emergencies')
  .select('*');
```

### Realtime not working

**Cause**: Table not added to publication
**Solution**: Run in SQL Editor

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE your_table;
```

---

## Migration from PostgreSQL

If you have existing data in PostgreSQL:

### 1. Export Data

```bash
pg_dump -U sos_user -h localhost -d sos_emergency \
  --data-only --table=emergencies > emergencies.sql
```

### 2. Import to Supabase

1. Go to Supabase SQL Editor
2. Paste export SQL
3. Run query

### 3. Verify Data

```javascript
const { count } = await supabase
  .from('emergencies')
  .select('*', { count: 'exact', head: true });

console.log(`Imported ${count} emergencies`);
```

---

## Cost Estimation

### Free Tier (Perfect for Development)

- 500 MB database
- 1 GB file storage
- 2 GB bandwidth
- 50,000 monthly active users
- Unlimited API requests

### Pro Tier ($25/month)

- 8 GB database
- 100 GB file storage
- 50 GB bandwidth
- 100,000 monthly active users
- Daily backups
- Point-in-time recovery

**For SOS app** (1,000 active users):
- Free tier is sufficient for MVP
- Upgrade to Pro when you hit limits

---

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [PostGIS with Supabase](https://supabase.com/docs/guides/database/extensions/postgis)
- [Realtime](https://supabase.com/docs/guides/realtime)
- [Supabase Discord](https://discord.supabase.com)

---

**Last Updated**: 2025-11-29
**Version**: 4.0.0 (Supabase Edition)
**Status**: Production Ready
