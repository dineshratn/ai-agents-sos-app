# Running the Supabase Migration

## Problem
Getting "Database error saving new user" when trying to sign up.

## Root Cause
The database migration hasn't been run yet, so the `handle_new_user()` trigger function doesn't exist. This trigger is required to automatically create user profiles when users sign up.

## Solution: Run the Migration

### Option 1: Via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Paste Migration**
   ```bash
   # From your terminal, get the migration file content:
   cat /home/dinesh/docker-ai-agents-training/week1-basics/database/supabase/migrations/20251129_initial_schema.sql
   ```

   - Copy the entire contents
   - Paste into the SQL Editor in Supabase

4. **Run the Migration**
   - Click "Run" (or press Ctrl+Enter)
   - Wait for confirmation message
   - Check for any errors in the output

5. **Verify Tables Were Created**
   - Go to "Table Editor" in the left sidebar
   - You should see these tables:
     - ✅ emergency_contacts
     - ✅ emergencies
     - ✅ locations
     - ✅ assessments
     - ✅ messages
     - ✅ notifications
     - ✅ user_profiles
     - ✅ ai_agent_logs

### Option 2: Via Supabase CLI

1. **Install Supabase CLI** (if not installed)
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**
   ```bash
   supabase login
   ```

3. **Link to Your Project**
   ```bash
   cd /home/dinesh/docker-ai-agents-training/week1-basics
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. **Run Migration**
   ```bash
   supabase db push
   ```

### Option 3: Direct Database Connection

If you have direct PostgreSQL access:

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
  -f /home/dinesh/docker-ai-agents-training/week1-basics/database/supabase/migrations/20251129_initial_schema.sql
```

## Verification

After running the migration, verify it worked:

### 1. Check Tables Exist

In Supabase Dashboard → SQL Editor:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see 8 tables.

### 2. Check Trigger Exists

```sql
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

Should return the trigger on `auth.users`.

### 3. Test Signup

Try creating a user via the backend:

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123",
    "full_name": "Test User",
    "phone": "+1234567890"
  }'
```

Should return success with user and session data.

## Common Issues

### Issue 1: "Extension postgis does not exist"
**Fix**: Enable PostGIS extension in Supabase Dashboard:
- Database → Extensions → Enable "postgis"

### Issue 2: "Permission denied for schema auth"
**Fix**: The migration uses SECURITY DEFINER, so it should work. If it fails:
- Run the migration in the Supabase Dashboard (uses superuser)
- Don't run as a regular database user

### Issue 3: "Relation auth.users does not exist"
**Fix**: You're using the wrong database. Make sure you're connected to your Supabase project database, not a local PostgreSQL instance.

### Issue 4: Tables Already Exist
**Fix**: Drop tables first (CAREFUL - this deletes data):
```sql
DROP TABLE IF EXISTS ai_agent_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS assessments CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS emergencies CASCADE;
DROP TABLE IF EXISTS emergency_contacts CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
```

Then run the migration again.

## After Migration

Once the migration is complete:

1. **Restart Backend Server**
   ```bash
   cd /home/dinesh/docker-ai-agents-training/week1-basics/backend
   node server.js
   ```

2. **Test Signup**
   - Open: http://localhost:3000/login.html
   - Click "Sign Up" tab
   - Fill in the form
   - Submit
   - Should redirect to dashboard

3. **Verify User Profile Created**
   In Supabase Dashboard → Table Editor → user_profiles:
   - You should see your new user profile

## Need Help?

If you're still having issues:

1. Check Supabase logs in Dashboard → Logs
2. Check backend logs: `tail -f /tmp/backend.log`
3. Verify environment variables in `.env` are correct
4. Make sure you're using the correct Supabase project

---

**Last Updated**: 2025-11-30
**Migration File**: database/supabase/migrations/20251129_initial_schema.sql
