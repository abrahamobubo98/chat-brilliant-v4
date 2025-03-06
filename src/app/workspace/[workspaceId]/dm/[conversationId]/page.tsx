"use client";

import { useParams } from "next/navigation";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { Conversation } from "./conversation";
import { Id } from "../../../../../../convex/_generated/dataModel";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const ConversationPage = () => {
  const params = useParams();
  const workspaceId = useWorkspaceId();
  
  // Extract and validate the conversationId
  let conversationId: Id<"conversations"> | null = null;
  
  try {
    if (params.conversationId && typeof params.conversationId === 'string') {
      conversationId = params.conversationId as Id<"conversations">;
    }
  } catch (e) {
    console.error("Invalid conversation ID format:", e);
  }
  
  // If no valid conversation ID, show a message
  if (!conversationId) {
    return (
      <div className="h-full flex-1 flex flex-col items-center justify-center">
        <p className="text-muted-foreground">Conversation not found or invalid ID format</p>
        <Link href={`/workspace/${workspaceId}/dm`} className="mt-2">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="size-4" />
            Back to Direct Messages
          </Button>
        </Link>
      </div>
    );
  }
  
  // Try to render the conversation component, with error boundary
  try {
    return <Conversation id={conversationId} />;
  } catch (e) {
    console.error("Error rendering conversation:", e);
    return (
      <div className="h-full flex-1 flex flex-col items-center justify-center">
        <p className="text-muted-foreground">Error loading conversation</p>
        <Link href={`/workspace/${workspaceId}/dm`} className="mt-2">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="size-4" />
            Back to Direct Messages
          </Button>
        </Link>
      </div>
    );
  }
};

export default ConversationPage; 