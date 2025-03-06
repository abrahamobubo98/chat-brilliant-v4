"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function NotFound() {
  const params = useParams();
  const workspaceId = params.workspaceId;

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <h2 className="text-xl font-semibold mb-2">Conversation Not Found</h2>
      <p className="text-muted-foreground mb-4">
        The conversation you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to view it.
      </p>
      <Link href={`/workspace/${workspaceId}/dm`}>
        <Button className="gap-2" variant="default">
          <ArrowLeft className="size-4" />
          Back to Direct Messages
        </Button>
      </Link>
    </div>
  );
} 