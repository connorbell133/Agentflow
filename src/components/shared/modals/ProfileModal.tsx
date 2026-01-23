import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import default_icon from '@/assets/images/avatars/default_user.png';
import { Profile, Organization } from '@/lib/supabase/types';
import { getOrgsForUser, removeUserFromOrg } from '@/actions/organization/organizations';
import { updateUserProfile } from '@/actions/auth/users';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ProfileModalProps {
  user: Profile;
  isOpen: boolean;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, isOpen, onClose }) => {
  // User profile
  const [fullName, setFullName] = useState(user.full_name || '');
  const [email, setEmail] = useState(user.email || '');

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Organizations
  const [organizations, setOrganizations] = useState<Array<Organization>>([]);

  const [selectedOrg, setSelectedOrg] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [confirmOrgName, setConfirmOrgName] = useState('');

  // Fetch organizations
  useEffect(() => {
    const fetchOrgs = async () => {
      const data = await getOrgsForUser(user.id);
      if (data) {
        setOrganizations(data);
      }
    };
    fetchOrgs();
  }, [user.id]);

  // Save profile
  const handleSave = async () => {
    try {
      await updateUserProfile(user.id, { full_name: fullName, email: email });
      onClose();
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  // Delete organization
  const handleDeleteOrg = async () => {
    if (selectedOrg && confirmOrgName === selectedOrg.name) {
      await removeUserFromOrg(user.id, selectedOrg.id);
      setOrganizations(orgs => orgs.filter(org => org.id !== selectedOrg.id));
      setShowDeleteConfirm(false);
      setSelectedOrg(null);
      setConfirmOrgName('');
    }
  };

  // Close all modals
  const handleCloseAll = () => {
    setShowDeleteConfirm(false);
    setSelectedOrg(null);
    setConfirmOrgName('');
    onClose();
  };

  // Only render when open
  if (!isOpen) {
    return null;
  }

  // Render
  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your full name"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              type="email"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileModal;
