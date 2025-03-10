"use client"
import { Loader } from "lucide-react";

import { Thread } from "@/features/messages/components/thread";
import { Profile } from "@/features/members/components/profile";

import { 
    ResizablePanelGroup, 
    ResizablePanel, 
    ResizableHandle 
} from "@/components/ui/resizable";
import { usePanel } from "@/hooks/use-panel";
import { usePresence } from "@/hooks/use-presence";
import { useParams, usePathname } from "next/navigation";

import { Sidebar } from "./sidebar";
import { Toolbar } from "./toolbar";
import { WorkspaceSidebar } from "./workspace-sidebar";

import { Id } from "../../../../convex/_generated/dataModel";

interface WorkspaceIdLayoutProps {
    children: React.ReactNode;
};

const WorkspaceIdLayout = ({ children }: WorkspaceIdLayoutProps) => {
    const params = useParams();
    const pathname = usePathname();
    const workspaceId = params.workspaceId as Id<"workspaces">;
    
    // Track user presence
    usePresence(workspaceId);

    // Always call hooks at the top level, regardless of route
    const {parentMessageId, profileMemberId, onClose} = usePanel();
    
    // If this is a DM route, just render the children (which will use the DM layout)
    const isDmRoute = pathname.includes('/dm');
    if (isDmRoute) {
        return <>{children}</>;
    }

    const showPanel = !!parentMessageId || !!profileMemberId;
    return (
        <div className="h-full">
            <Toolbar />
            <div className="flex h-[calc(100vh-40px)]">
                <Sidebar />
                <ResizablePanelGroup 
                direction="horizontal"
                autoSaveId="ab-workspace-layout">
                    <ResizablePanel
                    defaultSize={20}
                    minSize={11}
                    className="bg-[#008060]"
                    >
                        <WorkspaceSidebar />
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel minSize={20} defaultSize={80}>
                        {children}
                    </ResizablePanel>
                    {showPanel && (
                        <>
                        <ResizableHandle withHandle />
                        <ResizablePanel minSize={20} defaultSize={30}>
                            {parentMessageId ? (
                                <Thread 
                                messageId={parentMessageId as Id<"messages">}
                                onClose={onClose}
                                />
                            ) : profileMemberId ? (
                                <Profile
                                memberId={profileMemberId as Id<"members">}
                                onClose={onClose}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <Loader className="size-5 animate-spin text-muted-foreground"/>
                                </div>
                            )}
                        </ResizablePanel>
                        </>
                    )}
                </ResizablePanelGroup>
                
            </div>
            
        </div>
    )
}

export default WorkspaceIdLayout;