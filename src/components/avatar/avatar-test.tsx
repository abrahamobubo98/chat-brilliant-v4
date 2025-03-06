import React, { useState, useEffect, ChangeEvent } from 'react';
import { 
  Button, 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle, 
  Input, 
  Textarea, 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
  Switch,
  Label
} from "@/components/ui";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Check, RefreshCw, AlertTriangle } from "lucide-react";

// Define types for our component
interface Workspace {
  _id: Id<"workspaces">;
  name: string;
}

interface Conversation {
  _id: Id<"conversations">;
  name?: string;
}

interface Member {
  _id: Id<"members">;
  userId: string;
  name?: string;
}

export function AvatarTestPanel() {
  // State for form inputs
  const [userId, setUserId] = useState<string>("");
  const [messageText, setMessageText] = useState<string>("Hello, how are you today?");
  const [conversationId, setConversationId] = useState<string>("");
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [receiverMemberId, setReceiverMemberId] = useState<string>("");
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [logHistory, setLogHistory] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"form" | "debug">("form");
  
  // Get available workspaces for dropdown
  const workspaces = useQuery(api.workspaces.getAll) || [];
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  
  // Get conversations for selected workspace
  const conversations = useQuery(
    api.conversations.getAllForWorkspace, 
    selectedWorkspace ? { workspaceId: selectedWorkspace as Id<"workspaces"> } : "skip"
  ) || [];
  
  // Get members for selected workspace
  const members = useQuery(
    api.members.getByWorkspace, 
    selectedWorkspace ? { workspaceId: selectedWorkspace as Id<"workspaces"> } : "skip"
  ) || [];
  
  // Mutations
  const testAvatarResponse = useMutation(api.avatar.testAvatarResponse);
  const checkAvatarSetup = useQuery(api.avatar.checkAvatarSetup, { userId: userId || undefined });
  const setAvatarActive = useMutation(api.avatar.setActive);
  
  // Update workspaceId when selected workspace changes
  useEffect(() => {
    if (selectedWorkspace) {
      setWorkspaceId(selectedWorkspace);
    }
  }, [selectedWorkspace]);
  
  // Helper functions
  const handleWorkspaceChange = (value: string) => {
    setSelectedWorkspace(value);
    setConversationId(""); // Reset conversation when workspace changes
    setReceiverMemberId(""); // Reset member when workspace changes
  };
  
  const handleRunTest = async () => {
    if (!userId || !conversationId || !workspaceId || !receiverMemberId) {
      addLog("ERROR: All fields are required");
      return;
    }
    
    setLoading(true);
    addLog(`Starting avatar test with userId: ${userId}`);
    
    try {
      const result = await testAvatarResponse({
        userId,
        messageText,
        conversationId: conversationId as Id<"conversations">,
        workspaceId: workspaceId as Id<"workspaces">,
        receiverMemberId: receiverMemberId as Id<"members">
      });
      
      setTestResult(result);
      addLog(`Test completed. Method: ${result.directMethod || "unknown"}`);
      addLog(`Response: ${JSON.stringify(result)}`);
    } catch (error) {
      setTestResult({ error: String(error) });
      addLog(`ERROR: ${error}`);
    } finally {
      setLoading(false);
    }
  };
  
  const activateAvatar = async () => {
    if (!userId) {
      addLog("ERROR: User ID is required to activate avatar");
      return;
    }
    
    setLoading(true);
    addLog(`Activating avatar for userId: ${userId}`);
    
    try {
      const result = await setAvatarActive({
        userId,
        isActive: true
      });
      
      addLog(`Avatar activated: ${result.success}`);
    } catch (error) {
      addLog(`ERROR activating avatar: ${error}`);
    } finally {
      setLoading(false);
    }
  };
  
  const addLog = (message: string) => {
    setLogHistory(prev => [...prev, `${new Date().toISOString().substring(11, 23)} - ${message}`]);
  };
  
  const clearLogs = () => {
    setLogHistory([]);
  };
  
  return (
    <div className="container max-w-4xl mx-auto py-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>AI Avatar Test Panel</CardTitle>
          <CardDescription>Test the AI Avatar functionality directly</CardDescription>
          
          <div className="flex space-x-4 pt-2">
            <Button 
              variant={viewMode === "form" ? "default" : "outline"}
              onClick={() => setViewMode("form")}
            >
              Test Form
            </Button>
            <Button 
              variant={viewMode === "debug" ? "default" : "outline"}
              onClick={() => setViewMode("debug")}
            >
              Debug Info
            </Button>
          </div>
        </CardHeader>
        
        {viewMode === "form" && (
          <CardContent>
            <div className="space-y-4">
              {/* Workspace selection */}
              <div className="space-y-2">
                <Label htmlFor="workspace">Workspace</Label>
                <Select onValueChange={handleWorkspaceChange} value={selectedWorkspace || ""}>
                  <SelectTrigger id="workspace">
                    <SelectValue placeholder="Select workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map((workspace: Workspace) => (
                      <SelectItem key={workspace._id} value={workspace._id}>
                        {workspace.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Conversation selection */}
              <div className="space-y-2">
                <Label htmlFor="conversation">Conversation</Label>
                <Select 
                  onValueChange={(value: string) => setConversationId(value)} 
                  value={conversationId || ""}
                  disabled={!selectedWorkspace}
                >
                  <SelectTrigger id="conversation">
                    <SelectValue placeholder="Select conversation" />
                  </SelectTrigger>
                  <SelectContent>
                    {conversations.map((convo: Conversation) => (
                      <SelectItem key={convo._id} value={convo._id}>
                        {convo.name || `Conversation ${convo._id.slice(-6)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Avatar user selection */}
              <div className="space-y-2">
                <Label htmlFor="member">Avatar Owner (Member)</Label>
                <Select 
                  onValueChange={(value: string) => {
                    const member = members.find((m: Member) => m._id === value);
                    if (member) {
                      setReceiverMemberId(value);
                      setUserId(member.userId);
                    }
                  }} 
                  value={receiverMemberId || ""}
                  disabled={!selectedWorkspace}
                >
                  <SelectTrigger id="member">
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member: Member) => (
                      <SelectItem key={member._id} value={member._id}>
                        {member.name || member.userId.slice(-10)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Message text */}
              <div className="space-y-2">
                <Label htmlFor="message">Test Message</Label>
                <Textarea
                  id="message"
                  value={messageText}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMessageText(e.target.value)}
                  rows={3}
                  placeholder="Enter a message to test the avatar response"
                />
              </div>
            </div>
          </CardContent>
        )}
        
        {viewMode === "debug" && (
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Avatar Setup Status</h3>
                {checkAvatarSetup ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-4 h-4 rounded-full ${checkAvatarSetup.environmentSetup.openai ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span>OpenAI API Key: {checkAvatarSetup.environmentSetup.openai ? 'Configured' : 'Missing'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-4 h-4 rounded-full ${checkAvatarSetup.environmentSetup.pinecone ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span>Pinecone Setup: {checkAvatarSetup.environmentSetup.pinecone ? 'Configured' : 'Missing'}</span>
                    </div>
                    <div className="mt-2">
                      <h4 className="font-medium">Available Functions:</h4>
                      <div className="text-sm text-slate-600 max-h-32 overflow-y-auto">
                        <div>Avatar: {checkAvatarSetup.apiAvailable.avatar.join(", ")}</div>
                        <div>Messages: {checkAvatarSetup.apiAvailable.messages.join(", ")}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500">Loading setup information...</div>
                )}
              </div>
              
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold">Manual Form Values</h3>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="userId">User ID</Label>
                    <Input
                      id="userId"
                      value={userId}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setUserId(e.target.value)}
                      placeholder="User ID for avatar"
                    />
                  </div>
                  <div>
                    <Label htmlFor="manualWorkspaceId">Workspace ID</Label>
                    <Input
                      id="manualWorkspaceId"
                      value={workspaceId}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setWorkspaceId(e.target.value)}
                      placeholder="Workspace ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="manualConversationId">Conversation ID</Label>
                    <Input
                      id="manualConversationId"
                      value={conversationId}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setConversationId(e.target.value)}
                      placeholder="Conversation ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="manualMemberId">Receiver Member ID</Label>
                    <Input
                      id="manualMemberId"
                      value={receiverMemberId}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setReceiverMemberId(e.target.value)}
                      placeholder="Receiver Member ID"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        )}
        
        <CardFooter className="flex justify-between">
          <div className="flex space-x-4">
            <Button 
              onClick={handleRunTest} 
              disabled={loading || !userId || !conversationId || !workspaceId || !receiverMemberId}
            >
              {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Test Avatar Response
            </Button>
            
            <Button 
              variant="outline" 
              onClick={activateAvatar}
              disabled={loading || !userId}
            >
              Activate Avatar
            </Button>
          </div>
          
          <Button variant="destructive" onClick={clearLogs}>
            Clear Logs
          </Button>
        </CardFooter>
      </Card>
      
      {/* Test Result Card */}
      {testResult && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Result</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-slate-100 p-4 rounded overflow-auto max-h-48">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
      
      {/* Logs Card */}
      <Card>
        <CardHeader>
          <CardTitle>Test Logs</CardTitle>
          <CardDescription>Activity and error logs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-black text-green-400 font-mono p-4 rounded h-64 overflow-auto">
            {logHistory.length > 0 ? (
              logHistory.map((log, idx) => (
                <div key={idx} className={log.includes("ERROR") ? "text-red-400" : ""}>
                  {log}
                </div>
              ))
            ) : (
              <div className="text-slate-500">No logs yet. Run a test to see logs.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 