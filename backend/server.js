require('dotenv').config({ path: '../.env' });
const express = require('express');
const http = require('http');
const cors = require('cors');
const axios = require('axios');

// Supabase configuration
const { testConnection } = require('./src/config/supabase');

// WebSocket server
const { initializeWebSocketServer, cleanupWebSocketServer } = require('./src/websocket/server');

// Import routes
const authRoutes = require('./src/routes/auth');
const emergencyRoutes = require('./src/routes/emergency');
const contactsRoutes = require('./src/routes/contacts');
const messagesRoutes = require('./src/routes/messages');
const userRoutes = require('./src/routes/user');

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3000;
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static('../frontend'));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check Python service health
    let pythonStatus = { status: 'disconnected' };
    try {
      const pythonHealth = await axios.get(`${PYTHON_SERVICE_URL}/health`, { timeout: 3000 });
      pythonStatus = {
        status: 'connected',
        version: pythonHealth.data.version,
        model: pythonHealth.data.model
      };
    } catch (err) {
      pythonStatus = {
        status: 'disconnected',
        error: 'Multi-agent service unavailable'
      };
    }

    res.json({
      status: 'ok',
      message: 'SOS App Backend is running',
      version: '4.0.0',
      services: {
        supabase: 'connected',
        websocket: 'connected',
        python: pythonStatus.status,
        redis: 'not_implemented'
      },
      pythonService: pythonStatus
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/user', userRoutes);

// Catch-all for API routes (404)
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested API endpoint does not exist',
    path: req.originalUrl
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

// Initialize WebSocket server
let io;

// Start server
async function startServer() {
  try {
    // Test Supabase connection
    console.log('🔗 Testing Supabase connection...');
    await testConnection();

    // Initialize WebSocket server
    io = initializeWebSocketServer(httpServer);

    // Start HTTP + WebSocket server
    httpServer.listen(PORT, async () => {
      console.log('\n' + '='.repeat(60));
      console.log('🚨 SOS App Backend - v4.0.0 (Supabase + WebSocket Edition)');
      console.log('='.repeat(60));
      console.log(`📡 HTTP Server: http://localhost:${PORT}`);
      console.log(`🔌 WebSocket Server: ws://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log('');
      console.log('📌 REST API Endpoints:');
      console.log('   Auth:      POST   /api/auth/signup');
      console.log('              POST   /api/auth/login');
      console.log('              POST   /api/auth/logout');
      console.log('              GET    /api/auth/me');
      console.log('');
      console.log('   Emergency: POST   /api/emergency/trigger');
      console.log('              GET    /api/emergency');
      console.log('              GET    /api/emergency/:id');
      console.log('              PATCH  /api/emergency/:id/resolve');
      console.log('              PATCH  /api/emergency/:id/cancel');
      console.log('');
      console.log('   Contacts:  GET    /api/contacts');
      console.log('              POST   /api/contacts');
      console.log('              GET    /api/contacts/:id');
      console.log('              PUT    /api/contacts/:id');
      console.log('              DELETE /api/contacts/:id');
      console.log('');
      console.log('   Messages:  GET    /api/messages/emergency/:emergencyId');
      console.log('              POST   /api/messages/emergency/:emergencyId');
      console.log('              GET    /api/messages/:id');
      console.log('              DELETE /api/messages/:id');
      console.log('');
      console.log('   User:      GET    /api/user/profile');
      console.log('              PUT    /api/user/profile');
      console.log('              GET    /api/user/stats');
      console.log('');
      console.log('🔐 Security: Row Level Security (RLS) enabled on all tables');
      console.log('🔄 Realtime: Supabase subscriptions + Socket.IO active');
      console.log('');

      // Check Python service connection
      console.log('🐍 Python AI Service:');
      try {
        const health = await axios.get(`${PYTHON_SERVICE_URL}/health`, { timeout: 5000 });
        console.log(`   ✅ Connected: ${health.data.service} v${health.data.version}`);
        console.log(`   🤖 Model: ${health.data.model}`);
        console.log(`   🔀 Multi-Agent: Supervisor + 3 Specialists`);
      } catch (error) {
        console.log(`   ⚠️  Not available - start it with:`);
        console.log(`   docker run -d --name sos-agents -p 8000:8000 --env-file .env -e VERIFY_SSL=false sos-agents:latest`);
      }

      console.log('');
      console.log('='.repeat(60));
      console.log('✅ Backend ready to receive requests');
      console.log('='.repeat(60) + '\n');
    });
  } catch (error) {
    console.error('\n❌ Failed to start server:', error.message);
    console.error('Please check your Supabase configuration in .env file');
    process.exit(1);
  }
}

// Handle graceful shutdown
async function shutdown() {
  console.log('\n📛 Shutdown signal received...');

  if (io) {
    await cleanupWebSocketServer(io);
  }

  httpServer.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
startServer();
