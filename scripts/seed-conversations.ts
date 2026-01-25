/**
 * Seed Conversations Script
 *
 * Creates realistic demo conversations for the logged-in user.
 * Run with: npx tsx scripts/seed-conversations.ts
 */

import { createClient } from '@supabase/supabase-js';

// Local Supabase connection
const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const ORG_ID = '32cb139d-1c08-4a28-a9ad-01a1e21d58d9';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Conversation templates with realistic content
const conversationTemplates = [
  {
    title: 'Refactoring the authentication module',
    messages: [
      {
        role: 'user',
        content:
          "I need help refactoring our authentication module. The current implementation uses session-based auth but we want to migrate to JWT. What's the best approach?",
      },
      {
        role: 'assistant',
        content:
          "Great question! Migrating from session-based auth to JWT requires careful planning. Here's a recommended approach:\n\n1. **Parallel Implementation**: Keep the existing session auth working while building the JWT layer\n2. **Token Structure**: Design your JWT payload to include essential claims (sub, iat, exp, roles)\n3. **Refresh Token Strategy**: Implement refresh tokens for better security\n4. **Gradual Migration**: Use feature flags to switch users over incrementally\n\nWould you like me to provide specific code examples for any of these steps?",
      },
      {
        role: 'user',
        content: 'Yes, can you show me the token structure and refresh token implementation?',
      },
      {
        role: 'assistant',
        content:
          "```typescript\ninterface JWTPayload {\n  sub: string;        // User ID\n  email: string;\n  roles: string[];\n  org_id: string;\n  iat: number;        // Issued at\n  exp: number;        // Expiration\n}\n\n// Access token: short-lived (15 min)\nconst accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });\n\n// Refresh token: long-lived (7 days)\nconst refreshToken = jwt.sign({ sub: userId }, REFRESH_SECRET, { expiresIn: '7d' });\n```\n\nFor the refresh flow, store refresh tokens in a database table so you can revoke them if needed.",
      },
    ],
    daysAgo: 0.25,
  },
  {
    title: 'Q1 Marketing campaign strategy',
    messages: [
      {
        role: 'user',
        content:
          'We need creative ideas for our Q1 marketing campaign. Our target audience is enterprise tech companies. Budget is $50k.',
      },
      {
        role: 'assistant',
        content:
          'Here are 5 high-impact campaign ideas for enterprise tech:\n\n**1. Thought Leadership Series** ($15k)\n- Partner with industry analysts for webinar series\n- Gate content for lead generation\n\n**2. Interactive ROI Calculator** ($10k)\n- Custom tool showing potential savings\n- Great for bottom-funnel conversion\n\n**3. Customer Success Stories** ($8k)\n- Video testimonials from 3-5 key customers\n- Repurpose across channels\n\n**4. LinkedIn Account-Based Marketing** ($12k)\n- Target decision-makers at top 100 accounts\n- Personalized ad creative by industry\n\n**5. Developer Community Event** ($5k)\n- Sponsor relevant meetups/hackathons\n- Build grassroots awareness\n\nWhich of these aligns best with your Q1 goals?',
      },
    ],
    daysAgo: 1,
  },
  {
    title: 'Code review for API endpoints',
    messages: [
      {
        role: 'user',
        content:
          'Can you review this API endpoint for potential issues?\n\n```javascript\napp.post("/api/users", async (req, res) => {\n  const user = await db.users.create(req.body);\n  res.json(user);\n});\n```',
      },
      {
        role: 'assistant',
        content:
          'I found several security and reliability issues:\n\n**Critical Issues:**\n1. **No input validation** - Directly using req.body is dangerous\n2. **No authentication check** - Anyone can create users\n3. **No error handling** - Will crash on DB errors\n\n**Recommended fix:**\n```javascript\napp.post("/api/users", authenticate, async (req, res) => {\n  try {\n    const validated = userSchema.parse(req.body);\n    const user = await db.users.create(validated);\n    res.status(201).json(sanitize(user));\n  } catch (error) {\n    handleError(res, error);\n  }\n});\n```\n\nWould you like me to elaborate on any of these improvements?',
      },
    ],
    daysAgo: 2,
  },
  {
    title: 'Enterprise proposal for Globex Corp',
    messages: [
      {
        role: 'user',
        content:
          "Help me draft a proposal for Globex Corp. They're a Fortune 500 looking to deploy AI across 5,000 employees.",
      },
      {
        role: 'assistant',
        content:
          '# AgentFlow Enterprise Proposal for Globex Corporation\n\n## Executive Summary\n\nGlobex Corporation seeks to empower 5,000 employees with AI-driven productivity tools while maintaining enterprise security and compliance standards.\n\n## Proposed Solution\n\n- **Unified AI Platform**: Single dashboard for all AI deployments\n- **Department-Specific Agents**: Custom AI for Sales, Legal, Engineering\n- **SSO Integration**: Seamless auth with existing Okta setup\n- **Data Isolation**: Complete tenant separation per department\n\n## Pricing\n\n| Tier | Users | Price/User/Month |\n|------|-------|------------------|\n| Enterprise | 5,000 | $15 |\n\n**Total Annual Investment**: $900,000\n\n## ROI Projection\n\n- 2-3 hours saved per employee per week\n- Estimated annual productivity gain: $4.2M\n\nWant me to expand any section?',
      },
    ],
    daysAgo: 3,
  },
  {
    title: 'Database optimization strategies',
    messages: [
      {
        role: 'user',
        content:
          'Our PostgreSQL queries are getting slow as the database grows. What optimization strategies should we consider?',
      },
      {
        role: 'assistant',
        content:
          "Here's a comprehensive optimization strategy:\n\n## Quick Wins\n1. **Add indexes** on frequently queried columns\n2. **EXPLAIN ANALYZE** to identify slow queries\n3. **Connection pooling** (PgBouncer/Supavisor)\n\n## Medium-term\n4. **Partitioning** large tables by date\n5. **Materialized views** for complex aggregations\n6. **Query optimization** - avoid SELECT *\n\n## Architecture\n7. **Read replicas** for heavy read workloads\n8. **Caching layer** (Redis) for hot data\n9. **Archive old data** to cold storage\n\n```sql\n-- Example: Add composite index\nCREATE INDEX CONCURRENTLY idx_orders_user_date \nON orders(user_id, created_at DESC);\n```\n\nWhat's your current table size and query patterns?",
      },
    ],
    daysAgo: 5,
  },
  {
    title: 'React performance optimization',
    messages: [
      {
        role: 'user',
        content:
          'Our React app is sluggish. What are the best practices for optimizing React performance?',
      },
      {
        role: 'assistant',
        content:
          "## React Performance Optimization Guide\n\n### 1. Prevent Unnecessary Re-renders\n```tsx\n// Use React.memo for expensive components\nconst ExpensiveList = React.memo(({ items }) => (\n  <ul>{items.map(item => <li key={item.id}>{item.name}</li>)}</ul>\n));\n\n// Use useMemo for expensive calculations\nconst sortedItems = useMemo(() => \n  items.sort((a, b) => a.name.localeCompare(b.name)), \n  [items]\n);\n```\n\n### 2. Virtualization\nFor long lists, use `react-window` or `react-virtualized`\n\n### 3. Code Splitting\n```tsx\nconst Dashboard = lazy(() => import('./Dashboard'));\n```\n\n### 4. State Management\n- Keep state as local as possible\n- Use context sparingly\n- Consider Zustand for global state\n\nWant me to dive deeper into any of these?",
      },
    ],
    daysAgo: 7,
  },
  {
    title: 'CI/CD pipeline setup',
    messages: [
      {
        role: 'user',
        content:
          "We need to set up a CI/CD pipeline for our Next.js app. What's the recommended approach?",
      },
      {
        role: 'assistant',
        content:
          "Here's a production-ready CI/CD setup for Next.js:\n\n## GitHub Actions Workflow\n\n```yaml\nname: CI/CD\non:\n  push:\n    branches: [main, develop]\n  pull_request:\n    branches: [main]\n\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: 'npm'\n      - run: npm ci\n      - run: npm run lint\n      - run: npm run type-check\n      - run: npm test\n\n  deploy:\n    needs: test\n    if: github.ref == 'refs/heads/main'\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: vercel/actions/deploy@v1\n```\n\n## Key Stages\n1. **Lint & Type Check** - Catch issues early\n2. **Unit Tests** - Jest/Vitest\n3. **E2E Tests** - Playwright\n4. **Preview Deploy** - For PRs\n5. **Production Deploy** - On merge to main\n\nNeed help with any specific stage?",
      },
    ],
    daysAgo: 10,
  },
  {
    title: 'API rate limiting implementation',
    messages: [
      { role: 'user', content: 'How should we implement rate limiting for our API?' },
      {
        role: 'assistant',
        content:
          "Here's a robust rate limiting implementation:\n\n## Using Upstash Redis\n\n```typescript\nimport { Ratelimit } from '@upstash/ratelimit';\nimport { Redis } from '@upstash/redis';\n\nconst ratelimit = new Ratelimit({\n  redis: Redis.fromEnv(),\n  limiter: Ratelimit.slidingWindow(10, '10 s'),\n  analytics: true,\n});\n\nexport async function middleware(req: NextRequest) {\n  const ip = req.ip ?? '127.0.0.1';\n  const { success, limit, remaining } = await ratelimit.limit(ip);\n  \n  if (!success) {\n    return new Response('Too Many Requests', {\n      status: 429,\n      headers: {\n        'X-RateLimit-Limit': limit.toString(),\n        'X-RateLimit-Remaining': remaining.toString(),\n      },\n    });\n  }\n}\n```\n\n## Rate Limit Tiers\n- **Free**: 100 req/min\n- **Pro**: 1000 req/min\n- **Enterprise**: 10000 req/min\n\nThis uses sliding window algorithm for smooth limiting.",
      },
    ],
    daysAgo: 12,
  },
  {
    title: 'Microservices architecture design',
    messages: [
      {
        role: 'user',
        content: "We're considering moving to microservices. What should we consider?",
      },
      {
        role: 'assistant',
        content:
          "## Microservices Considerations\n\n### When to Use Microservices\n✅ Large team (50+ developers)\n✅ Need independent deployments\n✅ Different scaling requirements\n✅ Polyglot persistence needs\n\n### When to Avoid\n❌ Small team (<10 developers)\n❌ Simple CRUD app\n❌ Tight coupling required\n❌ Limited DevOps experience\n\n### Key Patterns\n1. **API Gateway** - Single entry point\n2. **Service Discovery** - Consul/Kubernetes\n3. **Circuit Breaker** - Resilience\n4. **Saga Pattern** - Distributed transactions\n5. **Event Sourcing** - Audit trail\n\n### Recommended Stack\n- **Container**: Docker + Kubernetes\n- **Service Mesh**: Istio\n- **Messaging**: Kafka/RabbitMQ\n- **Observability**: Prometheus + Grafana\n\nWhat's your current architecture and team size?",
      },
    ],
    daysAgo: 15,
  },
  {
    title: 'Customer support ticket analysis',
    messages: [
      {
        role: 'user',
        content:
          "A customer is reporting that they can't log in. They say they're getting \"Invalid credentials\" even though they're sure the password is correct. How should I troubleshoot?",
      },
      {
        role: 'assistant',
        content:
          "## Troubleshooting Login Issues\n\n### Step 1: Verify Account Status\n- Check if account is locked (too many failed attempts)\n- Verify email is confirmed\n- Check if user is in the correct organization\n\n### Step 2: Common Causes\n1. **Case sensitivity** - Email might be stored differently\n2. **Password reset** - Recent reset not completed\n3. **SSO mismatch** - Using SSO when should use email/password\n4. **Browser cache** - Old session cookies\n\n### Step 3: Debug Queries\n```sql\n-- Check user status\nSELECT email, email_confirmed_at, locked_until\nFROM auth.users WHERE email ILIKE '%customer@email.com%';\n\n-- Check recent login attempts\nSELECT * FROM auth.audit_log\nWHERE actor_username ILIKE '%customer%'\nORDER BY created_at DESC LIMIT 10;\n```\n\n### Recommended Response\n\"I've checked your account and [finding]. Please try [solution]. If that doesn't work, I can send a password reset link.\"\n\nWant me to draft a customer response?",
      },
    ],
    daysAgo: 18,
  },
  {
    title: 'Legal contract review assistance',
    messages: [
      {
        role: 'user',
        content:
          'Can you help me understand the key clauses I should look for in a SaaS vendor contract?',
      },
      {
        role: 'assistant',
        content:
          '## Essential SaaS Contract Clauses\n\n### 1. Data Protection & Privacy\n- **Data ownership** - You retain ownership of your data\n- **GDPR/CCPA compliance** - Required certifications\n- **Data location** - Where is data stored?\n- **Subprocessors** - Who else handles your data?\n\n### 2. Service Levels (SLA)\n- **Uptime guarantee** - 99.9% is standard\n- **Response times** - For critical issues\n- **Credits/remedies** - For SLA breaches\n\n### 3. Security\n- **SOC 2 Type II** - Annual audit\n- **Encryption** - At rest and in transit\n- **Breach notification** - 72 hours max\n\n### 4. Termination\n- **Data export** - Format and timeframe\n- **Data deletion** - Certification required\n- **Transition assistance** - Length of support\n\n### 5. Liability\n- **Cap on liability** - Usually 12 months fees\n- **Indemnification** - IP and data breaches\n- **Insurance** - Cyber liability coverage\n\n### Red Flags 🚩\n- Auto-renewal without notice\n- Unlimited liability for you\n- No data portability\n- Price increases without caps\n\nWant me to review a specific clause?',
      },
    ],
    daysAgo: 20,
  },
  {
    title: 'Strategic planning for Q2',
    messages: [
      {
        role: 'user',
        content:
          "Help me create a strategic plan outline for Q2. We're focused on growth and product expansion.",
      },
      {
        role: 'assistant',
        content:
          '# Q2 Strategic Plan\n\n## Executive Summary\nFocus: Accelerate growth through product expansion and market penetration.\n\n## Key Objectives (OKRs)\n\n### Objective 1: Expand Product Offering\n- KR1: Launch 2 new features based on customer feedback\n- KR2: Reduce churn by 15% through feature improvements\n- KR3: Increase NPS from 45 to 55\n\n### Objective 2: Accelerate Revenue Growth\n- KR1: Increase MRR by 25% ($X → $Y)\n- KR2: Close 3 enterprise deals (>$100k ACV)\n- KR3: Improve sales cycle from 60 to 45 days\n\n### Objective 3: Scale Operations\n- KR1: Hire 5 key roles (2 eng, 2 sales, 1 CS)\n- KR2: Implement new CRM by end of Q2\n- KR3: Reduce support ticket resolution time by 30%\n\n## Resource Allocation\n| Area | Q1 Budget | Q2 Budget | Change |\n|------|-----------|-----------|--------|\n| Engineering | $200k | $250k | +25% |\n| Sales | $150k | $200k | +33% |\n| Marketing | $100k | $120k | +20% |\n\n## Risk Mitigation\n1. Hiring delays → Partner with recruiting firm\n2. Feature delays → Agile prioritization\n3. Market conditions → Diversify customer base\n\nWant me to expand on any section?',
      },
    ],
    daysAgo: 25,
  },
  {
    title: 'Blog post draft: AI in Enterprise',
    messages: [
      {
        role: 'user',
        content:
          'Write a blog post introduction about how enterprises are adopting AI agents in 2025.',
      },
      {
        role: 'assistant',
        content:
          "# The Rise of AI Agents in Enterprise: 2025 and Beyond\n\n*How Fortune 500 companies are transforming operations with autonomous AI*\n\n---\n\nThe enterprise AI landscape has undergone a seismic shift. What began as simple chatbots and basic automation has evolved into sophisticated AI agents capable of reasoning, planning, and executing complex workflows autonomously.\n\nIn 2025, we're witnessing the emergence of what industry analysts call the \"Agentic Enterprise\" – organizations where AI agents work alongside humans, handling everything from customer support to strategic analysis.\n\n## Key Trends Driving Adoption\n\n**1. From Chat to Action**\nAI has moved beyond answering questions to actually completing tasks. An AI agent doesn't just tell you how to update a customer record – it updates it for you, with appropriate guardrails and audit trails.\n\n**2. Department-Specific Agents**\nGeneric AI is giving way to specialized agents. Legal teams have contract reviewers. Sales teams have proposal generators. Engineering teams have code assistants. Each trained on domain-specific knowledge.\n\n**3. Security-First Design**\nEnterprise adoption required solving the security puzzle. Modern AI platforms offer SOC 2 compliance, data isolation, and role-based access that meet the stringent requirements of regulated industries.\n\n---\n\n*In this series, we'll explore how leading enterprises are implementing AI agents, the challenges they've overcome, and the results they're achieving.*\n\nWant me to continue with the next section?",
      },
    ],
    daysAgo: 28,
  },
  {
    title: 'Competitor analysis request',
    messages: [
      {
        role: 'user',
        content:
          'Analyze our main competitors in the AI platform space and identify our differentiators.',
      },
      {
        role: 'assistant',
        content:
          '## Competitive Analysis: AI Platform Market\n\n### Competitor Overview\n\n| Competitor | Strengths | Weaknesses |\n|------------|-----------|------------|\n| **OpenWebUI** | Open source, large community | Single-tenant only, complex setup |\n| **Dify** | Visual workflow builder | Limited enterprise features |\n| **LangChain** | Flexible, developer-focused | Steep learning curve |\n| **Flowise** | No-code friendly | Limited scalability |\n\n### Our Differentiators\n\n**1. Multi-Tenant by Design**\n- Competitors: Require separate instances per customer\n- Us: One platform, unlimited isolated workspaces\n- Impact: 10x lower operational overhead\n\n**2. Enterprise-Ready Security**\n- SSO/SAML out of the box\n- SOC 2 Type II certified\n- Row-level data isolation\n\n**3. Unified Admin Experience**\n- Single dashboard for all AI deployments\n- Group-based access control\n- Usage analytics and feedback\n\n**4. Flexible Integration**\n- Works with any AI provider\n- Connect workflows (n8n, Make, Zapier)\n- Custom agent support\n\n### Market Positioning\n*\"The infrastructure layer for AI distribution\"*\n\nWe don\'t compete with AI model providers – we make it easy to deploy ANY AI to your organization.\n\nWant me to dive deeper into any competitor?',
      },
    ],
    daysAgo: 32,
  },
  {
    title: 'Onboarding documentation review',
    messages: [
      {
        role: 'user',
        content:
          'Review our onboarding docs and suggest improvements to reduce time-to-value for new users.',
      },
      {
        role: 'assistant',
        content:
          '## Onboarding Documentation Audit\n\n### Current State Assessment\n\n**What\'s Working:**\n✅ Clear installation steps\n✅ Environment variable documentation\n✅ Basic usage examples\n\n**What Needs Improvement:**\n\n### 1. Quick Start (Priority: High)\n**Problem:** Users take 30+ minutes to first successful API call\n**Solution:** Add \"5-Minute Quick Start\" guide\n```\n1. Sign up → 2. Create org → 3. Add model → 4. Start chatting\n```\nInclude copy-paste commands and screenshots.\n\n### 2. Use Case Templates (Priority: High)\n**Problem:** Users don\'t know where to start\n**Solution:** Add templates by role:\n- \"Customer Support Bot in 10 min\"\n- \"Code Review Assistant Setup\"\n- \"Sales Proposal Generator\"\n\n### 3. Video Walkthroughs (Priority: Medium)\n**Problem:** Text-heavy docs overwhelm users\n**Solution:** 2-3 minute Loom videos for:\n- First-time setup\n- Adding team members\n- Connecting AI models\n\n### 4. Interactive Playground (Priority: Medium)\n**Problem:** Users want to try before full setup\n**Solution:** Sandbox environment with pre-configured demo\n\n### Recommended Metrics\n- Time to first conversation: <5 minutes\n- Activation rate: >60% complete setup\n- 7-day retention: >40%\n\nWant me to draft the Quick Start guide?',
      },
    ],
    daysAgo: 35,
  },
];

async function getOrCreateModel(orgId: string): Promise<string | null> {
  // First try to get an existing model
  const { data: existingModels } = await supabase
    .from('models')
    .select('id')
    .eq('org_id', orgId)
    .limit(1);

  if (existingModels && existingModels.length > 0) {
    return existingModels[0].id;
  }

  // Create a demo model if none exists
  const { data: newModel, error } = await supabase
    .from('models')
    .insert({
      model_id: 'gpt-4-turbo',
      nice_name: 'GPT-4 Turbo',
      description: "OpenAI's most capable model",
      org_id: orgId,
      endpoint: 'https://api.openai.com/v1/chat/completions',
      method: 'POST',
      endpoint_type: 'sse',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating model:', error);
    return null;
  }

  return newModel?.id || null;
}

async function seedConversations() {
  console.log('🚀 Starting conversation seeding...\n');

  // Get the first user from the org
  const { data: orgMembers, error: orgError } = await supabase
    .from('org_map')
    .select('user_id')
    .eq('org_id', ORG_ID);

  if (orgError || !orgMembers || orgMembers.length === 0) {
    console.error('❌ No users found in organization:', orgError);
    console.log('\n📋 Checking org_map table...');

    const { data: allOrgs } = await supabase.from('org_map').select('*').limit(5);
    console.log('Sample org_map entries:', allOrgs);

    return;
  }

  const userId = orgMembers[0].user_id;
  console.log(`✅ Found user: ${userId}`);

  // Get or create a model
  const modelId = await getOrCreateModel(ORG_ID);
  if (!modelId) {
    console.error('❌ Could not get or create a model');
    return;
  }
  console.log(`✅ Using model: ${modelId}`);

  let conversationsCreated = 0;
  let messagesCreated = 0;
  let feedbackCreated = 0;

  for (const template of conversationTemplates) {
    const createdAt = new Date(Date.now() - template.daysAgo * 24 * 60 * 60 * 1000);

    // Create conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        user: userId,
        model: modelId,
        org_id: ORG_ID,
        title: template.title,
        created_at: createdAt.toISOString(),
      })
      .select('id')
      .single();

    if (convError) {
      console.error(`❌ Error creating conversation "${template.title}":`, convError);
      continue;
    }

    conversationsCreated++;
    console.log(`  📝 Created: "${template.title}"`);

    // Create messages
    for (let i = 0; i < template.messages.length; i++) {
      const msg = template.messages[i];
      const msgTime = new Date(createdAt.getTime() + i * 60000); // 1 minute apart

      const { data: message, error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          role: msg.role,
          content: msg.content,
          created_at: msgTime.toISOString(),
        })
        .select('id')
        .single();

      if (msgError) {
        console.error(`    ❌ Error creating message:`, msgError);
        continue;
      }

      messagesCreated++;

      // Add feedback to some assistant messages (50% chance)
      if (msg.role === 'assistant' && Math.random() > 0.5 && message) {
        const isPositive = Math.random() > 0.2; // 80% positive
        const comments = isPositive
          ? [
              'Exactly what I needed!',
              'Very helpful, thank you!',
              'Great explanation',
              'This solved my problem',
              'Perfect answer',
            ]
          : ['Could be more detailed', 'Not quite what I was looking for', 'Needs improvement'];

        const { error: feedbackError } = await supabase.from('message_feedback').insert({
          message_id: message.id,
          conversation_id: conversation.id,
          model_id: modelId,
          user_id: userId,
          positive: isPositive,
          comment: comments[Math.floor(Math.random() * comments.length)],
          created_at: new Date(msgTime.getTime() + 30000).toISOString(), // 30 seconds after message
        });

        if (!feedbackError) {
          feedbackCreated++;
        }
      }
    }
  }

  console.log('\n✨ Seeding complete!');
  console.log(`   📊 Conversations created: ${conversationsCreated}`);
  console.log(`   💬 Messages created: ${messagesCreated}`);
  console.log(`   👍 Feedback entries created: ${feedbackCreated}`);
}

// Run the script
seedConversations().catch(console.error);
