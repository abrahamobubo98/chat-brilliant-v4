import { useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

export const usePresence = (workspaceId: Id<"workspaces">) => {
  const updatePresence = useMutation(api.members.updatePresence);
  
  useEffect(() => {
    // Set user as online when they visit the page
    updatePresence({ workspaceId, isOnline: true });
    
    // Set up event listeners for visibility changes
    const handleVisibilityChange = () => {
      updatePresence({ 
        workspaceId, 
        isOnline: document.visibilityState === 'visible' 
      });
    };
    
    // Set up handlers for when the user leaves/returns to the page
    window.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Set user as offline when they leave
    const handleBeforeUnload = () => {
      updatePresence({ workspaceId, isOnline: false });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      updatePresence({ workspaceId, isOnline: false });
    };
  }, [workspaceId, updatePresence]);
}; 