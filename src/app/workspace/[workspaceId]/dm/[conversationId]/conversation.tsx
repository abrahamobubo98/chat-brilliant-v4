import { Id } from "../../../../../../convex/_generated/dataModel";
import { api } from "../../../../../../convex/_generated/api";
import { useGetMessages } from "@/features/messages/api/use-get-messages";
import { Loader, ArrowLeft } from "lucide-react";
import { MessageList } from "@/components/message-list";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FaChevronDown } from "react-icons/fa";
import { useCreateMessage } from "@/features/messages/api/use-create-message";
import { useGenerateUploadUrl } from "@/features/upload/api/use-generate-upload-url";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import dynamic from "next/dynamic";
import Quill from "quill";
import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { useCurrentMember } from "@/features/members/api/use-current-member";
import Link from "next/link";
import { useQuery } from "convex/react";

const Editor = dynamic(() => import("@/components/editor"), { ssr: false });

interface ConversationProps {
    id: Id<"conversations">;
}

// Define interface for conversation members
interface ConversationMember {
    id: Id<"members">;
    user: {
        name: string;
        image: string;
    };
}

// Interface for the conversation structure from API
interface ConversationFromAPI {
    id: Id<"conversations">;
    otherMember: {
        id: Id<"members">;
        name: string;
        image: string;
    };
    lastMessage: {
        body: string;
        createdAt: number;
        isUnread: boolean;
    } | null;
}

// A custom hook to get the conversation data and members
const useGetConversationMembers = ({ conversationId }: { conversationId: Id<"conversations"> }) => {
    const workspaceId = useWorkspaceId();
    const { data: currentMember } = useCurrentMember({ workspaceId });
    const conversations = useQuery(api.conversations.list, { workspaceId });
    const [members, setMembers] = useState<ConversationMember[] | null>(null);
    
    useEffect(() => {
        if (!conversations || !currentMember) return;
        
        // Find the current conversation
        const conversation = conversations.find((c: ConversationFromAPI) => c.id === conversationId);
        if (!conversation) return;
        
        // Prepare the member data
        const result: ConversationMember[] = [];
        
        // Add current member with placeholder values
        // Note: We don't have direct access to current user's name/image in this context
        result.push({
            id: currentMember._id,
            user: {
                name: "Current User", // Placeholder - we don't need this for the UI
                image: ""  // Placeholder - we don't need this for the UI
            }
        });
        
        // Add other member from the conversation
        if (conversation.otherMember) {
            result.push({
                id: conversation.otherMember.id,
                user: {
                    name: conversation.otherMember.name,
                    image: conversation.otherMember.image
                }
            });
        }
        
        setMembers(result);
    }, [conversations, currentMember, conversationId]);
    
    return {
        data: members,
        isLoading: members === null
    };
};

// DM Header component
const DmHeader = ({ 
    memberName = "Member",
    memberImage,
    workspaceId
}: { 
    memberName?: string;
    memberImage?: string;
    workspaceId: Id<"workspaces">;
}) => {
    const avatarFallback = memberName ? memberName.charAt(0).toUpperCase() : "?";

    return (
        <div className="bg-white border-b h-[49px] flex items-center px-4 overflow-hidden">
            <Link href={`/workspace/${workspaceId}/dm`} className="mr-3">
                <Button variant="ghost" size="iconSm" className="rounded-full">
                    <ArrowLeft className="size-4" />
                </Button>
            </Link>
            
            <div className="flex items-center gap-2">
                <Avatar className="size-7">
                    <AvatarImage src={memberImage} />
                    <AvatarFallback>
                        {avatarFallback}
                    </AvatarFallback>
                </Avatar>
                <h1 className="font-semibold">{memberName}</h1>
            </div>
        </div>
    );
};

// DM Chat Input component
const DmChatInput = ({ 
    placeholder, 
    conversationId 
}: {
    placeholder?: string;
    conversationId: Id<"conversations">;
}) => {
    const [editorKey, setEditorKey] = useState<number>(0);
    const [isPending, setIsPending] = useState<boolean>(false);
    const editorRef = useRef<Quill | null>(null);
    const workspaceId = useWorkspaceId();
    const { mutate: createMessage } = useCreateMessage();
    const { mutate: generateUploadUrl } = useGenerateUploadUrl();

    const handleSubmit = async ({
        body,
        image
    }: {
        body: string;
        image: File | null;
    }) => {
        try {
            setIsPending(true);
            editorRef.current?.enable(false);
            
            const values = {
                conversationId,
                workspaceId,
                body,
                image: undefined as Id<"_storage"> | undefined
            };

            if (image) {
                const url = await generateUploadUrl({}, {throwError: true});

                if (!url) {
                    throw new Error("Failed to generate upload url");
                }

                const result = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": image.type
                    },
                    body: image,
                });

                if (!result.ok) {
                    throw new Error("Failed to upload image");
                }

                const { storageId } = await result.json();
                values.image = storageId;
            }
            
            const messageResult = await createMessage(values, {throwError: true});
            console.log("[DmChatInput] Message result:", messageResult);
            setEditorKey(prev => prev + 1);
        } catch(error) {
            console.error("[DmChatInput] Error in handleSubmit:", error);
            toast.error("Failed to send message");
        } finally {
            setIsPending(false);
            editorRef.current?.enable(true);
        }
    };

    return (
        <div className="px-5 w-full">
            <Editor 
                key={editorKey}
                placeholder={placeholder}
                onSubmit={handleSubmit}
                onCancel={() => {}}
                disabled={isPending}
                innerRef={editorRef}
            />
        </div>
    );
};

// Main Conversation component
export const Conversation = ({ id }: ConversationProps) => {
    const workspaceId = useWorkspaceId();
    const { data: currentMember, isLoading: memberLoading } = useCurrentMember({ workspaceId });
    
    // Get conversation members, including the other participant
    const { data: members, isLoading: membersLoading } = useGetConversationMembers({ conversationId: id });
    
    // Get messages for this conversation
    const { results, status, loadMore } = useGetMessages({ conversationId: id });

    if (memberLoading || membersLoading || status === "LoadingFirstPage") {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader className="size-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Find the other member in the conversation (not the current user)
    const otherMember = members?.find((member: ConversationMember) => member.id !== currentMember?._id);

    if (!otherMember) {
        return (
            <div className="h-full flex-1 flex flex-col items-center justify-center">
                <p className="text-muted-foreground">Conversation partner not found</p>
                <Link href={`/workspace/${workspaceId}/dm`} className="mt-2">
                    <Button variant="outline" size="sm" className="gap-2">
                        <ArrowLeft className="size-4" />
                        Back to Direct Messages
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <DmHeader 
                memberName={otherMember.user.name}
                memberImage={otherMember.user.image}
                workspaceId={workspaceId}
            />
            <MessageList 
                data={results}
                variant="conversation"
                memberImage={otherMember.user.image}
                memberName={otherMember.user.name}
                loadMore={loadMore}
                isLoadingMore={status === "LoadingMore"}
                canLoadMore={status === "CanLoadMore"}
            />
            <DmChatInput 
                placeholder={`Message ${otherMember.user.name}`}
                conversationId={id}
            />
        </div>
    );
}; 