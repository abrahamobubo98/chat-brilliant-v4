"use client";

import { useParams } from "next/navigation";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { usePresence } from "@/hooks/use-presence";

// This is a nested layout that inherits from the DM layout
export default function ConversationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const workspaceId = params.workspaceId as Id<"workspaces">;
  
  // Track user presence
  usePresence(workspaceId);

  return (
    <div className="h-full">
      {children}
    </div>
  );
} 