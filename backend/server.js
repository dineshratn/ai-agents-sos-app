require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize OpenRouter client (using OpenAI SDK)
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
    'X-Title': 'SOS Emergency App',
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

// System prompt for situation assessment
const SITUATION_ASSESSMENT_PROMPT = `You are an emergency situation assessment specialist.
Analyze the user's emergency description and provide:
1. Emergency type (medical, security, natural disaster, accident, other)
2. Severity level (1-5, where 5 is life-threatening)
3. Immediate risks
4. Recommended response (self-help, contact help, call 911)

Be concise, clear, and prioritize user safety.
Respond in JSON format with these fields:
{
  "emergencyType": "string",
  "severityLevel": number,
  "immediateRisks": ["string"],
  "recommendedResponse": "string",
  "guidance": ["step 1", "step 2", "step 3"]
}`;

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SOS App Backend is running' });
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

    console.log('Emergency triggered:', { description, location });

    // Call OpenAI for situation assessment
    const assessment = await assessSituation(description, location);

    // Create emergency session
    const emergency = {
      id: generateId(),
      description,
      location: location || 'Unknown',
      triggeredAt: new Date().toISOString(),
      assessment,
      status: 'active'
    };

    console.log('Assessment completed:', assessment);

    res.json({
      success: true,
      emergency,
      message: 'Emergency alert created successfully'
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

// AI Situation Assessment Function
async function assessSituation(description, location) {
  try {
    const completion = await openai.chat.completions.create({
      model: "deepseek/deepseek-chat",
      messages: [
        {
          role: "system",
          content: SITUATION_ASSESSMENT_PROMPT
        },
        {
          role: "user",
          content: `Emergency description: ${description}\nLocation: ${location || 'Unknown'}`
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const assessmentText = completion.choices[0].message.content;
    const assessment = JSON.parse(assessmentText);

    return {
      ...assessment,
      aiModel: 'deepseek-chat',
      aiProvider: 'OpenRouter',
      tokensUsed: completion.usage.total_tokens,
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('OpenRouter API error:', error);
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
app.listen(PORT, () => {
  console.log(`🚨 SOS App Backend running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🤖 OpenRouter API Key configured: ${process.env.OPENROUTER_API_KEY ? 'Yes' : 'No'}`);
  console.log(`🧠 AI Model: DeepSeek Chat via OpenRouter`);
});
