# Connect Your First AI Endpoint

**Time Required:** 15 minutes
**Prerequisites:**
- [Installation](./INSTALLATION.md) complete
- [Clerk Setup](./CLERK_SETUP.md) complete
- You're signed in at http://localhost:3000

This guide will walk you through connecting your first AI endpoint to AgentFlow.

---

## What You'll Learn

By the end of this guide, you'll have:
- ✅ Imported an AI model configuration
- ✅ Added your API key
- ✅ Tested the connection
- ✅ Set up group-based access control
- ✅ Started your first AI conversation

---

## Quick Path (5 Minutes)

**For experienced users** who just want to get running:

```bash
# 1. Visit admin dashboard
open http://localhost:3000/admin

# 2. Click "Models" → "Import"

# 3. Import example config
# Drag: examples/openai-gpt-config.yaml

# 4. Add your OpenAI API key in the model settings

# 5. Click "Test" to verify

# 6. Create a group and assign the model

# 7. Start chatting at /flow
```

**→ Continue reading for detailed walkthrough**

---

## Step 1: Access Admin Dashboard

1. **Visit** http://localhost:3000/admin
2. **You should see**:
   - Models tab
   - Groups tab
   - Users tab
   - Settings tab

**If you see "Access Denied":**
- You need to be an organization Owner or Admin
- Check your role: http://localhost:3000/admin → Users tab

---

## Step 2: Choose Your AI Provider

AgentFlow works with any HTTP endpoint. Choose one:

### Option A: OpenAI (Easiest)
- ✅ Works out of the box
- ✅ Example config included
- **Requires:** OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- **Cost:** Pay-per-use (typically $0.01-0.10 per conversation)

### Option B: Anthropic Claude
- ✅ Example config included
- **Requires:** Anthropic API key ([Get one here](https://console.anthropic.com/))
- **Cost:** Pay-per-use

### Option C: Custom Endpoint
- ✅ Any HTTP endpoint that returns JSON
- **Examples:** n8n workflow, Make.com, LangChain agent, Cloud Function
- **Requires:** Your endpoint URL
- **→ See** [Endpoint Integration Guide](../guides/ENDPOINT_INTEGRATION.md)

**For this guide, we'll use OpenAI.**

---

## Step 3: Get Your API Key

### OpenAI API Key

1. **Visit** [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. **Sign in** or create account
3. **Click** "Create new secret key"
4. **Name it**: "AgentFlow Dev"
5. **Copy the key**: `sk-proj-...` (you won't see it again!)
6. **Save it** somewhere safe temporarily

**⚠️ Security:** Never commit API keys to Git!

---

## Step 4: Import Model Configuration

### Navigate to Models

1. **Click** "Models" tab in admin dashboard
2. **Click** "Import Model" button (top right)

### Import the YAML File

**Option 1: Drag and Drop**
1. **Open** your file explorer
2. **Navigate** to `chat-platform/examples/`
3. **Drag** `openai-gpt-config.yaml` into the import modal

**Option 2: Copy and Paste**
1. **Open** `examples/openai-gpt-config.yaml` in a text editor
2. **Copy** the entire content
3. **Paste** into the import modal

**Option 3: File Picker**
1. **Click** "Choose File"
2. **Select** `examples/openai-gpt-config.yaml`

### Validate Configuration

1. **Click** "Validate"
2. **You should see**: ✅ "Configuration is valid"

**If you see errors:**
- Check YAML syntax (proper indentation)
- See [YAML Configuration Guide](../guides/YAML_CONFIG.md)

### Import

1. **Click** "Import Model"
2. **You should see**: "Model imported successfully"
3. **You'll be redirected** to the model details page

---

## Step 5: Add Your API Key

The imported configuration doesn't include your API key (for security). You need to add it manually.

### Edit Model

1. **On the model details page**, click "Edit"
2. **Or navigate**: Models tab → Click the model card → Click "Edit"

### Find API Key Field

1. **Scroll to** "Authentication" section
2. **Find** "API Key" field
3. **Paste** your OpenAI API key: `sk-proj-...`
4. **Click** "Save"

**Security Note:** API keys are encrypted before storage and never exposed in the UI again.

---

## Step 6: Test the Connection

Before using the model in chat, verify it works:

1. **Click** "Test Connection" button (on model card)
2. **Enter a test message**: "Say hello!"
3. **Click** "Send Test"

**Expected Result:**
- ✅ Status: 200 OK
- ✅ Response appears: "Hello! How can I assist you today?"
- ✅ Response time: < 3 seconds

**If you see an error:**

```
❌ Error 401: Invalid API key
```
**Fix:** Check your API key is correct

```
❌ Error 404: Endpoint not found
```
**Fix:** Check the endpoint URL in configuration

```
❌ Error: Cannot parse response
```
**Fix:** Check `response_path` in configuration matches API response structure

**→ See [Troubleshooting](./TROUBLESHOOTING.md#model-connection-issues)**

---

## Step 7: Set Up Access Control

Now that your model works, you need to control who can access it.

### Create a Group

1. **Click** "Groups" tab
2. **Click** "Create Group"
3. **Enter**:
   - **Name**: "All Users" (or "Premium", "Team", etc.)
   - **Description**: "Everyone in the organization"
4. **Click** "Create"

### Assign Model to Group

1. **Click** the group you just created
2. **Click** "Models" tab (within the group)
3. **Click** "Add Model"
4. **Select** your OpenAI model
5. **Click** "Add"

**Result:** Users in this group can now access this AI model.

### Add Yourself to the Group

1. **In the group**, click "Members" tab
2. **Click** "Add Member"
3. **Select** your email
4. **Click** "Add"

**Alternative:** Groups tab → "All Users" → Members → Add yourself

---

## Step 8: Start Your First Conversation

### Navigate to Chat

1. **Visit** http://localhost:3000/flow
2. **You should see**:
   - Chat interface
   - Model selector (top right)
   - Your OpenAI model is available

### Select Your Model

1. **Click** the model selector dropdown
2. **Select** your OpenAI model (e.g., "GPT-4")

### Send a Message

1. **Type** a message: "What's the capital of France?"
2. **Press** Enter or click Send
3. **Watch** the AI respond in real-time

**Expected Behavior:**
- ✅ Message appears in chat
- ✅ "Thinking..." indicator shows
- ✅ AI response streams in
- ✅ Response is saved to conversation history

### Conversation Features

**Try these features:**
- **New Conversation**: Click "+ New Chat" in sidebar
- **Conversation History**: Click previous conversations in sidebar
- **Switch Models**: Change model mid-conversation
- **Feedback**: Thumbs up/down on AI responses
- **Export**: Download conversation as JSON/Markdown

---

## Step 9: Verify Everything Works

### Check Database

Visit Supabase Studio: http://127.0.0.1:54323

1. **Table: `models`**
   - Should have 1 row (your OpenAI model)
   - Check `endpoint`, `name`, `model_id`

2. **Table: `conversations`**
   - Should have 1 row (your test conversation)
   - Check `user_id` matches your profile

3. **Table: `messages`**
   - Should have 2+ rows (your message + AI response)
   - Check `role` (user vs assistant)
   - Check `content` has your messages

4. **Table: `group_model_map`**
   - Should have 1 row linking your group to your model

5. **Table: `group_user_map`**
   - Should have 1 row linking you to your group

---

## What You've Accomplished

🎉 **Congratulations!** You've successfully:

- ✅ Imported an AI model configuration
- ✅ Securely added API credentials
- ✅ Tested the connection
- ✅ Set up group-based access control
- ✅ Started AI conversations
- ✅ Verified data persistence

---

## Next Steps

### Add More Models

**Different AI Providers:**
- Import `examples/anthropic-claude-config.yaml` for Claude
- Both models will be available in the chat interface

**Different Use Cases:**
- Import `examples/n8n-workflow-config.yaml` for automation
- Import `examples/langchain-agent-config.yaml` for custom agents

### Advanced Access Control

**Scenario:** Different teams get different AI models

1. **Create groups**:
   - Group: "Engineering Team"
   - Group: "Marketing Team"

2. **Assign models**:
   - Engineering Team → GPT-4 (expensive, powerful)
   - Marketing Team → GPT-3.5 (cheaper, faster)

3. **Add users**:
   - Add engineers to Engineering Team
   - Add marketers to Marketing Team

**Result:** Each team only sees their designated AI models.

**→ See [Access Control Guide](../guides/ACCESS_CONTROL.md)**

### Connect Your Own Endpoint

**If you have a custom AI agent:**

1. **Read** [Endpoint Integration Guide](../guides/ENDPOINT_INTEGRATION.md)
2. **Create** your YAML configuration
3. **Import** it following this guide
4. **Test** and deploy

### Multi-Tenant Setup

**Scenario:** You're an AI consultant with multiple clients

1. **Create organizations** for each client
2. **Invite** client users to their organization
3. **Connect** client-specific AI models
4. **Assign** models only to that organization's groups

**Result:** Complete data isolation between clients.

**→ See [Multi-Tenant Guide](../guides/MULTI_TENANT.md)**

---

## Common Issues

### "No models available" in Chat

**Causes:**
1. Model not assigned to any group
2. You're not a member of any group with models
3. Model is disabled

**Fix:**
```bash
# Check model-group mapping
# Admin → Groups → Your Group → Models tab
# Verify your model is assigned

# Check your group membership
# Admin → Groups → Your Group → Members tab
# Verify you're a member

# Check model is enabled
# Admin → Models → Your Model → Check "Enabled" toggle
```

### Model Test Fails with "Invalid API Key"

**Fix:**
1. Verify API key is correct
2. Check API key permissions (should have access to model)
3. Check API key billing is active (OpenAI requires payment method)

### Model Appears But Doesn't Respond

**Check:**
1. Browser console for errors (F12 → Console)
2. Dev server terminal for errors
3. Network tab for failed requests (F12 → Network)

**Common issue:** CORS errors
```env
# Add to .env.local
ALLOWED_ORIGINS=http://localhost:3000
```

### Conversation Saves But No AI Response

**Cause:** API request succeeded but response parsing failed

**Fix:**
1. Check `response_path` in model configuration
2. Test the actual API response format
3. Update configuration to match API structure

**→ See [YAML Configuration Guide](../guides/YAML_CONFIG.md#response-path)**

---

## Learn More

- 📖 [YAML Configuration Reference](../guides/YAML_CONFIG.md)
- 🔧 [Endpoint Integration Guide](../guides/ENDPOINT_INTEGRATION.md)
- 🏢 [Access Control Patterns](../guides/ACCESS_CONTROL.md)
- 🚀 [Deploy to Production](../DEPLOYMENT.md)
- 💬 [GitHub Discussions](https://github.com/your-org/chat-platform/discussions)

---

**🎉 You're ready to build with AgentFlow!**

Share your AI agents with teams, clients, or organizations with enterprise-grade infrastructure out of the box.
