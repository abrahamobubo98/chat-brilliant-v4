"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// Define types for our component
interface Workspace {
  _id: string;
  name: string;
}

interface Conversation {
  _id: string;
  name?: string;
}

interface Member {
  _id: string;
  userId: string;
  name?: string;
}

// Define a proper type for context samples
interface ContextSample {
  text: string;
  score?: number;
  source?: string;
  [key: string]: unknown;
}

interface TestResult {
  success: boolean;
  message?: string;
  contextFound?: boolean;
  contextCount?: number;
  contextSamples?: ContextSample[];
  response?: string;
}

// Mock data for testing when API endpoints aren't available
const MOCK_WORKSPACES: Workspace[] = [
  { _id: "workspace1", name: "Workspace 1" },
  { _id: "workspace2", name: "Workspace 2" }
];

const MOCK_CONVERSATIONS: Record<string, Conversation[]> = {
  "workspace1": [
    { _id: "conv1", name: "General" },
    { _id: "conv2", name: "Random" }
  ],
  "workspace2": [
    { _id: "conv3", name: "Support" }
  ]
};

const MOCK_MEMBERS: Record<string, Member[]> = {
  "workspace1": [
    { _id: "member1", userId: "user1", name: "John Doe" },
    { _id: "member2", userId: "user2", name: "Jane Smith" }
  ],
  "workspace2": [
    { _id: "member3", userId: "user3", name: "Bob Jones" }
  ]
};

export function AvatarTestPanel() {
  // State for the test form
  const [workspace, setWorkspace] = useState<string>("");
  const [conversation, setConversation] = useState<string>("");
  const [message, setMessage] = useState<string>("Hello, how are you today?");
  const [receiver, setReceiver] = useState<string>("");
  const [testMode, setTestMode] = useState<"respond" | "context" | "activate">("respond");
  const [busy, setBusy] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [avatarActive, setAvatarActive] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  // Get data (using mock data since the API structure doesn't match)
  // Replace these with actual API calls when available
  const workspaces = MOCK_WORKSPACES;
  const conversations = workspace ? MOCK_CONVERSATIONS[workspace] || [] : [];
  const members = workspace ? MOCK_MEMBERS[workspace] || [] : [];
  
  const sendMessage = useMutation(api.messages.send);
  
  // Track avatar usage for analytics
  const trackAvatarUsage = useMutation(api.avatarUsage.track);
  
  // Auto scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);
  
  // Handlers
  const handleWorkspaceChange = (value: string) => {
    setWorkspace(value);
    setConversation("");
    setReceiver("");
  };
  
  const handleRunTest = async () => {
    if (!workspace || !conversation || !message || !receiver) {
      alert("Please fill in all required fields before running the test.");
      return;
    }
    
    setBusy(true);
    addLog(`Starting ${testMode} test...`);
    
    try {
      // Track the test in analytics
      await trackAvatarUsage({
        action: testMode,
        workspaceId: workspace,
        success: true
      });
      
      if (testMode === "activate") {
        // Simulate avatar activation
        setAvatarActive(true);
        
        setTestResult({
          success: true,
          message: "Avatar activated successfully"
        });
        
        addLog(`Avatar activated successfully.`);
      } else if (testMode === "respond") {
        // Simulate sending a message via the available API
        await sendMessage({
          text: message,
          conversationId: conversation,
          isAvatarMessage: true
        });
        
        setTestResult({
          success: true,
          message: "Response sent successfully"
        });
        
        addLog(`Response generated and sent successfully.`);
      } else if (testMode === "context") {
        // Simulate context retrieval
        setTestResult({
          success: true,
          contextFound: true,
          contextCount: 3,
          contextSamples: [
            { text: "This is a sample context message 1", score: 0.95 },
            { text: "This is a sample context message 2", score: 0.88 },
            { text: "This is a sample context message 3", score: 0.75 }
          ]
        });
        
        addLog(`Context retrieval complete. Found 3 relevant messages.`);
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: String(error)
      });
      addLog(`Error: ${error}`);
      
      // Track error in analytics
      await trackAvatarUsage({
        action: testMode,
        workspaceId: workspace,
        success: false,
        error: String(error)
      });
    } finally {
      setBusy(false);
    }
  };
  
  const activateAvatar = async (active: boolean) => {
    try {
      setBusy(true);
      addLog(`${active ? 'Activating' : 'Deactivating'} avatar...`);
      
      // Simulated avatar activation
      setAvatarActive(active);
      
      // Track in analytics
      await trackAvatarUsage({
        action: active ? "activate" : "deactivate",
        success: true
      });
      
      addLog(`Avatar ${active ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      addLog(`Error: ${error}`);
      
      // Track error
      await trackAvatarUsage({
        action: active ? "activate" : "deactivate",
        success: false,
        error: String(error)
      });
    } finally {
      setBusy(false);
    }
  };
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
  };
  
  const clearLogs = () => {
    setLogs([]);
  };
  
  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">AI Avatar Testing</h1>
        <div className="flex items-center gap-2">
          <Label htmlFor="avatar-active">Avatar Active</Label>
          <Switch 
            id="avatar-active" 
            checked={avatarActive}
            onCheckedChange={activateAvatar}
            disabled={busy}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
            <CardDescription>
              Configure your test parameters to try out different aspects of the AI avatar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-4 mb-4">
              <Button 
                variant={testMode === "respond" ? "default" : "outline"}
                onClick={() => setTestMode("respond")}
              >
                Response Test
              </Button>
              <Button 
                variant={testMode === "context" ? "default" : "outline"}
                onClick={() => setTestMode("context")}
              >
                Context Retrieval
              </Button>
              <Button 
                variant={testMode === "activate" ? "default" : "outline"}
                onClick={() => setTestMode("activate")}
              >
                Activation
              </Button>
            </div>
            
            {testMode !== "activate" && (
              <div className="space-y-2">
                <Label htmlFor="message">Test Message</Label>
                <Input
                  id="message"
                  value={message}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessage(e.target.value)}
                  placeholder="Enter a message to test..."
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="workspace">Workspace</Label>
              <select 
                id="workspace" 
                className="w-full p-2 border rounded"
                value={workspace} 
                onChange={(e) => handleWorkspaceChange(e.target.value)}
              >
                <option value="">Select workspace</option>
                {workspaces.map((w: Workspace) => (
                  <option key={w._id} value={w._id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
              
            <div className="space-y-2">
              <Label htmlFor="conversation">Conversation</Label>
              <select 
                id="conversation" 
                className="w-full p-2 border rounded"
                value={conversation} 
                onChange={(e) => setConversation(e.target.value)}
                disabled={!workspace || conversations.length === 0}
              >
                <option value="">Select conversation</option>
                {conversations.map((c: Conversation) => (
                  <option key={c._id} value={c._id}>
                    {c.name || `Conversation ${c._id.toString().slice(-4)}`}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="member">Receiver (Member)</Label>
              <select 
                id="member" 
                className="w-full p-2 border rounded"
                value={receiver} 
                onChange={(e) => setReceiver(e.target.value)}
                disabled={!workspace || members.length === 0}
              >
                <option value="">Select receiver</option>
                {members.map((m: Member) => (
                  <option key={m._id} value={m._id}>
                    {m.name || `Member ${m._id.toString().slice(-4)}`}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleRunTest} 
              disabled={busy || (!workspace || !conversation || !message || !receiver) && testMode !== "activate"}
              className="w-full"
            >
              {busy ? "Running Test..." : `Run ${testMode.charAt(0).toUpperCase() + testMode.slice(1)} Test`}
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              View the results of your test and execution logs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {testResult && (
              <div className="space-y-3 mb-4 p-4 border rounded">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-sm ${testResult.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {testResult.success ? "Success" : "Failed"}
                  </span>
                  
                  {testMode === "context" && testResult.contextCount !== undefined && (
                    <span className="px-2 py-1 rounded text-sm bg-blue-100 text-blue-800">
                      {testResult.contextCount} context item(s)
                    </span>
                  )}
                </div>
                
                {testMode === "context" && testResult.contextSamples && testResult.contextSamples.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-medium">Retrieved Context</h3>
                    <div className="rounded-md border p-3 max-h-[200px] overflow-y-auto">
                      <ul className="space-y-2">
                        {testResult.contextSamples.map((item, idx) => (
                          <li key={idx} className="text-sm border-b pb-2 last:border-b-0 last:pb-0">
                            <div className="flex justify-between mb-1">
                              <span className="font-medium">Message {idx+1}</span>
                              <span className="text-xs text-gray-500">Score: {item.score}</span>
                            </div>
                            <p className="text-xs text-gray-500">{item.text}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                
                {testResult.message && (
                  <p className={`text-sm ${testResult.success ? "text-gray-500" : "text-red-500"}`}>
                    {testResult.message}
                  </p>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Execution Logs</h3>
                <Button variant="outline" size="sm" onClick={clearLogs}>Clear</Button>
              </div>
              <div className="h-[200px] rounded-md border p-3 overflow-auto">
                {logs.length === 0 ? (
                  <p className="text-sm text-gray-500">No logs yet.</p>
                ) : (
                  <div className="space-y-1">
                    {logs.map((log, idx) => (
                      <p key={idx} className="text-xs font-mono">
                        {log}
                      </p>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 