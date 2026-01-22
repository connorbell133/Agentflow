import { createClient } from '@supabase/supabase-js';
import { createSeedClient } from '@snaplet/seed';
import { v4 as uuidv4 } from 'uuid';

// Create Supabase admin client for seed operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function createUserModelMapHelper(
  user_group_map: Record<string, { group_ids: string[] }>,
  model_group_map: Record<string, { group_ids: string[] }>
): Array<{ user: string; models: string[] }> {
  // Create user-to-model mappings based on shared groups
  const user_model_map = Object.entries(user_group_map).map(([user_id, user_data]) => {
    // Find all models that share at least one group with this user
    const accessible_models = Object.entries(model_group_map)
      .filter(([model_id, model_data]) => {
        // Check if user and model share any groups
        return user_data.group_ids.some(group_id => model_data.group_ids.includes(group_id));
      })
      .map(([model_id]) => model_id);

    return {
      user: user_id,
      models: accessible_models,
    };
  });
  return user_model_map;
}

async function initiateSeed(seed: any, master_id: string): Promise<void> {
  // get user profile row from db before resetting
  const { data: master_profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', master_id)
    .single();

  if (error || !master_profile) {
    console.error('❌ Master profile not found');
    process.exit(1);
  }

  console.log(`📝 Seeding database for user: ${master_id}`);
  // Reset database to start fresh
  await seed.$resetDatabase();
  // re-insert the master profile
  await seed.profiles(x =>
    x(1, {
      id: master_id,
      email: master_profile.email,
      full_name: master_profile.full_name,
      avatar_url: master_profile.avatar_url,
      signup_complete: master_profile.signup_complete,
      created_at: master_profile.created_at,
      updated_at: master_profile.updated_at,
    })
  );

  console.log(`✅ Re-inserted master profile`);
}

async function createOrganization(seed: any, org_id: string, master_id: string): Promise<void> {
  await seed.organizations(x =>
    x(1, {
      id: org_id,
      name: 'My AI Organization',
      owner: master_id,
      status: 'active',
    })
  );
  console.log(`✅ Created organization`);
  // The organization will be linked to the owner automatically via the owner field
  // But we also need to add the user to the org_map table
  await seed.org_map(x =>
    x(1, {
      user_id: master_id,
      org_id: org_id, // Reference to the organization we just created
    })
  );
  console.log(`✅ Mapped user to organization`);
}

async function createGroups(
  seed: any,
  org_id: string,
  master_id: string,
  admin_group_id: string,
  member_group_id: string,
  guest_group_id: string
): Promise<void> {
  // Create groups for the organization
  await seed.groups(x =>
    x(1, {
      id: admin_group_id,
      role: 'admin',
      description: 'Full administrative access',
      org_id: org_id, // Link to the created organization
    })
  );
  await seed.groups(x =>
    x(1, {
      id: member_group_id,
      role: 'member',
      description: 'Standard member access',
      org_id: org_id, // Link to the created organization
    })
  );
  await seed.groups(x =>
    x(1, {
      id: guest_group_id,
      role: 'guest',
      description: 'Limited guest access',
      org_id: org_id, // Link to the created organization
    })
  );
  console.log(`✅ Created 3 groups`);
}

async function createUsers(
  seed: any,
  org_id: string,
  master_id: string,
  member_group_id: string
): Promise<string[]> {
  const users = [];
  for (let i = 0; i < 10; i++) {
    const user_id = uuidv4();
    await seed.profiles(x =>
      x(1, {
        id: user_id,
        email: `test${i}@test.com`,
        full_name: `Test User ${i}`,
        avatar_url: '',
        signup_complete: true,
        created_at: new Date(),
        updated_at: new Date(),
      })
    );
    users.push(user_id);
  }
  users.push(master_id);
  return users;
}

async function createOrgUsers(
  seed: any,
  org_id: string,
  users: string[],
  group_ids: string[],
  max_groups: number = 2
): Promise<Record<string, { group_ids: string[] }>> {
  var user_group_map: Record<string, { group_ids: string[] }> = {};
  for (const user of users) {
    user_group_map[user] = { group_ids: [] };
    await seed.org_map(x =>
      x(1, {
        user_id: user,
        org_id: org_id,
      })
    );
    for (const group of group_ids) {
      if (user_group_map[user].group_ids.length < max_groups) {
        if (!user_group_map[user].group_ids.includes(group)) {
          user_group_map[user].group_ids.push(group);
        }
      }
    }
  }
  for (const user in user_group_map) {
    for (const group of user_group_map[user].group_ids) {
      await seed.group_map(x =>
        x(1, {
          user_id: user,
          group_id: group,
          org_id: org_id,
        })
      );
    }
  }
  return user_group_map;
}

async function createModels(seed: any, org_id: string, master_id: string): Promise<string[]> {
  const model_data = [
    {
      id: uuidv4(),
      created_at: new Date(),
      model_id: 'agent_your_elevenlabs_agent_id', // Replace with your ElevenLabs agent ID
      schema: 'voice',
      description: 'ElevenLabs Voice Agent',
      nice_name: 'Voice Assistant',
      org_id: org_id,
      endpoint: '',
      method: 'POST',
      response_path: '',
      headers: {},
      body_config: {},
      message_format_config: {
        mapping: {
          role: { source: 'role', target: 'role', transform: 'none' },
          content: { source: 'content', target: 'content', transform: 'none' },
        },
      },
      suggestion_prompts: [],
    },
    {
      id: uuidv4(),
      created_at: new Date(),
      model_id: 'gpt-4-mini',
      schema: 'text',
      description: '',
      nice_name: 'gpt-4-mini',
      org_id: org_id,
      endpoint: 'https://api.openai.com/v1/responses',
      method: 'POST',
      response_path: 'output[0].content[0].text',
      headers: { Authorization: 'Bearer ${OPENAI_API_KEY}' }, // Replace with your OpenAI API key
      body_config: { input: '{{messages}}', model: 'gpt-4.1-mini' },
      message_format_config: {
        preset: 'openai',
        mapping: {
          role: { source: 'role', target: 'role', transform: 'none', roleMapping: [] },
          content: { source: 'content', target: 'content', transform: 'none' },
        },
        attachments: {
          enabled: true,
          mapping: {
            image: {
              field: 'image_data',
              format: 'base64',
              wrapper: 'data:{{mimeType}};base64,{{content}}',
            },
          },
          bodyMapping: {},
          acceptedTypes: '.png,.jpeg,.webp',
        },
        customFields: [],
      },
      suggestion_prompts: ['hi how are you'],
    },
    {
      id: uuidv4(),
      created_at: new Date(),
      model_id: 'zapier-demo',
      schema: 'text',
      description: '',
      nice_name: 'AI Tinkerer',
      org_id: org_id,
      endpoint: 'https://hook.us2.make.com/your_webhook_id', // Replace with your Make.com webhook URL
      method: 'POST',
      response_path: '[1].content[0].text',
      headers: { 'x-make-apikey': 'password123' },
      body_config: { content: '{{messages}}', request: '${content}' },
      message_format_config: {
        preset: 'openai',
        mapping: {
          role: {
            source: 'role',
            target: 'role',
            transform: 'none',
            roleMapping: [{ to: 'agent', from: 'assistant' }],
          },
          content: { source: 'content', target: 'content', transform: 'none' },
        },
      },
      suggestion_prompts: [],
    },
  ];

  for (const model of model_data) {
    await seed.models(x =>
      x(1, {
        id: model.id,
        created_at: model.created_at,
        model_id: model.model_id,
        schema: model.schema,
        description: model.description,
        nice_name: model.nice_name,
        org_id: model.org_id,
        endpoint: model.endpoint as any,
        method: model.method as any,
        response_path: model.response_path as any,
        headers: model.headers as any,
        body_config: model.body_config as any,
        message_format_config: model.message_format_config as any,
        suggestion_prompts: model.suggestion_prompts as any,
      } as any)
    );
  }
  console.log(`✅ Created ${model_data.length} AI models`);
  return model_data.map(model => model.id);
}

async function createModelMap(
  seed: any,
  org_id: string,
  master_id: string,
  model_ids: string[],
  group_ids: string[],
  max_groups: number = 2
): Promise<Record<string, { group_ids: string[] }>> {
  var model_group_map: Record<string, { group_ids: string[] }> = {};
  for (const model_id of model_ids) {
    // Map the model to the groups
    for (const group_id of group_ids) {
      // Initialize the model_group_map if it doesn't exist
      if (!model_group_map[model_id]) {
        model_group_map[model_id] = { group_ids: [] };
      }

      // Add the group to the model_group_map if it doesn't exist and the model has less than the max groups
      if (model_group_map[model_id].group_ids.length < max_groups) {
        if (!model_group_map[model_id].group_ids.includes(group_id)) {
          model_group_map[model_id].group_ids.push(group_id);
        }
      }
    }
  }

  for (const model_id in model_group_map) {
    for (const group_id of model_group_map[model_id].group_ids) {
      await seed.model_map(x =>
        x(1, {
          model_id: model_id,
          group_id: group_id,
          org_id: org_id,
        })
      );
    }
  }
  return model_group_map;
}

async function createConversations(
  seed: any,
  org_id: string,
  user_model_map: Array<{ user: string; models: string[] }>
): Promise<string[]> {
  let totalConversations = 0;

  const conversation_ids = [];
  for (const { user: user_id, models: model_ids } of user_model_map) {
    for (const model_id of model_ids) {
      const conversation_id = uuidv4();
      conversation_ids.push(conversation_id);
      await seed.conversations(x =>
        x(1, {
          id: conversation_id,
          created_at: new Date(),
          user: user_id,
          model: model_id,
          org_id: org_id,
        })
      );
      totalConversations++;
    }
  }
  console.log(`✅ Created ${totalConversations} conversations for ${user_model_map.length} users`);
  return conversation_ids;
}

async function createMessages(seed: any, conversation_ids: string[]): Promise<void> {
  let totalMessages = 0;
  for (const conversation_id of conversation_ids) {
    for (let i = 0; i < 5; i++) {
      const message_id = uuidv4();
      await seed.public_messages(x =>
        x(1, {
          id: message_id,
          created_at: new Date(),
          content: `Message ${i} of conversation ${conversation_id}`,
          conversation_id: conversation_id,
          role: i % 2 === 0 ? 'user' : 'assistant',
        })
      );
      totalMessages++;
    }
  }
  console.log(`✅ Created ${totalMessages} messages for ${conversation_ids.length} conversations`);
}
async function main() {
  // Get user ID from command line argument
  const master_id = process.argv[2];
  const seed = await createSeedClient({ dryRun: false });

  if (process.argv[2] === 'clear') {
    await seed.$resetDatabase();
    process.exit(0);
  }

  const org_id = uuidv4();
  if (!master_id || !org_id) {
    console.error('❌ Please provide your user ID as an argument');
    console.error('Usage: npx tsx seed.ts <your-user-id>');
    console.error('Example: npx tsx seed.ts user_2abc123def456');
    process.exit(1);
  }
  await initiateSeed(seed, master_id);

  await createOrganization(seed, org_id, master_id);

  const admin_group_id = uuidv4();
  const member_group_id = uuidv4();
  const guest_group_id = uuidv4();
  const group_ids = [admin_group_id, member_group_id, guest_group_id];
  await createGroups(seed, org_id, master_id, admin_group_id, member_group_id, guest_group_id);

  const users = await createUsers(seed, org_id, master_id, member_group_id);

  // Map the user to the member group
  const user_group_map = await createOrgUsers(seed, org_id, users, group_ids, 2);
  console.log(`✅ Mapped ${users.length} test users to organization and member group`);

  const model_ids = await createModels(seed, org_id, master_id);
  console.log(`✅ Created ${model_ids.length} AI models`);

  const model_group_map = await createModelMap(seed, org_id, master_id, model_ids, group_ids);
  console.log(`✅ Created ${model_ids.length} model-to-group mappings`);

  // Create user-to-model mappings based on shared groups
  const user_model_map = createUserModelMapHelper(user_group_map, model_group_map);
  console.log(`✅ Created ${user_model_map.length} user-to-model mappings`);
  const conversation_ids = await createConversations(seed, org_id, user_model_map);
  console.log(`✅ Created ${conversation_ids.length} conversations`);
  await createMessages(seed, conversation_ids);

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Error seeding database:', error);
  process.exit(1);
});
