import { useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";

/**
 * Hook that provides a logout function that ensures the user is marked as offline
 * across all workspaces before signing out
 */
export function useLogout() {
  const { signOut } = useAuthActions();
  const updatePresenceAll = useMutation(api.members.updatePresenceAll);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const logout = async () => {
    setIsLoggingOut(true);
    
    try {
      // Set user as offline in all workspaces with a single call
      await updatePresenceAll({ isOnline: false });
      
      // After ensuring offline status is set, sign out
      await signOut();
    } catch (error) {
      console.error("Error during logout:", error);
      // Still attempt to sign out even if updating presence failed
      await signOut();
    } finally {
      setIsLoggingOut(false);
    }
  };
  
  return {
    logout,
    isLoggingOut
  };
} 