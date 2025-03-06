"use client"

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EmojiPopover } from "@/components/emoji-popover";
import { Smile } from "lucide-react";
import { toast } from "sonner";

interface StatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: Id<"workspaces">;
  currentStatus?: string;
  currentEmoji?: string;
}

// Define a proper interface for emoji objects
interface EmojiObject {
  native: string;
  colons?: string;
  id?: string;
  name?: string;
  [key: string]: unknown;
}

export const StatusModal = ({ 
  isOpen, 
  onClose, 
  workspaceId, 
  currentStatus, 
  currentEmoji 
}: StatusModalProps) => {
  const [status, setStatus] = useState(currentStatus || "");
  const [statusEmoji, setStatusEmoji] = useState(currentEmoji || "");
  
  const updateStatus = useMutation(api.members.updateStatus);
  
  const handleSubmit = async () => {
    await updateStatus({ 
      workspaceId, 
      status: status || undefined, 
      statusEmoji: statusEmoji || undefined 
    });
    toast.success("Status updated");
    onClose();
  };
  
  const handleClear = async () => {
    await updateStatus({ 
      workspaceId, 
      status: undefined, 
      statusEmoji: undefined 
    });
    setStatus("");
    setStatusEmoji("");
    toast.success("Status cleared");
    onClose();
  };

  const onEmojiSelect = (emoji: EmojiObject) => {
    setStatusEmoji(emoji.native);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update your status</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-2">
            <EmojiPopover onEmojiSelect={onEmojiSelect} hint="Select an emoji">
              <Button variant="outline" size="icon" className="h-10 w-10">
                {statusEmoji ? (
                  <span className="text-lg">{statusEmoji}</span>
                ) : (
                  <Smile className="h-5 w-5" />
                )}
              </Button>
            </EmojiPopover>
            <Input
              placeholder="What's your status?"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="flex-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-2">
            {["In a meeting", "Commuting", "Off sick", "On holiday"].map((option) => (
              <Button 
                key={option} 
                variant="outline" 
                onClick={() => setStatus(option)}
                className={status === option ? "border-primary" : ""}
              >
                {option}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex justify-between">
          <Button variant="ghost" onClick={handleClear}>
            Clear status
          </Button>
          <Button onClick={handleSubmit}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 