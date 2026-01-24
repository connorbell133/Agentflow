import { DarkModeToggle } from '@/components/shared/theme/DarkModeToggle';
import { NamePopup } from '@/components/shared/menus/UserMenu';
import { Profile } from '@/lib/supabase/types';

interface AdminHeaderProps {
  org_name: string;
  user: Profile;
}

export function AdminHeader({ org_name, user }: AdminHeaderProps) {
  return (
    <header className="flex h-fit shrink-0 items-center gap-2 border-b">
      <div className="flex w-full items-center gap-2 px-4 lg:px-6">
        <h1
          className="font-[family-name:var(--font-roboto-mono)] text-xl font-bold"
          data-testid="admin-dashboard-heading"
        >
          {org_name} Dashboard
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-4">
            <DarkModeToggle />
            <NamePopup user={user} isOpen={true} location={'top'} />
          </div>
        </div>
      </div>
    </header>
  );
}
