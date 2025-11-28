require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check Python service health
    const pythonHealth = await axios.get(`${PYTHON_SERVICE_URL}/health`);

    res.json({
      status: 'ok',
      message: 'SOS App Backend is running',
      pythonService: {
        status: 'connected',
        version: pythonHealth.data.version,
        model: pythonHealth.data.model
      }
    });
  } catch (error) {
    res.json({
      status: 'ok',
      message: 'SOS App Backend is running',
      pythonService: {
        status: 'disconnected',
        error: 'Multi-agent service unavailable'
      }
    });
  }
});

// Emergency trigger endpoint with AI assessment
app.post('/api/emergency/trigger', async (req, res) => {
  try {
    const { description, location } = req.body;

    if (!description) {
      return res.status(400).json({
        error: 'Description is required',
        message: 'Please provide a description of the emergency'
      });
    }

    console.log('🚨 Emergency triggered:', { description, location });
    console.log('📡 Calling Python multi-agent service...');

    // Call Python multi-agent service
    const assessment = await assessWithMultiAgent(description, location);

    // Create emergency session
    const emergency = {
      id: generateId(),
      description,
      location: location || 'Unknown',
      triggeredAt: new Date().toISOString(),
      assessment,
      status: 'active'
    };

    console.log('✅ Multi-agent assessment completed');
    console.log(`🤖 Agents called: ${assessment.agentsCalled?.join(', ')}`);
    console.log(`⏱️  Total time: ${assessment.executionTime}s`);

    res.json({
      success: true,
      emergency,
      message: 'Emergency alert created with multi-agent assessment'
    });

  } catch (error) {
    console.error('Error processing emergency:', error);

    // Fallback response if OpenAI fails
    const fallbackAssessment = getFallbackAssessment();

    res.status(200).json({
      success: true,
      emergency: {
        id: generateId(),
        description: req.body.description,
        location: req.body.location || 'Unknown',
        triggeredAt: new Date().toISOString(),
        assessment: fallbackAssessment,
        status: 'active'
      },
      warning: 'AI assessment unavailable, using fallback guidance',
      message: 'Emergency alert created with fallback guidance'
    });
  }
});

// Multi-Agent Assessment Function - Calls Python service
async function assessWithMultiAgent(description, location) {
  try {
    const startTime = Date.now();

    // Call Python multi-agent service
    const response = await axios.post(`${PYTHON_SERVICE_URL}/assess-multi`, {
      description,
      location
    }, {
      timeout: 60000 // 60 second timeout for multi-agent processing
    });

    const data = response.data;

    // Transform multi-agent response to match frontend expectations
    return {
      // From Situation Agent
      emergencyType: data.assessment.emergency_type,
      severityLevel: data.assessment.severity,
      immediateRisks: data.assessment.immediate_risks,
      recommendedResponse: data.assessment.recommended_response,

      // From Guidance Agent
      guidance: data.guidance.steps,

      // From Resource Agent
      nearbyHospitals: data.resources.nearby_hospitals,
      emergencyServices: data.resources.emergency_services,

      // Meta information
      aiModel: data.orchestration.model,
      aiProvider: data.orchestration.provider,
      tokensUsed: 0, // Not tracking in current implementation
      generatedAt: new Date().toISOString(),

      // Multi-agent specific
      agentsCalled: data.orchestration.agents_called,
      executionTime: ((Date.now() - startTime) / 1000).toFixed(2),
      multiAgent: true
    };

  } catch (error) {
    console.error('❌ Python service error:', error.message);
    throw error;
  }
}

// Fallback assessment when AI is unavailable
function getFallbackAssessment() {
  return {
    emergencyType: 'unknown',
    severityLevel: 3,
    immediateRisks: ['Unable to assess with AI - proceed with caution'],
    recommendedResponse: 'Contact emergency services if situation is urgent',
    guidance: [
      'Stay calm and assess the situation',
      'Move to a safe location if possible',
      'Call 911 if life-threatening',
      'Contact your emergency contacts',
      'Follow any specific safety protocols for your situation'
    ],
    aiModel: 'fallback',
    generatedAt: new Date().toISOString()
  };
}

// Simple ID generator
function generateId() {
  return `sos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Start server
app.listen(PORT, async () => {
  console.log(`🚨 SOS App Backend (Node.js Gateway) running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🐍 Python Service URL: ${PYTHON_SERVICE_URL}`);
  console.log(`🤖 Multi-Agent System: Supervisor + 3 Specialists`);

  // Check Python service connection
  try {
    const health = await axios.get(`${PYTHON_SERVICE_URL}/health`, { timeout: 5000 });
    console.log(`✅ Python service connected: ${health.data.service} v${health.data.version}`);
  } catch (error) {
    console.log(`⚠️  Python service not available - start it with: docker run -d --name sos-agents -p 8000:8000 --env-file .env -e VERIFY_SSL=false sos-agents:latest`);
  }
});
