"use client";
import Image from "next/image";
import default_icon from "@/assets/images/avatars/default_user.png";
import { Profile } from "@/lib/supabase/types"
import { useState, useEffect, useRef } from "react";
import { SignOutButton, useUser as useClerkUser } from '@clerk/nextjs';
import ProfileModal from "@/components/shared/modals/ProfileModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useSubscription } from '@clerk/nextjs/experimental'

import { Settings, Globe, HelpCircle, ArrowUpCircle, Info, LogOut, ChevronRight, LayoutDashboard, MessageSquare } from "lucide-react";
import { isUserOrgOwner } from "@/actions/organization/organizations";
import { usePathname, useRouter } from "next/navigation";

interface NamePopupProps {
  user: Profile;
  isOpen: boolean;
  location?: string;
}

// Render counter for debugging
let userMenuRenderCount = 0;

// NamePopup component
export const NamePopup: React.FC<NamePopupProps> = ({
  user,
  isOpen,
  location,
}) => {
  userMenuRenderCount++;
  console.log(`[UserMenu] Render #${userMenuRenderCount}`);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  // TEMPORARILY DISABLED to debug excessive RSC requests
  // const { data: subscription, isLoading, error } = useSubscription()
  const subscriptionPlan = "Free";
  const isLoading = false;
  const error = null;
  console.log(`[UserMenu] useSubscription DISABLED for debugging`);
  const [isOwner, setIsOwner] = useState(false);
  const { user: clerkUser } = useClerkUser();
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

  const menuItems = [
    {
      name: "Settings",
      icon: <Settings className="h-4 w-4" />,
      shortcut: "⌘,",
      showArrow: false,
      onClick: () => {
        setIsProfileModalOpen(true);
        setDropdownOpen(false);
      },
    },
    {
      name: "Documentation",
      icon: <HelpCircle className="h-4 w-4" />,
      showArrow: false,
      href: "https://docs.agentflow.live",
      onClick: () => {
        window.open("https://docs.agentflow.live", "_blank");
        setDropdownOpen(false);
      },
    },
    {
      name: "Changelog",
      icon: <Info className="h-4 w-4" />,
      showArrow: false,
      href: "/changelog",
      onClick: () => {
        window.location.href = "/changelog";
        setDropdownOpen(false);
      },
    },
  ];


  // Add "Back to Chat" if on admin page, or "Admin" if user is owner and not on admin page
  if (isOnAdminPage) {
    menuItems.push({
      name: "Back to Chat",
      icon: <MessageSquare className="h-4 w-4" />,
      showArrow: false,
      href: "/",
      onClick: () => {
        window.location.href = "/";
        setDropdownOpen(false);
      },
    });
  }
  menuItems.push({
    name: "Organization Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
    showArrow: false,
    href: "/admin",
    onClick: () => {
      window.location.href = "/admin";
      setDropdownOpen(false);
    },
  });

  const secondaryItems = [
    {
      name: "Upgrade plan",
      icon: <ArrowUpCircle className="h-4 w-4" />,
      showArrow: false,
      onClick: () => {
        setIsProfileModalOpen(true);
        setDropdownOpen(false);
      },
    }
  ];

  if (!isOpen || !user) {
    return null;
  }

  const fullName = user.full_name || user.email;

  // Use Clerk's avatar image
  const avatarUrl = clerkUser?.imageUrl || user.avatar_url || default_icon;

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full outline-none">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Image
              src={avatarUrl}
              className="h-8 w-8 rounded-full flex-shrink-0"
              width={32}
              height={32}
              alt="Avatar"
              data-testid="avatar"
            />
            <div className="flex flex-col items-start min-w-0 flex-1">
              <span className="text-sm font-medium truncate w-full text-left">
                {fullName}
              </span>
              <span className="text-xs text-sidebar-foreground/50 truncate w-full text-left">
                {subscriptionPlan}
              </span>
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="top"
          className="w-64 bg-popover border border-border p-2"
          sideOffset={8}
        >
          {/* Main menu items */}
          {menuItems.map((item) => (
            <DropdownMenuItem
              key={item.name}
              onClick={item.onClick}
              className="flex items-center justify-between px-2 py-2 cursor-pointer rounded-md"
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span>{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.shortcut && (
                  <span className="text-xs text-muted-foreground">{item.shortcut}</span>
                )}
                {item.showArrow && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator className="my-2" />

          {/* Secondary menu items */}
          {secondaryItems.map((item) => (
            <DropdownMenuItem
              key={item.name}
              onClick={item.onClick}
              className="flex items-center justify-between px-2 py-2 cursor-pointer rounded-md"
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span>{item.name}</span>
              </div>
              {item.showArrow && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator className="my-2" />

          {/* Logout button */}
          <SignOutButton redirectUrl="/sign-in">
            <DropdownMenuItem className="flex items-center gap-3 px-2 py-2 cursor-pointer rounded-md">
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </SignOutButton>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileModal
        user={user}
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          if (isOnAdminPage) {
            router.refresh();
          }
        }}
      />
    </>
  );
};
