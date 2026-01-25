-- ============================================================================
-- AGENTFLOW DEMO DATA SEED SCRIPT
-- Creates realistic demo data for screenshots and demos
-- ============================================================================

-- Configuration: Use provided org_id
-- Org ID: 32cb139d-1c08-4a28-a9ad-01a1e21d58d9

-- ============================================================================
-- SECTION 1: CLEANUP (Optional - uncomment to reset)
-- ============================================================================
-- DELETE FROM message_feedback WHERE conversation_id IN (SELECT id FROM conversations WHERE org_id = '32cb139d-1c08-4a28-a9ad-01a1e21d58d9');
-- DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE org_id = '32cb139d-1c08-4a28-a9ad-01a1e21d58d9');
-- DELETE FROM conversations WHERE org_id = '32cb139d-1c08-4a28-a9ad-01a1e21d58d9';
-- DELETE FROM model_map WHERE org_id = '32cb139d-1c08-4a28-a9ad-01a1e21d58d9';
-- DELETE FROM model_prompts WHERE model_id IN (SELECT id FROM models WHERE org_id = '32cb139d-1c08-4a28-a9ad-01a1e21d58d9');
-- DELETE FROM models WHERE org_id = '32cb139d-1c08-4a28-a9ad-01a1e21d58d9';
-- DELETE FROM group_map WHERE org_id = '32cb139d-1c08-4a28-a9ad-01a1e21d58d9';
-- DELETE FROM invites WHERE org_id = '32cb139d-1c08-4a28-a9ad-01a1e21d58d9';
-- DELETE FROM groups WHERE org_id = '32cb139d-1c08-4a28-a9ad-01a1e21d58d9';

-- ============================================================================
-- SECTION 2: DEMO USER PROFILES
-- ============================================================================

-- Insert demo user profiles (these are fake users for demo purposes)
INSERT INTO profiles (id, full_name, email, avatar_url, signup_complete, created_at) VALUES
  ('a1b2c3d4-e5f6-4789-abcd-111111111111'::uuid, 'Sarah Chen', 'sarah.chen@acmecorp.com', NULL, true, NOW() - INTERVAL '45 days'),
  ('a1b2c3d4-e5f6-4789-abcd-222222222222'::uuid, 'Marcus Johnson', 'marcus.j@acmecorp.com', NULL, true, NOW() - INTERVAL '38 days'),
  ('a1b2c3d4-e5f6-4789-abcd-333333333333'::uuid, 'Emily Rodriguez', 'emily.r@acmecorp.com', NULL, true, NOW() - INTERVAL '32 days'),
  ('a1b2c3d4-e5f6-4789-abcd-444444444444'::uuid, 'David Kim', 'david.kim@acmecorp.com', NULL, true, NOW() - INTERVAL '28 days'),
  ('a1b2c3d4-e5f6-4789-abcd-555555555555'::uuid, 'Lisa Thompson', 'lisa.t@acmecorp.com', NULL, true, NOW() - INTERVAL '21 days'),
  ('a1b2c3d4-e5f6-4789-abcd-666666666666'::uuid, 'James Wilson', 'james.w@acmecorp.com', NULL, true, NOW() - INTERVAL '14 days'),
  ('a1b2c3d4-e5f6-4789-abcd-777777777777'::uuid, 'Amanda Foster', 'amanda.f@acmecorp.com', NULL, true, NOW() - INTERVAL '10 days'),
  ('a1b2c3d4-e5f6-4789-abcd-888888888888'::uuid, 'Michael Brown', 'michael.b@acmecorp.com', NULL, true, NOW() - INTERVAL '7 days'),
  ('a1b2c3d4-e5f6-4789-abcd-999999999999'::uuid, 'Jennifer Lee', 'jennifer.l@acmecorp.com', NULL, true, NOW() - INTERVAL '5 days'),
  ('a1b2c3d4-e5f6-4789-abcd-aaaaaaaaaaaa'::uuid, 'Robert Taylor', 'robert.t@acmecorp.com', NULL, true, NOW() - INTERVAL '3 days'),
  ('a1b2c3d4-e5f6-4789-abcd-bbbbbbbbbbbb'::uuid, 'Nicole Martinez', 'nicole.m@acmecorp.com', NULL, true, NOW() - INTERVAL '2 days'),
  ('a1b2c3d4-e5f6-4789-abcd-cccccccccccc'::uuid, 'Christopher Davis', 'chris.d@acmecorp.com', NULL, true, NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email;

-- ============================================================================
-- SECTION 3: ORGANIZATION & ORG MAPPINGS
-- ============================================================================

-- Update organization name to something impressive
UPDATE organizations 
SET name = 'Acme Corporation', status = 'active'
WHERE id = '32cb139d-1c08-4a28-a9ad-01a1e21d58d9';

-- Add demo users to the organization
INSERT INTO org_map (org_id, user_id, role, created_at) VALUES
  ('32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'a1b2c3d4-e5f6-4789-abcd-111111111111', 'member', NOW() - INTERVAL '45 days'),
  ('32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'a1b2c3d4-e5f6-4789-abcd-222222222222', 'member', NOW() - INTERVAL '38 days'),
  ('32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'a1b2c3d4-e5f6-4789-abcd-333333333333', 'member', NOW() - INTERVAL '32 days'),
  ('32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'a1b2c3d4-e5f6-4789-abcd-444444444444', 'member', NOW() - INTERVAL '28 days'),
  ('32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'a1b2c3d4-e5f6-4789-abcd-555555555555', 'member', NOW() - INTERVAL '21 days'),
  ('32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'a1b2c3d4-e5f6-4789-abcd-666666666666', 'member', NOW() - INTERVAL '14 days'),
  ('32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'a1b2c3d4-e5f6-4789-abcd-777777777777', 'member', NOW() - INTERVAL '10 days'),
  ('32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'a1b2c3d4-e5f6-4789-abcd-888888888888', 'member', NOW() - INTERVAL '7 days'),
  ('32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'a1b2c3d4-e5f6-4789-abcd-999999999999', 'member', NOW() - INTERVAL '5 days'),
  ('32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'a1b2c3d4-e5f6-4789-abcd-aaaaaaaaaaaa', 'member', NOW() - INTERVAL '3 days'),
  ('32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'a1b2c3d4-e5f6-4789-abcd-bbbbbbbbbbbb', 'member', NOW() - INTERVAL '2 days'),
  ('32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'a1b2c3d4-e5f6-4789-abcd-cccccccccccc', 'member', NOW() - INTERVAL '1 day')
ON CONFLICT (user_id, org_id) DO NOTHING;

-- ============================================================================
-- SECTION 4: GROUPS
-- ============================================================================

INSERT INTO groups (id, role, description, org_id, created_at) VALUES
  ('11111111-aaaa-4000-8000-000000000001'::uuid, 'Engineering', 'Software development and technical teams', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '40 days'),
  ('11111111-aaaa-4000-8000-000000000002'::uuid, 'Marketing', 'Marketing and growth teams', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '38 days'),
  ('11111111-aaaa-4000-8000-000000000003'::uuid, 'Sales', 'Sales and business development', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '35 days'),
  ('11111111-aaaa-4000-8000-000000000004'::uuid, 'Executive', 'Leadership and executives', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '40 days'),
  ('11111111-aaaa-4000-8000-000000000005'::uuid, 'Support', 'Customer support and success', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '30 days'),
  ('11111111-aaaa-4000-8000-000000000006'::uuid, 'Legal', 'Legal and compliance team', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '25 days')
ON CONFLICT (org_id, role) DO NOTHING;

-- ============================================================================
-- SECTION 5: AI MODELS
-- ============================================================================

INSERT INTO models (id, model_id, nice_name, description, org_id, endpoint, method, endpoint_type, created_at) VALUES
  -- OpenAI Models
  ('22222222-bbbb-4000-8000-000000000001'::uuid, 'gpt-4-turbo', 'GPT-4 Turbo', 'OpenAI''s most capable model for complex reasoning and creative tasks', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'https://api.openai.com/v1/chat/completions', 'POST', 'sse', NOW() - INTERVAL '35 days'),
  ('22222222-bbbb-4000-8000-000000000002'::uuid, 'gpt-4o', 'GPT-4o', 'OpenAI''s multimodal flagship model with vision capabilities', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'https://api.openai.com/v1/chat/completions', 'POST', 'sse', NOW() - INTERVAL '30 days'),
  ('22222222-bbbb-4000-8000-000000000003'::uuid, 'gpt-3.5-turbo', 'GPT-3.5 Turbo', 'Fast and cost-effective model for general tasks', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'https://api.openai.com/v1/chat/completions', 'POST', 'sse', NOW() - INTERVAL '40 days'),
  
  -- Anthropic Models
  ('22222222-bbbb-4000-8000-000000000004'::uuid, 'claude-3-opus', 'Claude 3 Opus', 'Anthropic''s most powerful model for complex analysis', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'https://api.anthropic.com/v1/messages', 'POST', 'sse', NOW() - INTERVAL '28 days'),
  ('22222222-bbbb-4000-8000-000000000005'::uuid, 'claude-3-sonnet', 'Claude 3 Sonnet', 'Balanced performance and speed for enterprise use', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'https://api.anthropic.com/v1/messages', 'POST', 'sse', NOW() - INTERVAL '25 days'),
  
  -- Custom/Workflow Models
  ('22222222-bbbb-4000-8000-000000000006'::uuid, 'code-assistant', 'Code Assistant', 'Custom n8n workflow for code review and generation', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'https://n8n.acmecorp.com/webhook/code-review', 'POST', 'webhook', NOW() - INTERVAL '20 days'),
  ('22222222-bbbb-4000-8000-000000000007'::uuid, 'sales-copilot', 'Sales Copilot', 'AI assistant for sales outreach and proposals', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'https://n8n.acmecorp.com/webhook/sales-assist', 'POST', 'webhook', NOW() - INTERVAL '18 days'),
  ('22222222-bbbb-4000-8000-000000000008'::uuid, 'legal-reviewer', 'Legal Document Reviewer', 'Contract analysis and legal document review', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'https://n8n.acmecorp.com/webhook/legal-review', 'POST', 'webhook', NOW() - INTERVAL '15 days'),
  ('22222222-bbbb-4000-8000-000000000009'::uuid, 'support-agent', 'Support Agent', 'Customer support automation with knowledge base', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'https://n8n.acmecorp.com/webhook/support', 'POST', 'webhook', NOW() - INTERVAL '12 days')
ON CONFLICT (id) DO UPDATE SET nice_name = EXCLUDED.nice_name, description = EXCLUDED.description;

-- ============================================================================
-- SECTION 6: MODEL-GROUP MAPPINGS (Access Control)
-- ============================================================================

INSERT INTO model_map (model_id, group_id, org_id, created_at) VALUES
  -- Engineering gets all technical models
  ('22222222-bbbb-4000-8000-000000000001', '11111111-aaaa-4000-8000-000000000001', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '30 days'),
  ('22222222-bbbb-4000-8000-000000000002', '11111111-aaaa-4000-8000-000000000001', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '28 days'),
  ('22222222-bbbb-4000-8000-000000000004', '11111111-aaaa-4000-8000-000000000001', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '25 days'),
  ('22222222-bbbb-4000-8000-000000000006', '11111111-aaaa-4000-8000-000000000001', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '20 days'),
  
  -- Marketing gets GPT-4o and GPT-3.5
  ('22222222-bbbb-4000-8000-000000000002', '11111111-aaaa-4000-8000-000000000002', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '28 days'),
  ('22222222-bbbb-4000-8000-000000000003', '11111111-aaaa-4000-8000-000000000002', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '30 days'),
  
  -- Sales gets Sales Copilot and Claude
  ('22222222-bbbb-4000-8000-000000000005', '11111111-aaaa-4000-8000-000000000003', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '22 days'),
  ('22222222-bbbb-4000-8000-000000000007', '11111111-aaaa-4000-8000-000000000003', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '18 days'),
  
  -- Executive gets all premium models
  ('22222222-bbbb-4000-8000-000000000001', '11111111-aaaa-4000-8000-000000000004', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '35 days'),
  ('22222222-bbbb-4000-8000-000000000002', '11111111-aaaa-4000-8000-000000000004', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '30 days'),
  ('22222222-bbbb-4000-8000-000000000004', '11111111-aaaa-4000-8000-000000000004', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '28 days'),
  ('22222222-bbbb-4000-8000-000000000005', '11111111-aaaa-4000-8000-000000000004', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '25 days'),
  
  -- Support gets Support Agent
  ('22222222-bbbb-4000-8000-000000000003', '11111111-aaaa-4000-8000-000000000005', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '28 days'),
  ('22222222-bbbb-4000-8000-000000000009', '11111111-aaaa-4000-8000-000000000005', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '12 days'),
  
  -- Legal gets Legal Reviewer and Claude
  ('22222222-bbbb-4000-8000-000000000004', '11111111-aaaa-4000-8000-000000000006', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '22 days'),
  ('22222222-bbbb-4000-8000-000000000008', '11111111-aaaa-4000-8000-000000000006', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '15 days')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SECTION 7: USER-GROUP MAPPINGS
-- ============================================================================

INSERT INTO group_map (user_id, group_id, org_id, created_at) VALUES
  -- Engineering team
  ('a1b2c3d4-e5f6-4789-abcd-111111111111', '11111111-aaaa-4000-8000-000000000001', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '40 days'),
  ('a1b2c3d4-e5f6-4789-abcd-222222222222', '11111111-aaaa-4000-8000-000000000001', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '38 days'),
  ('a1b2c3d4-e5f6-4789-abcd-444444444444', '11111111-aaaa-4000-8000-000000000001', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '28 days'),
  
  -- Marketing team  
  ('a1b2c3d4-e5f6-4789-abcd-333333333333', '11111111-aaaa-4000-8000-000000000002', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '32 days'),
  ('a1b2c3d4-e5f6-4789-abcd-777777777777', '11111111-aaaa-4000-8000-000000000002', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '10 days'),
  
  -- Sales team
  ('a1b2c3d4-e5f6-4789-abcd-555555555555', '11111111-aaaa-4000-8000-000000000003', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '21 days'),
  ('a1b2c3d4-e5f6-4789-abcd-888888888888', '11111111-aaaa-4000-8000-000000000003', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '7 days'),
  ('a1b2c3d4-e5f6-4789-abcd-aaaaaaaaaaaa', '11111111-aaaa-4000-8000-000000000003', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '3 days'),
  
  -- Executive team
  ('a1b2c3d4-e5f6-4789-abcd-666666666666', '11111111-aaaa-4000-8000-000000000004', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '14 days'),
  
  -- Support team
  ('a1b2c3d4-e5f6-4789-abcd-999999999999', '11111111-aaaa-4000-8000-000000000005', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '5 days'),
  ('a1b2c3d4-e5f6-4789-abcd-bbbbbbbbbbbb', '11111111-aaaa-4000-8000-000000000005', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '2 days'),
  
  -- Legal team
  ('a1b2c3d4-e5f6-4789-abcd-cccccccccccc', '11111111-aaaa-4000-8000-000000000006', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SECTION 8: PENDING INVITES
-- ============================================================================

INSERT INTO invites (org_id, invitee, inviter, group_id, message, created_at) VALUES
  ('32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'alex.wong@acmecorp.com', 'admin@acmecorp.com', '11111111-aaaa-4000-8000-000000000001', 'Welcome to the Engineering team!', NOW() - INTERVAL '2 days'),
  ('32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'jessica.smith@acmecorp.com', 'admin@acmecorp.com', '11111111-aaaa-4000-8000-000000000002', 'Join our Marketing team', NOW() - INTERVAL '1 day'),
  ('32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'kevin.jones@acmecorp.com', 'admin@acmecorp.com', '11111111-aaaa-4000-8000-000000000003', NULL, NOW() - INTERVAL '12 hours')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SECTION 9: CONVERSATIONS WITH MESSAGES
-- ============================================================================

-- Create conversations spread over time for good analytics
INSERT INTO conversations (id, "user", model, org_id, title, created_at) VALUES
  -- Recent conversations (last 7 days)
  ('33333333-cccc-4000-8000-000000000001'::uuid, 'a1b2c3d4-e5f6-4789-abcd-111111111111', '22222222-bbbb-4000-8000-000000000001', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'Refactoring the authentication module', NOW() - INTERVAL '6 hours'),
  ('33333333-cccc-4000-8000-000000000002'::uuid, 'a1b2c3d4-e5f6-4789-abcd-222222222222', '22222222-bbbb-4000-8000-000000000006', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'Code review for API endpoints', NOW() - INTERVAL '1 day'),
  ('33333333-cccc-4000-8000-000000000003'::uuid, 'a1b2c3d4-e5f6-4789-abcd-333333333333', '22222222-bbbb-4000-8000-000000000002', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'Q1 Marketing campaign ideas', NOW() - INTERVAL '2 days'),
  ('33333333-cccc-4000-8000-000000000004'::uuid, 'a1b2c3d4-e5f6-4789-abcd-555555555555', '22222222-bbbb-4000-8000-000000000007', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'Enterprise proposal draft', NOW() - INTERVAL '3 days'),
  ('33333333-cccc-4000-8000-000000000005'::uuid, 'a1b2c3d4-e5f6-4789-abcd-666666666666', '22222222-bbbb-4000-8000-000000000004', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'Strategic planning analysis', NOW() - INTERVAL '4 days'),
  ('33333333-cccc-4000-8000-000000000006'::uuid, 'a1b2c3d4-e5f6-4789-abcd-999999999999', '22222222-bbbb-4000-8000-000000000009', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'Customer ticket resolution', NOW() - INTERVAL '5 days'),
  
  -- Older conversations (for trend data)
  ('33333333-cccc-4000-8000-000000000007'::uuid, 'a1b2c3d4-e5f6-4789-abcd-111111111111', '22222222-bbbb-4000-8000-000000000001', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'Database optimization queries', NOW() - INTERVAL '10 days'),
  ('33333333-cccc-4000-8000-000000000008'::uuid, 'a1b2c3d4-e5f6-4789-abcd-444444444444', '22222222-bbbb-4000-8000-000000000001', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'Microservices architecture design', NOW() - INTERVAL '12 days'),
  ('33333333-cccc-4000-8000-000000000009'::uuid, 'a1b2c3d4-e5f6-4789-abcd-333333333333', '22222222-bbbb-4000-8000-000000000003', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'Blog post drafts', NOW() - INTERVAL '15 days'),
  ('33333333-cccc-4000-8000-000000000010'::uuid, 'a1b2c3d4-e5f6-4789-abcd-555555555555', '22222222-bbbb-4000-8000-000000000005', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'Client presentation outline', NOW() - INTERVAL '18 days'),
  ('33333333-cccc-4000-8000-000000000011'::uuid, 'a1b2c3d4-e5f6-4789-abcd-cccccccccccc', '22222222-bbbb-4000-8000-000000000008', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'Contract clause analysis', NOW() - INTERVAL '20 days'),
  ('33333333-cccc-4000-8000-000000000012'::uuid, 'a1b2c3d4-e5f6-4789-abcd-222222222222', '22222222-bbbb-4000-8000-000000000006', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'API documentation review', NOW() - INTERVAL '22 days'),
  
  -- More historical data for 30-day trend
  ('33333333-cccc-4000-8000-000000000013'::uuid, 'a1b2c3d4-e5f6-4789-abcd-111111111111', '22222222-bbbb-4000-8000-000000000002', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'Feature planning session', NOW() - INTERVAL '25 days'),
  ('33333333-cccc-4000-8000-000000000014'::uuid, 'a1b2c3d4-e5f6-4789-abcd-666666666666', '22222222-bbbb-4000-8000-000000000001', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'Quarterly review prep', NOW() - INTERVAL '28 days'),
  ('33333333-cccc-4000-8000-000000000015'::uuid, 'a1b2c3d4-e5f6-4789-abcd-777777777777', '22222222-bbbb-4000-8000-000000000002', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'Social media strategy', NOW() - INTERVAL '30 days'),
  ('33333333-cccc-4000-8000-000000000016'::uuid, 'a1b2c3d4-e5f6-4789-abcd-888888888888', '22222222-bbbb-4000-8000-000000000005', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'Competitor analysis', NOW() - INTERVAL '32 days'),
  ('33333333-cccc-4000-8000-000000000017'::uuid, 'a1b2c3d4-e5f6-4789-abcd-aaaaaaaaaaaa', '22222222-bbbb-4000-8000-000000000007', '32cb139d-1c08-4a28-a9ad-01a1e21d58d9', 'Pricing proposal', NOW() - INTERVAL '35 days')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

-- ============================================================================
-- SECTION 10: MESSAGES
-- ============================================================================

INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES
  -- Conversation 1: Refactoring auth module
  ('44444444-dddd-4000-8000-000000000001'::uuid, '33333333-cccc-4000-8000-000000000001', 'user', 'I need help refactoring our authentication module. The current implementation uses session-based auth but we want to migrate to JWT. What''s the best approach?', NOW() - INTERVAL '6 hours'),
  ('44444444-dddd-4000-8000-000000000002'::uuid, '33333333-cccc-4000-8000-000000000001', 'assistant', 'Great question! Migrating from session-based auth to JWT requires careful planning. Here''s a recommended approach:\n\n1. **Parallel Implementation**: Keep the existing session auth working while building the JWT layer\n2. **Token Structure**: Design your JWT payload to include essential claims (sub, iat, exp, roles)\n3. **Refresh Token Strategy**: Implement refresh tokens for better security\n4. **Gradual Migration**: Use feature flags to switch users over incrementally\n\nWould you like me to provide specific code examples for any of these steps?', NOW() - INTERVAL '6 hours' + INTERVAL '30 seconds'),
  ('44444444-dddd-4000-8000-000000000003'::uuid, '33333333-cccc-4000-8000-000000000001', 'user', 'Yes, can you show me the token structure and refresh token implementation?', NOW() - INTERVAL '5 hours' + INTERVAL '45 minutes'),
  ('44444444-dddd-4000-8000-000000000004'::uuid, '33333333-cccc-4000-8000-000000000001', 'assistant', 'Here''s a robust JWT implementation:\n\n```typescript\ninterface JWTPayload {\n  sub: string;        // User ID\n  email: string;\n  roles: string[];\n  org_id: string;\n  iat: number;        // Issued at\n  exp: number;        // Expiration\n}\n\n// Access token: short-lived (15 min)\nconst accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: ''15m'' });\n\n// Refresh token: long-lived (7 days), stored in httpOnly cookie\nconst refreshToken = jwt.sign({ sub: userId }, REFRESH_SECRET, { expiresIn: ''7d'' });\n```\n\nFor the refresh flow, store refresh tokens in a database table so you can revoke them if needed. Want me to show the full refresh endpoint implementation?', NOW() - INTERVAL '5 hours' + INTERVAL '46 minutes'),

  -- Conversation 2: Code review
  ('44444444-dddd-4000-8000-000000000005'::uuid, '33333333-cccc-4000-8000-000000000002', 'user', 'Can you review this API endpoint for potential issues?\n\n```javascript\napp.post("/api/users", async (req, res) => {\n  const user = await db.users.create(req.body);\n  res.json(user);\n});\n```', NOW() - INTERVAL '1 day'),
  ('44444444-dddd-4000-8000-000000000006'::uuid, '33333333-cccc-4000-8000-000000000002', 'assistant', 'I found several security and reliability issues:\n\n**Critical Issues:**\n1. **No input validation** - Directly using req.body is dangerous\n2. **No authentication check** - Anyone can create users\n3. **No error handling** - Will crash on DB errors\n\n**Recommended fix:**\n```javascript\napp.post("/api/users", authenticate, async (req, res) => {\n  try {\n    const validated = userSchema.parse(req.body);\n    const user = await db.users.create(validated);\n    res.status(201).json(sanitize(user));\n  } catch (error) {\n    handleError(res, error);\n  }\n});\n```\n\nWould you like me to elaborate on any of these improvements?', NOW() - INTERVAL '1 day' + INTERVAL '1 minute'),

  -- Conversation 3: Marketing campaign
  ('44444444-dddd-4000-8000-000000000007'::uuid, '33333333-cccc-4000-8000-000000000003', 'user', 'We need creative ideas for our Q1 marketing campaign. Our target audience is enterprise tech companies. Budget is $50k.', NOW() - INTERVAL '2 days'),
  ('44444444-dddd-4000-8000-000000000008'::uuid, '33333333-cccc-4000-8000-000000000003', 'assistant', 'Here are 5 high-impact campaign ideas for enterprise tech:\n\n**1. Thought Leadership Series** ($15k)\n- Partner with industry analysts for webinar series\n- Gate content for lead generation\n\n**2. Interactive ROI Calculator** ($10k)\n- Custom tool showing potential savings\n- Great for bottom-funnel conversion\n\n**3. Customer Success Stories** ($8k)\n- Video testimonials from 3-5 key customers\n- Repurpose across channels\n\n**4. LinkedIn Account-Based Marketing** ($12k)\n- Target decision-makers at top 100 accounts\n- Personalized ad creative by industry\n\n**5. Developer Community Event** ($5k)\n- Sponsor relevant meetups/hackathons\n- Build grassroots awareness\n\nWhich of these aligns best with your Q1 goals?', NOW() - INTERVAL '2 days' + INTERVAL '2 minutes'),

  -- Conversation 4: Sales proposal
  ('44444444-dddd-4000-8000-000000000009'::uuid, '33333333-cccc-4000-8000-000000000004', 'user', 'Help me draft a proposal for Globex Corp. They''re a Fortune 500 looking to deploy AI across 5,000 employees.', NOW() - INTERVAL '3 days'),
  ('44444444-dddd-4000-8000-000000000010'::uuid, '33333333-cccc-4000-8000-000000000004', 'assistant', 'Here''s an executive summary for the Globex proposal:\n\n---\n\n# AgentFlow Enterprise Proposal for Globex Corporation\n\n## Executive Summary\n\nGlobex Corporation seeks to empower 5,000 employees with AI-driven productivity tools while maintaining enterprise security and compliance standards.\n\n## Proposed Solution\n\n- **Unified AI Platform**: Single dashboard for all AI deployments\n- **Department-Specific Agents**: Custom AI for Sales, Legal, Engineering\n- **SSO Integration**: Seamless auth with existing Okta setup\n- **Data Isolation**: Complete tenant separation per department\n\n## Pricing\n\n| Tier | Users | Price/User/Month |\n|------|-------|------------------|\n| Enterprise | 5,000 | $15 |\n\n**Total Annual Investment**: $900,000\n\n## ROI Projection\n\n- 2-3 hours saved per employee per week\n- Estimated annual productivity gain: $4.2M\n\nWant me to expand any section?', NOW() - INTERVAL '3 days' + INTERVAL '3 minutes')
ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content;

-- ============================================================================
-- SECTION 11: MESSAGE FEEDBACK
-- ============================================================================

INSERT INTO message_feedback (id, message_id, conversation_id, model_id, user_id, positive, comment, created_at) VALUES
  ('55555555-eeee-4000-8000-000000000001'::uuid, '44444444-dddd-4000-8000-000000000002', '33333333-cccc-4000-8000-000000000001', '22222222-bbbb-4000-8000-000000000001', 'a1b2c3d4-e5f6-4789-abcd-111111111111', true, 'Very helpful migration strategy!', NOW() - INTERVAL '5 hours'),
  ('55555555-eeee-4000-8000-000000000002'::uuid, '44444444-dddd-4000-8000-000000000004', '33333333-cccc-4000-8000-000000000001', '22222222-bbbb-4000-8000-000000000001', 'a1b2c3d4-e5f6-4789-abcd-111111111111', true, 'Exactly what I needed', NOW() - INTERVAL '4 hours'),
  ('55555555-eeee-4000-8000-000000000003'::uuid, '44444444-dddd-4000-8000-000000000006', '33333333-cccc-4000-8000-000000000002', '22222222-bbbb-4000-8000-000000000006', 'a1b2c3d4-e5f6-4789-abcd-222222222222', true, 'Caught issues I missed!', NOW() - INTERVAL '23 hours'),
  ('55555555-eeee-4000-8000-000000000004'::uuid, '44444444-dddd-4000-8000-000000000008', '33333333-cccc-4000-8000-000000000003', '22222222-bbbb-4000-8000-000000000002', 'a1b2c3d4-e5f6-4789-abcd-333333333333', true, 'Great campaign ideas', NOW() - INTERVAL '2 days'),
  ('55555555-eeee-4000-8000-000000000005'::uuid, '44444444-dddd-4000-8000-000000000010', '33333333-cccc-4000-8000-000000000004', '22222222-bbbb-4000-8000-000000000007', 'a1b2c3d4-e5f6-4789-abcd-555555555555', true, 'Perfect proposal template', NOW() - INTERVAL '2 days' + INTERVAL '30 minutes'),
  -- Some negative feedback for realistic data
  ('55555555-eeee-4000-8000-000000000006'::uuid, '44444444-dddd-4000-8000-000000000008', '33333333-cccc-4000-8000-000000000003', '22222222-bbbb-4000-8000-000000000002', 'a1b2c3d4-e5f6-4789-abcd-777777777777', false, 'Budget allocation could be better', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO UPDATE SET positive = EXCLUDED.positive;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify data counts
SELECT 'profiles' as table_name, COUNT(*) as count FROM profiles WHERE id::text LIKE 'a1b2c3d4-e5f6-4789-abcd-%'
UNION ALL
SELECT 'org_map', COUNT(*) FROM org_map WHERE org_id = '32cb139d-1c08-4a28-a9ad-01a1e21d58d9'
UNION ALL
SELECT 'groups', COUNT(*) FROM groups WHERE org_id = '32cb139d-1c08-4a28-a9ad-01a1e21d58d9'
UNION ALL
SELECT 'models', COUNT(*) FROM models WHERE org_id = '32cb139d-1c08-4a28-a9ad-01a1e21d58d9'
UNION ALL
SELECT 'model_map', COUNT(*) FROM model_map WHERE org_id = '32cb139d-1c08-4a28-a9ad-01a1e21d58d9'
UNION ALL
SELECT 'group_map', COUNT(*) FROM group_map WHERE org_id = '32cb139d-1c08-4a28-a9ad-01a1e21d58d9'
UNION ALL
SELECT 'invites', COUNT(*) FROM invites WHERE org_id = '32cb139d-1c08-4a28-a9ad-01a1e21d58d9'
UNION ALL
SELECT 'conversations', COUNT(*) FROM conversations WHERE org_id = '32cb139d-1c08-4a28-a9ad-01a1e21d58d9'
UNION ALL
SELECT 'messages', COUNT(*) FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE org_id = '32cb139d-1c08-4a28-a9ad-01a1e21d58d9')
UNION ALL
SELECT 'message_feedback', COUNT(*) FROM message_feedback WHERE conversation_id IN (SELECT id FROM conversations WHERE org_id = '32cb139d-1c08-4a28-a9ad-01a1e21d58d9');
