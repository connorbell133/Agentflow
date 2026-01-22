# Endpoint Integration Guide

Build HTTP endpoints compatible with AgentFlow.

---

## Overview

AgentFlow connects to **any HTTP endpoint** that can accept a request and return a JSON response. This guide shows you how to build endpoints compatible with AgentFlow, whether you're using:

- Cloud functions (Cloud Run, Lambda, Azure Functions)
- Workflow platforms (n8n, Make.com, Zapier)
- Agent frameworks (LangChain, CrewAI, AutoGen)
- Custom APIs (FastAPI, Express, Flask)

---

## Minimum Requirements

Your endpoint must:

1. **Accept HTTP requests** (POST, GET, PUT, etc.)
2. **Return JSON response** with the AI's reply
3. **Be accessible via HTTPS** (HTTP for local development)
4. **Respond within 30 seconds** (or implement streaming)

**That's it!** AgentFlow handles everything else.

---

## Basic Pattern

### Request Flow

```
User types message in AgentFlow
    ↓
AgentFlow sends HTTP request to your endpoint
    ↓
Your endpoint processes the message (call AI, run logic, etc.)
    ↓
Your endpoint returns JSON response
    ↓
AgentFlow displays response to user
```

### Minimal Example

**Your endpoint:**
```javascript
// Node.js/Express example
app.post('/chat', async (req, res) => {
  const { message } = req.body;

  // Your AI logic here
  const response = await callOpenAI(message);

  // Return JSON with response
  res.json({
    reply: response
  });
});
```

**AgentFlow YAML config:**
```yaml
name: "My AI"
model_id: "my-ai-v1"
endpoint: "https://your-api.com/chat"
method: "POST"

request_schema:
  message: "{{message}}"

response_path: "reply"
```

---

## Request Format

### What AgentFlow Sends

AgentFlow will send a request based on your YAML configuration's `request_schema`:

```yaml
request_schema:
  message: "{{message}}"          # User's message
  user_id: "{{user_id}}"          # User ID
  conversation_id: "{{conversation_id}}"  # Conversation ID
  timestamp: "{{timestamp}}"      # Current timestamp
```

**Actual HTTP request:**
```http
POST /chat HTTP/1.1
Host: your-api.com
Content-Type: application/json
Authorization: Bearer your-api-key

{
  "message": "What is the weather today?",
  "user_id": "user_12345",
  "conversation_id": "conv_67890",
  "timestamp": "2025-01-21T10:30:00Z"
}
```

### Available Template Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{message}}` | User's message text | "Hello, how are you?" |
| `{{user_id}}` | User's unique ID | "user_2abc..." |
| `{{conversation_id}}` | Current conversation ID | "conv_xyz..." |
| `{{timestamp}}` | ISO timestamp | "2025-01-21T10:30:00Z" |
| `{{org_id}}` | Organization ID | "org_123..." |

---

## Response Format

### What AgentFlow Expects

AgentFlow needs to extract the AI's response from your JSON. Use `response_path` to specify where it is.

**Simple response:**
```json
{
  "response": "The weather is sunny today!"
}
```

**YAML config:**
```yaml
response_path: "response"
```

**Nested response:**
```json
{
  "data": {
    "ai": {
      "message": "The weather is sunny today!"
    }
  }
}
```

**YAML config:**
```yaml
response_path: "data.ai.message"
```

**Array response (like OpenAI):**
```json
{
  "choices": [
    {
      "message": {
        "content": "The weather is sunny today!"
      }
    }
  ]
}
```

**YAML config:**
```yaml
response_path: "choices[0].message.content"
```

### JSONPath Syntax

AgentFlow uses JSONPath to extract responses:

- `.` for nested objects: `data.result.text`
- `[0]` for array index: `choices[0].message`
- Combine: `data.items[0].content`

**Test your path:** Use [jsonpath.com](https://jsonpath.com/) to test extraction.

---

## Implementation Examples

### 1. FastAPI (Python)

**Basic endpoint:**
```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class ChatRequest(BaseModel):
    message: str
    user_id: str = None

@app.post("/chat")
async def chat(request: ChatRequest):
    # Your AI logic
    response = process_message(request.message)

    return {
        "response": response
    }
```

**With OpenAI:**
```python
import openai

@app.post("/chat")
async def chat(request: ChatRequest):
    completion = openai.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "user", "content": request.message}
        ]
    )

    return {
        "response": completion.choices[0].message.content
    }
```

**Deploy to Cloud Run:**
```bash
# Dockerfile
FROM python:3.11-slim
COPY . /app
WORKDIR /app
RUN pip install -r requirements.txt
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]

# Deploy
gcloud run deploy my-ai-endpoint \
  --source . \
  --platform managed \
  --region us-central1
```

---

### 2. Express.js (Node.js)

**Basic endpoint:**
```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/chat', async (req, res) => {
  const { message, user_id } = req.body;

  // Your AI logic
  const response = await processMessage(message);

  res.json({
    response: response
  });
});

app.listen(3000);
```

**With Anthropic Claude:**
```javascript
const Anthropic = require('@anthropic-ai/sdk');
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

app.post('/chat', async (req, res) => {
  const { message } = req.body;

  const completion = await anthropic.messages.create({
    model: "claude-3-opus-20240229",
    max_tokens: 1024,
    messages: [
      { role: "user", content: message }
    ]
  });

  res.json({
    response: completion.content[0].text
  });
});
```

**Deploy to Vercel:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

---

### 3. LangChain Agent

**Complete agent endpoint:**
```python
from fastapi import FastAPI
from langchain.agents import create_openai_functions_agent
from langchain.tools import Tool
from langchain_openai import ChatOpenAI

app = FastAPI()

# Set up LangChain agent
llm = ChatOpenAI(model="gpt-4")

tools = [
    Tool(
        name="Search",
        func=search_web,
        description="Search the web for information"
    ),
    Tool(
        name="Calculator",
        func=calculate,
        description="Perform calculations"
    )
]

agent = create_openai_functions_agent(llm, tools)

@app.post("/chat")
async def chat(request: dict):
    message = request.get("message")

    # Run agent
    result = agent.run(message)

    return {
        "response": result,
        "tools_used": agent.get_tools_used()  # Optional metadata
    }
```

---

### 4. n8n Workflow Webhook

**n8n workflow setup:**

1. **Add Webhook node:**
   - HTTP Method: POST
   - Path: /webhook/my-agent
   - Response Mode: "Wait for Webhook"
   - Response Data: "All Entries"

2. **Add your logic:**
   ```
   Webhook → HTTP Request (API) → OpenAI → Set Response → Respond to Webhook
   ```

3. **Set response format:**
   - In "Respond to Webhook" node:
   - Response Body:
     ```json
     {
       "response": "{{ $json.choices[0].message.content }}"
     }
     ```

4. **Copy webhook URL:**
   ```
   https://your-n8n.com/webhook/abc123xyz
   ```

**AgentFlow config:**
```yaml
name: "n8n Agent"
model_id: "n8n-agent-v1"
endpoint: "https://your-n8n.com/webhook/abc123xyz"
method: "POST"

request_schema:
  message: "{{message}}"

response_path: "response"
```

---

### 5. Make.com Scenario

**Make.com setup:**

1. **Create new scenario**
2. **Add "Webhooks" → "Custom webhook" module**
3. **Add your automation modules** (API calls, data processing, etc.)
4. **Add "Webhooks" → "Webhook Response" module**
   - Body:
     ```json
     {
       "response": "{{your.result.here}}"
     }
     ```

5. **Copy webhook URL from first module**

**AgentFlow config:**
```yaml
name: "Make.com Agent"
model_id: "make-agent-v1"
endpoint: "https://hook.us1.make.com/abc123"
method: "POST"

request_schema:
  input: "{{message}}"
  user: "{{user_id}}"

response_path: "response"
```

---

## Advanced Patterns

### 1. Conversation Memory

**Store and retrieve conversation history:**

```python
# Store messages in database
conversation_history = get_history(conversation_id)

# Include in AI context
messages = [
    *conversation_history,  # Previous messages
    {"role": "user", "content": current_message}
]

response = openai.chat.completions.create(
    model="gpt-4",
    messages=messages
)

# Save new message
save_message(conversation_id, current_message, response)
```

### 2. Tool/Function Calling

**LangChain with tools:**

```python
@app.post("/chat")
async def chat(request: dict):
    message = request["message"]

    # Agent with tools
    agent = initialize_agent(
        tools=[search_tool, calculator_tool, database_tool],
        llm=llm,
        agent=AgentType.OPENAI_FUNCTIONS
    )

    result = agent.run(message)

    return {
        "response": result,
        "sources": agent.get_sources(),  # Optional
        "tools_used": agent.get_tools_used()  # Optional
    }
```

### 3. RAG (Retrieval Augmented Generation)

**Vector search + LLM:**

```python
@app.post("/chat")
async def chat(request: dict):
    message = request["message"]

    # 1. Search vector database
    relevant_docs = vector_db.search(message, top_k=5)

    # 2. Build context
    context = "\n".join([doc.content for doc in relevant_docs])

    # 3. Generate response with context
    prompt = f"""Use the following context to answer the question:

Context:
{context}

Question: {message}

Answer:"""

    response = openai.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}]
    )

    return {
        "response": response.choices[0].message.content,
        "sources": [doc.metadata for doc in relevant_docs]
    }
```

### 4. Multi-Step Workflows

**Complex business logic:**

```python
@app.post("/chat")
async def chat(request: dict):
    message = request["message"]
    user_id = request["user_id"]

    # Step 1: Classify intent
    intent = classify_intent(message)

    # Step 2: Route to appropriate handler
    if intent == "support":
        # Check ticket database
        tickets = get_user_tickets(user_id)
        response = generate_support_response(message, tickets)
    elif intent == "sales":
        # Check CRM
        account = get_account_info(user_id)
        response = generate_sales_response(message, account)
    else:
        # General chat
        response = generate_general_response(message)

    return {"response": response}
```

### 5. Streaming Responses

**Real-time streaming (advanced):**

```python
from fastapi.responses import StreamingResponse

@app.post("/chat/stream")
async def chat_stream(request: dict):
    async def generate():
        stream = await openai.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": request["message"]}],
            stream=True
        )

        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    return StreamingResponse(generate(), media_type="text/plain")
```

**AgentFlow config:**
```yaml
supports_streaming: true
streaming_endpoint: "https://your-api.com/chat/stream"
```

---

## Security Best Practices

### 1. Authentication

**Require API key:**

```python
from fastapi import Header, HTTPException

@app.post("/chat")
async def chat(
    request: dict,
    authorization: str = Header(None)
):
    # Verify API key
    if not verify_api_key(authorization):
        raise HTTPException(status_code=401, detail="Invalid API key")

    # Process request
    response = process_message(request["message"])
    return {"response": response}
```

**AgentFlow config:**
```yaml
headers:
  Authorization: "Bearer {{api_key}}"
```

### 2. Rate Limiting

**Prevent abuse:**

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/chat")
@limiter.limit("10/minute")
async def chat(request: Request):
    # Your logic
    pass
```

### 3. Input Validation

**Sanitize inputs:**

```python
from pydantic import BaseModel, validator

class ChatRequest(BaseModel):
    message: str
    user_id: str

    @validator('message')
    def message_must_not_be_empty(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('message cannot be empty')
        if len(v) > 10000:
            raise ValueError('message too long')
        return v.strip()
```

### 4. Error Handling

**Graceful failures:**

```python
@app.post("/chat")
async def chat(request: dict):
    try:
        response = process_message(request["message"])
        return {"response": response}
    except OpenAIError as e:
        return {"response": "I'm having trouble connecting to my AI service. Please try again."}
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return {"response": "An error occurred. Please contact support."}
```

---

## Testing Your Endpoint

### 1. Local Testing with curl

```bash
# Test your endpoint
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "message": "Hello, how are you?",
    "user_id": "test_user"
  }'

# Expected response
{
  "response": "I'm doing well, thank you for asking!"
}
```

### 2. Test with Postman

1. Create new POST request
2. Set URL: `http://localhost:8000/chat`
3. Add headers:
   - `Content-Type: application/json`
   - `Authorization: Bearer your-api-key`
4. Add body (JSON):
   ```json
   {
     "message": "Test message",
     "user_id": "test_user"
   }
   ```
5. Send and verify response structure

### 3. Test in AgentFlow

1. Import your YAML configuration
2. Add API credentials
3. Click "Test Connection"
4. Send test message
5. Verify response appears correctly

---

## Deployment Options

### Cloud Run (Google Cloud)

```bash
# Build and deploy
gcloud run deploy my-ai-endpoint \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars OPENAI_API_KEY=sk-...

# Get URL
gcloud run services describe my-ai-endpoint --format='value(status.url)'
```

### AWS Lambda

```python
# lambda_function.py
def lambda_handler(event, context):
    body = json.loads(event['body'])
    message = body['message']

    response = process_message(message)

    return {
        'statusCode': 200,
        'body': json.dumps({'response': response})
    }
```

### Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Initialize and deploy
railway init
railway up
```

### Vercel (Node.js)

```javascript
// api/chat.js
export default async function handler(req, res) {
  const { message } = req.body;

  const response = await processMessage(message);

  res.json({ response });
}
```

---

## Troubleshooting

### Endpoint Returns 500 Error

**Check:**
- Server logs for error details
- API credentials are valid
- Request format matches what endpoint expects
- Endpoint can reach external APIs (OpenAI, etc.)

**Fix:**
- Add comprehensive error logging
- Return error messages in development
- Check network/firewall rules

### Response Not Appearing in AgentFlow

**Check:**
- Response path in YAML matches actual JSON structure
- Response is valid JSON
- Response doesn't have nested arrays/objects in wrong places

**Fix:**
- Test response path with [jsonpath.com](https://jsonpath.com/)
- Log actual response from endpoint
- Verify response structure

### Timeout Errors

**Check:**
- Endpoint responds within 30 seconds
- AI API calls complete quickly
- Database queries are optimized

**Fix:**
- Implement streaming for long responses
- Cache frequent queries
- Use async/await properly
- Return "Processing..." immediately, then stream results

### CORS Errors (Local Development)

**Check:**
- CORS headers configured correctly
- Preflight requests handled

**Fix:**
```python
# FastAPI
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"]
)
```

---

## Best Practices

### 1. Structure Your Response

**Good:**
```json
{
  "response": "Clear, direct answer",
  "metadata": {
    "model": "gpt-4",
    "tokens": 150
  }
}
```

**Bad:**
```json
{
  "data": {
    "result": {
      "output": {
        "text": "Buried answer"
      }
    }
  }
}
```

### 2. Include Error Messages

**Good:**
```json
{
  "response": "I'm having trouble connecting to my knowledge base. Please try again."
}
```

**Bad:**
```json
{
  "error": "Database connection failed"
}
```

### 3. Keep Responses Focused

- Return just the AI's message
- Don't include debug information in production
- Keep response times under 5 seconds when possible

### 4. Log Everything (In Development)

```python
import logging

logger.info(f"Received message: {message}")
logger.info(f"Calling AI API...")
logger.info(f"AI response: {response}")
logger.info(f"Returning to AgentFlow")
```

### 5. Version Your API

```
https://api.yourcompany.com/v1/chat
```

Allows updates without breaking existing AgentFlow configurations.

---

## Example Configurations

For complete working examples, see:

- [OpenAI GPT](../../examples/openai-gpt-config.yaml)
- [Anthropic Claude](../../examples/anthropic-claude-config.yaml)
- [n8n Workflow](../../examples/n8n-workflow-config.yaml)
- [LangChain Agent](../../examples/langchain-agent-config.yaml)
- [All Examples](../../examples/)

---

## Need Help?

- 📖 [YAML Configuration Reference](./YAML_CONFIG.md)
- 🔧 [Troubleshooting Guide](../getting-started/TROUBLESHOOTING.md)
- 💬 [GitHub Discussions](https://github.com/your-org/chat-platform/discussions)
- 🐛 [Report Issues](https://github.com/your-org/chat-platform/issues)

---

**Ready to build your endpoint?** Start with the FastAPI or Express examples above, deploy to your preferred platform, and connect to AgentFlow in minutes!
