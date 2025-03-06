import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useCallback } from "react";

export function useActivateAvatar() {
  const activateAvatarMutation = useMutation(api.avatar.activateAvatar);
  
  const mutate = useCallback(
    ({ userId }: { userId: string }) => {
      return activateAvatarMutation({ userId });
    },
    [activateAvatarMutation]
  );

  return { mutate };
}

export function useDeactivateAvatar() {
  const deactivateAvatarMutation = useMutation(api.avatar.deactivateAvatar);

  const mutate = useCallback(
    ({ userId }: { userId: string }) => {
      return deactivateAvatarMutation({ userId });
    },
    [deactivateAvatarMutation]
  );

  return { mutate };
}

export function useIsAvatarActive({ userId }: { userId: string }) {
  const result = useQuery(api.avatar.isAvatarActive, { userId });
  return result;
}

export function useHandleAutomatedResponse() {
  const handleAutomatedResponseMutation = useMutation(api.avatar.handleAutomatedResponse);

  const mutate = useCallback(
    (args: { 
      userId: string;
      messageText: string;
      conversationId: Id<"conversations">;
      workspaceId: Id<"workspaces">;
      receiverMemberId: Id<"members">;
    }) => {
      return handleAutomatedResponseMutation(args);
    },
    [handleAutomatedResponseMutation]
  );

  return { mutate };
} 