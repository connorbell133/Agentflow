'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgs } from '@/hooks/organization/use-organizations';
import { Profile, Organization } from '@/lib/supabase/types';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Pencil } from 'lucide-react';
import ProfileModal from '@/components/shared/modals/ProfileModal';
/** Example Org interface — adjust as needed. */

interface OrgSettingsProps {
  user: Profile;
  org: Organization;
  // deleteOrg: (org_id: string) => void;
  refreshOrgs?: () => void; // e.g. for refetching or side effects after update
}

const OrgSettings: React.FC<OrgSettingsProps> = ({ user, org, refreshOrgs }) => {
  // Local state for org name
  const [orgName, setOrgName] = useState<string>(org.name ?? '');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { updateOrg } = useOrgs(user);
  const router = useRouter();
  // Example update handler (replace with real update logic)
  const handleUpdateOrg = async () => {
    // e.g., call your API to update org fields
    // await updateOrg({ id: org.id, name: orgName, ... });

    await updateOrg(orgName, org);

    refreshOrgs && refreshOrgs();

    alert('Organization updated');
  };

  return (
    <>
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">{orgName || 'Organization Settings'}</CardTitle>
          <CardDescription>Org ID: {org.id}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input id="org-name" value={orgName} onChange={e => setOrgName(e.target.value)} />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button onClick={handleUpdateOrg} variant="default">
            Update Org
          </Button>
        </CardFooter>
      </Card>

      <ProfileModal
        user={user}
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          router.refresh();
        }}
      />
    </>
  );
};

export default OrgSettings;
