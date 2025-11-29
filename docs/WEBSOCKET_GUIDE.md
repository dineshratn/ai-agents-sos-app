# WebSocket Server Guide - Socket.IO + Supabase Realtime

Complete guide to real-time communication in the SOS Emergency App using Socket.IO and Supabase Realtime subscriptions.

---

## 🏗️ Architecture

```
Client (Browser/Mobile)
    ↓ Socket.IO
Node.js WebSocket Server
    ├── Authentication Middleware (JWT)
    ├── Event Handlers (Emergency, Location, Messages)
    └── Supabase Realtime Integration
        ↓
Supabase (Database Changes)
    → Broadcast to connected clients
```

---

## 🔌 Connection

### Client-Side Connection

```javascript
import { io } from 'socket.io-client';

// Get access token from Supabase Auth
const { data: { session } } = await supabase.auth.getSession();
const accessToken = session.access_token;

// Connect to WebSocket server
const socket = io('http://localhost:3000', {
  auth: {
    token: accessToken
  }
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});
```

### Authentication

All WebSocket connections require JWT authentication:

- Token must be provided in `auth.token` during connection
- Token is verified against Supabase Auth
- User object is attached to socket for all events
- Invalid tokens result in connection rejection

---

## 📡 Events

### Emergency Events

#### 1. Join Emergency Room

**Client → Server**
```javascript
socket.emit('emergency:join', {
  emergencyId: 'uuid-here'
}, (response) => {
  console.log(response);
  // { success: true, message: 'Joined emergency...', emergency: {...} }
});
```

**What it does:**
- Verifies user has access to the emergency
- Joins the client to the emergency room
- Broadcasts join notification to other room members

#### 2. Leave Emergency Room

**Client → Server**
```javascript
socket.emit('emergency:leave', {
  emergencyId: 'uuid-here'
}, (response) => {
  console.log(response);
  // { success: true, message: 'Left emergency...' }
});
```

#### 3. Subscribe to All Emergencies

**Client → Server**
```javascript
socket.emit('emergency:subscribe_all', (response) => {
  console.log(response);
  // { success: true, message: 'Subscribed...', room: 'user:uuid' }
});
```

**What it does:**
- Joins user's personal room
- Receives updates for all user's emergencies

#### 4. Get Emergency Status

**Client → Server**
```javascript
socket.emit('emergency:get_status', {
  emergencyId: 'uuid-here'
}, (response) => {
  console.log(response.emergency);
  // Full emergency with locations, assessments, messages
});
```

#### 5. Emergency Updated (Server → Client)

**Server broadcast when emergency changes:**
```javascript
socket.on('emergency:updated', (data) => {
  console.log('Emergency event:', data);
  // {
  //   type: 'triggered' | 'updated' | 'resolved' | 'cancelled',
  //   emergency: {...},
  //   timestamp: '2025-11-29T...'
  // }
});
```

**Triggered by:**
- New emergency created (Supabase INSERT)
- Emergency status changed (Supabase UPDATE)
- Emergency resolved/cancelled

---

### Location Events

#### 1. Update Location

**Client → Server**
```javascript
socket.emit('location:update', {
  emergencyId: 'uuid-here',
  latitude: 37.7749,
  longitude: -122.4194,
  accuracy: 10,          // optional (meters)
  heading: 180,          // optional (degrees)
  speed: 5.5             // optional (m/s)
}, (response) => {
  console.log(response);
  // { success: true, message: 'Location updated', location: {...} }
});
```

**What it does:**
- Validates coordinates (-90 to 90 lat, -180 to 180 lng)
- Inserts location record into database
- Broadcasts to emergency room
- Triggers PostGIS geography calculation

#### 2. Location Updated (Server → Client)

**Server broadcast when location changes:**
```javascript
socket.on('location:updated', (data) => {
  console.log('Location update:', data);
  // {
  //   emergencyId: 'uuid',
  //   location: { latitude, longitude, accuracy, ... },
  //   timestamp: '2025-11-29T...'
  // }
});
```

#### 3. Start Location Tracking

**Client → Server**
```javascript
socket.emit('location:start_tracking', {
  emergencyId: 'uuid-here',
  interval: 30000  // Update interval in ms (default: 30s)
}, (response) => {
  console.log(response);
  // { success: true, message: 'Location tracking started', interval: 30000 }
});
```

**Then send location updates periodically:**
```javascript
setInterval(() => {
  navigator.geolocation.getCurrentPosition((position) => {
    socket.emit('location:update', {
      emergencyId: emergencyId,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy
    });
  });
}, 30000); // Every 30 seconds
```

#### 4. Stop Location Tracking

**Client → Server**
```javascript
socket.emit('location:stop_tracking', (response) => {
  console.log(response);
  // { success: true, message: 'Location tracking stopped' }
});
```

#### 5. Get Location History

**Client → Server**
```javascript
socket.emit('location:get_history', {
  emergencyId: 'uuid-here',
  limit: 50  // optional (default: 50)
}, (response) => {
  console.log(response.locations);
  // Array of location records, newest first
});
```

---

### Message Events

#### 1. Send Message

**Client → Server**
```javascript
socket.emit('message:send', {
  emergencyId: 'uuid-here',
  content: 'Patient is stable, waiting for ambulance'
}, (response) => {
  console.log(response);
  // { success: true, message: 'Message sent', data: {...} }
});
```

**Validations:**
- Content cannot be empty
- Content max 2000 characters
- Emergency must be active
- User must have access to emergency

#### 2. New Message (Server → Client)

**Server broadcast when message is sent:**
```javascript
socket.on('message:new', (data) => {
  console.log('New message:', data);
  // {
  //   emergencyId: 'uuid',
  //   message: {
  //     id: 'uuid',
  //     content: '...',
  //     sender_type: 'user' | 'system',
  //     sender: { id, email, full_name },
  //     sent_at: '...'
  //   },
  //   timestamp: '2025-11-29T...'
  // }
});
```

#### 3. Typing Indicator

**Client → Server (no callback needed)**
```javascript
// User started typing
socket.emit('message:typing', {
  emergencyId: 'uuid-here',
  isTyping: true
});

// User stopped typing
socket.emit('message:typing', {
  emergencyId: 'uuid-here',
  isTyping: false
});
```

**Server → Client**
```javascript
socket.on('message:typing', (data) => {
  console.log(data);
  // {
  //   emergencyId: 'uuid',
  //   userId: 'uuid',
  //   email: 'user@example.com',
  //   isTyping: true,
  //   timestamp: '...'
  // }
});
```

#### 4. Get Message History

**Client → Server**
```javascript
socket.emit('message:get_history', {
  emergencyId: 'uuid-here',
  limit: 50,   // optional (default: 50)
  offset: 0    // optional (default: 0)
}, (response) => {
  console.log(response.messages);
  // Array of messages, oldest first
});
```

---

## 🔄 Supabase Realtime Integration

The server automatically subscribes to database changes and broadcasts them:

### Emergencies Table

**INSERT** → `emergency:updated` event (type: 'triggered')
**UPDATE** → `emergency:updated` event (type: 'updated', 'resolved', or 'cancelled')

### Locations Table

**INSERT** → `location:updated` event

### Messages Table

**INSERT** → `message:new` event (system messages only)

### Notifications Table

**INSERT** → `notification:new` event

---

## 🏠 Rooms

### Emergency Rooms

- **Name**: `emergency:{emergencyId}`
- **Purpose**: Real-time updates for specific emergency
- **Join**: `emergency:join` event
- **Leave**: `emergency:leave` event
- **Members**: All users tracking this emergency

### User Rooms

- **Name**: `user:{userId}`
- **Purpose**: Personal notifications and all user's emergencies
- **Join**: Automatic on connection or `emergency:subscribe_all`
- **Members**: Single user

---

## 🧪 Testing

### Using the Test Client

1. **Start Backend Server**:
   ```bash
   cd /home/dinesh/docker-ai-agents-training/week1-basics/backend
   node server.js
   ```

2. **Open Test Client**:
   ```bash
   # Open in browser
   open test-websocket.html
   # Or navigate to: file:///.../backend/test-websocket.html
   ```

3. **Get Access Token**:
   ```bash
   # Login via REST API
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Pass123"}'

   # Copy the access_token from response
   ```

4. **Connect in Test Client**:
   - Paste access token
   - Click "Connect"
   - Test emergency, location, and message events

### Testing from Code

```javascript
import { io } from 'socket.io-client';

// Get token from Supabase Auth
const { data: { session } } = await supabase.auth.getSession();

// Connect
const socket = io('http://localhost:3000', {
  auth: { token: session.access_token }
});

// Wait for connection
socket.on('connect', () => {
  console.log('Connected!');

  // Subscribe to all emergencies
  socket.emit('emergency:subscribe_all', (response) => {
    console.log('Subscribed:', response);
  });

  // Listen for emergency updates
  socket.on('emergency:updated', (data) => {
    console.log('Emergency update:', data);
    // Update UI
  });

  // Listen for messages
  socket.on('message:new', (data) => {
    console.log('New message:', data);
    // Display in chat
  });

  // Listen for location updates
  socket.on('location:updated', (data) => {
    console.log('Location updated:', data);
    // Update map marker
  });
});
```

---

## 🔒 Security

### Authentication

- JWT tokens verified on connection
- Tokens must be valid and not expired
- User object attached to socket

### Authorization

- RLS policies enforced via Supabase client
- Users can only access their own emergencies
- Emergency room access verified before join

### Data Validation

- Emergency IDs validated (must exist and belong to user)
- Coordinates validated (-90/90 lat, -180/180 lng)
- Message content validated (length, empty check)
- All inputs sanitized

---

## 📊 Event Flow Examples

### Emergency Trigger Flow

1. **User triggers emergency via REST API**
   ```
   POST /api/emergency/trigger
   → Inserts to emergencies table
   → Supabase Realtime detects INSERT
   → Server broadcasts emergency:updated to user:${userId}
   → All connected clients receive update
   ```

2. **User joins emergency room**
   ```
   Client: emergency:join
   → Server verifies access
   → Client joins emergency:${id} room
   → Other room members receive emergency:user_joined
   ```

3. **Location updates**
   ```
   Client: location:update
   → Server inserts to locations table
   → Supabase Realtime detects INSERT
   → Server broadcasts location:updated to emergency:${id}
   → All room members receive update
   ```

4. **Messages**
   ```
   Client: message:send
   → Server inserts to messages table
   → Server broadcasts message:new to emergency:${id}
   → All room members receive message
   → Supabase Realtime also detects INSERT (but filtered)
   ```

---

## 🚀 Production Considerations

### Scaling

- **Horizontal Scaling**: Use Socket.IO adapter (Redis adapter)
  ```javascript
  const { createAdapter } = require('@socket.io/redis-adapter');
  const { createClient } = require('redis');

  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();

  io.adapter(createAdapter(pubClient, subClient));
  ```

- **Load Balancing**: Enable sticky sessions on load balancer
- **Connection Limits**: Set maxHttpBufferSize and pingTimeout

### Monitoring

- Track connection counts
- Monitor room sizes
- Log event errors
- Track Supabase Realtime subscription status

### Error Handling

- Reconnection logic on client
- Exponential backoff
- Session recovery
- Offline queueing

---

## 📚 Additional Resources

- **Socket.IO Docs**: https://socket.io/docs/v4/
- **Supabase Realtime**: https://supabase.com/docs/guides/realtime
- **Socket.IO Client**: https://socket.io/docs/v4/client-api/

---

## 📁 File Structure

```
backend/src/websocket/
├── server.js                    # Main WebSocket server
├── middleware/
│   └── auth.js                  # JWT authentication
├── events/
│   ├── emergency.js             # Emergency event handlers
│   ├── location.js              # Location tracking handlers
│   └── messages.js              # Message event handlers
└── realtime.js                  # Supabase Realtime integration
```

---

**Last Updated**: 2025-11-29
**Version**: 4.0.0
**Status**: Production Ready
