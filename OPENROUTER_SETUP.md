# OpenRouter Setup Guide

## Quick Start with DeepSeek

### 1. Get Your OpenRouter API Key

1. Visit: https://openrouter.ai/
2. Click "Sign In" (supports Google, GitHub login)
3. Go to https://openrouter.ai/keys
4. Click "Create Key"
5. Copy your API key (starts with `sk-or-v1-`)

### 2. Add Credits (Optional but Recommended)

OpenRouter uses pay-as-you-go pricing:
- Visit: https://openrouter.ai/credits
- Add $5-10 to start (very generous for testing)
- DeepSeek is ~$0.0004 per request

### 3. Configure Your API Key

Edit the `.env` file in the project root:

```bash
nano .env
```

Replace the placeholder with your actual API key:

```env
OPENROUTER_API_KEY=sk-or-v1-YOUR-ACTUAL-KEY-HERE
SITE_URL=http://localhost:3000
PORT=3000
NODE_ENV=development
```

Save and exit (Ctrl+X, then Y, then Enter in nano)

### 4. Start the Server

```bash
cd backend
npm start
```

You should see:
```
🚨 SOS App Backend running on http://localhost:3000
📊 Health check: http://localhost:3000/api/health
🤖 OpenRouter API Key configured: Yes
🧠 AI Model: DeepSeek Chat via OpenRouter
```

### 5. Test the App

1. Open browser: http://localhost:3000
2. Try this example:

```
Description: I'm experiencing severe chest pain and difficulty breathing
Location: Home, 123 Main Street
```

3. Click "Trigger SOS"
4. Watch DeepSeek assess the situation!

## Switch to Different AI Models

Want to try other models? Edit `backend/server.js` line 108:

```javascript
// Current (DeepSeek - fast & cheap)
model: "deepseek/deepseek-chat",

// Switch to GPT-4o-mini
model: "openai/gpt-4o-mini",

// Switch to Claude Haiku
model: "anthropic/claude-3-haiku",

// FREE model!
model: "meta-llama/llama-3.1-8b-instruct:free",
```

Restart the server after changing models.

## Troubleshooting

**"OpenRouter API Key configured: No"**
- Check that `.env` file exists in project root
- Verify the API key starts with `sk-or-v1-`
- No spaces or quotes around the key

**Error 401: Invalid Authentication**
- Your API key might be incorrect
- Copy it again from https://openrouter.ai/keys

**Error 402: Insufficient Credits**
- Add credits at https://openrouter.ai/credits
- Minimum $1 recommended for testing

**Model not responding**
- Check OpenRouter status: https://openrouter.ai/
- Try a different model
- Check credits balance

## Model Comparison

| Model | Speed | Cost | Quality | Best For |
|-------|-------|------|---------|----------|
| DeepSeek Chat | ⚡⚡⚡ | 💰 | ⭐⭐⭐⭐ | General use, cheap |
| GPT-4o-mini | ⚡⚡ | 💰💰 | ⭐⭐⭐⭐⭐ | Best quality |
| Claude Haiku | ⚡⚡⚡ | 💰💰 | ⭐⭐⭐⭐ | Fast responses |
| Llama 3.1 8B | ⚡⚡⚡ | FREE | ⭐⭐⭐ | Testing/learning |

## Cost Tracking

Monitor your usage:
- Dashboard: https://openrouter.ai/activity
- View costs per model
- Set spending limits
- Download usage reports

---

**Questions?** Check the main [README.md](README.md) for detailed troubleshooting.
