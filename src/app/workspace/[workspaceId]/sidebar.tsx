import { UserButton } from "@/features/auth/components/user-button";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { SidebarButton } from "./sidebar-button";
import { BellIcon, Home, MessagesSquare, MoreHorizontal } from "lucide-react";
import { usePathname } from "next/navigation";

export const Sidebar = () => {
    const pathname = usePathname();
    const workspaceId = pathname.split("/")[2]; // Extract workspaceId from pathname
    
    return (
        <aside className="w-[70px] h-full bg-[rgb(0,204,153)] flex flex-col gap-y-4 items-center pt-9px pb-4">
            <WorkspaceSwitcher />
            <SidebarButton 
                icon={Home} 
                label="Home" 
                isActive={pathname.includes("/workspace") && !pathname.includes("/dm")} 
                href={`/workspace/${workspaceId}`}
            />
            <SidebarButton 
                icon={MessagesSquare} 
                label="DMs" 
                isActive={pathname.includes("/dm")}
                href={`/workspace/${workspaceId}/dm`}
            />
            <SidebarButton icon={BellIcon} label="Activity" isActive={false} />
            <SidebarButton icon={MoreHorizontal} label="More" isActive={false} />
            <div className="flex flex-col items-center justify-center gap-y-1 mt-auto">
                <UserButton />
            </div>
        </aside>
    );
};