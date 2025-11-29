# Phase 6: Web App Enhancement - Implementation Plan

## Overview

Transform the current v3.0.0 POC into a production web application with database persistence, real-time updates, and authentication.

**Timeline**: 1 week (5-7 days)
**Current Status**: v3.0.0 - Stateless API with multi-agent orchestration
**Target**: v4.0.0 - Production web app with persistence and real-time features

---

## What We're Building

### Current Architecture (v3.0.0)

```
Frontend (Static HTML/CSS/JS)
    ↓
Node.js Gateway (Express) - Port 3000
    ↓
Python AI Service (FastAPI) - Port 8000
    ↓
OpenRouter API
```

**Limitations**:
- No data persistence
- No real-time updates
- No authentication
- No session history beyond LangGraph MemorySaver (memory-only)

### Target Architecture (v4.0.0)

```
Frontend (Enhanced React/Vue or improved HTML+JS)
    ↓ HTTP + WebSocket
Node.js Backend (Express + Socket.IO)
    ├── REST API
    ├── WebSocket Server
    ├── Authentication (JWT)
    ├── PostgreSQL Client
    └── Redis Client
    ↓
├─→ PostgreSQL (Emergency sessions, locations, messages)
├─→ Redis (Session storage, caching)
└─→ Python AI Service (FastAPI) - Port 8000
        ↓
    OpenRouter API
```

**Improvements**:
- ✅ Database persistence (PostgreSQL)
- ✅ Real-time updates (WebSocket via Socket.IO)
- ✅ User authentication (JWT)
- ✅ Session management (Redis)
- ✅ Emergency history tracking
- ✅ Multi-user support
- ✅ Docker Compose orchestration

---

## Day-by-Day Implementation

### Day 1: Database Setup & Schema

#### Morning: PostgreSQL + PostGIS Setup

**Docker Compose Configuration**:

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgis/postgis:15-3.3-alpine
    container_name: sos-postgres
    environment:
      POSTGRES_DB: sos_emergency
      POSTGRES_USER: sos_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sos_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: sos-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  python-ai:
    build: ./agents
    container_name: sos-agents
    ports:
      - "8000:8000"
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  node-backend:
    build: ./backend
    container_name: sos-backend
    ports:
      - "3000:3000"
    env_file:
      - .env
    environment:
      DATABASE_URL: postgresql://sos_user:${POSTGRES_PASSWORD}@postgres:5432/sos_emergency
      REDIS_URL: redis://redis:6379
      PYTHON_SERVICE_URL: http://python-ai:8000
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      python-ai:
        condition: service_healthy

volumes:
  postgres_data:
  redis_data:
```

#### Afternoon: Database Schema

**File**: `database/init.sql`

```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Emergency contacts
CREATE TABLE emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  priority INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contacts_user ON emergency_contacts(user_id);

-- Emergency sessions
CREATE TABLE emergencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  workflow_id VARCHAR(100) UNIQUE,
  thread_id VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, resolved, cancelled
  emergency_type VARCHAR(50), -- medical, security, natural_disaster, etc.
  severity INT CHECK (severity BETWEEN 1 AND 5),
  description TEXT NOT NULL,
  triggered_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_emergencies_user ON emergencies(user_id, triggered_at DESC);
CREATE INDEX idx_emergencies_status ON emergencies(status);
CREATE INDEX idx_emergencies_workflow ON emergencies(workflow_id);

-- Locations
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_id UUID NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(6, 2),
  location_name VARCHAR(255), -- "Home", "Office", etc.
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_locations_emergency ON locations(emergency_id, timestamp DESC);
CREATE INDEX idx_locations_geom ON locations USING GIST(ST_MakePoint(longitude, latitude));

-- AI assessments
CREATE TABLE ai_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_id UUID NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
  emergency_type VARCHAR(50),
  severity INT,
  immediate_risks TEXT[],
  recommended_response VARCHAR(50),
  situation_confidence DECIMAL(3, 2),
  guidance_confidence DECIMAL(3, 2),
  resource_confidence DECIMAL(3, 2),
  guidance_steps TEXT[],
  nearby_hospitals TEXT[],
  emergency_services VARCHAR(50),
  additional_resources TEXT[],
  agents_called TEXT[],
  total_tokens INT,
  execution_time_seconds DECIMAL(6, 3),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_assessments_emergency ON ai_assessments(emergency_id);

-- Messages (two-way communication)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_id UUID NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  sender_type VARCHAR(20) NOT NULL, -- user, contact, system
  content TEXT NOT NULL,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_emergency ON messages(emergency_id, created_at);

-- Notifications log
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_id UUID NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES emergency_contacts(id),
  channel VARCHAR(20) NOT NULL, -- push, sms, email
  status VARCHAR(20) NOT NULL, -- sent, delivered, failed
  sent_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP,
  error_message TEXT
);

CREATE INDEX idx_notifications_emergency ON notifications(emergency_id, sent_at DESC);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER emergencies_updated_at BEFORE UPDATE ON emergencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER emergency_contacts_updated_at BEFORE UPDATE ON emergency_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Deliverables**:
- [x] docker-compose.yml with PostgreSQL, Redis, Python AI, Node.js
- [x] Database schema (init.sql)
- [x] PostGIS extension enabled
- [x] All tables with indexes

---

### Day 2: Backend Database Integration

#### Morning: Database Client Setup

**Install Dependencies**:

```bash
cd backend
npm install pg sequelize sequelize-typescript
npm install @types/pg --save-dev
```

**Database Configuration**:

```typescript
// backend/src/database/config.ts
import { Sequelize } from 'sequelize-typescript';

export const sequelize = new Sequelize(process.env.DATABASE_URL!, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000,
  },
});

// Test connection
export async function initDatabase() {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected');
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error);
    process.exit(1);
  }
}
```

#### Afternoon: Sequelize Models

**Emergency Model**:

```typescript
// backend/src/models/Emergency.ts
import { Table, Column, Model, DataType, HasMany, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { User } from './User';
import { Location } from './Location';
import { AIAssessment } from './AIAssessment';

@Table({ tableName: 'emergencies', timestamps: true })
export class Emergency extends Model {
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: DataType.UUIDV4 })
  id!: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  userId!: string;

  @Column({ type: DataType.STRING(100), unique: true })
  workflowId?: string;

  @Column({ type: DataType.STRING(100) })
  threadId?: string;

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: 'active' })
  status!: string;

  @Column({ type: DataType.STRING(50) })
  emergencyType?: string;

  @Column({ type: DataType.INTEGER })
  severity?: number;

  @Column({ type: DataType.TEXT, allowNull: false })
  description!: string;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  triggeredAt!: Date;

  @Column({ type: DataType.DATE })
  resolvedAt?: Date;

  @BelongsTo(() => User)
  user!: User;

  @HasMany(() => Location)
  locations!: Location[];

  @HasMany(() => AIAssessment)
  assessments!: AIAssessment[];
}
```

**Similar models for**: User, Location, AIAssessment, EmergencyContact, Message, Notification

**Deliverables**:
- [x] Database connection setup
- [x] Sequelize models for all tables
- [x] Model relationships configured
- [x] Database initialization script

---

### Day 3: Authentication & Session Management

#### Morning: JWT Authentication

**Install Dependencies**:

```bash
npm install jsonwebtoken bcrypt
npm install @types/jsonwebtoken @types/bcrypt --save-dev
```

**Auth Service**:

```typescript
// backend/src/services/auth.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { User } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function register(email: string, password: string, name: string) {
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    email,
    passwordHash,
    name,
  });

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: '7d',
  });

  return { user, token };
}

export async function login(email: string, password: string) {
  const user = await User.findOne({ where: { email } });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    throw new Error('Invalid credentials');
  }

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: '7d',
  });

  return { user, token };
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
  } catch (error) {
    throw new Error('Invalid token');
  }
}
```

**Auth Middleware**:

```typescript
// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth';

export interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

#### Afternoon: Redis Session Management

**Install Dependencies**:

```bash
npm install redis connect-redis express-session
npm install @types/express-session --save-dev
```

**Redis Client**:

```typescript
// backend/src/database/redis.ts
import { createClient } from 'redis';

export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => console.error('Redis error:', err));
redisClient.on('connect', () => console.log('✅ Redis connected'));

export async function initRedis() {
  await redisClient.connect();
}
```

**Deliverables**:
- [x] JWT authentication (register, login, verify)
- [x] Auth middleware
- [x] Redis client setup
- [x] Session storage configured

---

### Day 4: WebSocket Server & Real-Time Updates

#### Morning: Socket.IO Setup

**Install Dependencies**:

```bash
npm install socket.io
npm install @types/socket.io --save-dev
```

**WebSocket Server**:

```typescript
// backend/src/websocket/server.ts
import { Server } from 'socket.io';
import { verifyToken } from '../services/auth';

export function initWebSocket(httpServer: any) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const user = verifyToken(token);
      socket.data.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.data.user.userId}`);

    // Join emergency room
    socket.on('join_emergency', ({ emergencyId }) => {
      socket.join(`emergency_${emergencyId}`);
      console.log(`User joined emergency room: ${emergencyId}`);
    });

    // Leave emergency room
    socket.on('leave_emergency', ({ emergencyId }) => {
      socket.leave(`emergency_${emergencyId}`);
    });

    // Send message
    socket.on('send_message', async ({ emergencyId, content }) => {
      // Save message to database
      const message = await Message.create({
        emergencyId,
        senderId: socket.data.user.userId,
        senderType: 'user',
        content,
      });

      // Broadcast to all users in emergency room
      io.to(`emergency_${emergencyId}`).emit('new_message', message);
    });

    // Location update
    socket.on('location_update', async ({ emergencyId, latitude, longitude, accuracy }) => {
      // Save location to database
      const location = await Location.create({
        emergencyId,
        latitude,
        longitude,
        accuracy,
      });

      // Broadcast to all users in emergency room
      io.to(`emergency_${emergencyId}`).emit('location_updated', location);
    });

    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.data.user.userId}`);
    });
  });

  console.log('✅ WebSocket server initialized');
  return io;
}
```

#### Afternoon: REST API Integration

**Emergency Endpoints**:

```typescript
// backend/src/routes/emergency.ts
import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Emergency } from '../models/Emergency';
import { AIAssessment } from '../models/AIAssessment';
import axios from 'axios';

const router = express.Router();

// Trigger emergency
router.post('/trigger', authenticate, async (req: AuthRequest, res) => {
  try {
    const { description, location } = req.body;

    // Create emergency session in database
    const emergency = await Emergency.create({
      userId: req.user!.userId,
      description,
      status: 'active',
    });

    // Save initial location
    if (location) {
      await Location.create({
        emergencyId: emergency.id,
        latitude: location.latitude,
        longitude: location.longitude,
        locationName: location.name,
      });
    }

    // Call Python AI service
    const aiResponse = await axios.post(`${process.env.PYTHON_SERVICE_URL}/assess-multi`, {
      description,
      location: location?.name,
      thread_id: req.user!.userId, // Use user ID as thread for conversation history
    });

    // Save AI assessment
    await AIAssessment.create({
      emergencyId: emergency.id,
      ...aiResponse.data.assessment,
      ...aiResponse.data.guidance,
      ...aiResponse.data.resources,
      ...aiResponse.data.orchestration,
    });

    // Update emergency with AI data
    await emergency.update({
      workflowId: aiResponse.data.orchestration.workflow_id,
      threadId: req.user!.userId,
      emergencyType: aiResponse.data.assessment.emergency_type,
      severity: aiResponse.data.assessment.severity,
    });

    // Broadcast to WebSocket
    req.app.get('io').to(`emergency_${emergency.id}`).emit('emergency_triggered', {
      emergency,
      assessment: aiResponse.data,
    });

    res.json({ emergency, assessment: aiResponse.data });
  } catch (error) {
    console.error('Emergency trigger error:', error);
    res.status(500).json({ error: 'Failed to trigger emergency' });
  }
});

// Get emergency details
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const emergency = await Emergency.findOne({
      where: { id: req.params.id, userId: req.user!.userId },
      include: [Location, AIAssessment, Message],
    });

    if (!emergency) {
      return res.status(404).json({ error: 'Emergency not found' });
    }

    res.json(emergency);
  } catch (error) {
    console.error('Get emergency error:', error);
    res.status(500).json({ error: 'Failed to get emergency' });
  }
});

// List user emergencies
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const emergencies = await Emergency.findAll({
      where: { userId: req.user!.userId },
      include: [AIAssessment],
      order: [['triggeredAt', 'DESC']],
      limit: 50,
    });

    res.json(emergencies);
  } catch (error) {
    console.error('List emergencies error:', error);
    res.status(500).json({ error: 'Failed to list emergencies' });
  }
});

// Resolve emergency
router.post('/:id/resolve', authenticate, async (req: AuthRequest, res) => {
  try {
    const emergency = await Emergency.findOne({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!emergency) {
      return res.status(404).json({ error: 'Emergency not found' });
    }

    await emergency.update({
      status: 'resolved',
      resolvedAt: new Date(),
    });

    // Broadcast to WebSocket
    req.app.get('io').to(`emergency_${emergency.id}`).emit('emergency_resolved', emergency);

    res.json(emergency);
  } catch (error) {
    console.error('Resolve emergency error:', error);
    res.status(500).json({ error: 'Failed to resolve emergency' });
  }
});

export default router;
```

**Deliverables**:
- [x] Socket.IO server with authentication
- [x] WebSocket events (join/leave, messages, location updates)
- [x] REST API endpoints (trigger, get, list, resolve)
- [x] Integration with Python AI service
- [x] Database persistence for all actions

---

### Day 5: Enhanced Frontend

#### Morning: Real-Time Frontend Updates

**Update frontend/app.js**:

```javascript
// Add Socket.IO client
const socket = io('http://localhost:3000', {
  auth: {
    token: localStorage.getItem('token'),
  },
  autoConnect: false,
});

// Connect when emergency is triggered
socket.on('connect', () => {
  console.log('✅ WebSocket connected');
});

// Listen for emergency updates
socket.on('emergency_triggered', (data) => {
  console.log('Emergency triggered:', data);
  displayEmergencyUpdate(data);
});

socket.on('location_updated', (location) => {
  console.log('Location updated:', location);
  updateLocationOnMap(location);
});

socket.on('new_message', (message) => {
  console.log('New message:', message);
  displayMessage(message);
});

// Trigger emergency
async function triggerEmergency(description, location) {
  const token = localStorage.getItem('token');

  const response = await fetch('http://localhost:3000/api/emergency/trigger', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ description, location }),
  });

  const data = await response.json();

  // Join emergency room
  socket.connect();
  socket.emit('join_emergency', { emergencyId: data.emergency.id });

  return data;
}

// Send message
function sendMessage(emergencyId, content) {
  socket.emit('send_message', { emergencyId, content });
}

// Update location
function updateLocation(emergencyId, latitude, longitude, accuracy) {
  socket.emit('location_update', { emergencyId, latitude, longitude, accuracy });
}
```

#### Afternoon: UI Improvements

**Enhanced Emergency Dashboard**:

```html
<!-- frontend/dashboard.html -->
<!DOCTYPE html>
<html>
<head>
  <title>SOS Dashboard</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="dashboard">
    <header>
      <h1>Emergency Dashboard</h1>
      <button id="logout-btn">Logout</button>
    </header>

    <section id="active-emergency" style="display: none;">
      <h2>Active Emergency</h2>
      <div id="emergency-details"></div>
      <div id="ai-assessment"></div>
      <div id="location-map"></div>
      <div id="message-thread"></div>
      <button id="resolve-btn">Resolve Emergency</button>
    </section>

    <section id="emergency-history">
      <h2>Emergency History</h2>
      <div id="history-list"></div>
    </section>
  </div>

  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

**Deliverables**:
- [x] Socket.IO client integration
- [x] Real-time emergency updates
- [x] Real-time messaging
- [x] Real-time location tracking
- [x] Emergency dashboard UI
- [x] Emergency history view

---

### Day 6: Testing & Docker Compose

#### Morning: Integration Testing

**Test Scenarios**:

```bash
# 1. User registration and login
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# 2. Trigger emergency
curl -X POST http://localhost:3000/api/emergency/trigger \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"description":"Severe chest pain","location":{"name":"Home","latitude":40.7128,"longitude":-74.0060}}'

# 3. Get emergency details
curl http://localhost:3000/api/emergency/<emergency-id> \
  -H "Authorization: Bearer <token>"

# 4. List emergencies
curl http://localhost:3000/api/emergency \
  -H "Authorization: Bearer <token>"

# 5. Resolve emergency
curl -X POST http://localhost:3000/api/emergency/<emergency-id>/resolve \
  -H "Authorization: Bearer <token>"
```

#### Afternoon: Docker Compose Finalization

**Start all services**:

```bash
docker-compose up -d

# Check services
docker-compose ps

# View logs
docker-compose logs -f

# Test health checks
curl http://localhost:8000/health  # Python AI
curl http://localhost:3000/health  # Node.js backend
```

**Deliverables**:
- [x] Integration tests passing
- [x] Docker Compose working
- [x] All services healthy
- [x] End-to-end workflow tested

---

### Day 7: Documentation & Deployment

#### Morning: Update Documentation

**Files to Update**:
- [ ] README.md (add Phase 6 features)
- [ ] docs/ARCHITECTURE.md (updated architecture diagram)
- [ ] docs/API.md (new API endpoints)
- [ ] docs/DEPLOYMENT.md (Docker Compose instructions)
- [ ] Create docs/PHASE6_COMPLETE.md (what was built)

#### Afternoon: Git & Release

**Commit Changes**:

```bash
git add .
git commit -m "feat(phase6): add database persistence, WebSocket, and authentication

Phase 6 Enhancements:
- PostgreSQL database with complete schema
- Real-time WebSocket updates via Socket.IO
- JWT authentication and session management
- Redis for session storage
- Enhanced frontend with real-time updates
- Docker Compose orchestration for all services
- Emergency history tracking
- Multi-user support

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git tag -a v4.0.0 -m "Release v4.0.0: Production Web App with Persistence

Phase 6 Complete:
- Database persistence (PostgreSQL + PostGIS)
- Real-time updates (WebSocket via Socket.IO)
- User authentication (JWT)
- Session management (Redis)
- Emergency history tracking
- Multi-user support
- Docker Compose orchestration

System Status: Production-Ready Web Application"

git push origin main
git push origin v4.0.0
```

---

## Success Criteria

### Functional Requirements

- [ ] User can register and login
- [ ] User can trigger emergency and see AI assessment
- [ ] Emergency session persisted to database
- [ ] Real-time updates via WebSocket
- [ ] Location tracking stored in database
- [ ] Emergency history viewable
- [ ] Multi-user support working
- [ ] All services running via Docker Compose

### Technical Metrics

- [ ] Database connection established
- [ ] All Sequelize models working
- [ ] Authentication middleware functioning
- [ ] WebSocket connections stable
- [ ] AI service integration maintained
- [ ] Health checks passing
- [ ] No console errors

### Quality Gates

- [ ] All API endpoints tested
- [ ] WebSocket events tested
- [ ] Database queries optimized
- [ ] Security: passwords hashed, JWT secure
- [ ] Documentation updated
- [ ] Docker Compose tested

---

## Environment Variables

**Add to `.env`**:

```env
# Existing
OPENROUTER_API_KEY=sk-or-v1-xxx
SITE_URL=http://localhost:3000
VERIFY_SSL=false

# New for Phase 6
DATABASE_URL=postgresql://sos_user:your-password@localhost:5432/sos_emergency
POSTGRES_PASSWORD=your-secure-password
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
FRONTEND_URL=http://localhost:3000
PYTHON_SERVICE_URL=http://localhost:8000
NODE_ENV=development
```

---

## Rollback Plan

If Phase 6 fails:

```bash
# Stop new services
docker-compose down

# Revert to v3.0.0
git checkout v3.0.0

# Restart old container
docker run -d --name sos-agents -p 8000:8000 --env-file .env sos-agents:latest
```

---

## Next Steps (Phase 7)

After Phase 6 completion:

1. **Mobile App Foundation** (Week 2-3)
   - React Native project setup
   - SOS button implementation
   - API integration

2. **Offline-First Architecture** (Week 4-5)
   - WatermelonDB integration
   - Sync engine

3. **Real-Time Communication** (Week 6)
   - WebSocket client
   - Two-way messaging

See `MOBILE_APP_ROADMAP.md` for complete timeline.

---

**Document Version**: 1.0
**Phase**: 6 (Web Enhancement)
**Timeline**: 5-7 days
**Status**: Ready to implement
