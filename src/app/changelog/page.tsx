import fs from 'fs';
import path from 'path';
import { ChangelogViewer } from '@/components/features/changelog/ChangelogViewer';
import { auth } from '@/lib/auth/server';
import { getUserProfile } from '@/actions/auth/users';
import { Profile } from '@/lib/supabase/types';

export default async function ChangelogPage() {
  const changelogPath = path.join(process.cwd(), 'CHANGELOG');
  let content = '';

  try {
    content = fs.readFileSync(changelogPath, 'utf8');
  } catch (error) {
    console.error('Error reading CHANGELOG file:', error);
    content = '# Changelog\n\nUnable to load changelog at this time.';
  }

  const { userId } = await auth();
  let userProfile: Profile | null = null;

  if (userId) {
    const profiles = await getUserProfile(userId);
    if (profiles && profiles.length > 0) {
      userProfile = profiles[0] as Profile;
    }
  }

  return <ChangelogViewer content={content} user={userProfile} />;
}
