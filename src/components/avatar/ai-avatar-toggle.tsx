import { useEffect } from 'react';
import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, User, Loader } from 'lucide-react';
import { useActivateAvatar, useDeactivateAvatar, useIsAvatarActive } from '@/features/avatar/api/use-avatar';
import { toast } from 'sonner';

interface AIAvatarToggleProps {
  userId: string;
}

export const AIAvatarToggle = ({ userId }: AIAvatarToggleProps) => {
  // Get server state
  const serverAvatarActive = useIsAvatarActive({ userId });
  
  // Local UI state
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPending, setIsPending] = useState<boolean>(false);
  
  // Sync server state to local state
  useEffect(() => {
    if (serverAvatarActive !== undefined) {
      setIsActive(serverAvatarActive);
      setIsLoading(false);
    }
  }, [serverAvatarActive]);
  
  const { mutate: activateAvatarMutation } = useActivateAvatar();
  const { mutate: deactivateAvatarMutation } = useDeactivateAvatar();

  const handleToggleChange = async (checked: boolean) => {
    // Optimistically update UI
    setIsActive(checked);
    setIsPending(true);
    
    try {
      if (checked) {
        await activateAvatarMutation({ userId });
        toast.success('AI Avatar activated');
      } else {
        await deactivateAvatarMutation({ userId });
        toast.success('AI Avatar deactivated');
      }
    } catch (error) {
      console.error('Error toggling avatar state:', error);
      // Revert to previous state on error
      setIsActive(!checked);
      toast.error('Failed to update avatar state');
    } finally {
      setIsPending(false);
    }
  };

  // Display better loading state
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot size={18} />
            AI Avatar
          </CardTitle>
          <CardDescription>
            Loading avatar status...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-4">
          <Loader size={24} className="animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot size={18} />
          AI Avatar
        </CardTitle>
        <CardDescription>
          Let your AI avatar respond on your behalf when you&apos;re offline
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="avatar-mode"
              checked={isActive}
              onCheckedChange={handleToggleChange}
              disabled={isPending}
            />
            <label htmlFor="avatar-mode" className="text-sm font-medium flex items-center gap-2">
              {isActive ? 'Avatar Active' : 'Avatar Inactive'}
              {isPending && <Loader size={14} className="animate-spin" />}
            </label>
          </div>
          
          <div className="text-sm text-muted-foreground">
            {isActive ? (
              <div className="space-y-2">
                <p>Your AI avatar is now active and will:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Respond to messages when you&apos;re offline</li>
                  <li>Use your past messages to learn your communication style</li>
                  <li>Help keep conversations going when you&apos;re away</li>
                </ul>
              </div>
            ) : (
              <p>Enable your AI avatar to automatically respond to messages when you&apos;re offline.</p>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        {isActive ? (
          <p className="flex items-center gap-1">
            <Bot size={14} className="text-blue-500" />
            Your AI avatar is actively responding to messages
          </p>
        ) : (
          <p className="flex items-center gap-1">
            <User size={14} />
            You&apos;re responding to messages yourself
          </p>
        )}
      </CardFooter>
    </Card>
  );
}; 