# YAML Configuration Reference

Complete reference for creating AI endpoint configurations.

---

## Overview

AgentFlow uses YAML files to configure AI endpoint connections. These configurations define:
- Where to send requests (endpoint URL)
- How to format requests (request schema)
- How to parse responses (response path)
- Authentication credentials
- UI customization

---

## Complete Configuration Template

```yaml
# ====================================
# REQUIRED FIELDS
# ====================================

# Display name shown in UI
name: "GPT-4 Turbo"

# Unique identifier (lowercase, hyphens only)
model_id: "gpt-4-turbo"

# Description shown to users
description: "Most capable GPT-4 model, best for complex tasks"

# HTTP endpoint URL
endpoint: "https://api.openai.com/v1/chat/completions"

# HTTP method
method: "POST"  # GET, POST, PUT, PATCH, DELETE

# ====================================
# AUTHENTICATION
# ====================================

# HTTP headers (including authentication)
headers:
  Authorization: "Bearer {{api_key}}"
  Content-Type: "application/json"
  Custom-Header: "value"

# ====================================
# REQUEST CONFIGURATION
# ====================================

# Request body template
request_schema:
  model: "gpt-4-turbo-preview"
  messages:
    - role: "user"
      content: "{{message}}"
  temperature: 0.7
  max_tokens: 4000
  stream: false

# ====================================
# RESPONSE CONFIGURATION
# ====================================

# JSON path to extract response text
response_path: "choices[0].message.content"

# ====================================
# MESSAGE FORMAT
# ====================================

# How to format conversation history
message_format:
  preset: "openai"  # or "anthropic" or "custom"

  # Custom mapping (if preset: "custom")
  mapping:
    role:
      source: "role"
      target: "messages[].role"
      transform: "none"  # or "lowercase", "uppercase"
    content:
      source: "content"
      target: "messages[].content"
      transform: "none"

# ====================================
# UI CUSTOMIZATION (Optional)
# ====================================

# Suggested prompts shown in UI
suggestion_prompts:
  - "Explain quantum computing in simple terms"
  - "Write a Python function to sort a list"
  - "What's the weather like today?"

# Model icon (emoji or URL)
icon: "🤖"

# Model color (hex)
color: "#10A37F"

# Tags for categorization
tags:
  - "gpt-4"
  - "openai"
  - "chat"

# ====================================
# ADVANCED OPTIONS (Optional)
# ====================================

# Enable/disable model
enabled: true

# Maximum tokens for this model
max_tokens: 4000

# Default temperature
temperature: 0.7

# Streaming support
supports_streaming: false

# Rate limiting (requests per minute)
rate_limit: 60

# Timeout (seconds)
timeout: 30
```

---

## Field Reference

### Required Fields

#### `name`
**Type:** String
**Description:** Display name shown in the UI
**Example:** `"GPT-4 Turbo"`, `"Claude 3 Opus"`, `"My Custom Agent"`
**Rules:**
- 1-100 characters
- Can include spaces and special characters
- Should be descriptive and user-friendly

#### `model_id`
**Type:** String
**Description:** Unique identifier for this model
**Example:** `"gpt-4-turbo"`, `"claude-3-opus"`, `"my-custom-agent"`
**Rules:**
- Lowercase only
- Hyphens allowed, no spaces
- Must be unique across all models
- Cannot be changed after creation

#### `description`
**Type:** String
**Description:** Longer description of the model's capabilities
**Example:** `"Most capable GPT-4 model, best for complex reasoning tasks"`
**Rules:**
- 1-500 characters
- Supports markdown
- Shown in model selector tooltip

#### `endpoint`
**Type:** URL
**Description:** HTTP endpoint to send requests to
**Example:** `"https://api.openai.com/v1/chat/completions"`
**Rules:**
- Must be valid HTTPS URL (HTTP allowed for localhost)
- Can include query parameters
- Should be publicly accessible (or on VPN for internal endpoints)

#### `method`
**Type:** String
**Description:** HTTP method
**Options:** `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
**Default:** `POST`

---

### Headers

**Type:** Object (key-value pairs)
**Description:** HTTP headers sent with every request

**Common Headers:**
```yaml
headers:
  # Authentication
  Authorization: "Bearer {{api_key}}"
  # Or API key header
  X-API-Key: "{{api_key}}"
  # Or custom auth
  Custom-Auth-Token: "{{api_key}}"

  # Content type
  Content-Type: "application/json"

  # Custom headers
  User-Agent: "AgentFlow/1.0"
  X-Custom-Header: "value"
```

**Template Variables:**
- `{{api_key}}` - Replaced with API key from model settings
- `{{user_id}}` - Replaced with current user ID
- `{{org_id}}` - Replaced with current organization ID

**Security:** API keys are stored encrypted and never exposed in logs

---

### Request Schema

**Type:** Object
**Description:** Template for the request body

**Template Variables:**
- `{{message}}` - Current user message
- `{{conversation_history}}` - Array of previous messages
- `{{user_id}}` - Current user ID
- `{{conversation_id}}` - Current conversation ID
- `{{timestamp}}` - Current ISO timestamp
- `{{model_id}}` - This model's ID

**Examples:**

#### OpenAI Format
```yaml
request_schema:
  model: "gpt-4"
  messages:
    - role: "user"
      content: "{{message}}"
  temperature: 0.7
  max_tokens: 2000
```

#### Anthropic Format
```yaml
request_schema:
  model: "claude-3-opus-20240229"
  messages:
    - role: "user"
      content: "{{message}}"
  max_tokens: 4000
  temperature: 0.7
```

#### Custom Format
```yaml
request_schema:
  input: "{{message}}"
  user: "{{user_id}}"
  context:
    conversation_id: "{{conversation_id}}"
    timestamp: "{{timestamp}}"
  parameters:
    temperature: 0.5
    max_length: 1000
```

#### With Conversation History
```yaml
request_schema:
  messages: "{{conversation_history}}"
  # conversation_history is automatically formatted based on message_format
```

---

### Response Path

**Type:** String (JSONPath expression)
**Description:** Extracts the AI response from the API response

**Examples:**

#### Simple Path
```yaml
# API Response:
{
  "response": "Hello, world!"
}

# Configuration:
response_path: "response"
```

#### Nested Path
```yaml
# API Response:
{
  "result": {
    "text": "Hello, world!"
  }
}

# Configuration:
response_path: "result.text"
```

#### Array Index
```yaml
# API Response:
{
  "choices": [
    {
      "message": {
        "content": "Hello, world!"
      }
    }
  ]
}

# Configuration:
response_path: "choices[0].message.content"
```

#### Multiple Candidates
```yaml
# API Response:
{
  "candidates": [
    { "text": "Response 1" },
    { "text": "Response 2" }
  ]
}

# Configuration (always uses first):
response_path: "candidates[0].text"
```

**Testing Response Path:**
1. Make a test API call manually
2. Copy the actual response JSON
3. Use JSONPath tester: https://jsonpath.com/
4. Verify your path extracts the text correctly

---

### Message Format

**Type:** Object
**Description:** Defines how to format conversation history

#### Preset: OpenAI
```yaml
message_format:
  preset: "openai"
```

Formats messages as:
```json
{
  "messages": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi there!" },
    { "role": "user", "content": "How are you?" }
  ]
}
```

#### Preset: Anthropic
```yaml
message_format:
  preset: "anthropic"
```

Formats messages as:
```json
{
  "messages": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi there!" },
    { "role": "user", "content": "How are you?" }
  ]
}
```

#### Custom Format
```yaml
message_format:
  preset: "custom"
  mapping:
    role:
      source: "role"
      target: "history[].sender"
      transform: "uppercase"  # USER, ASSISTANT
    content:
      source: "content"
      target: "history[].text"
      transform: "none"
```

Results in:
```json
{
  "history": [
    { "sender": "USER", "text": "Hello" },
    { "sender": "ASSISTANT", "text": "Hi there!" }
  ]
}
```

---

## Complete Examples

### OpenAI GPT-4

```yaml
name: "GPT-4 Turbo"
model_id: "gpt-4-turbo"
description: "Most capable GPT-4 model"
endpoint: "https://api.openai.com/v1/chat/completions"
method: "POST"

headers:
  Authorization: "Bearer {{api_key}}"
  Content-Type: "application/json"

request_schema:
  model: "gpt-4-turbo-preview"
  messages:
    - role: "user"
      content: "{{message}}"
  temperature: 0.7
  max_tokens: 4000

response_path: "choices[0].message.content"

message_format:
  preset: "openai"

suggestion_prompts:
  - "Explain quantum computing"
  - "Write a Python function"
  - "Debug this error"
```

### Anthropic Claude

```yaml
name: "Claude 3 Opus"
model_id: "claude-3-opus"
description: "Most intelligent Claude model"
endpoint: "https://api.anthropic.com/v1/messages"
method: "POST"

headers:
  x-api-key: "{{api_key}}"
  anthropic-version: "2023-06-01"
  Content-Type: "application/json"

request_schema:
  model: "claude-3-opus-20240229"
  messages:
    - role: "user"
      content: "{{message}}"
  max_tokens: 4000

response_path: "content[0].text"

message_format:
  preset: "anthropic"
```

### n8n Workflow

```yaml
name: "Customer Support Agent"
model_id: "support-agent-v1"
description: "Handles customer support queries with knowledge base"
endpoint: "https://your-domain.app.n8n.cloud/webhook/support-agent"
method: "POST"

headers:
  Content-Type: "application/json"
  X-N8N-API-KEY: "{{api_key}}"

request_schema:
  message: "{{message}}"
  user_id: "{{user_id}}"
  metadata:
    conversation_id: "{{conversation_id}}"
    timestamp: "{{timestamp}}"

response_path: "response.text"

message_format:
  preset: "custom"
  mapping:
    role:
      source: "role"
      target: "messages[].sender"
    content:
      source: "content"
      target: "messages[].message"
```

### LangChain Agent

```yaml
name: "Research Assistant"
model_id: "research-assistant"
description: "AI agent with web search and document retrieval"
endpoint: "https://your-agent.run.app/chat"
method: "POST"

headers:
  Authorization: "Bearer {{api_key}}"
  Content-Type: "application/json"

request_schema:
  input: "{{message}}"
  conversation_id: "{{conversation_id}}"
  config:
    tools:
      - "web_search"
      - "document_retrieval"
    max_iterations: 5

response_path: "output"

message_format:
  preset: "custom"
  mapping:
    role:
      source: "role"
      target: "chat_history[].type"
      transform: "lowercase"
    content:
      source: "content"
      target: "chat_history[].content"
```

---

## Validation

### Testing Your Configuration

1. **Validate YAML Syntax**
   ```bash
   # Use online YAML validator
   # https://www.yamllint.com/
   ```

2. **Import and Validate**
   - Admin Dashboard → Models → Import
   - Paste or upload your YAML
   - Click "Validate"
   - Fix any errors shown

3. **Test Connection**
   - After importing, click "Test"
   - Enter a test message
   - Verify response appears correctly

4. **Test in Chat**
   - Assign model to a group
   - Add yourself to the group
   - Test in actual conversation

### Common Validation Errors

```
❌ Error: Invalid YAML syntax
Fix: Check indentation (use spaces, not tabs)

❌ Error: 'model_id' must be unique
Fix: Change model_id to something not already used

❌ Error: 'endpoint' must be a valid URL
Fix: Add https:// prefix

❌ Error: 'response_path' returned null
Fix: Check path matches actual API response structure

❌ Error: Request timeout
Fix: Check endpoint URL is accessible
```

---

## Advanced Topics

### Using Conversation History

```yaml
request_schema:
  messages: "{{conversation_history}}"
  # Automatically includes last N messages
  # Formatted according to message_format
```

Configure max history:
```yaml
max_history_messages: 10  # Default: 20
```

### Conditional Fields

Use different configurations based on context:

```yaml
request_schema:
  model: "gpt-4"
  messages:
    - role: "system"
      content: "You are a helpful assistant"
    - role: "user"
      content: "{{message}}"
  # Only include temperature if user is premium
  temperature: "{{user.is_premium ? 0.3 : 0.7}}"
```

### Streaming Responses

```yaml
supports_streaming: true

request_schema:
  stream: true
  # Rest of schema

# Response will be processed as Server-Sent Events (SSE)
response_path: "choices[0].delta.content"
```

---

## Best Practices

### Security
- ✅ Never include API keys in YAML (use `{{api_key}}` placeholder)
- ✅ Use HTTPS endpoints
- ✅ Validate all user inputs
- ❌ Don't expose internal endpoints to public

### Performance
- ✅ Set appropriate timeouts
- ✅ Limit conversation history to necessary context
- ✅ Use streaming for long responses
- ❌ Don't send unnecessary data in requests

### Maintainability
- ✅ Use descriptive model names and IDs
- ✅ Document custom configurations
- ✅ Version your configurations (in file name)
- ✅ Test after any changes

---

## See Also

- [Endpoint Integration Guide](./ENDPOINT_INTEGRATION.md) - Building compatible endpoints
- [Examples Directory](../examples/) - Working configurations
- [First Endpoint Guide](../getting-started/FIRST_ENDPOINT.md) - Importing and testing
