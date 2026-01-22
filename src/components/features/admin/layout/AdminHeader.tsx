import { DarkModeToggle } from "@/components/shared/theme/DarkModeToggle"
import { NamePopup } from "@/components/shared/menus/UserMenu"
import { Profile } from "@/lib/supabase/types"
import { Badge } from "@/components/ui/badge"

interface AdminHeaderProps {
    org_name: string;
    user: Profile;
    subscription?: any;
}

export function AdminHeader({ org_name, user, subscription }: AdminHeaderProps) {
    const subscriptionPlan = subscription?.subscriptionItems?.[0]?.plan?.name || 'Free';
    const isPro = subscriptionPlan === 'Pro';

    return (
        <header className="flex h-fit shrink-0 items-center gap-2 border-b">
            <div className="flex w-full items-center gap-2 px-4 lg:px-6">
                <h1 className="text-xl font-bold font-[family-name:var(--font-roboto-mono)]" data-testid="admin-dashboard-heading">{org_name} Dashboard</h1>
                {subscription && (
                    <Badge
                        variant={isPro ? 'default' : 'secondary'}
                        className="ml-2"
                    >
                        {subscriptionPlan}
                    </Badge>
                )}
                <div className="ml-auto flex items-center gap-2">
                    <div className="flex items-center gap-4">
                        <DarkModeToggle />
                        <NamePopup user={user} isOpen={true} location={"top"} />
                    </div>
                </div>
            </div>
        </header >
    )
}