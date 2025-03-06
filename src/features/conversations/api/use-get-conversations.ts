import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

interface UseGetConversationsProps {
  workspaceId: Id<"workspaces"> | undefined;
}

export const useGetConversations = ({ 
  workspaceId 
}: UseGetConversationsProps) => {
  // Create a non-type-safe reference to the conversations.list function
  const queryReference = api.conversations?.list;
  
  // Always call useQuery with "skip" to maintain consistent hook call order
  // If workspaceId is undefined, the query won't execute but the hook is still called
  const conversations = useQuery(
    queryReference, 
    workspaceId ? { workspaceId } : "skip"
  );
  
  // Handle the case when workspaceId is undefined
  if (!workspaceId) {
    return { conversations: undefined, isLoading: false };
  }
  
  return {
    conversations,
    isLoading: conversations === undefined
  };
}; 