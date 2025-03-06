"use client";

import { useState } from "react";
import { Loader, Smile, LogOutIcon } from "lucide-react";
import { 
    Avatar,
    AvatarFallback,
    AvatarImage,
    AvatarPresence
} from "@/components/ui/avatar";

import { 
    DropdownMenu,
    DropdownMenuContent, 
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCurrentUser } from "@/features/auth/api/use-current-user";
import { useAuthActions } from "@convex-dev/auth/react";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { StatusModal } from "@/features/members/components/status-modal";
import { useCurrentMember } from "@/features/members/api/use-current-member";
import { useLogout } from "@/hooks/use-logout";

export const UserButton = () => {
    const { signOut } = useAuthActions();
    const { logout, isLoggingOut } = useLogout();
    const { data, isLoading } = useCurrentUser();
    const workspaceId = useWorkspaceId();
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    
    // Only fetch current member if we have a valid workspaceId
    const { data: currentMember } = workspaceId 
        ? useCurrentMember({ workspaceId }) 
        : { data: undefined };
    
    if (isLoading || isLoggingOut) {
        return <Loader className="size-4 animate-spin text-muted-foreground"/>
    }

    if (!data) {
        return null;
    }

    const { image, name } = data;
    const avatarFallback = name!.charAt(0).toUpperCase();
    
    const handleStatusUpdate = () => {
        setStatusModalOpen(true);
    };

    return(
        <>
            <StatusModal
                isOpen={statusModalOpen}
                onClose={() => setStatusModalOpen(false)}
                workspaceId={workspaceId}
                currentStatus={currentMember?.status}
                currentEmoji={currentMember?.statusEmoji}
            />
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div>
                            <DropdownMenu modal={false}>
                                <DropdownMenuTrigger className="outline-none relative">
                                    <Avatar className="size-10 hover:opacity-75 transition">
                                        <AvatarImage alt={name} src={image} />
                                        <AvatarFallback className="bg-sky-500 text-white">
                                            {avatarFallback}
                                        </AvatarFallback>
                                        <AvatarPresence 
                                            isOnline={!!currentMember?.isOnline} 
                                            className="h-3.5 w-3.5 border-2 border-[#008060]"
                                        />
                                    </Avatar>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="center" side="right" className="w-60">
                                    {currentMember?.status ? (
                                        <div className="px-2 py-1.5 text-sm flex items-center">
                                            <span className="mr-2 opacity-75">Current status:</span>
                                            <span className="flex items-center">
                                                {currentMember.statusEmoji && <span className="mr-1">{currentMember.statusEmoji}</span>}
                                                {currentMember.status}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                            No status set
                                        </div>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleStatusUpdate} className="h-10">
                                        <Smile className="size-5 mr-2"/>
                                        Update Status
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => logout()} className="h-10">
                                        <LogOutIcon className="size-4 mr-2"/>
                                        Sign Out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        <p>Your profile • Click to update status</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </>
    );
}