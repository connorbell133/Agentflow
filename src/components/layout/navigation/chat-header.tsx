
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { DarkModeToggle } from "@/components/shared/theme/DarkModeToggle"
import { NamePopup } from "@/components/shared/menus/UserMenu"
import { Profile } from "@/lib/supabase/types"

interface SiteHeaderProps {
    org_name: string;
    user: Profile;
}

export function SiteHeader({ org_name, user }: SiteHeaderProps) {
    return (
        <header className="flex h-[var(--header-height)] shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[var(--header-height)]">
            <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
                <SidebarTrigger className="-ml-1" />
                <Separator
                    orientation="vertical"
                    className="mx-2 data-[orientation=vertical]:h-4"
                />
                <h1 className="text-base font-medium">{org_name} Dashboard</h1>
                <div className="ml-auto flex items-center gap-2">
                    <div className="flex items-center gap-4">
                        <DarkModeToggle />
                        <NamePopup user={user} isOpen={true} location={"top"} />
                    </div>

                </div>
            </div>
        </header>
    )
}
