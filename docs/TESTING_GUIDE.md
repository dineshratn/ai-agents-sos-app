# 🧪 Complete Testing Guide - SOS Emergency App

## ✅ Your Test Account

**Email:** testuser@gmail.com
**Password:** Test@123
**User ID:** a290fc8b-eacc-48b1-8872-d0b6b78cab83
**Profile:** Created ✅

---

## 🚀 Quick Start - Test All Features (15 minutes)

### Prerequisites

1. **Backend Server Running:**
   ```bash
   cd /home/dinesh/docker-ai-agents-training/week1-basics/backend
   node server.js
   ```
   Should show: `✅ Backend ready to receive requests`

2. **Python AI Service Running (Optional for AI assessments):**
   ```bash
   docker run -d --name sos-agents -p 8000:8000 --env-file .env -e VERIFY_SSL=false sos-agents:latest
   ```

3. **Open Browser:**
   Navigate to: `http://localhost:3000/login.html`

---

## 📋 Test Checklist

### ✅ Test 1: Login (2 minutes)

1. Open: http://localhost:3000/login.html
2. **Login Tab** should be selected
3. Enter credentials:
   - Email: `testuser@gmail.com`
   - Password: `Test@123`
4. Click **"Login"**
5. **Expected Result:**
   - ✅ "Login successful! Redirecting..." message
   - ✅ Redirects to dashboard within 1 second
   - ✅ No errors in browser console

**If login fails:**
- Check backend is running: `curl http://localhost:3000/api/health`
- Check browser console for errors (F12 → Console)
- Verify credentials are correct

---

### ✅ Test 2: Dashboard View (3 minutes)

After successful login, you should see:

1. **Header:**
   - ✅ Logo: "🚨 SOS Emergency App"
   - ✅ Connection status: "Connected" (green indicator)
   - ✅ Your name/email displayed
   - ✅ Logout button

2. **Statistics Cards:**
   - ✅ Total Emergencies: 0 (or current count)
   - ✅ Active: 0
   - ✅ Resolved: 0
   - ✅ Response Time: --

3. **Quick Actions:**
   - ✅ Big red "🚨 Trigger Emergency" button

4. **Emergency List:**
   - ✅ Filter tabs: All | Active | Resolved
   - ✅ Empty state: "📭 No emergencies"

**Test Real-Time Connection:**
- WebSocket status should show "Connected" with pulsing green dot
- If disconnected (red dot), refresh page or check backend

---

### ✅ Test 3: Trigger Emergency (5 minutes)

1. Click **"Trigger Emergency"** button
2. You'll see 3-step wizard:

#### Step 1: Location
- ✅ Browser asks for location permission (click "Allow")
- ✅ Shows: "✅ Location confirmed"
- ✅ Displays: Lat, Lng, and accuracy
- ✅ "Next" button becomes enabled
- Click **"Next"**

**If location fails:**
- Click "Allow" when browser asks for permission
- Wait 2 seconds - button will enable anyway
- Backend will use IP-based location

#### Step 2: Description
- ✅ Text area for emergency description
- ✅ Enter: "Test emergency - severe chest pain"
- ✅ Shows hint: "Be as specific as possible..."
- Click **"Next"**

#### Step 3: Review & Trigger
- ✅ Shows your description
- ✅ Shows your location
- ✅ "Trigger Emergency" button (red, large)
- Click **"🚨 Trigger Emergency"**

#### Expected Results:
- ✅ Button shows: "Triggering Emergency..." with spinner
- ✅ Success alert: "Emergency triggered successfully!"
- ✅ **AI Assessment Card** appears with:
  - Emergency Type (e.g., "Medical Emergency")
  - Severity Level (1-5)
  - Recommended Response
  - Immediate Actions
  - Resource Requirements
- ✅ Two buttons appear:
  - "Back to Dashboard"
  - "View Emergency Details"

**If triggering fails:**
- Check Python AI service is running: `curl http://localhost:8000/health`
- If AI service is down, emergency will still be created but without AI assessment
- Check backend logs: `tail -f /tmp/backend-debug.log`

---

### ✅ Test 4: Emergency Details & Real-Time Messaging (5 minutes)

After triggering emergency, click **"View Emergency Details"**

#### Page Elements:
1. **Header:**
   - ✅ "← Back to Dashboard" link
   - ✅ WebSocket status: "Connected"

2. **Emergency Info Card:**
   - ✅ Emergency Type
   - ✅ Status badge (Active/Resolved/Cancelled)
   - ✅ Severity badge
   - ✅ Triggered time
   - ✅ Description
   - ✅ Emergency ID (UUID)
   - ✅ Action buttons: "✓ Mark as Resolved" and "× Cancel Emergency"

3. **AI Assessment Card:**
   - ✅ Shows assessment from Python AI service
   - ✅ Emergency type, recommended response, actions

4. **Location Card:**
   - ✅ Shows GPS coordinates
   - ✅ Accuracy in meters

5. **Chat Sidebar:**
   - ✅ Messages header: "💬 Messages"
   - ✅ Empty state or system messages
   - ✅ Message input box at bottom
   - ✅ "Send" button

#### Test Real-Time Messaging:

1. **Send a message:**
   - Type: "Patient is stable"
   - Click **"Send"**
   - ✅ Message appears immediately
   - ✅ Shows as "You" with timestamp
   - ✅ Input clears automatically

2. **Open second browser window:**
   - Open another tab/window (or use private window)
   - Login with same account
   - Navigate to the same emergency
   - ✅ Both windows should be in sync

3. **Test typing indicator:**
   - In window 1: Start typing (don't send)
   - In window 2: Should show "Someone is typing..."
   - ✅ Indicator appears/disappears correctly

4. **Test WebSocket reconnection:**
   - Restart backend server
   - ✅ Status changes to "Disconnected" (red)
   - Backend starts again
   - ✅ Status changes back to "Connected" (green)
   - ✅ Messages still work

---

### ✅ Test 5: Emergency Actions (2 minutes)

#### Test Resolve:
1. Click **"✓ Mark as Resolved"**
2. Confirm dialog
3. **Expected:**
   - ✅ Page reloads
   - ✅ Status badge changes to "RESOLVED" (green)
   - ✅ Action buttons are hidden
   - ✅ Dashboard shows +1 in "Resolved" stat

#### Test Cancel (create new emergency first):
1. Trigger another emergency
2. Click **"× Cancel Emergency"**
3. Confirm dialog
4. **Expected:**
   - ✅ Status badge changes to "CANCELLED" (gray)
   - ✅ Action buttons are hidden

---

### ✅ Test 6: Dashboard Real-Time Updates (3 minutes)

1. Go back to **Dashboard**
2. **Expected:**
   - ✅ Emergency cards appear for all your emergencies
   - ✅ Each card shows:
     - Emergency type icon (🏥, 🔥, 🚗, etc.)
     - Emergency type name
     - Severity badge
     - Status badge
     - Description
     - Time ago (e.g., "5m ago")
     - Resolved time (if resolved)

3. **Test Real-Time:**
   - Trigger new emergency (from another tab/window)
   - ✅ Dashboard updates automatically (no refresh needed)
   - ✅ New emergency card appears at top
   - ✅ Stats update immediately

4. **Test Filters:**
   - Click **"Active"** tab
   - ✅ Only active emergencies shown
   - Click **"Resolved"** tab
   - ✅ Only resolved emergencies shown
   - Click **"All"** tab
   - ✅ All emergencies shown

---

## 🔍 Advanced Testing

### Test API Endpoints Directly

#### 1. Health Check
```bash
curl http://localhost:3000/api/health
```
**Expected:** Status "ok", services listed

#### 2. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@gmail.com","password":"Test@123"}'
```
**Expected:** User object + session with access_token

#### 3. Get Emergencies (use token from login)
```bash
TOKEN="your-access-token-here"
curl http://localhost:3000/api/emergency \
  -H "Authorization: Bearer $TOKEN"
```
**Expected:** List of your emergencies

#### 4. Trigger Emergency via API
```bash
TOKEN="your-access-token-here"
curl -X POST http://localhost:3000/api/emergency/trigger \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "API test - minor injury",
    "location": "37.7749,-122.4194"
  }'
```
**Expected:** Emergency created with AI assessment

---

## 🐛 Troubleshooting

### Login Issues

**Error: "Invalid response from server: missing session data"**
- **Cause:** Backend not returning session
- **Fix:** Check backend logs for actual error

**Error: "Invalid login credentials"**
- **Cause:** Wrong password or user doesn't exist
- **Fix:** Reset password in Supabase Dashboard

**Error: "Network error"**
- **Cause:** Backend not running
- **Fix:** Start backend: `cd backend && node server.js`

---

### WebSocket Issues

**Status: "Disconnected" (red indicator)**
- **Cause:** Backend WebSocket server not running
- **Fix:** Restart backend server

**Messages not sending**
- **Cause:** WebSocket disconnected
- **Check:** Status indicator in header
- **Fix:** Refresh page to reconnect

**Typing indicator not working**
- **Cause:** Need two separate sessions
- **Fix:** Open incognito window, login, join same emergency

---

### Emergency Trigger Issues

**AI Assessment not appearing**
- **Cause:** Python AI service not running
- **Check:** `curl http://localhost:8000/health`
- **Fix:** Start AI service with Docker
- **Note:** Emergency still created, just without AI analysis

**Location not working**
- **Cause:** Browser permission denied
- **Fix:** Click address bar icon, allow location
- **Alternative:** Emergency will use IP-based location

**"Database error saving new user" on signup**
- **Cause:** Rate limit hit or trigger missing
- **Fix:** Use existing account or wait 1 hour

---

## 📊 Performance Metrics

### Expected Response Times:
- Login: < 1 second
- Emergency trigger: 2-5 seconds (with AI), < 1 second (without AI)
- Message send: < 100ms
- Dashboard load: < 1 second
- WebSocket message: < 50ms

### Browser Console Logs:
**Normal:**
- "WebSocket connected"
- "Subscribed to emergencies"
- Socket.IO connection messages

**Warnings (safe to ignore):**
- Node.js 18 deprecation warnings
- CORS preflight messages

**Errors (investigate):**
- "Failed to fetch"
- "Unauthorized"
- "WebSocket disconnected: io server disconnect"

---

## ✅ Success Criteria

After completing all tests, you should have:

- ✅ Logged in successfully
- ✅ Viewed dashboard with real-time updates
- ✅ Triggered at least 2 emergencies (1 with location)
- ✅ Received AI assessments
- ✅ Sent messages in real-time
- ✅ Seen typing indicators
- ✅ Marked emergency as resolved
- ✅ Cancelled an emergency
- ✅ Filtered emergencies by status
- ✅ Tested WebSocket reconnection
- ✅ No critical errors in browser console

---

## 🎓 Next Steps

### For Production:
1. **Security:**
   - Enable email confirmation in Supabase
   - Add rate limiting on frontend
   - Implement HTTPS
   - Add CSRF protection

2. **Features to Add:**
   - Emergency contacts management UI
   - User profile page
   - Location map visualization
   - Push notifications
   - Emergency history export

3. **Performance:**
   - Add Redis for WebSocket scaling
   - Implement CDN for static assets
   - Add database indexes
   - Enable database connection pooling

4. **Monitoring:**
   - Add error tracking (Sentry)
   - Implement analytics
   - Add performance monitoring
   - Set up uptime monitoring

---

## 📚 Documentation References

- **Backend API:** `/docs/BACKEND_API_TESTING.md`
- **WebSocket Guide:** `/docs/WEBSOCKET_GUIDE.md`
- **Database Migration:** `/docs/RUN_MIGRATION.md`
- **Supabase Integration:** `/docs/SUPABASE_INTEGRATION.md`

---

## 🔧 Debug Commands

### Check all services status:
```bash
# Backend
curl http://localhost:3000/api/health

# Python AI
curl http://localhost:8000/health

# Database
cd backend && node check-supabase.js

# Trigger verification
cd backend && node debug-trigger.js
```

### View logs:
```bash
# Backend logs
tail -f /tmp/backend-debug.log

# Docker AI service logs
docker logs -f sos-agents
```

### Clean up test data:
```bash
cd backend && node cleanup-test-users.js
```

---

**Last Updated:** 2025-11-30
**Version:** 4.0.0
**Status:** Production Ready ✅

**Happy Testing!** 🚀
