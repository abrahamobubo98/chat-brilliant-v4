"use client";

import { useCreateOrGetConversation } from "@/features/conversations/api/use-create-or-get-conversation";
import { useMemberId } from "@/hooks/use-member-id";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { AlertTriangle, Loader } from "lucide-react";
import { useEffect, useState } from "react";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { Conversation } from "./conversation";

const MemberIdPage = () => {
    const workspaceId = useWorkspaceId();
    const memberId = useMemberId();

    const [conversationId, setConversation] = useState<Id<"conversations"> | null>(null);

    const { data, mutate, isPending } = useCreateOrGetConversation();

    useEffect(() => {
        mutate({ workspaceId, memberId },{
            onSuccess: (data) => {
                setConversation(data);
            },
            onError: () => {
                toast.error("Failed to create or get conversation");
            }
        });
    }, [workspaceId, memberId, mutate]);

    if (isPending) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader className="size-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!conversationId) {
        return (
            <div className="h-full flex gap-y-2 items-center justify-center flex-col gap-2">
                <AlertTriangle className="size-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Conversation not found!?</span>
            </div>
        );
    }

    return <Conversation id={conversationId} />
};

export default MemberIdPage;