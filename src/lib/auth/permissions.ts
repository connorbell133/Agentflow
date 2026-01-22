import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Profile, Group, GroupMap } from '@/lib/supabase/types';

export async function isUserAdmin(userId: string, org_id: string): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient();
    const userGroups = await supabase
      .from('group_map')
      .select('role')
      .eq('user_id', userId)
      .eq('org_id', org_id);

    if (userGroups.error) {
      console.error('Error checking admin permissions:', userGroups.error);
      return false;
    }

    return userGroups.data?.some((g: any) => g.role === 'admin' || g.role === 'owner');
  } catch (error) {
    console.error('Error checking admin permissions:', error);
    return false;
  }
}

export async function requireAdmin(userId: string | null, org_id: string | null) {
  if (!userId || !org_id) {
    throw new Error('Unauthorized: No user or organization');
  }

  const isAdmin = await isUserAdmin(userId, org_id);
  if (!isAdmin) {
    throw new Error('Forbidden: Admin access required');
  }

  return true;
}