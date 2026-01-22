import fs from 'fs';
import path from 'path';
import { ChangelogViewer } from '@/components/features/changelog/ChangelogViewer';
import { currentUser } from '@clerk/nextjs/server';
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

    const clerkUser = await currentUser();
    let userProfile: Profile | null = null;

    if (clerkUser) {
        const profiles = await getUserProfile(clerkUser.id);
        if (profiles && profiles.length > 0) {
            userProfile = profiles[0] as Profile;
        }
    }

    return <ChangelogViewer content={content} user={userProfile} />;
}

