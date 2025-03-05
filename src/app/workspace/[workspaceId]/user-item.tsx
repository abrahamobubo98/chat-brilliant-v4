import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage, AvatarPresence } from "@/components/ui/avatar";
import { Id } from "../../../../convex/_generated/dataModel";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

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
    
    return (
        <Button
        variant="transparent"
        className={cn(UserItemVariants({ variant }))}
        size="sm"
        asChild>
            <Link href={`/workspace/${workspaceId}/member/${id}`}>
                <div className="relative">
                    <Avatar className="size-5 rounded-md mr-1">
                        <AvatarImage className="rounded-md" src={image}/>
                        <AvatarFallback className="rounded-md">
                            {avatarFallback}
                        </AvatarFallback>
                    </Avatar>
                    {member?.isOnline && (
                        <span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-green-500 border border-white"></span>
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