import { useGetMembers } from "@/features/members/api/use-get-members";
import { useGetChannels } from "@/features/channels/api/use-get-channels";
import { useCurrentMember } from "@/features/members/api/use-current-member";
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace";
import { useCreateChannelModal } from "@/features/channels/store/use-create-channel-modal";

import { useMemberId } from "@/hooks/use-member-id";
import { useChannelId } from "@/hooks/use-channel-id";
import { useWorkspaceId } from "@/hooks/use-workspace-id";

import { UserItem } from "./user-item";
import { SidebarItem } from "./sidebar-item";
import { WorkspaceHeader } from "./workspace-header";
import { WorkspaceSection } from "./workspace-section";

import { AlertTriangle } from "lucide-react";
import { HashIcon, Loader2, MessageSquareText, SendHorizontal } from "lucide-react";

export const WorkspaceSidebar = () => {
    const memberId = useMemberId();
    const channelId = useChannelId();
    const workspaceId = useWorkspaceId();

    const [, setOpen] = useCreateChannelModal();
    
    const { data: member, isLoading: memberLoading } = useCurrentMember( { workspaceId } );
    const { data: workspace, isLoading: workspaceLoading } = useGetWorkspace( { id: workspaceId } );
    const { data: channels, isLoading: channelsLoading } = useGetChannels({ workspaceId });
    const { data: members, isLoading: membersLoading } = useGetMembers({ workspaceId });

    if (workspaceLoading || memberLoading || channelsLoading || membersLoading) {
        return <div className="flex flex-col bg-[#008060] h-full items-center justify-center">
            <Loader2 className="size-5 animate-spin text-white" />
        </div>;
    }

    if (!workspace || !member) {
        return <div className="flex flex-col bg-[#008060] h-full items-center justify-center">
            <AlertTriangle className="size-5 text-white" />
        </div>;
    }

    return (
        <div className="flex flex-col bg-[#008060] h-full">
            <WorkspaceHeader workspace={workspace} isAdmin={member.role === "admin"} />
            <div className="flex flex-col px-2 mt-3">
                <SidebarItem 
                label="Threads"
                icon={MessageSquareText}
                id="threads"/>
                <SidebarItem 
                label="Drafts & Sent"
                icon={SendHorizontal}
                id="drafts"
                />
                <WorkspaceSection
                label="Channels"
                hint="New channel"
                onNew={member.role === "admin" ? () => setOpen(true) : undefined}
                >
                    {channels?.map((item) =>(
                        <SidebarItem 
                        key={item._id}
                        icon={HashIcon}
                        label={item.name}
                        id={item._id}
                        variant={channelId === item._id ? "active" : "default"}/>
                    ))}
                </WorkspaceSection>
            </div>
            <WorkspaceSection
                label="Direct Messages"
                hint="New Direct Message"
                onNew={() => {}}
                >
            {members?.map((item) => (
                <UserItem 
                key={item._id}
                id={item._id}
                label={item.user.name}
                image={item.user.image}
                variant={memberId === item._id ? "active" : "default"}
                />
            ))}
            </WorkspaceSection>
        </div>
    );
};