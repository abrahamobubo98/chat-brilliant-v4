import { AlertTriangle, Loader, XIcon } from "lucide-react";

import { useCurrentMember } from "@/features/members/api/use-current-member";
import { useGetMessage } from "@/features/messages/api/use-get-message";

import { Button } from "@/components/ui/button";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { Message } from "@/components/message";

import { Id } from "../../../../convex/_generated/dataModel";

interface ThreadProps {
    messageId: Id<"messages">;
    onClose: () => void;
}

export const Thread = ({messageId, onClose}: ThreadProps) => {
    const workspaceId = useWorkspaceId();
    const { data: currentMember } = useCurrentMember({workspaceId});
    const {data: message, isLoading: loadingMessage } = useGetMessage({id: messageId});

    if (loadingMessage) {
        return (
            <div className="h-full flex flex-col">
                <div className="h-[49px]flex justify-between items-center px-4 border-b">
                    <p>Thread</p>
                    <Button onClick={onClose} size="iconSm" variant="ghost">
                        <XIcon className="size-5 stroke-1.5"/>
                    </Button>
                </div>
                <div className="flex flex-col gap-y-2 items-center justify-center h-full">
                    <Loader className="size-5 animate-spin text-muted-foreground"/>
                </div>
            </div>
        );
    }

    if (!message) {
        return (
            <div className="h-full flex flex-col">
                <div className="h-[49px]flex justify-between items-center px-4 border-b">
                    <p>Thread</p>
                    <Button onClick={onClose} size="iconSm" variant="ghost">
                        <XIcon className="size-5 stroke-1.5"/>
                    </Button>
                </div>
                <div className="flex flex-col gap-y-2 items-center justify-center h-full">
                    <AlertTriangle className="size-5 text-muted-foreground"/>
                    <p className="text-sm text-muted-foreground">Message not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="h-[49px] flex justify-between items-center px-4 border-b">
                <p className="text-lg font-bold">Thread</p>
                <Button onClick={onClose} size="iconSm" variant="ghost">
                    <XIcon className="size-5 stroke-1.5"/>
                </Button>
            </div>
            <div>
                <Message 
                hideThreadButton
                memberId={message.memberId}
                authorImage={message.user.image}
                authorName={message.user.name}
                isAuthor={message.memberId === currentMember?._id}
                body={message.body}
                image={message.image}
                createdAt={message._creationTime}
                updatedAt={message.updatedAt}
                id={message._id}
                reactions={message.reactions}
                isEditing={false}
                setEditingId={() => {}}
                />
            </div>
        </div>
    );
}