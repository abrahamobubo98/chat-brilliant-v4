"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Loader, Search, Users } from "lucide-react";
import Link from "next/link";

import { useCurrentMember } from "@/features/members/api/use-current-member";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useGetConversations } from "@/features/conversations/api/use-get-conversations";

// Helper function to extract plain text from JSON message body
const extractMessageText = (jsonBody: string) => {
  try {
    const parsed = JSON.parse(jsonBody);
    if (parsed && parsed.ops) {
      // Extract text from Quill delta format
      return parsed.ops
        .map((op: { insert?: string }) => op.insert || "")
        .join("")
        .trim();
    }
    return jsonBody;
  } 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  catch (_error) {
    // If parsing fails, return original
    return jsonBody;
  }
};

const DirectMessagesPage = () => {
  const workspaceId = useWorkspaceId();
  // We fetch currentMember for future implementation of user-specific features
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: currentMember, isLoading: memberLoading } = useCurrentMember({ workspaceId });
  const [searchQuery, setSearchQuery] = useState("");
  
  // Always call hooks at the top level
  const { conversations, isLoading: conversationsLoading } = useGetConversations({ workspaceId });

  const filteredConversations = Array.isArray(conversations) 
    ? conversations.filter((conversation) =>
        conversation?.otherMember?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (conversation?.lastMessage?.body || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const formatMessageDate = (timestamp: number) => {
    try {
      const now = new Date();
      const messageDate = new Date(timestamp);
      
      // If today, show time
      if (messageDate.toDateString() === now.toDateString()) {
        return format(messageDate, "h:mm a");
      }
      
      // If this week, show day name
      const diffDays = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 7) {
        return format(messageDate, "EEEE");
      }
      
      // Otherwise show date
      return format(messageDate, "MMM d");
    } catch (error) {
      console.error("Error formatting message date:", error);
      return "Unknown time";
    }
  };

  const isLoading = memberLoading || conversationsLoading;
  
  return (
    <div className="h-full flex flex-col">
      <div className="h-[49px] flex items-center px-4 border-b">
        <h1 className="text-lg font-bold">Direct Messages</h1>
        <p className="ml-4 text-sm text-muted-foreground">Send private messages to workspace members</p>
      </div>
      
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
          <Input 
            placeholder="Find a DM" 
            className="pl-9 bg-gray-100 border-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="h-full flex-1 flex items-center justify-center">
            <Loader className="animate-spin size-6 text-muted-foreground" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Users className="size-12 mb-2 opacity-50" />
            <p className="font-medium text-base">No conversations yet</p>
            <p className="text-sm mt-1 max-w-md text-center">
              Direct Messages allow you to have private conversations with other members of this workspace
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map((conversation) => (
              <Link 
                key={conversation.id}
                href={`/workspace/${workspaceId}/dm/${conversation.id}`}
                className={cn(
                  "flex items-center gap-3 p-4 hover:bg-gray-100 cursor-pointer",
                  conversation.lastMessage?.isUnread && "bg-gray-50"
                )}
              >
                <Avatar className="size-10">
                  <AvatarImage src={conversation.otherMember.image} />
                  <AvatarFallback>
                    {conversation.otherMember.name.split(" ").map((name: string) => name[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className={cn(
                      "font-medium truncate",
                      conversation.lastMessage?.isUnread && "font-semibold"
                    )}>
                      {conversation.otherMember.name}
                    </p>
                    {conversation.lastMessage && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {formatMessageDate(conversation.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <p className={cn(
                    "text-sm text-muted-foreground truncate",
                    conversation.lastMessage?.isUnread && "text-foreground font-medium"
                  )}>
                    {conversation.lastMessage ? (
                      <>
                        {/* Add "You: " prefix if the message is not unread (sent by current user) */}
                        {!conversation.lastMessage.isUnread && <span className="font-medium">You: </span>}
                        {extractMessageText(conversation.lastMessage.body)}
                      </>
                    ) : "No messages yet"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DirectMessagesPage; 