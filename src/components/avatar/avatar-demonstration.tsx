"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, User } from 'lucide-react';
import { useActivateAvatar, useDeactivateAvatar, useHandleAutomatedResponse } from '@/features/avatar/api/use-avatar';
import { toast } from 'sonner';
import { asId, TableNames } from '@/lib/utils/id-helpers';

interface AvatarDemonstrationProps {
  userId: string;
  workspaceId: string;
  conversationId: string;
  receiverMemberId: string;
  username: string;
}

export const AvatarDemonstration = ({ 
  userId, 
  workspaceId, 
  conversationId, 
  receiverMemberId,
  username
}: AvatarDemonstrationProps) => {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { mutate: activateAvatar } = useActivateAvatar();
  const { mutate: deactivateAvatar } = useDeactivateAvatar();
  const { mutate: handleAutomatedResponse } = useHandleAutomatedResponse();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    setIsLoading(true);
    
    try {
      // Convert string IDs to Convex IDs
      const convexWorkspaceId = asId(workspaceId, TableNames.workspaces);
      const convexConversationId = asId(conversationId, TableNames.conversations);
      const convexMemberId = asId(receiverMemberId, TableNames.members);
      
      // Check if all IDs were converted successfully
      if (!convexWorkspaceId || !convexConversationId || !convexMemberId) {
        throw new Error("Invalid IDs provided");
      }
      
      const result = await handleAutomatedResponse({
        userId,
        messageText: message,
        conversationId: convexConversationId,
        workspaceId: convexWorkspaceId,
        receiverMemberId: convexMemberId
      });
      
      if (result?.success) {
        setResponse('The AI avatar has responded to your message!');
        toast.success('AI avatar responded successfully');
      } else {
        setResponse(`Failed to get response: ${result?.reason || 'Unknown error'}`);
        toast.error('Failed to get AI response');
      }
    } catch (error) {
      console.error('Error in avatar demonstration:', error);
      setResponse('An error occurred while communicating with the AI avatar.');
      toast.error('Error communicating with AI avatar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Avatar Demonstration
        </CardTitle>
        <CardDescription>
          Test your AI avatar&apos;s response capabilities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Send a test message to <span className="font-bold">{username}&apos;s</span> AI avatar:</p>
            <Input
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading || !message.trim()}
          >
            {isLoading ? 'Sending...' : 'Send to AI Avatar'}
          </Button>
        </form>

        {response && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <div className="flex items-start gap-2">
              <Bot className="h-5 w-5 mt-0.5 text-primary" />
              <div>
                <p className="text-sm font-medium">AI Avatar Response:</p>
                <p className="text-sm mt-1">{response}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            activateAvatar({ userId });
            toast.success('Avatar activated');
          }}
        >
          <Bot className="mr-2 h-4 w-4" />
          Activate Avatar
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            deactivateAvatar({ userId });
            toast.success('Avatar deactivated');
          }}
        >
          <User className="mr-2 h-4 w-4" />
          Deactivate Avatar
        </Button>
      </CardFooter>
    </Card>
  );
}; 