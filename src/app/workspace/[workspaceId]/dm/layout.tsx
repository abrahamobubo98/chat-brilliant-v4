"use client";

import { Loader } from "lucide-react";
import { useParams } from "next/navigation";
import { Id } from "../../../../../convex/_generated/dataModel";
import { usePresence } from "@/hooks/use-presence";
import { UserButton } from "@/features/auth/components/user-button";
import { SidebarButton } from "../sidebar-button";
import { WorkspaceSwitcher } from "../workspace-switcher";
import { BellIcon, Home, MessagesSquare, MoreHorizontal } from "lucide-react";
import { Toolbar } from "../toolbar";

interface DmLayoutProps {
  children: React.ReactNode;
}

const DmLayout = ({ children }: DmLayoutProps) => {
  const params = useParams();
  const workspaceId = params.workspaceId as Id<"workspaces">;
  
  // Track user presence
  usePresence(workspaceId);

  return (
    <div className="h-full">
      <Toolbar />
      <div className="flex h-[calc(100vh-40px)]">
        {/* Main sidebar with navigation */}
        <aside className="w-[70px] h-full bg-[rgb(0,204,153)] flex flex-col gap-y-4 items-center pt-9px pb-4">
          <WorkspaceSwitcher />
          <SidebarButton 
            icon={Home} 
            label="Home" 
            isActive={false} 
            href={`/workspace/${workspaceId}`}
          />
          <SidebarButton 
            icon={MessagesSquare} 
            label="DMs" 
            isActive={true}
            href={`/workspace/${workspaceId}/dm`}
          />
          <SidebarButton icon={BellIcon} label="Activity" isActive={false} />
          <SidebarButton icon={MoreHorizontal} label="More" isActive={false} />
          <div className="flex flex-col items-center justify-center gap-y-1 mt-auto">
            <UserButton />
          </div>
        </aside>

        {/* DM content area */}
        <div className="flex-1 h-full overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};

export default DmLayout; 