import { createSupabaseTestClient } from './e2e/utils/supabase-test-client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env.test'), override: true });

async function checkAndClean() {
  const supabase = await createSupabaseTestClient();

  console.log('\n📊 Checking database state...\n');

  // Check groups
  const { data: groups, error: groupsError } = await supabase
    .from('groups')
    .select('id, org_id, role, created_at')
    .order('created_at', { ascending: false })
    .limit(30);

  if (groupsError) {
    console.error('Error fetching groups:', groupsError);
  } else {
    console.log(`Found ${groups?.length || 0} groups:`);
    if (groups && groups.length > 0) {
      console.table(
        groups.map(g => ({
          role: g.role,
          org_id: g.org_id.substring(0, 8) + '...',
          created: new Date(g.created_at).toLocaleString(),
        }))
      );
    }
  }

  // Delete test groups
  console.log('\n🧹 Cleaning up test groups...');
  const { data: deletedGroups, error: deleteError } = await supabase
    .from('groups')
    .delete()
    .like('role', 'test-group-%')
    .select('id, role');

  if (deleteError) {
    console.error('Error deleting test groups:', deleteError);
  } else {
    console.log(`✅ Deleted ${deletedGroups?.length || 0} test groups`);
  }

  // Check remaining groups
  const { data: remainingGroups } = await supabase
    .from('groups')
    .select('role')
    .order('created_at', { ascending: false });

  console.log(`\n📊 Remaining groups: ${remainingGroups?.length || 0}`);
  if (remainingGroups && remainingGroups.length > 0) {
    remainingGroups.forEach(g => console.log(`  - ${g.role}`));
  }

  console.log('\n✅ Cleanup complete!\n');
}

checkAndClean().catch(console.error);
