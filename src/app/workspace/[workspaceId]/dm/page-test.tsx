"use client";

import Link from "next/link";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { Button } from "@/components/ui/button";

const DmTestPage = () => {
  const workspaceId = useWorkspaceId();
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Direct Messages Test Page</h1>
      <p className="mb-4">This is a simple test page to verify routing to the DM page works.</p>
      <p className="mb-4">WorkspaceId: {workspaceId}</p>
      
      <div className="flex gap-4">
        <Link href={`/workspace/${workspaceId}`}>
          <Button variant="outline">Back to Workspace</Button>
        </Link>
        
        <Link href={`/workspace/${workspaceId}/dm`}>
          <Button>Go to Direct Messages</Button>
        </Link>
      </div>
    </div>
  );
};

export default DmTestPage; 