import dynamic from "next/dynamic";
import { Id, Doc } from "../../convex/_generated/dataModel";

import { format, isToday, isYesterday } from "date-fns";

import { Hint } from "./hint";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Thumbnail } from "./thumbnail";
import { Toolbar } from "@/components/toolbar";

import { useUpdateMessage } from "@/features/messages/api/use-update-message";
import { useRemoveMessage } from "@/features/messages/api/use-remove-message";
import { useConfirm } from "@/hooks/use-confirm";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useToggleReaction } from "@/features/reactions/api/use-toggle-reaction";
import { Reactions } from "./reactions";
import { usePanel } from "@/hooks/use-panel";
import { ThreadBar } from "./thread-bar";
import { Bot } from "lucide-react";
const Renderer = dynamic(() => import("@/components/renderer"), {
    ssr: false,
});
const Editor = dynamic(() => import("@/components/editor"), {
    ssr: false,
});

interface MessageProps {
    id: Id<"messages">;
    memberId: Id<"members">;
    authorImage?: string;
    authorName?: string;
    isAuthor: boolean;
    reactions: Array<
        Omit<Doc<"reactions">, "memberId"> & {
            count: number;
            memberIds: Id<"members">[];
        }
    >;
    body: Doc<"messages">["body"];
    image: string | null | undefined;
    createdAt: Doc<"messages">["_creationTime"];
    updatedAt: Doc<"messages">["updatedAt"];
    isEditing: boolean;
    isCompact?: boolean;
    setEditingId: (id: Id<"messages"> | null) => void;
    hideThreadButton: boolean;
    threadCount?: number;
    threadImage?: string;
    threadName?: string;
    threadTimestamp?: number;
    isFromAIAvatar?: boolean;
};

const formatFullTime = (date: Date) => {
    return `${isToday(date) ? "Today" : isYesterday(date) ? "Yesterday" : format(date, "MMM d, yyyy")} at ${format(date, "hh:mm:ss a")}`;
};

export const Message = ({
    id,
    isAuthor,
    memberId,
    authorImage,
    authorName = "Member",
    reactions,
    body,
    image,
    createdAt,
    updatedAt,
    isEditing,
    isCompact,
    setEditingId,
    hideThreadButton,
    threadCount,
    threadImage,
    threadName,
    threadTimestamp,
    isFromAIAvatar,
}: MessageProps) => {

    const { parentMessageId, onOpenMessage, onOpenProfile, onClose } = usePanel();

    const [ConfirmDialog, confirm] = useConfirm(
        "Delete Message",
        "Are you sure you want to delete this message? This action cannot be undone."
    );

    const handleDelete = async () => {
        const okay = await confirm();
        if (!okay) return;

        removeMessage({id}, {
            onSuccess: () => {
                toast.success("Message deleted");

                
                if (parentMessageId === id) {
                    onClose();
                }
            },
            onError: () => {
                toast.error("Failed to delete message");
            },
        });
   
    };
    
    const { mutate: updateMessage, isPending: isUpdatingMessage } = useUpdateMessage();
    const { mutate: removeMessage, isPending: isRemovingMessage } = useRemoveMessage();
    const { mutate: toggleReaction, isPending: isTogglingReaction } = useToggleReaction();

    const isPending = isUpdatingMessage || isTogglingReaction;

    const handleReaction = (value: string) => {
        toggleReaction({
            messageId: id,
            value,
        }, {
            onError: () => {
                toast.error("Failed to toggle reaction");
            },
        });
    };

    const handleUpdate = ({body}: {body: string}) => {
        updateMessage({id, body}, {
            onSuccess: () => {
                toast.success("Message updated");
                setEditingId(null);
            },
            onError: () => {
                toast.error("Failed to update message");
            },
        });
    };

    if (isCompact) {
    
        return (
            <>
            <ConfirmDialog/>
            <div className={cn(
                "flex flex-col gap-2 p-2 px-5 hover:bg-slate-100/60 group relative",
                isEditing && "bg-[#f2c74433] hover:bg-[#f2c74433]",
                isRemovingMessage && "bg-rose-500/50 transform transition-all scale-y-0 origin-bottom duration-200"
                )}>
                <div className="flex items-start gap-2">
                    <Hint label={formatFullTime(new Date(createdAt))}>
                        <button className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 w-[40px] leading-[22px] text-center hover:underline">
                            {format(new Date(createdAt), "hh:mm")}
                        </button>
                    </Hint>
                    {isEditing ? (
                        <div className="w-full h-full">
                            <Editor
                            onSubmit={handleUpdate}
                            disabled={isPending}
                            defaultValue={JSON.parse(body)}
                            onCancel={() => setEditingId(null)}
                            variant="update"
                            />
                        </div>
                    ): (
                        <div className="flex flex-col w-full ">
                            <Renderer value={body}/>
                            <Thumbnail url={image}/>
                        {updatedAt ? (
                            <span className="text-xs text-muted-foreground">(edited)</span>
                        ): null}
                        <Reactions data={reactions} onChange={handleReaction}/>
                        <ThreadBar
                        count={threadCount}
                        image={threadImage}
                        name={threadName}
                        timestamp={threadTimestamp}
                        onClick={() => onOpenMessage(id)}
                        />
                        </div>
                    )}
                </div>
                {!isEditing && (
                <Toolbar
                isAuthor={isAuthor}
                isPending={isPending}
                handleEdit={() => setEditingId(id)}
                handleThread={() => onOpenMessage(id)}
                handleDelete={handleDelete}
                handleReaction={handleReaction}
                hideThreadButton={hideThreadButton}
                />
                )}
            </div>
            </>
        );
    }

    const avatarFallback = authorName.charAt(0).toUpperCase();

    return (    
        <>
        <ConfirmDialog/>
        <div className={cn(
            "flex flex-col gap-2 p-2 px-5 hover:bg-slate-100/60 group relative",
            isEditing && "bg-[#f2c74433] hover:bg-[#f2c74433]",
            isRemovingMessage && "bg-rose-500/50 transform transition-all scale-y-0 origin-bottom duration-200"
            )}>
            <div className="flex items-start gap-2">
                <button onClick={() => onOpenProfile(memberId)} className="relative">
                    <Avatar>
                        <AvatarImage src={authorImage}/>
                        <AvatarFallback >
                            {avatarFallback}
                        </AvatarFallback>
                    </Avatar>
                    {isFromAIAvatar && (
                        <span className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-0.5">
                            <Bot className="h-3 w-3" />
                        </span>
                    )}
                </button>
                {isEditing ? (
                    <div className="w-full h-full">
                        <Editor
                        onSubmit={handleUpdate}
                        disabled={isPending}
                        defaultValue={JSON.parse(body)}
                        onCancel={() => setEditingId(null)}
                        variant="update"
                        />
                    </div>
                ): (
                <div className="flex flex-col w-full overflow-hidden">
                    <div className="text-sm flex items-center">
                        <button onClick={() => onOpenProfile(memberId)} className="font-bold text-primary hover:underline flex items-center">
                            {authorName}
                            {isFromAIAvatar && (
                                <span className="ml-1 text-blue-500 flex items-center" title="AI Avatar">
                                    <Bot className="h-3.5 w-3.5 inline-block" />
                                </span>
                            )}
                        </button>
                        <Hint label={formatFullTime(new Date(createdAt))}>
                            <button className="text-sm text-muted-foreground hover:underline ml-2">
                                {format(new Date(createdAt), "h:mm a")}
                            </button>
                        </Hint>
                    </div>
                    <div>
                        <Renderer value={body}/>
                        <Thumbnail url={image}/>
                        {updatedAt ? (
                            <span className="text-xs text-muted-foreground">(edited)</span>
                        ): null}
                        <Reactions data={reactions} onChange={handleReaction}/>
                        <ThreadBar
                        count={threadCount}
                        image={threadImage}
                        name={threadName}
                        timestamp={threadTimestamp}
                        onClick={() => onOpenMessage(id)}
                        />
                    </div>
                </div>
                )}
            </div>
            {!isEditing && (
                <Toolbar
                isAuthor={isAuthor}
                isPending={isPending}
                handleEdit={() => setEditingId(id)}
                handleThread={() => onOpenMessage(id)}
                handleDelete={handleDelete}
                handleReaction={handleReaction}
                hideThreadButton={hideThreadButton}
                />
            )}
        </div>
        </>
    )
};