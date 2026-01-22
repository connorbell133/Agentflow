# Use Cases & Examples

Real-world scenarios showing how to use AgentFlow to distribute your AI agents.

---

## For AI Consultants

### Scenario: Multiple Client Engagements

**Your Situation:**
- You build custom AI solutions for 3-5 clients
- Each client has different AI requirements
- You use n8n, Make.com, or custom agents
- Clients need professional interface, not just API access

**Without AgentFlow:**
- Build separate chat UIs for each client
- Manage 3-5 different deployments
- Handle auth/users separately for each
- 6+ months development time per client

**With AgentFlow:**

```
1. Deploy AgentFlow once (your-platform.com)

2. Create organizations:
   ├── Acme Corp (your-platform.com/acme)
   ├── TechStart Inc (your-platform.com/techstart)
   └── Legal LLC (your-platform.com/legal)

3. Connect each client's AI endpoint:
   ├── Acme: n8n workflow (support automation)
   ├── TechStart: LangChain agent (sales coach)
   └── Legal: Claude API (contract review)

4. Invite clients to their organization
   └── They only see their AI, their data

5. Iterate on agents independently
   └── Update your n8n workflow, changes reflect immediately
```

**Benefits:**
- ✅ One platform, multiple clients
- ✅ Complete data isolation
- ✅ Professional interface for client demos
- ✅ Update AI logic without touching UI
- ✅ 5 minutes per client vs 6 months

---

## For SaaS Companies

### Scenario: Tiered AI Features

**Your Situation:**
- SaaS product with Free, Pro, Enterprise tiers
- Want to offer AI features at each tier
- Need to control access based on subscription
- Must prevent Free users from accessing Pro AI

**Without AgentFlow:**
- Build chat interface from scratch
- Implement subscription checks everywhere
- Build admin dashboard for model management
- Handle user permissions manually
- 4-6 months development

**With AgentFlow:**

```
1. Set up organization structure:
   Organization: Your SaaS Product

2. Create groups by tier:
   ├── Group: "Free Users"
   ├── Group: "Pro Users"
   └── Group: "Enterprise Users"

3. Connect AI models by tier:
   ├── Free Users → GPT-3.5 Turbo (fast, cheap)
   ├── Pro Users → GPT-4 (powerful, expensive)
   └── Enterprise → Custom fine-tuned model

4. Auto-assign users to groups on signup:
   └── Webhook: Stripe subscription → Add to correct group

5. Users automatically get access to their tier's AI
   └── Upgrade subscription → Moved to new group → New AI access
```

**Benefits:**
- ✅ Built-in access control
- ✅ No code changes for tier management
- ✅ Automatic access based on groups
- ✅ Upgrade path built-in
- ✅ Usage tracking per tier (coming soon)

**Revenue Impact:**
```
Free Tier: Basic AI → $0/month
Pro Tier: Advanced AI → $29/month
Enterprise: Custom AI → $199/month

Offer AI features without building infrastructure
```

---

## For Enterprises

### Scenario: Department-Specific AI Tools

**Your Situation:**
- Large organization with 5+ departments
- Each needs specialized AI capabilities
- Legal, HR, Engineering, Sales, Marketing
- IT needs centralized control and visibility

**Without AgentFlow:**
- Build separate tools for each department
- Or build one tool with complex access control
- Implement SSO/SAML
- Build audit logging
- 9-12 months development

**With AgentFlow:**

```
1. One organization: Your Company Inc.

2. Create department groups:
   ├── Group: Legal
   ├── Group: HR
   ├── Group: Engineering
   ├── Group: Sales
   └── Group: Marketing

3. Connect department-specific AI:
   ├── Legal → Contract Analyzer (LangChain + legal DB)
   ├── HR → Policy Assistant (Claude + HR docs)
   ├── Engineering → Code Helper (GPT-4 + GitHub)
   ├── Sales → Sales Coach (Custom agent)
   └── Marketing → Content Writer (GPT-4)

4. Assign employees to their departments:
   └── Legal team members only see Legal AI

5. IT dashboard shows all usage:
   └── Admin → View all conversations, users, models
```

**Benefits:**
- ✅ Centralized deployment
- ✅ Distributed access
- ✅ Complete audit trail
- ✅ One platform to maintain
- ✅ Add departments without code changes

**Compliance:**
- Row-Level Security ensures data isolation
- Legal team can't see HR conversations
- Complete audit log for compliance
- Self-hostable for data residency

---

## For Agent Builders

### Scenario: LangChain/CrewAI Distribution

**Your Situation:**
- Built powerful multi-agent system with LangChain/CrewAI
- Agents use tools: web search, calculator, database queries
- Need to share with team or customers
- Don't want to build UI from scratch

**Without AgentFlow:**
- Build React/Next.js frontend
- Implement WebSocket for streaming
- Handle auth and sessions
- Build conversation history
- 3-4 months development

**With AgentFlow:**

```
1. Your LangChain agent (example):
   ├── Cloud Run deployment
   ├── HTTP endpoint: https://your-agent.run.app/chat
   └── Returns: { "output": "response text" }

2. Create YAML config:
   name: "Research Assistant"
   endpoint: "https://your-agent.run.app/chat"
   request_schema:
     input: "{{message}}"
     tools: ["web_search", "calculator"]
   response_path: "output"

3. Import to AgentFlow (30 seconds)
   └── Admin → Models → Import YAML

4. Assign to team:
   └── Create group → Add team members → Assign model

5. Team starts using immediately:
   └── Professional chat interface
   └── Conversation history automatically saved
   └── Feedback system built-in
```

**Agent Development Workflow:**
```
1. Update your LangChain agent code
2. Deploy to Cloud Run (auto-deploy on git push)
3. AgentFlow automatically uses new version
4. No frontend changes needed
```

**Benefits:**
- ✅ Focus on agent logic, not UI
- ✅ Iterate quickly on agent capabilities
- ✅ Professional interface for demos
- ✅ Built-in conversation management

---

## For Automation Engineers

### Scenario: n8n/Make.com Workflow Distribution

**Your Situation:**
- Built complex n8n workflows
- Combine APIs: Airtable, Google Sheets, Slack, OpenAI
- Need to share workflows with non-technical users
- Want professional chat interface

**Without AgentFlow:**
- Build custom frontend for each workflow
- Handle user input/output formatting
- Implement error handling UI
- Build conversation history
- 2-3 months per workflow

**With AgentFlow:**

```
1. Your n8n workflow:
   ├── Webhook trigger: https://n8n.example.com/webhook/abc123
   ├── Processes: Fetch data, call OpenAI, update Airtable
   └── Returns: { "response": { "text": "result" } }

2. Create YAML config:
   name: "Customer Support Automation"
   endpoint: "https://n8n.example.com/webhook/abc123"
   headers:
     X-API-Key: "{{api_key}}"
   request_schema:
     message: "{{message}}"
     user: "{{user_id}}"
   response_path: "response.text"

3. Import and share:
   └── Support team gets chat interface
   └── They type questions → Your n8n workflow processes
   └── Results returned in clean chat format

4. Workflow benefits:
   └── User message → Fetch from Airtable → Call OpenAI → Update Slack → Return result
   └── All complexity hidden behind chat interface
```

**Real Example: Support Ticket Automation**
```
User: "What's the status of ticket #12345?"
  ↓
n8n Workflow:
  1. Query Zendesk for ticket #12345
  2. Get latest notes and status
  3. Ask OpenAI to summarize
  4. Return formatted response
  ↓
AgentFlow: "Ticket #12345 is in progress. Last update from engineering
           team: Investigating database performance issue. Expected
           resolution: 24 hours."
```

**Benefits:**
- ✅ Turn any workflow into chat interface
- ✅ Non-technical users can interact with complex automation
- ✅ No code changes to workflows
- ✅ Professional UX out of the box

---

## For AI Researchers

### Scenario: Experimental Model Distribution

**Your Situation:**
- Testing different AI models/prompts/approaches
- Need to gather feedback from users
- Want A/B testing capabilities
- Need conversation data for analysis

**Without AgentFlow:**
- Build experimental platform
- Implement feedback collection
- Build analytics dashboard
- Export conversation data
- 4-5 months development

**With AgentFlow:**

```
1. Connect multiple model variations:
   ├── Model A: GPT-4 with prompt v1
   ├── Model B: GPT-4 with prompt v2
   ├── Model C: Claude with prompt v1
   └── Model D: Your fine-tuned model

2. Create test groups:
   ├── Group: Variant A (25% of users)
   ├── Group: Variant B (25% of users)
   ├── Group: Variant C (25% of users)
   └── Group: Variant D (25% of users)

3. Users automatically assigned randomly:
   └── Get feedback through built-in thumbs up/down

4. Analyze results:
   └── Export conversations
   └── Compare feedback scores
   └── Iterate on best-performing variant
```

**Research Benefits:**
- ✅ Easy A/B testing setup
- ✅ Built-in feedback collection
- ✅ Export data for analysis
- ✅ Quick iteration on prompts/models
- ✅ No UI development needed

---

## Multi-Tenant Scenarios

### Scenario 1: White-Label AI Platform

**Your Situation:**
- Selling AI platform to multiple companies
- Each company needs their own branding
- Complete data isolation required
- Each company manages their own users

**Setup:**
```
Platform: your-ai-platform.com

Organizations (separate tenants):
├── acme.your-ai-platform.com
│   ├── Users: Acme employees
│   ├── Models: Acme-specific AI agents
│   └── Branding: Acme colors/logo
│
├── techcorp.your-ai-platform.com
│   ├── Users: TechCorp employees
│   ├── Models: TechCorp AI agents
│   └── Branding: TechCorp colors/logo
│
└── startup.your-ai-platform.com
    ├── Users: Startup employees
    ├── Models: Startup AI agents
    └── Branding: Startup colors/logo
```

**Benefits:**
- ✅ One codebase, many customers
- ✅ Complete data isolation (RLS)
- ✅ Each customer feels like separate platform
- ✅ Centralized admin for you
- ✅ Customer self-service for their users

### Scenario 2: Agency Client Management

**Your Situation:**
- Digital agency with 10+ clients
- Each client gets custom AI solutions
- Need to track which AI is for which client
- Want professional client experience

**Setup:**
```
One Platform: agency-ai.com

Client Organizations:
├── Client A → Org: "Client A Inc"
│   ├── Group: "All Users"
│   ├── Models: Client A Custom Agent
│   └── Data: Only Client A data visible
│
├── Client B → Org: "Client B Corp"
│   ├── Group: "Marketing Team"
│   ├── Models: Content Generator, SEO Assistant
│   └── Data: Only Client B data visible
│
└── Client C → Org: "Client C LLC"
    ├── Group: "Support Team"
    ├── Models: Support Bot
    └── Data: Only Client C data visible
```

**Agency Workflow:**
```
1. Sign new client
2. Create organization for client
3. Connect client-specific AI agents
4. Invite client users
5. Client manages their own users going forward
6. You update AI agents as needed
```

---

## Quick Start Templates

### Template 1: Simple OpenAI Passthrough

**Use Case:** Just want to give team access to GPT-4

```yaml
name: "GPT-4"
model_id: "gpt-4"
endpoint: "https://api.openai.com/v1/chat/completions"
method: "POST"
headers:
  Authorization: "Bearer {{api_key}}"
request_schema:
  model: "gpt-4"
  messages:
    - role: "user"
      content: "{{message}}"
response_path: "choices[0].message.content"
```

**Setup Time:** 2 minutes

### Template 2: Knowledge Base Q&A

**Use Case:** Company knowledge base powered by AI

```yaml
name: "Company Knowledge Base"
model_id: "kb-assistant"
endpoint: "https://your-kb-agent.run.app/query"
method: "POST"
headers:
  Authorization: "Bearer {{api_key}}"
request_schema:
  query: "{{message}}"
  sources: ["confluence", "notion", "drive"]
  max_sources: 5
response_path: "answer"
```

**Includes:** Source citations, confidence scores

### Template 3: Customer Support Automation

**Use Case:** AI handles common support questions

```yaml
name: "Support Bot"
model_id: "support-bot-v1"
endpoint: "https://n8n.company.com/webhook/support"
method: "POST"
request_schema:
  message: "{{message}}"
  user_email: "{{user_email}}"
  conversation_id: "{{conversation_id}}"
response_path: "response"
```

**Workflow:** Check FAQ → Search tickets → Escalate if needed

---

## Next Steps

Choose your scenario and get started:

- 📖 [Installation Guide](./getting-started/INSTALLATION.md)
- 🔧 [First Endpoint Guide](./getting-started/FIRST_ENDPOINT.md)
- ⚙️ [YAML Configuration](./guides/YAML_CONFIG.md)
- 🏢 [Access Control](./guides/ACCESS_CONTROL.md)
- 🚀 [Deployment](./DEPLOYMENT.md)
