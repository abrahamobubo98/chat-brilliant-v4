import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Id } from "../../../../convex/_generated/dataModel";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Bot } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const UserItemVariants = cva(
    "flex items-center gap-1.5 justify-start font-normal h-7 px-4 text-sm overflow-hidden",
    {
        variants: {
            variant: {
                default: "text-[#f9edffcc]",
                active: "text-black bg-[#008060] bg-white/90 hover:bg-white/90",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    },
)

interface UserItemProps {
    id: Id<"members">;
    label?: string;
    image?: string;
    variant?: VariantProps<typeof UserItemVariants>["variant"];
}

export const UserItem = ({ 
    id, 
    label = "Member", 
    image,
    variant 
}: UserItemProps) => {
    const workspaceId = useWorkspaceId();
    const avatarFallback = label?.charAt(0).toUpperCase();
    
    // Get member data to check online status
    const member = useQuery(api.members.getById, { 
        id 
    });
    
    // Always call the hook unconditionally
    // If userId is undefined/null, the query will handle it or return null/undefined
    const avatarActiveResult = useQuery(api.avatar.isAvatarActive, {
        userId: member?.userId || "" // Using empty string as fallback for when userId is undefined
    });
    
    // Then safely use the result
    const avatarActive = !!member?.userId && !!avatarActiveResult;
    
    // Determine if this is an AI representation (user is offline but avatar is active)
    const isAIActive = !member?.isOnline && avatarActive;
    
    return (
        <Button
        variant="transparent"
        className={cn(UserItemVariants({ variant }))}
        size="sm"
        asChild>
            <Link href={`/workspace/${workspaceId}/member/${id}`}>
                <div className="relative flex items-center">
                    <Avatar className="size-5 rounded-md mr-1">
                        <AvatarImage className="rounded-md" src={image}/>
                        <AvatarFallback className="rounded-md">
                            {avatarFallback}
                        </AvatarFallback>
                    </Avatar>
                    {member?.isOnline && (
                        <span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-green-500 border border-white"></span>
                    )}
                    {isAIActive && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Bot className="h-3 w-3 absolute -top-1 -right-1 text-blue-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="text-xs">AI Avatar active</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
                <span className="truncate">
                    {label}
                    {member?.status && (
                        <span className="text-xs ml-1 opacity-70">
                            {member.statusEmoji} {member.status}
                        </span>
                    )}
                </span>
            </Link>
        </Button>
    )
};