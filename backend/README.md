# SOS App Backend - v4.0.0 (Supabase Edition)

RESTful API backend for the SOS Emergency App with Supabase integration, multi-agent AI assessment, and real-time capabilities.

---

## 🏗️ Architecture

```
Backend Server (Express.js + Supabase)
├── Authentication (Supabase Auth + JWT)
├── RESTful API (Express routes)
├── Database (Supabase PostgreSQL + RLS)
├── AI Integration (Python multi-agent service)
└── Realtime (Supabase subscriptions ready)
```

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── supabase.js          # Supabase client configuration
│   ├── middleware/
│   │   └── auth.js               # JWT authentication middleware
│   └── routes/
│       ├── auth.js               # Authentication routes
│       ├── emergency.js          # Emergency operations
│       ├── contacts.js           # Emergency contacts CRUD
│       ├── messages.js           # Messaging system
│       └── user.js               # User profile management
├── server.js                     # Main Express server
├── package.json                  # Dependencies
├── test-api.sh                   # API testing script
└── README.md                     # This file
```

---

## 🚀 Quick Start

### Prerequisites

1. **Node.js** 18+ installed
2. **Supabase project** created at [https://app.supabase.com](https://app.supabase.com)
3. **Database migration** run (see below)
4. **Environment variables** configured in `.env`

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Supabase Migration

**IMPORTANT**: Run this migration in Supabase SQL Editor before starting the server!

1. Go to your Supabase project → **SQL Editor**
2. Copy contents from: `../database/supabase/migrations/20251129_initial_schema.sql`
3. Paste and click **"Run"**
4. Verify 8 tables created in **Table Editor**

See [`../docs/SUPABASE_INTEGRATION.md`](../docs/SUPABASE_INTEGRATION.md) for detailed setup.

### 3. Configure Environment

Update `../.env` with your Supabase credentials:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
PYTHON_SERVICE_URL=http://localhost:8000
PORT=3000
```

### 4. Start Server

```bash
node server.js
```

**Expected output**:
```
✅ Supabase connection successful
============================================================
🚨 SOS App Backend - v4.0.0 (Supabase Edition)
============================================================
📡 Server running on: http://localhost:3000
✅ Backend ready to receive requests
```

### 5. Test API

```bash
# Health check
curl http://localhost:3000/api/health

# Run comprehensive tests
bash test-api.sh
```

---

## 📌 API Endpoints

### Authentication

- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh access token

### Emergency Operations

- `POST /api/emergency/trigger` - Trigger emergency with AI assessment
- `GET /api/emergency` - List user's emergencies
- `GET /api/emergency/:id` - Get emergency details
- `PATCH /api/emergency/:id/resolve` - Mark emergency as resolved
- `PATCH /api/emergency/:id/cancel` - Cancel emergency

### Emergency Contacts

- `GET /api/contacts` - List emergency contacts
- `POST /api/contacts` - Create contact
- `GET /api/contacts/:id` - Get contact details
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact

### Messages

- `GET /api/messages/emergency/:emergencyId` - Get emergency messages
- `POST /api/messages/emergency/:emergencyId` - Send message
- `GET /api/messages/:id` - Get specific message
- `DELETE /api/messages/:id` - Delete message

### User Profile

- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile
- `GET /api/user/stats` - Get user statistics

See [`../docs/BACKEND_API_TESTING.md`](../docs/BACKEND_API_TESTING.md) for detailed examples.

---

## 🔒 Security

### Row Level Security (RLS)

All database tables have RLS policies enabled:

- Users can only access their own data
- Enforced at database level (cannot be bypassed from client)
- Automatic filtering by `auth.uid()`

### Authentication

- JWT tokens from Supabase Auth
- Tokens expire after 1 hour (configurable)
- Refresh tokens for extending sessions
- All protected endpoints require `Authorization: Bearer <token>` header

### Input Validation

- Email format validation
- Password strength requirements (min 6 characters)
- Phone number format validation
- Message length limits (2000 chars)
- SQL injection protection (via Supabase client)

---

## 🧪 Testing

### Manual Testing

See [`../docs/BACKEND_API_TESTING.md`](../docs/BACKEND_API_TESTING.md) for curl examples.

### Automated Testing

```bash
bash test-api.sh
```

Tests:
- ✅ Health check
- ✅ User signup/login
- ✅ Contact CRUD operations
- ✅ Emergency trigger with AI
- ✅ Message sending
- ✅ User statistics

---

## 🤖 AI Integration

### Multi-Agent Assessment

When an emergency is triggered, the backend calls the Python AI service:

```javascript
POST /emergency/trigger
→ Calls Python service: POST http://localhost:8000/assess-multi
→ Supervisor orchestrates 3 specialist agents:
   1. Situation Agent (emergency classification)
   2. Guidance Agent (step-by-step instructions)
   3. Resource Agent (nearby hospitals, services)
→ Returns comprehensive assessment
→ Stores in database (ai_assessments table)
```

**Start Python AI service**:
```bash
docker run -d --name sos-agents -p 8000:8000 --env-file .env -e VERIFY_SSL=false sos-agents:latest
```

---

## 📊 Database Tables

| Table | Description | RLS |
|-------|-------------|-----|
| `emergencies` | Emergency sessions | ✅ |
| `emergency_contacts` | User's emergency contacts | ✅ |
| `locations` | Location tracking (PostGIS) | ✅ |
| `ai_assessments` | AI analysis results | ✅ |
| `messages` | Emergency messages | ✅ |
| `notifications` | Notification delivery | ✅ |
| `audit_log` | Security audit trail | ✅ |
| `user_profiles` | Extended user data | ✅ |

---

## 🔄 Next Steps

### Phase 6 Remaining Tasks

- [x] Backend API implementation
- [ ] WebSocket server (Socket.IO)
- [ ] Supabase Realtime integration
- [ ] Enhanced frontend with auth
- [ ] Real-time emergency dashboard
- [ ] End-to-end testing

See [`../docs/PHASE6_PROGRESS.md`](../docs/PHASE6_PROGRESS.md) for full roadmap.

---

## 🐛 Troubleshooting

### "Database error saving new user"

**Cause**: Migration not run
**Fix**: Run migration in Supabase SQL Editor (see step 2 above)

### "Invalid or expired token"

**Cause**: JWT expired
**Fix**: Use refresh token endpoint

### "Python service unavailable"

**Cause**: AI service not running
**Fix**: Start Docker container (see AI Integration above)

### "Port 3000 already in use"

**Cause**: Another process using port 3000
**Fix**: Change `PORT` in .env or kill the other process

---

## 📚 Documentation

- [`../docs/SUPABASE_INTEGRATION.md`](../docs/SUPABASE_INTEGRATION.md) - Supabase setup guide
- [`../docs/BACKEND_API_TESTING.md`](../docs/BACKEND_API_TESTING.md) - API testing guide
- [`../docs/PHASE6_PROGRESS.md`](../docs/PHASE6_PROGRESS.md) - Implementation progress
- [`../database/supabase/README.md`](../database/supabase/README.md) - Database setup

---

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18
- **Database**: Supabase (PostgreSQL 15 + PostGIS)
- **Auth**: Supabase Auth (JWT)
- **ORM**: Supabase client (@supabase/supabase-js)
- **AI**: Python FastAPI + LangGraph
- **Testing**: curl + bash scripts
- **Deployment**: Docker (planned)

---

**Version**: 4.0.0 (Supabase Edition)
**Status**: Ready for testing (after migration)
**Last Updated**: 2025-11-29
