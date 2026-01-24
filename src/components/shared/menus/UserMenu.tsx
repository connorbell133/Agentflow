'use client';
import Image from 'next/image';
import default_icon from '@/assets/images/avatars/default_user.png';
import { Profile } from '@/lib/supabase/types';
import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from '@/lib/auth/client-helpers';
import ProfileModal from '@/components/shared/modals/ProfileModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

import {
  Settings,
  Globe,
  HelpCircle,
  ArrowUpCircle,
  Info,
  LogOut,
  ChevronRight,
  LayoutDashboard,
  MessageSquare,
} from 'lucide-react';
import { isUserOrgOwner } from '@/actions/organization/organizations';
import { usePathname, useRouter } from 'next/navigation';

interface NamePopupProps {
  user: Profile;
  isOpen: boolean;
  location?: string;
}

// Render counter for debugging
let userMenuRenderCount = 0;

// NamePopup component
export const NamePopup: React.FC<NamePopupProps> = ({ user, isOpen, location }) => {
  userMenuRenderCount++;
  console.log(`[UserMenu] Render #${userMenuRenderCount}`);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  // Subscription plan (can be implemented with custom subscription logic later)
  const subscriptionPlan = 'Local';
  const isLoading = false;
  const error = null;
  const [isOwner, setIsOwner] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const isOnAdminPage = pathname?.startsWith('/admin') || pathname?.startsWith('/changelog');

  // Check if user is an owner of any organization
  useEffect(() => {
    async function checkOwnerStatus() {
      if (user?.id) {
        const ownerStatus = await isUserOrgOwner(user.id);
        setIsOwner(ownerStatus);
      }
    }
    checkOwnerStatus();
  }, [user?.id]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/sign-in');
  };

  const menuItems = [
    {
      name: 'Settings',
      icon: <Settings className="h-4 w-4" />,
      shortcut: '⌘,',
      showArrow: false,
      onClick: () => {
        setIsProfileModalOpen(true);
        setDropdownOpen(false);
      },
    },
    {
      name: 'Documentation',
      icon: <HelpCircle className="h-4 w-4" />,
      showArrow: false,
      href: 'https://docs.agentflow.live',
      onClick: () => {
        window.open('https://docs.agentflow.live', '_blank');
        setDropdownOpen(false);
      },
    },
    {
      name: 'Changelog',
      icon: <Info className="h-4 w-4" />,
      showArrow: false,
      href: '/changelog',
      onClick: () => {
        window.location.href = '/changelog';
        setDropdownOpen(false);
      },
    },
  ];

  // Add "Back to Chat" if on admin page, or "Admin" if user is owner and not on admin page
  if (isOnAdminPage) {
    menuItems.push({
      name: 'Back to Chat',
      icon: <MessageSquare className="h-4 w-4" />,
      showArrow: false,
      href: '/flow',
      onClick: () => {
        router.push('/flow');
        setDropdownOpen(false);
      },
    } as any);
  } else if (isOwner) {
    menuItems.push({
      name: 'Admin',
      icon: <LayoutDashboard className="h-4 w-4" />,
      showArrow: false,
      href: '/admin',
      onClick: () => {
        router.push('/admin');
        setDropdownOpen(false);
      },
    } as any);
  }

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="User menu"
          >
            <Image
              src={user?.avatar_url || default_icon}
              alt="User avatar"
              width={32}
              height={32}
              className="rounded-full"
              data-testid="avatar"
            />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {user?.full_name || 'User'}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-sm font-semibold">{user?.full_name}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
            {subscriptionPlan && (
              <p className="mt-1 text-xs text-gray-400">Plan: {subscriptionPlan}</p>
            )}
          </div>
          <DropdownMenuSeparator />
          {menuItems.map((item, index) => (
            <DropdownMenuItem key={index} onClick={item.onClick} className="cursor-pointer">
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span>{item.name}</span>
                </div>
                {item.shortcut && <span className="text-xs text-gray-400">{item.shortcut}</span>}
                {item.showArrow && <ChevronRight className="h-4 w-4" />}
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
            <div className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
      />
    </>
  );
};

export default NamePopup;
