import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

// Activate a user's AI avatar
export const activateAvatar = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = args;
    
    console.log(`[AVATAR:ACTIVATE] Activating avatar for user: ${userId}`);
    
    // Check if avatar state exists
    const existingAvatarState = await ctx.db
      .query("avatarStates")
      .withIndex("by_user_id", q => q.eq("userId", userId))
      .first();
      
    if (existingAvatarState) {
      console.log(`[AVATAR:ACTIVATE] Updating existing avatar state for user: ${userId}`);
      // Update existing avatar state
      await ctx.db.patch(existingAvatarState._id, {
        isActive: true,
        lastActive: Date.now()
      });
    } else {
      console.log(`[AVATAR:ACTIVATE] Creating new avatar state for user: ${userId}`);
      // Create new avatar state
      await ctx.db.insert("avatarStates", {
        userId: userId,
        isActive: true,
        lastActive: Date.now(),
        personalityProfile: undefined
      });
    }
    
    console.log(`[AVATAR:ACTIVATE] Successfully activated avatar for user: ${userId}`);
    return { success: true, isActive: true };
  },
});

// Deactivate a user's AI avatar
export const deactivateAvatar = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = args;
    
    console.log(`[AVATAR:DEACTIVATE] Deactivating avatar for user: ${userId}`);
    
    const avatarState = await ctx.db
      .query("avatarStates")
      .withIndex("by_user_id", q => q.eq("userId", userId))
      .first();
      
    if (avatarState) {
      console.log(`[AVATAR:DEACTIVATE] Found avatar state, setting to inactive: ${userId}`);
      await ctx.db.patch(avatarState._id, {
        isActive: false,
        lastActive: Date.now()
      });
    } else {
      console.log(`[AVATAR:DEACTIVATE] No avatar state found for user: ${userId}`);
    }
    
    return { success: true, isActive: false };
  },
});

// Check if a user's avatar is active
export const isAvatarActive = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = args;
    
    console.log(`[AVATAR:CHECK] Checking if avatar is active for user: ${userId}`);
    
    const avatarState = await ctx.db
      .query("avatarStates")
      .withIndex("by_user_id", q => q.eq("userId", userId))
      .first();
    
    const isActive = !!avatarState?.isActive;
    console.log(`[AVATAR:CHECK] Avatar active status for ${userId}: ${isActive}`);
    
    return isActive;
  },
});

// Handle automated response to a message
export const handleAutomatedResponse = mutation({
  args: {
    userId: v.string(),
    messageText: v.string(),
    conversationId: v.id("conversations"),
    workspaceId: v.id("workspaces"),
    receiverMemberId: v.id("members"),
  },
  handler: async (ctx, args) => {
    const { userId, messageText, conversationId, workspaceId, receiverMemberId } = args;
    
    console.log(`[AVATAR:HANDLE_RESPONSE] Received request for automated response.
      userId: ${userId}
      messageText: ${messageText.substring(0, 50)}...
      conversationId: ${conversationId}
      workspaceId: ${workspaceId}
      receiverMemberId: ${receiverMemberId}
      timestamp: ${new Date().toISOString()}
    `);
    
    // 1. Check if avatar is active
    console.log(`[AVATAR:HANDLE_RESPONSE] Checking if avatar is active for user: ${userId}`);
    const avatarState = await ctx.db
      .query("avatarStates")
      .withIndex("by_user_id", q => q.eq("userId", userId))
      .first();
      
    if (!avatarState) {
      console.log(`[AVATAR:HANDLE_RESPONSE] No avatar state found for user: ${userId}`);
      return { 
        responded: false,
        message: "Avatar state not found" 
      };
    }
    
    console.log(`[AVATAR:HANDLE_RESPONSE] Found avatar state:
      isActive: ${avatarState.isActive}
      lastActive: ${new Date(avatarState.lastActive).toISOString()}
      hasPersonalityProfile: ${!!avatarState.personalityProfile}
    `);
    
    if (!avatarState.isActive) {
      console.log(`[AVATAR:HANDLE_RESPONSE] Avatar not active for user: ${userId}`);
      return { 
        responded: false,
        message: "Avatar is not active" 
      };
    }
    
    console.log(`[AVATAR:HANDLE_RESPONSE] Avatar is active. Scheduling AI response generation.`);
    
    // 2. Schedule the AI response generation
    try {
      // Get the profile text if it exists, otherwise use empty string
      const profileText = avatarState.personalityProfile || "";
      const profilePreview = profileText.length > 0 
        ? `${profileText.substring(0, 20)}...` 
        : "Not set";
      
      console.log(`[AVATAR:HANDLE_RESPONSE] About to schedule task with:
        messageText length: ${messageText.length} chars
        conversationIdStr: ${conversationId.toString()}
        workspaceIdStr: ${workspaceId.toString()}
        receiverMemberIdStr: ${receiverMemberId.toString()}
        userProfile: ${profilePreview}
      `);
      
      const scheduledTask = await ctx.scheduler.runAfter(0, api.avatar.processMessageAndRespond, {
        messageText,
        conversationIdStr: conversationId.toString(),
        workspaceIdStr: workspaceId.toString(),
        receiverMemberIdStr: receiverMemberId.toString(),
        userProfile: profileText
      });
      
      console.log(`[AVATAR:HANDLE_RESPONSE] Successfully scheduled response generation. Task ID: ${scheduledTask}`);
      
      // 3. Update last active timestamp
      await ctx.db.patch(avatarState._id, {
        lastActive: Date.now()
      });
      
      return { 
        responded: true,
        message: "Avatar will respond shortly" 
      };
    } catch (error) {
      console.error(`[AVATAR:HANDLE_RESPONSE] Error scheduling response: ${error}`);
      console.error(`[AVATAR:HANDLE_RESPONSE] Stack trace: ${(error as Error).stack || 'No stack trace'}`);
      return {
        responded: false,
        message: `Error scheduling response: ${error}`
      };
    }
  },
});

// Process message and generate AI response
export const processMessageAndRespond = action({
  args: {
    messageText: v.string(),
    conversationIdStr: v.string(),
    workspaceIdStr: v.string(),
    receiverMemberIdStr: v.string(),
    userProfile: v.string()
  },
  handler: async (ctx, args) => {
    const { messageText, conversationIdStr, workspaceIdStr, receiverMemberIdStr, userProfile } = args;
    
    console.log(`[AVATAR:PROCESS] Starting to process message and generate response.
      messageText: ${messageText.substring(0, 50)}...
      conversationIdStr: ${conversationIdStr}
      workspaceIdStr: ${workspaceIdStr}
      receiverMemberIdStr: ${receiverMemberIdStr}
      userProfile length: ${userProfile.length}
      timestamp: ${new Date().toISOString()}
    `);
    
    try {
      // Convert string IDs to their proper types for database operations
      console.log(`[AVATAR:PROCESS] Converting string IDs to proper types`);
      const workspaceId = workspaceIdStr as unknown as Id<"workspaces">;
      const conversationId = conversationIdStr as unknown as Id<"conversations">;
      const receiverMemberId = receiverMemberIdStr as unknown as Id<"members">;
      
      // Generate AI response
      console.log(`[AVATAR:PROCESS] Generating AI response...`);
      let response;
      try {
        response = await generateSmartAIResponse(messageText, workspaceIdStr, userProfile);
        console.log(`[AVATAR:PROCESS] Successfully generated response: ${response.substring(0, 50)}...`);
      } catch (genError) {
        console.error(`[AVATAR:PROCESS] Error during AI response generation: ${genError}`);
        console.error(`[AVATAR:PROCESS] Generation error stack: ${(genError as Error).stack || 'No stack trace'}`);
        response = `I'm sorry, I couldn't process your message properly. There was a technical error: ${genError}`;
      }
      
      // Send the AI message
      console.log(`[AVATAR:PROCESS] Sending AI message via messages.sendAIMessage`);
      try {
        // Check if sendAIMessage exists
        if (!api.messages.sendAIMessage) {
          console.error(`[AVATAR:PROCESS] api.messages.sendAIMessage is undefined!`);
          console.log(`[AVATAR:PROCESS] Available functions in api.messages:`, Object.keys(api.messages));
          throw new Error("sendAIMessage function not found in API");
        }
        
        console.log(`[AVATAR:PROCESS] About to call sendAIMessage with:
          body length: ${response.length} chars
          memberId: ${receiverMemberId}
          workspaceId: ${workspaceId}
          conversationId: ${conversationId}
          timestamp: ${new Date().toISOString()}
        `);
        
        const messageId = await ctx.runMutation(api.messages.sendAIMessage, {
          body: response,
          memberId: receiverMemberId,
          workspaceId: workspaceId,
          conversationId: conversationId
        });
        
        console.log(`[AVATAR:PROCESS] Successfully sent AI message. Message ID: ${messageId}`);
      } catch (sendError) {
        console.error(`[AVATAR:PROCESS] Error sending AI message: ${sendError}`);
        console.error(`[AVATAR:PROCESS] Send error stack: ${(sendError as Error).stack || 'No stack trace'}`);
        throw sendError;
      }
      
      return { success: true, response };
    } catch (error) {
      console.error(`[AVATAR:PROCESS] Error in processMessageAndRespond: ${error}`);
      console.error(`[AVATAR:PROCESS] Error stack: ${(error as Error).stack || 'No stack trace'}`);
      return { success: false, error: String(error) };
    }
  },
});

// Set or update a user's personality profile
export const updatePersonalityProfile = mutation({
  args: {
    userId: v.string(),
    personalityProfile: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, personalityProfile } = args;
    
    console.log(`[AVATAR:UPDATE_PROFILE] Updating personality profile for user: ${userId}`);
    
    const avatarState = await ctx.db
      .query("avatarStates")
      .withIndex("by_user_id", q => q.eq("userId", userId))
      .first();
      
    if (avatarState) {
      console.log(`[AVATAR:UPDATE_PROFILE] Updating existing profile for: ${userId}`);
      await ctx.db.patch(avatarState._id, {
        personalityProfile
      });
      return { success: true };
    } else {
      console.log(`[AVATAR:UPDATE_PROFILE] Creating new profile for: ${userId}`);
      // Create new avatar state with personality profile
      await ctx.db.insert("avatarStates", {
        userId,
        isActive: false, // Default to inactive
        lastActive: Date.now(),
        personalityProfile
      });
      return { success: true };
    }
  },
});

// Helper function that leverages vector search to generate an AI response
async function generateSmartAIResponse(
  messageText: string, 
  workspaceId: string, 
  userProfile: string
): Promise<string> {
  console.log(`[AVATAR:GENERATE] Generating smart AI response.
    messageText: ${messageText.substring(0, 50)}...
    workspaceId: ${workspaceId}
    userProfile: ${userProfile ? 'Provided' : 'Not provided'}
  `);
  
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error(`[AVATAR:GENERATE] OpenAI API key is missing!`);
      throw new Error("OpenAI API key is required but not configured");
    }
    
    console.log(`[AVATAR:GENERATE] OpenAI API key is available`);
    
    // In a real implementation, we would:
    // 1. Create an embedding for the message
    // 2. Find relevant context from the vector database
    // 3. Use this context to generate a more intelligent response
    
    const systemPrompt = `${userProfile || "You are a helpful AI assistant."}
You are responding to a message in a chat workspace. Keep your responses concise, helpful, and conversational.
`;

    console.log(`[AVATAR:GENERATE] Making OpenAI API request`);
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: systemPrompt 
          },
          { 
            role: "user", 
            content: messageText 
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`[AVATAR:GENERATE] OpenAI API error: ${error}`);
      throw new Error(`OpenAI API error: ${error}`);
    }
    
    console.log(`[AVATAR:GENERATE] Got successful response from OpenAI`);
    const result = await response.json();
    const generatedText = result.choices[0].message.content;
    console.log(`[AVATAR:GENERATE] Generated AI text: ${generatedText.substring(0, 50)}...`);
    
    // Format the text as a Quill Delta object in JSON string format
    const deltaObj = {
      ops: [
        { insert: generatedText }
      ]
    };
    const jsonString = JSON.stringify(deltaObj);
    
    console.log(`[AVATAR:GENERATE] Formatted as Delta JSON: ${jsonString.substring(0, 50)}...`);
    
    return jsonString;
  } catch (error) {
    console.error(`[AVATAR:GENERATE] Error generating response: ${error}`);
    
    // Even for error responses, return a properly formatted Delta JSON
    const errorDelta = {
      ops: [
        { insert: `I'm sorry, I couldn't process your message due to a technical error: ${error}` }
      ]
    };
    return JSON.stringify(errorDelta);
  }
}

// Debug utility to check avatar setup and dependencies
export const checkAvatarSetup = query({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    environmentSetup: {
      openai: boolean;
      pinecone: boolean;
    };
    apiAvailable: {
      avatar: string[];
      messages: string[];
    };
  }> => {
    console.log(`[AVATAR:DEBUG] Checking avatar setup`);
    
    // Check environment variables
    const openaiApiKey = process.env.OPENAI_API_KEY;
    console.log(`[AVATAR:DEBUG] OpenAI API key configured: ${!!openaiApiKey}`);
    
    // Check for vector database setup
    const pineconeApiKey = process.env.PINECONE_API_KEY;
    const pineconeEnvironment = process.env.PINECONE_ENVIRONMENT;
    const pineconeIndex = process.env.PINECONE_INDEX;
    console.log(`[AVATAR:DEBUG] Pinecone configured: ${!!pineconeApiKey && !!pineconeEnvironment && !!pineconeIndex}`);
    
    // Check API availability
    console.log(`[AVATAR:DEBUG] Available avatar functions:`, Object.keys(api.avatar));
    console.log(`[AVATAR:DEBUG] Available message functions:`, Object.keys(api.messages));
    
    // Check database tables
    try {
      const totalAvatarStates = await ctx.db.query("avatarStates").collect();
      console.log(`[AVATAR:DEBUG] avatarStates table exists with ${totalAvatarStates.length} records`);
    } catch (error) {
      console.error(`[AVATAR:DEBUG] Error accessing avatarStates table: ${error}`);
    }
    
    // Check specific user if provided
    if (args.userId) {
      const avatarState = await ctx.db
        .query("avatarStates")
        .withIndex("by_user_id", q => q.eq("userId", args.userId as string))
        .first();
      
      if (avatarState) {
        const profilePreview = avatarState.personalityProfile 
          ? avatarState.personalityProfile.substring(0, 50) 
          : 'Not set';
        
        console.log(`[AVATAR:DEBUG] Found avatar state for user ${args.userId}:
          isActive: ${avatarState.isActive}
          lastActive: ${new Date(avatarState.lastActive).toISOString()}
          personalityProfile: ${profilePreview}
        `);
      } else {
        console.log(`[AVATAR:DEBUG] No avatar state found for user ${args.userId}`);
      }
    }
    
    return {
      environmentSetup: {
        openai: !!openaiApiKey,
        pinecone: !!pineconeApiKey && !!pineconeEnvironment && !!pineconeIndex
      },
      apiAvailable: {
        avatar: Object.keys(api.avatar),
        messages: Object.keys(api.messages)
      }
    };
  }
});

// Manual test function to trigger the avatar flow
export const testAvatarResponse = mutation({
  args: {
    userId: v.string(),
    messageText: v.string(),
    conversationId: v.id("conversations"),
    workspaceId: v.id("workspaces"),
    receiverMemberId: v.id("members"),
  },
  handler: async (ctx, args): Promise<{
    directMethod?: string;
    result?: any;
    error?: string;
    stack?: string;
  }> => {
    const { userId, messageText, conversationId, workspaceId, receiverMemberId } = args;
    
    console.log(`[AVATAR:TEST] Manual test initiated with:
      userId: ${userId}
      messageText: ${messageText}
      conversationId: ${conversationId}
      workspaceId: ${workspaceId}
      receiverMemberId: ${receiverMemberId}
      timestamp: ${new Date().toISOString()}
    `);
    
    try {
      // 1. First check if avatar state exists and is active
      console.log(`[AVATAR:TEST] Checking if avatar exists and is active`);
      const avatarState = await ctx.db
        .query("avatarStates")
        .withIndex("by_user_id", q => q.eq("userId", userId))
        .first();
        
      if (!avatarState) {
        console.log(`[AVATAR:TEST] Creating temporary avatar state for test`);
        await ctx.db.insert("avatarStates", {
          userId,
          isActive: true,
          lastActive: Date.now(),
          personalityProfile: "You are a helpful assistant for testing purposes."
        });
      } else if (!avatarState.isActive) {
        console.log(`[AVATAR:TEST] Activating existing avatar for test`);
        await ctx.db.patch(avatarState._id, {
          isActive: true,
          lastActive: Date.now()
        });
      }
      
      // 2. Directly call the functions to test each step
      // First try the normal handleAutomatedResponse function
      console.log(`[AVATAR:TEST] Calling handleAutomatedResponse`);
      const handleResult = await ctx.runMutation(api.avatar.handleAutomatedResponse, {
        userId,
        messageText,
        conversationId,
        workspaceId,
        receiverMemberId
      });
      
      console.log(`[AVATAR:TEST] handleAutomatedResponse result:`, handleResult);
      
      // If the normal route didn't work, try to directly call processMessageAndRespond
      if (!handleResult.responded) {
        console.log(`[AVATAR:TEST] Normal flow failed. Trying direct processMessageAndRespond call`);
        const processResult = await ctx.scheduler.runAfter(0, api.avatar.processMessageAndRespond, {
          messageText,
          conversationIdStr: conversationId.toString(),
          workspaceIdStr: workspaceId.toString(),
          receiverMemberIdStr: receiverMemberId.toString(),
          userProfile: "You are a helpful assistant for testing purposes."
        });
        
        return {
          directMethod: "processMessageAndRespond",
          result: processResult
        };
      }
      
      return {
        directMethod: "handleAutomatedResponse",
        result: handleResult
      };
    } catch (error) {
      console.error(`[AVATAR:TEST] Error in test function: ${error}`);
      console.error(`[AVATAR:TEST] Error stack: ${(error as Error).stack || 'No stack trace'}`);
      return {
        error: String(error),
        stack: (error as Error).stack || 'No stack trace'
      };
    }
  }
});

// Test function to generate a sample response for testing JSON formatting
export const testResponseFormat = query({
  args: {
    messageText: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    rawText: string;
    formattedJson: string;
  }> => {
    const testMessage = args.messageText || "Hello, how are you today?";
    
    console.log(`[AVATAR:TEST_FORMAT] Testing response format with message: ${testMessage}`);
    
    // Generate a sample response
    const sampleText = "This is a test response to verify the JSON formatting is working correctly. The frontend should be able to parse this without errors.";
    
    // Format as Delta JSON
    const deltaObj = {
      ops: [
        { insert: sampleText }
      ]
    };
    const formattedJson = JSON.stringify(deltaObj);
    
    console.log(`[AVATAR:TEST_FORMAT] Sample formatted JSON: ${formattedJson.substring(0, 50)}...`);
    
    return {
      rawText: sampleText,
      formattedJson: formattedJson
    };
  }
}); 