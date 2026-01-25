-- Inject conversations with smooth growth over last 90 days
-- Creates a realistic, steady adoption curve with no gaps

DO $$
DECLARE
  owner_id UUID := 'd7226cc1-1b0a-4be7-ae70-758a9c5b37e4';
  org_id UUID := '32cb139d-1c08-4a28-a9ad-01a1e21d58d9';
  model_ids UUID[] := ARRAY[
    '22222222-bbbb-4000-8000-000000000001'::uuid,
    '22222222-bbbb-4000-8000-000000000002'::uuid,
    '22222222-bbbb-4000-8000-000000000003'::uuid,
    '22222222-bbbb-4000-8000-000000000004'::uuid,
    '22222222-bbbb-4000-8000-000000000005'::uuid
  ];
  conv_id UUID;
  titles TEXT[] := ARRAY[
    'Refactoring the authentication module',
    'Q1 Marketing campaign strategy',
    'Code review for API endpoints',
    'Enterprise proposal for Globex Corp',
    'Database optimization strategies',
    'React performance optimization',
    'CI/CD pipeline setup',
    'API rate limiting implementation',
    'Microservices architecture design',
    'Customer support ticket analysis',
    'Legal contract review assistance',
    'Strategic planning for Q2',
    'Blog post draft: AI in Enterprise',
    'Competitor analysis request',
    'Onboarding documentation review',
    'Security audit preparation',
    'Feature prioritization for roadmap',
    'Team standup notes analysis',
    'Customer feedback synthesis',
    'Technical debt assessment',
    'New hire onboarding checklist',
    'Quarterly OKR planning',
    'Product launch checklist',
    'Integration with Salesforce',
    'Data migration planning',
    'Performance benchmarking',
    'User research synthesis',
    'API documentation update',
    'Mobile app requirements',
    'Accessibility audit review',
    'Cost optimization analysis',
    'Vendor evaluation matrix',
    'Training materials creation',
    'Release notes drafting',
    'Bug triage assistance',
    'Architecture decision record',
    'Incident postmortem analysis',
    'Capacity planning review',
    'Customer success playbook',
    'Sales enablement content'
  ];
  
  day_offset INT;
  base_count FLOAT;
  convs_for_day INT;
  title_idx INT := 1;
  hour_offset FLOAT;
  created_ts TIMESTAMPTZ;
  model_idx INT;
  i INT;
BEGIN
  -- Loop through each of the last 90 days
  FOR day_offset IN 1..90 LOOP
    -- Smooth growth curve using exponential function
    -- Day 90 ago: ~3 convos, Day 1 (yesterday): ~18 convos
    -- Formula: base = 3 + 15 * ((90 - day_offset) / 89)^1.5
    base_count := 3.0 + 15.0 * POWER(((90.0 - day_offset) / 89.0), 1.3);
    
    -- Add small random variation (+/- 15%)
    convs_for_day := GREATEST(2, ROUND(base_count * (0.85 + random() * 0.30))::INT);
    
    -- Create convs_for_day conversations for this day
    FOR i IN 1..convs_for_day LOOP
      -- Spread throughout the day (8am - 10pm)
      hour_offset := 8 + (random() * 14);
      created_ts := (CURRENT_DATE - (day_offset || ' days')::interval) + (hour_offset || ' hours')::interval;
      
      model_idx := (title_idx % 5) + 1;
      
      INSERT INTO conversations (id, "user", model, org_id, title, created_at)
      VALUES (
        gen_random_uuid(),
        owner_id,
        model_ids[model_idx],
        org_id,
        titles[((title_idx - 1) % 40) + 1],
        created_ts
      )
      RETURNING id INTO conv_id;
      
      -- Add user message
      INSERT INTO messages (conversation_id, role, content, created_at)
      VALUES (
        conv_id,
        'user',
        'Help me with ' || lower(titles[((title_idx - 1) % 40) + 1]),
        created_ts
      );
      
      -- Add assistant response
      INSERT INTO messages (conversation_id, role, content, created_at)
      VALUES (
        conv_id,
        'assistant',
        'I''d be happy to help! Here''s my guidance on this topic.',
        created_ts + interval '30 seconds'
      );
      
      title_idx := title_idx + 1;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Done! Created conversations with smooth 90-day growth curve.';
END $$;

-- Show daily distribution with summary
SELECT 
  DATE_TRUNC('week', created_at)::date as week_start,
  COUNT(*) as conversations,
  ROUND(AVG(daily_count)) as avg_daily
FROM (
  SELECT created_at, COUNT(*) OVER (PARTITION BY created_at::date) as daily_count
  FROM conversations 
  WHERE org_id = '32cb139d-1c08-4a28-a9ad-01a1e21d58d9'
    AND "user" = 'd7226cc1-1b0a-4be7-ae70-758a9c5b37e4'
) sub
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week_start;

-- Total count
SELECT COUNT(*) as total_conversations 
FROM conversations 
WHERE org_id = '32cb139d-1c08-4a28-a9ad-01a1e21d58d9'
  AND "user" = 'd7226cc1-1b0a-4be7-ae70-758a9c5b37e4';
