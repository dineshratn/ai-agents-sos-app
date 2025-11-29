# Backend API Testing Guide

## ⚠️ IMPORTANT: Run Database Migration First!

Before testing the API endpoints, you **MUST** run the database migration in Supabase:

### Step 1: Run Supabase Migration

1. Go to [https://app.supabase.com](https://app.supabase.com) and open your project
2. Click on **SQL Editor** (left sidebar)
3. Click **"New Query"**
4. Open the migration file: `database/supabase/migrations/20251129_initial_schema.sql`
5. Copy the **entire contents** (450+ lines)
6. Paste into the Supabase SQL Editor
7. Click **"Run"** or press `Cmd/Ctrl + Enter`
8. Wait for "Success. No rows returned" message
9. Verify tables in **Table Editor** (should see 8 tables)

**Why this is required**: The migration creates the `create_user_profile()` trigger that automatically creates user profiles when users sign up. Without this, signup will fail with "Database error saving new user".

---

## Backend Server

### Start Backend Server

```bash
cd /home/dinesh/docker-ai-agents-training/week1-basics/backend
node server.js
```

**Expected Output**:
```
✅ Supabase Admin client initialized (service role)
🔗 Testing Supabase connection...
✅ Supabase connection successful

============================================================
🚨 SOS App Backend - v4.0.0 (Supabase Edition)
============================================================
📡 Server running on: http://localhost:3000
📊 Health check: http://localhost:3000/api/health

📌 API Endpoints:
   Auth:      POST   /api/auth/signup
              POST   /api/auth/login
              ...
```

### Health Check

```bash
curl http://localhost:3000/api/health | python3 -m json.tool
```

**Expected**:
```json
{
  "status": "ok",
  "version": "4.0.0",
  "services": {
    "supabase": "connected",
    "python": "connected"
  }
}
```

---

## API Endpoint Tests

### 1. Authentication

#### Signup

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123",
    "full_name": "Test User",
    "phone": "+1234567890"
  }' | python3 -m json.tool
```

**Expected**:
```json
{
  "message": "User created successfully",
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "full_name": "Test User"
  },
  "session": {
    "access_token": "eyJhbGci...",
    "refresh_token": "eyJhbGci..."
  }
}
```

**Save the `access_token` for subsequent requests!**

#### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123"
  }' | python3 -m json.tool
```

#### Get Current User

```bash
TOKEN="your-access-token-here"

curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

### 2. Emergency Contacts

#### Create Contact

```bash
curl -X POST http://localhost:3000/api/contacts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "phone": "+1987654321",
    "email": "john@example.com",
    "relationship": "Brother",
    "priority": 1
  }' | python3 -m json.tool
```

#### List Contacts

```bash
curl -X GET http://localhost:3000/api/contacts \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

#### Update Contact

```bash
CONTACT_ID="uuid-here"

curl -X PUT http://localhost:3000/api/contacts/$CONTACT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1111111111"
  }' | python3 -m json.tool
```

#### Delete Contact

```bash
curl -X DELETE http://localhost:3000/api/contacts/$CONTACT_ID \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

### 3. Emergency Operations

#### Trigger Emergency

```bash
curl -X POST http://localhost:3000/api/emergency/trigger \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Severe chest pain and difficulty breathing",
    "location": "Home",
    "latitude": 37.7749,
    "longitude": -122.4194
  }' | python3 -m json.tool
```

**Expected**: AI assessment from multi-agent system + emergency record created

```json
{
  "message": "Emergency triggered successfully",
  "emergency": {
    "id": "uuid-here",
    "emergency_type": "medical",
    "severity": 5,
    "status": "active"
  },
  "assessment": {
    "situation_analysis": "...",
    "guidance_steps": "...",
    "resource_recommendations": "...",
    "confidence_score": 0.95
  }
}
```

#### List Emergencies

```bash
curl -X GET "http://localhost:3000/api/emergency?status=active&limit=10" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

#### Get Emergency Details

```bash
EMERGENCY_ID="uuid-here"

curl -X GET http://localhost:3000/api/emergency/$EMERGENCY_ID \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected**: Full emergency data with locations, AI assessments, and messages

#### Resolve Emergency

```bash
curl -X PATCH http://localhost:3000/api/emergency/$EMERGENCY_ID/resolve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resolution_notes": "Ambulance arrived, patient stable"
  }' | python3 -m json.tool
```

#### Cancel Emergency

```bash
curl -X PATCH http://localhost:3000/api/emergency/$EMERGENCY_ID/cancel \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cancellation_reason": "False alarm"
  }' | python3 -m json.tool
```

### 4. Messages

#### Send Message

```bash
curl -X POST http://localhost:3000/api/messages/emergency/$EMERGENCY_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Patient is stable, waiting for ambulance"
  }' | python3 -m json.tool
```

#### Get Emergency Messages

```bash
curl -X GET http://localhost:3000/api/messages/emergency/$EMERGENCY_ID \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

### 5. User Profile

#### Get Profile

```bash
curl -X GET http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

#### Update Profile

```bash
curl -X PUT http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Updated Name",
    "address": "123 Main St, San Francisco, CA",
    "blood_type": "O+",
    "allergies": "Penicillin",
    "medications": "None",
    "emergency_notes": "Diabetic, insulin dependent"
  }' | python3 -m json.tool
```

#### Get User Stats

```bash
curl -X GET http://localhost:3000/api/user/stats \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected**:
```json
{
  "stats": {
    "total_emergencies": 5,
    "active_emergencies": 1,
    "resolved_emergencies": 3,
    "cancelled_emergencies": 1,
    "emergency_contacts": 2
  }
}
```

---

## Automated Testing

### Run All Tests

```bash
cd /home/dinesh/docker-ai-agents-training/week1-basics/backend
bash test-api.sh
```

**Expected** (after migration is run):
```
====================================================================
🧪 SOS App Backend API Tests - v4.0.0 (Supabase Edition)
====================================================================

✅ PASSED: Health check endpoint
✅ PASSED: User signup
✅ PASSED: User login
✅ PASSED: Get current user
✅ PASSED: Get user profile
✅ PASSED: Create emergency contact
✅ PASSED: Get emergency contacts
✅ PASSED: Trigger emergency with AI assessment
✅ PASSED: Get emergencies list
✅ PASSED: Send message to emergency
✅ PASSED: Get user statistics

====================================================================
📊 Test Summary
====================================================================
✅ Passed: 11
❌ Failed: 0

🎉 All tests passed!
```

---

## Security Features

### Row Level Security (RLS)

All tables have RLS enabled. Users can only access their own data:

- ✅ **Emergencies**: User can only see/modify their own emergencies
- ✅ **Contacts**: User can only see/modify their own contacts
- ✅ **Messages**: User can only see messages for their emergencies
- ✅ **Profiles**: User can only see/modify their own profile

**Test RLS**: Try accessing another user's data with your token - should return 404 or empty results.

### Authentication

- JWT tokens from Supabase Auth
- Tokens expire after 1 hour (default)
- Use refresh token to get new access token
- All protected endpoints require `Authorization: Bearer <token>` header

---

## Common Issues

### 1. "Database error saving new user"

**Cause**: Database migration not run
**Fix**: Follow "Step 1: Run Supabase Migration" above

### 2. "Invalid or expired token"

**Cause**: Access token expired (1 hour default)
**Fix**: Use the refresh token endpoint to get a new access token

### 3. "Emergency not found"

**Cause**: Trying to access another user's emergency (RLS blocking)
**Fix**: Ensure you're using the correct token for the user who created the emergency

### 4. "Python service unavailable"

**Cause**: Python AI service not running
**Fix**:
```bash
docker run -d --name sos-agents -p 8000:8000 --env-file .env -e VERIFY_SSL=false sos-agents:latest
```

---

## API Reference Summary

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | No | Health check |
| `/api/auth/signup` | POST | No | Register user |
| `/api/auth/login` | POST | No | Login user |
| `/api/auth/logout` | POST | Yes | Logout user |
| `/api/auth/me` | GET | Yes | Get current user |
| `/api/contacts` | GET | Yes | List contacts |
| `/api/contacts` | POST | Yes | Create contact |
| `/api/contacts/:id` | GET | Yes | Get contact |
| `/api/contacts/:id` | PUT | Yes | Update contact |
| `/api/contacts/:id` | DELETE | Yes | Delete contact |
| `/api/emergency/trigger` | POST | Yes | Trigger emergency |
| `/api/emergency` | GET | Yes | List emergencies |
| `/api/emergency/:id` | GET | Yes | Get emergency |
| `/api/emergency/:id/resolve` | PATCH | Yes | Resolve emergency |
| `/api/emergency/:id/cancel` | PATCH | Yes | Cancel emergency |
| `/api/messages/emergency/:id` | GET | Yes | Get messages |
| `/api/messages/emergency/:id` | POST | Yes | Send message |
| `/api/user/profile` | GET | Yes | Get profile |
| `/api/user/profile` | PUT | Yes | Update profile |
| `/api/user/stats` | GET | Yes | Get stats |

---

**Last Updated**: 2025-11-29
**Version**: 4.0.0 (Supabase Edition)
**Status**: Ready for testing (after migration)
