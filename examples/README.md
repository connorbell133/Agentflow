# Example Configurations

This directory contains working YAML configurations for connecting different AI providers and platforms to AgentFlow.

---

## Quick Start

1. **Choose a configuration** that matches your AI provider
2. **Copy the YAML file**
3. **Import** via Admin Dashboard → Models → Import
4. **Add your API key** in the model settings
5. **Test** the connection
6. **Assign** to a group and start chatting

---

## Available Examples

### Direct API Integrations

#### `openai-gpt-config.yaml` - OpenAI GPT Models
**Best for:** General-purpose AI chat
**Requirements:** OpenAI API key
**Models:** GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
**Setup Time:** 2 minutes

```yaml
# Connects to OpenAI's chat completions endpoint
# Supports all GPT models
# Simple, fast, reliable
```

**Get API Key:** [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

---

#### `anthropic-claude-config.yaml` - Anthropic Claude
**Best for:** Long-form content, analysis, coding
**Requirements:** Anthropic API key
**Models:** Claude 3 Opus, Sonnet, Haiku
**Setup Time:** 2 minutes

```yaml
# Connects to Anthropic's messages API
# Excellent for complex reasoning
# Longer context windows
```

**Get API Key:** [console.anthropic.com](https://console.anthropic.com/)

---

### Workflow Automations

#### `n8n-workflow-config.yaml` - n8n Workflows
**Best for:** Complex automation, multi-step processes
**Requirements:** n8n instance with webhook URL
**Use Cases:** Data processing, API orchestration, business logic
**Setup Time:** 5 minutes

```yaml
# Connects to any n8n workflow via webhook
# Combine multiple APIs and services
# Examples:
# - Fetch from database → Process with AI → Update CRM
# - Search documentation → Summarize → Return answer
```

**n8n Setup:**
1. Create workflow in n8n
2. Add "Webhook" trigger node
3. Add your business logic
4. Return response in JSON format
5. Copy webhook URL

**Example Workflow:**
```
Webhook Trigger → HTTP Request (API) → OpenAI → Set Response → Respond
```

---

#### `make-workflow-config.yaml` - Make.com (formerly Integromat)
**Best for:** Visual automation, no-code workflows
**Requirements:** Make.com webhook URL
**Use Cases:** Integration with 1000+ apps
**Setup Time:** 5 minutes

```yaml
# Connects to Make.com scenarios via webhook
# Visual workflow builder
# Connect to: Google Workspace, Slack, Salesforce, etc.
```

**Make.com Setup:**
1. Create new scenario
2. Add "Webhooks" → "Custom webhook" module
3. Build your automation flow
4. Return JSON response
5. Copy webhook URL

---

### Agent Frameworks

#### `langchain-agent-config.yaml` - LangChain Agents
**Best for:** Custom AI agents with tools/memory
**Requirements:** LangChain agent deployed as HTTP endpoint
**Use Cases:** RAG, tool use, multi-step reasoning
**Setup Time:** 10 minutes

```yaml
# Connects to LangChain agents
# Support for tools, memory, custom chains
# Deploy to Cloud Run, Lambda, Railway, etc.
```

**LangChain Setup:**
1. Build your LangChain agent (Python)
2. Create FastAPI/Flask endpoint
3. Deploy to cloud (Cloud Run, Lambda, etc.)
4. Return response in JSON

**Minimal Example:**
```python
from fastapi import FastAPI
from langchain import create_agent

app = FastAPI()

@app.post("/chat")
def chat(message: str):
    response = agent.run(message)
    return {"output": response}
```

---

#### `openai-agent-builder-config.yaml` - OpenAI Assistants API
**Best for:** Using OpenAI's Assistants with code interpreter, retrieval
**Requirements:** OpenAI API key, Assistant ID
**Use Cases:** Code execution, file analysis, knowledge retrieval
**Setup Time:** 5 minutes

```yaml
# Connects to OpenAI Assistants API
# Built-in tools: code interpreter, retrieval, function calling
# Managed by OpenAI
```

**Setup:**
1. Create Assistant at [platform.openai.com/assistants](https://platform.openai.com/assistants)
2. Configure tools and instructions
3. Copy Assistant ID
4. Import config and add API key

---

### Cloud Functions

#### `cloud-run-function-config.yaml` - Google Cloud Run
**Best for:** Custom AI logic on Google Cloud
**Requirements:** Cloud Run service URL
**Use Cases:** Custom models, proprietary logic, GCP integrations
**Setup Time:** 15 minutes

```yaml
# Connects to Cloud Run services
# Deploy custom code
# Use Google Cloud AI, databases, etc.
```

**Cloud Run Setup:**
1. Create Dockerfile with your AI code
2. Deploy to Cloud Run
3. Configure authentication
4. Copy service URL

---

#### `relay-workflow-config.yaml` - Relay.app Workflows
**Best for:** Team workflows, approvals, notifications
**Requirements:** Relay.app workflow webhook
**Use Cases:** Workflow automation with human-in-the-loop
**Setup Time:** 5 minutes

```yaml
# Connects to Relay.app workflows
# Add approval steps, notifications, branching logic
```

---

## How to Use These Examples

### Step 1: Choose Your Configuration

Match your use case:
- **Just want AI chat?** → `openai-gpt-config.yaml` or `anthropic-claude-config.yaml`
- **Have an n8n workflow?** → `n8n-workflow-config.yaml`
- **Built a LangChain agent?** → `langchain-agent-config.yaml`
- **Using Make.com?** → `make-workflow-config.yaml`

### Step 2: Get Required Credentials

Each configuration needs:
- API key (for direct API integrations)
- Webhook URL (for workflow platforms)
- Service URL (for custom deployments)

See the "Requirements" section for each example above.

### Step 3: Import to AgentFlow

1. **Navigate:** Admin Dashboard → Models tab
2. **Click:** "Import Model" button
3. **Upload:** Drag the YAML file or paste contents
4. **Validate:** Click "Validate" to check syntax
5. **Import:** Click "Import Model"

### Step 4: Add Credentials

After importing:
1. **Click:** The model card to open details
2. **Click:** "Edit" button
3. **Scroll to:** "Authentication" section
4. **Paste:** Your API key/credentials
5. **Save:** Changes

⚠️ **Security Note:** Credentials are never saved in YAML files for security. You must add them manually after import.

### Step 5: Test Connection

1. **Click:** "Test Connection" button on model card
2. **Type:** A test message (e.g., "Say hello!")
3. **Click:** "Send Test"
4. **Verify:** Response appears correctly

If test fails, see [Troubleshooting Guide](../docs/getting-started/TROUBLESHOOTING.md)

### Step 6: Set Up Access

1. **Navigate:** Groups tab
2. **Create/Select:** A group
3. **Click:** "Models" tab within the group
4. **Add:** Your imported model
5. **Add:** Users to the group

### Step 7: Start Chatting

1. **Navigate:** Chat interface at `/flow`
2. **Select:** Your model from dropdown
3. **Start:** Conversing!

---

## Customizing Configurations

All examples can be customized to fit your needs.

### Common Customizations

#### Change Model Name
```yaml
name: "My Custom GPT-4"  # Change this to anything
```

#### Adjust Temperature
```yaml
request_schema:
  temperature: 0.3  # Lower = more focused, Higher = more creative
```

#### Add System Message
```yaml
request_schema:
  messages:
    - role: "system"
      content: "You are a helpful assistant specializing in..."
    - role: "user"
      content: "{{message}}"
```

#### Custom Headers
```yaml
headers:
  Authorization: "Bearer {{api_key}}"
  X-Custom-Header: "your-value"
  User-Agent: "YourCompany/1.0"
```

#### Add Metadata
```yaml
request_schema:
  message: "{{message}}"
  metadata:
    user_id: "{{user_id}}"
    timestamp: "{{timestamp}}"
    organization: "{{org_id}}"
```

---

## Creating Your Own Configuration

Don't see an example for your use case? Create your own!

### Minimum Requirements

Your endpoint must:
1. **Accept HTTP requests** (POST, GET, etc.)
2. **Return JSON response** with the AI's reply
3. **Be accessible via HTTPS** (or HTTP for local dev)

### Basic Template

```yaml
name: "Your Model Name"
model_id: "your-model-id"
description: "What this model does"
endpoint: "https://your-api.com/endpoint"
method: "POST"

headers:
  Authorization: "Bearer {{api_key}}"
  Content-Type: "application/json"

request_schema:
  # Your request format
  input: "{{message}}"

response_path: "output"  # Path to response in your API's JSON
```

### Test Your Endpoint First

Before creating YAML config:
```bash
# Test with curl
curl -X POST https://your-api.com/endpoint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_KEY" \
  -d '{"input": "Hello, test!"}'

# Verify:
# 1. Returns 200 OK
# 2. Response is JSON
# 3. Contains your AI's reply at expected path
```

### Full Documentation

For complete YAML reference:
→ [YAML Configuration Guide](../docs/guides/YAML_CONFIG.md)

---

## Example Use Cases

### Customer Support Bot
```
n8n workflow → Check FAQ database → If not found, call OpenAI → Update ticket
```
Use: `n8n-workflow-config.yaml`

### Knowledge Base Q&A
```
LangChain agent → Search company docs → Retrieve relevant sections → Summarize
```
Use: `langchain-agent-config.yaml`

### Code Assistant
```
OpenAI Assistant → Code interpreter + retrieval tools → Analyze code, suggest fixes
```
Use: `openai-agent-builder-config.yaml`

### Sales Coach
```
Make.com → Fetch CRM data → Analyze with Claude → Provide coaching tips
```
Use: `make-workflow-config.yaml`

---

## Troubleshooting

### Import Fails
- **Check YAML syntax:** Use [yamllint.com](https://www.yamllint.com/)
- **Verify all required fields:** name, model_id, endpoint, method
- **Check indentation:** Use spaces, not tabs

### Test Connection Fails
- **Verify endpoint URL:** Test with curl or Postman first
- **Check API key:** Make sure it's valid and has permission
- **Review error message:** Often tells you exactly what's wrong
- **Check response_path:** Must match your API's actual response structure

### Model Works But Response Is Wrong
- **Check response_path:** Use [jsonpath.com](https://jsonpath.com/) to test
- **Verify API response format:** Log actual response from your API
- **Check for streaming:** If API streams, set `supports_streaming: true`

---

## Contributing

Have a configuration for a platform not listed here?

1. **Test it thoroughly**
2. **Create a pull request** with your YAML file
3. **Include**:
   - YAML configuration
   - Description and use case
   - Setup instructions
   - Example response

---

## Need Help?

- 📖 [YAML Configuration Guide](../docs/guides/YAML_CONFIG.md) - Complete reference
- 🔧 [Endpoint Integration Guide](../docs/guides/ENDPOINT_INTEGRATION.md) - Build compatible endpoints
- 💬 [GitHub Discussions](https://github.com/your-org/chat-platform/discussions) - Ask questions
- 🐛 [Report Issues](https://github.com/your-org/chat-platform/issues) - Found a problem?

---

**Ready to connect your AI?** Pick an example and get started! 🚀
