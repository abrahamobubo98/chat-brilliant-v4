import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "../../mocks/convex-hooks";
import { api } from "@/convex/_generated/api";
import { generateAvatarResponse } from "./avatar-service";
import { AvatarChatUI } from "./AvatarChatUI";

interface AvatarProps {
  recipientId: string;
}

interface Message {
  id: string;
  sender: string;
  content?: string;
}

export default function Avatar({ recipientId }: AvatarProps) {
  const { user } = useUser();
  const sendMessage = useMutation(api.messages.send);
  const trackAvatarUsage = useMutation(api.avatarUsage.track);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (messageText: string) => {
    if (!user || !recipientId || !messageText.trim()) return;

    const userId = user.id;
    
    try {
      setIsLoading(true);

      // Get the last 20 messages for context
      const messages = await fetchRecentMessages(userId);
      
      // Generate conversation history string
      const conversationHistory = messages
        .slice(0, 10)
        .map(m => `${m.sender === userId ? 'You' : 'Recipient'}: ${m.content || ""}`)
        .join('\n');
      
      // Get AI-generated response based on user's style
      const response = await generateAvatarResponse(
        userId, 
        messageText,
        conversationHistory,
        messages
      );

      // Send message to recipient
      await sendMessage({
        recipientId,
        content: messageText,
        contentType: "text",
        sendAsAvatar: true,
      });

      // Track that avatar was used
      trackAvatarUsage({ userId });

      // Wait a moment before sending the AI response
      setTimeout(async () => {
        await sendMessage({
          recipientId,
          content: response,
          contentType: "quill",
          sendAsAvatar: false,
        });
        setIsLoading(false);
      }, 1500);
    } catch (error) {
      console.error("Error in avatar message flow:", error);
      setIsLoading(false);
    }
  };
  
  // Fetch recent messages for context
  const fetchRecentMessages = async (userId: string): Promise<Message[]> => {
    try {
      // This would typically be a Convex query to fetch recent messages
      // between the user and the recipient
      return []; // Replace with actual message fetching
    } catch (error) {
      console.error("Error fetching recent messages:", error);
      return [];
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow-sm bg-background">
      <AvatarChatUI 
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        avatarUrl={user?.imageUrl}
      />
    </div>
  );
} 