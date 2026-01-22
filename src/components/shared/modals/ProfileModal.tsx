import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import default_icon from "@/assets/images/avatars/default_user.png";
import { Profile, Organization } from "@/lib/supabase/types"
import { getOrgsForUser, removeUserFromOrg } from "@/actions/organization/organizations";
import { updateUserProfile } from "@/actions/auth/users";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserProfile } from "@clerk/nextjs";

interface ProfileModalProps {
  user: Profile;
  isOpen: boolean;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({
  user,
  isOpen,
  onClose,
}) => {
  // User profile
  const [fullName, setFullName] = useState(user.full_name || "");
  const [email, setEmail] = useState(user.email || "");

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
  const [organizations, setOrganizations] = useState<Array<Organization>>(
    []
  );

  const [selectedOrg, setSelectedOrg] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [confirmOrgName, setConfirmOrgName] = useState("");

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
      console.error("Error saving profile:", error);
    }
  };

  // Delete organization
  const handleDeleteOrg = async () => {
    if (selectedOrg && confirmOrgName === selectedOrg.name) {
      await removeUserFromOrg(user.id, selectedOrg.id);
      setOrganizations((orgs) =>
        orgs.filter((org) => org.id !== selectedOrg.id)
      );
      setShowDeleteConfirm(false);
      setSelectedOrg(null);
      setConfirmOrgName("");
    }
  };

  // Close all modals
  const handleCloseAll = () => {
    setShowDeleteConfirm(false);
    setSelectedOrg(null);
    setConfirmOrgName("");
    onClose();
  };

  // Memoize appearance to prevent unnecessary re-renders
  const userProfileAppearance = useMemo(() => ({
    elements: {
      rootBox: "h-full",
      card: "shadow-none border-0",
    }
  }), []);

  // Only render when open to prevent Clerk's UserProfile from polling when modal is closed
  if (!isOpen) {
    return null;
  }

  // Render
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <div className="relative">
          <UserProfile
            routing="hash"
            appearance={userProfileAppearance}
          />
          <Button
            onClick={onClose}
            className="absolute top-4 right-4 z-50"
            variant="ghost"
            size="icon"
          >
            <span className="sr-only">Close</span>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileModal;
