import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

interface UseGetConversationsProps {
  workspaceId: Id<"workspaces"> | undefined;
}

export const useGetConversations = ({ 
  workspaceId 
}: UseGetConversationsProps) => {
  // Use any assertion to bypass TypeScript error while Convex is syncing
  const listFunction = (api.conversations as any).list;
  
  // Only query if workspaceId is defined
  const conversations = workspaceId 
    ? useQuery(listFunction, { workspaceId }) 
    : undefined;
  
  return {
    conversations,
    isLoading: conversations === undefined && workspaceId !== undefined
  };
}; 