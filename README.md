# SOS Emergency App - AI Situation Assessment POC

## Overview

A proof-of-concept emergency response application that demonstrates AI-powered situation assessment using OpenAI's GPT-4. This is a learning project focused on understanding AI/LLM integration patterns.

**Features:**
- Emergency trigger interface
- AI-powered situation assessment using OpenAI GPT-4o-mini
- Real-time emergency type classification
- Severity level analysis (1-5 scale)
- Step-by-step safety guidance
- Fallback responses when AI is unavailable

**Tech Stack:**
- **Backend:** Node.js + Express
- **Frontend:** HTML5 + CSS3 + Vanilla JavaScript
- **AI:** OpenAI GPT-4o-mini API

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **OpenAI API Key** - [Get one here](https://platform.openai.com/api-keys)

## Installation

### Step 1: Clone the Repository

```bash
cd /home/dinesh/docker-ai-agents-training/week1-basics
```

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

Expected output:
```
added 57 packages in 3s
```

### Step 3: Configure Environment Variables

Create a `.env` file in the project root:

```bash
cd ..
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:

```env
OPENAI_API_KEY=sk-your-actual-api-key-here
PORT=3000
NODE_ENV=development
```

**⚠️ Important:** Never commit your `.env` file to git. It's already in `.gitignore`.

## Running the Application

### Start the Backend Server

```bash
cd backend
npm start
```

Expected output:
```
🚨 SOS App Backend running on http://localhost:3000
📊 Health check: http://localhost:3000/api/health
🤖 OpenAI API Key configured: Yes
```

### Access the Frontend

Open your browser and navigate to:

```
http://localhost:3000
```

You should see the SOS Emergency App interface.

## Usage Guide

### Triggering an Emergency

1. **Describe your emergency** in the text area
   - Example: "I'm experiencing chest pain and difficulty breathing"

2. **Add location** (optional)
   - Example: "123 Main St, New York, NY"

3. **Click "Trigger SOS"** button

4. **Wait for AI assessment** (typically 2-3 seconds)

5. **Review the assessment** which includes:
   - Emergency type classification
   - Severity level (1-5)
   - Immediate risks identified
   - Recommended response
   - Step-by-step guidance

### Example Emergency Scenarios

Try these examples to see different AI responses:

**Medical Emergency:**
```
Description: I'm having severe chest pain radiating to my left arm
Location: Home, 456 Oak Avenue
```

**Security Emergency:**
```
Description: Someone is trying to break into my house
Location: 789 Elm Street
```

**Natural Disaster:**
```
Description: There's a fire spreading in the nearby forest
Location: 321 Pine Road, near the woods
```

**Accident:**
```
Description: I just witnessed a car accident at the intersection
Location: Main St and 5th Avenue intersection
```

## API Endpoints

### Health Check

```bash
curl http://localhost:3000/api/health
```

Response:
```json
{
  "status": "ok",
  "message": "SOS App Backend is running"
}
```

### Trigger Emergency

```bash
curl -X POST http://localhost:3000/api/emergency/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "description": "I need help",
    "location": "123 Main St"
  }'
```

Response:
```json
{
  "success": true,
  "emergency": {
    "id": "sos_1234567890_abc123",
    "description": "I need help",
    "location": "123 Main St",
    "triggeredAt": "2025-11-28T12:00:00.000Z",
    "assessment": {
      "emergencyType": "other",
      "severityLevel": 3,
      "immediateRisks": ["Limited information provided"],
      "recommendedResponse": "Provide more details about the situation",
      "guidance": ["Stay calm", "Assess the situation", "..."],
      "aiModel": "gpt-4o-mini",
      "tokensUsed": 245,
      "generatedAt": "2025-11-28T12:00:01.000Z"
    },
    "status": "active"
  }
}
```

## Project Structure

```
week1-basics/
├── backend/
│   ├── server.js          # Express server with OpenAI integration
│   ├── package.json       # Backend dependencies
│   └── .gitignore         # Ignore node_modules and .env
├── frontend/
│   ├── index.html         # Main UI
│   ├── styles.css         # Styling
│   └── app.js             # Frontend logic
├── plans/
│   └── ai-agents-sos-app.md  # Full implementation plan
├── .env.example           # Example environment variables
└── README.md              # This file
```

## How It Works

### 1. User Triggers Emergency

The user fills out the emergency description and optionally adds their location, then clicks "Trigger SOS".

### 2. Backend Receives Request

The Express server at `/api/emergency/trigger` receives the POST request with:
```json
{
  "description": "Emergency description",
  "location": "User location"
}
```

### 3. OpenAI API Call

The backend makes a request to OpenAI's GPT-4o-mini model with:

**System Prompt:**
```
You are an emergency situation assessment specialist.
Analyze the user's emergency description and provide:
1. Emergency type (medical, security, natural disaster, accident, other)
2. Severity level (1-5, where 5 is life-threatening)
3. Immediate risks
4. Recommended response (self-help, contact help, call 911)
```

**User Input:**
```
Emergency description: [user's description]
Location: [user's location]
```

### 4. AI Response Processing

OpenAI returns a JSON response:
```json
{
  "emergencyType": "medical",
  "severityLevel": 4,
  "immediateRisks": ["Potential heart attack", "Risk of unconsciousness"],
  "recommendedResponse": "Call 911 immediately",
  "guidance": [
    "Call 911 immediately",
    "Do not drive yourself",
    "Take aspirin if available and not allergic",
    "Sit down and rest",
    "Unlock the door for emergency responders"
  ]
}
```

### 5. Frontend Displays Assessment

The frontend receives the assessment and displays it in a user-friendly format with:
- Color-coded severity badges
- Organized risk list
- Clear step-by-step guidance
- Meta information (emergency ID, timestamp, AI model used)

### 6. Fallback Mechanism

If the OpenAI API fails (network issues, rate limits, invalid API key), the backend returns a fallback assessment with generic safety guidance:

```json
{
  "emergencyType": "unknown",
  "severityLevel": 3,
  "immediateRisks": ["Unable to assess with AI - proceed with caution"],
  "recommendedResponse": "Contact emergency services if situation is urgent",
  "guidance": [
    "Stay calm and assess the situation",
    "Move to a safe location if possible",
    "Call 911 if life-threatening",
    "Contact your emergency contacts",
    "Follow any specific safety protocols for your situation"
  ]
}
```

## Cost Estimation

**OpenAI API Costs (as of Nov 2025):**

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| gpt-4o-mini | $0.15 | $0.60 |

**Typical Request:**
- Input tokens: ~150-200
- Output tokens: ~200-300
- Cost per request: ~$0.0002 (less than a penny)

**Example Monthly Usage:**
- 100 emergencies/month = ~$0.02
- 1,000 emergencies/month = ~$0.20
- 10,000 emergencies/month = ~$2.00

## Troubleshooting

### Backend Won't Start

**Error:** `Cannot find module 'express'`
```bash
cd backend
npm install
```

**Error:** `OpenAI API Key configured: No`
```bash
# Check if .env file exists in project root
ls -la ../.env

# Verify OPENAI_API_KEY is set
cat ../.env | grep OPENAI_API_KEY
```

### Frontend Shows "Cannot connect to backend"

1. Verify backend is running:
```bash
curl http://localhost:3000/api/health
```

2. Check if port 3000 is in use:
```bash
lsof -i :3000
```

3. Try a different port:
```bash
# In .env file:
PORT=3001

# Restart backend and access frontend at http://localhost:3001
```

### OpenAI API Errors

**Error 401: Invalid API Key**
- Verify your API key in `.env` file
- Ensure no extra spaces or quotes
- Check API key is active on OpenAI dashboard

**Error 429: Rate Limit Exceeded**
- You've exceeded OpenAI's rate limits
- Wait a few minutes and try again
- Consider upgrading your OpenAI plan

**Error 500: Model not available**
- The model might be temporarily unavailable
- Try changing model in `server.js`:
```javascript
model: "gpt-3.5-turbo"  // Fallback model
```

## Learning Resources

### Understanding the Code

**Backend (`server.js`):**
- Line 12-20: OpenAI client initialization
- Line 23-42: AI prompt engineering for situation assessment
- Line 67-96: OpenAI API integration
- Line 98-111: Fallback mechanism

**Frontend (`app.js`):**
- Line 18-59: Emergency trigger handler
- Line 61-107: Assessment display logic
- Line 142-149: Health check on page load

### Next Steps

1. **Experiment with AI prompts** in `server.js` lines 23-42
2. **Add more emergency types** and specific guidance
3. **Implement emergency contact notifications** (Option B)
4. **Add user authentication** for persistent emergency history
5. **Containerize with Docker** for easier deployment

## Security Notes

**⚠️ This is a POC/Learning Project - NOT production-ready**

For production deployment, you would need:

- ✅ HTTPS/TLS encryption
- ✅ Rate limiting and DDoS protection
- ✅ Input sanitization and validation
- ✅ User authentication and authorization
- ✅ API key rotation and secrets management
- ✅ Proper error handling and logging
- ✅ HIPAA/GDPR compliance (for health data)
- ✅ Load balancing and scaling
- ✅ Database for persistent storage
- ✅ Real emergency service integration

## License

MIT License - This is a learning project.

## Disclaimer

**FOR EDUCATIONAL PURPOSES ONLY**

This application is a proof-of-concept and should NOT be used for actual emergencies.

**For real emergencies:**
- 🚨 Call 911 (US) or your local emergency number
- 🏥 Contact local emergency services
- 📞 Reach out to trusted emergency contacts

---

**Built with ❤️ for learning AI/LLM integration**

Questions or issues? Check the troubleshooting section or review the code comments in `backend/server.js`.
