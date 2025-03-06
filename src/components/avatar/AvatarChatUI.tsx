import { useState, FormEvent, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SendIcon, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import Image from "next/image";

interface AvatarChatUIProps {
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  avatarUrl?: string;
  className?: string;
}

export function AvatarChatUI({
  onSendMessage,
  isLoading,
  avatarUrl,
  className = "",
}: AvatarChatUIProps) {
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input when the component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    try {
      await onSendMessage(message);
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className={`flex flex-col space-y-4 ${className}`}>
      <div className="flex items-center space-x-2 pb-2">
        <Avatar className="h-8 w-8">
          {avatarUrl ? (
            <Image 
              src={avatarUrl} 
              alt="Avatar" 
              width={32} 
              height={32} 
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary text-sm">AI</div>
          )}
        </Avatar>
        <div className="text-sm font-medium">AI Avatar</div>
      </div>

      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Type a message to send as your avatar..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={isLoading}
          className="flex-1"
        />
        <Button 
          type="submit" 
          size="icon" 
          disabled={!message.trim() || isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SendIcon className="h-4 w-4" />
          )}
        </Button>
      </form>

      {isLoading && (
        <div className="text-sm text-muted-foreground animate-pulse">
          Generating AI response...
        </div>
      )}
    </div>
  );
} 