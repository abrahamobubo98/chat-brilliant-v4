import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import OpenAI from "openai";

// Default avatar personalities for quick selection
const DEFAULT_PERSONALITIES = {
  "helpful": "You are a helpful AI assistant who responds to messages in a friendly, warm, and constructive manner. You are patient, knowledgeable, and always aim to provide useful information or assistance.",
  "expert": "You are an expert AI assistant with deep technical knowledge. You provide detailed, accurate, and comprehensive responses with a focus on precision and technical excellence. Your tone is professional and authoritative.",
  "creative": "You are a creative and imaginative AI assistant who thinks outside the box. You offer innovative ideas and perspectives, using colorful language and expressive communication. You're enthusiastic and energetic in your responses.",
  "concise": "You are a concise AI assistant who values brevity and clarity. You provide short, direct answers that get straight to the point without unnecessary elaboration. Your communication style is efficient and practical.",
  "friendly": "You are a friendly, casual AI assistant who communicates like a helpful friend. Your tone is conversational, warm, and approachable, using casual language and occasionally adding humor when appropriate."
};

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

// Handle automated response generation for AI avatars
export const handleAutomatedResponse = mutation({
  args: {
    userId: v.string(),
    messageText: v.string(),
    conversationId: v.id("conversations"),
    workspaceId: v.id("workspaces"),
    receiverMemberId: v.id("members"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; messageId?: Id<"messages">; reason?: string }> => {
    const { 
      userId, 
      messageText, 
      conversationId, 
      workspaceId, 
      receiverMemberId 
    } = args;
    
    console.log(`[AVATAR:HANDLE] Handling automated response
      userId: ${userId}
      messageText: ${messageText.substring(0, 50)}...
      conversationId: ${conversationId}
      workspaceId: ${workspaceId}
      receiverMemberId: ${receiverMemberId}
    `);
    
    try {
      // Get the avatar config, including personality profile
      const avatarState = await ctx.db
        .query("avatarStates")
        .withIndex("by_user_id", (q) => q.eq("userId", userId))
        .unique();
      
      if (!avatarState || !avatarState.isActive) {
        console.log(`[AVATAR:HANDLE] Avatar not active for user ${userId}`);
        return { success: false, reason: "Avatar not active" };
      }
      
      console.log(`[AVATAR:HANDLE] Found active avatar with${avatarState.personalityProfile ? '' : 'out'} personality profile`);
      
      // Fetch recent messages for better context (up to 20 messages)
      const recentMessages = await ctx.db
        .query("messages")
        .withIndex("by_conversation_id", (q) => q.eq("conversationId", conversationId))
        .order("desc")
        .take(20);
      
      // Sort messages chronologically for better context
      recentMessages.sort((a, b) => a._creationTime - b._creationTime);
      
      // Format recent messages for context
      const conversationHistory = recentMessages
        .map(msg => {
          const isUserMessage = msg.memberId === receiverMemberId;
          return `${isUserMessage ? 'You' : 'Them'}: ${msg.body}`;
        })
        .join('\n');
      
      console.log(`[AVATAR:HANDLE] Fetched ${recentMessages.length} recent messages for context`);
      
      // Get or create user personality profile
      let personalityProfile = avatarState.personalityProfile || "";
      
      // If no profile exists, try to create one from recent messages
      if (!personalityProfile && recentMessages.length > 0) {
        try {
          // Extract messages from the user (not the other person)
          const userMessages = recentMessages
            .filter(msg => msg.memberId === receiverMemberId)
            .map(msg => msg.body);
          
          if (userMessages.length >= 5) {
            // Create a personality profile from user messages
            personalityProfile = await generatePersonalityProfile(userMessages);
            
            // Store the personality profile for future use
            await ctx.db.patch(avatarState._id, {
              personalityProfile
            });
            
            console.log(`[AVATAR:HANDLE] Generated and saved new personality profile`);
          }
        } catch (profileError) {
          console.error(`[AVATAR:HANDLE] Error generating personality profile: ${profileError}`);
          // Continue with empty profile if generation fails
        }
      }
      
      // Generate the AI response with the user's personality profile
      const responseJson = await generateSmartAIResponse(
        messageText,
        workspaceId.toString(),
        personalityProfile,
        conversationHistory
      );
      
      console.log(`[AVATAR:HANDLE] Generated responseJson (length: ${responseJson.length})`);
      
      // Add the response to the conversation using sendAIMessage
      const messageId = await ctx.runMutation(api.messages.sendAIMessage, {
        conversationId,
        workspaceId,
        memberId: receiverMemberId,
        body: responseJson,
      });
      
      console.log(`[AVATAR:HANDLE] Created AI response message: ${messageId}`);
      
      return { success: true, messageId };
    } catch (error) {
      console.error(`[AVATAR:HANDLE] Error handling automated response: ${error}`);
      return { 
        success: false, 
        reason: `Error: ${error}` 
      };
    }
  }
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
  handler: async (ctx, args): Promise<{
    success: boolean;
    messageId?: Id<"messages">;
    responseLength?: number;
    error?: string;
  }> => {
    const { messageText, conversationIdStr, workspaceIdStr, receiverMemberIdStr, userProfile } = args;
    
    console.log(`[AVATAR:PROCESS] Processing message and generating response
      messageText: ${messageText.substring(0, 50)}...
      conversationId: ${conversationIdStr}
      workspaceId: ${workspaceIdStr}
      receiverMemberId: ${receiverMemberIdStr}
    `);
    
    try {
      // Generate AI response
      const responseJson = await generateSmartAIResponse(
        messageText,
        workspaceIdStr,
        userProfile
      );
      
      console.log(`[AVATAR:PROCESS] Generated response JSON (length: ${responseJson.length})`);
      
      // Add the response to the conversation
      const messageId: Id<"messages"> = await ctx.runMutation(api.messages.sendAIMessage, {
        conversationId: conversationIdStr as unknown as Id<"conversations">,
        workspaceId: workspaceIdStr as unknown as Id<"workspaces">,
        memberId: receiverMemberIdStr as unknown as Id<"members">,
        body: responseJson,
      });
      
      console.log(`[AVATAR:PROCESS] Added response to conversation. Message ID: ${messageId}`);
      
      return {
        success: true,
        messageId,
        responseLength: responseJson.length
      };
    } catch (error) {
      console.error(`[AVATAR:PROCESS] Error processing message: ${error}`);
      return {
        success: false,
        error: String(error)
      };
    }
  }
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

// Update avatar state and personality profile
export const updateAvatar = mutation({
  args: {
    isActive: v.boolean(),
    personalityType: v.optional(v.string()),
    customPersonality: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    const userId = identity.tokenIdentifier;
    
    console.log(`[AVATAR:UPDATE] Updating avatar for user ${userId}
      isActive: ${args.isActive}
      personalityType: ${args.personalityType || 'not provided'}
      customPersonality: ${args.customPersonality ? 'provided' : 'not provided'}
    `);
    
    // Get the personality profile text based on type or custom input
    let personalityProfile = null;
    
    if (args.personalityType && args.personalityType in DEFAULT_PERSONALITIES) {
      personalityProfile = DEFAULT_PERSONALITIES[args.personalityType as keyof typeof DEFAULT_PERSONALITIES];
    } else if (args.customPersonality) {
      personalityProfile = args.customPersonality;
    }
    
    // Find existing avatar state or create new one
    const existingState = await ctx.db
      .query("avatarStates")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();
    
    if (existingState) {
      console.log(`[AVATAR:UPDATE] Updating existing avatar state (${existingState._id})`);
      await ctx.db.patch(existingState._id, {
        isActive: args.isActive,
        lastActive: args.isActive ? Date.now() : existingState.lastActive || 0,
        ...(personalityProfile ? { personalityProfile } : {})
      });
    } else {
      console.log(`[AVATAR:UPDATE] Creating new avatar state`);
      await ctx.db.insert("avatarStates", {
        userId,
        isActive: args.isActive,
        lastActive: args.isActive ? Date.now() : 0,
        ...(personalityProfile ? { personalityProfile } : {})
      });
    }
    
    return { success: true };
  },
});

// Get a user's avatar configuration
export const getAvatarConfig = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    const userId = identity.tokenIdentifier;
    
    const avatarState = await ctx.db
      .query("avatarStates")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();
    
    return {
      isActive: avatarState?.isActive || false,
      personalityProfile: avatarState?.personalityProfile || null,
      lastActive: avatarState?.lastActive || null,
      availablePersonalities: Object.keys(DEFAULT_PERSONALITIES)
    };
  },
});

/**
 * Generate a personality profile for a user based on their messages
 */
async function generatePersonalityProfile(messages: string[]): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    console.log("[AVATAR:PROFILE] No OpenAI API key found, using default profile");
    return "Helpful and professional communicator with a clear, concise style.";
  }
  
  // Sample a maximum of 10 messages if there are too many
  const sampledMessages = messages.length > 10 
    ? messages.sort(() => 0.5 - Math.random()).slice(0, 10) 
    : messages;
    
  const messageText = sampledMessages.join("\n\n");
  
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    const prompt = `
Analyze these messages from a user and create a short personality profile (2-3 sentences) that captures their:
1. Communication style (formal/casual, verbose/concise, etc.)
2. Typical greeting patterns
3. Common expressions or vocabulary
4. Overall tone

Messages:
${messageText}

Create a concise personality profile that could be used to generate responses that sound like this person.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 150
    });
    
    return response.choices[0].message.content || "Friendly and professional communicator.";
  } catch (error) {
    console.error("[AVATAR:PROFILE] Error generating personality profile:", error);
    return "Friendly and professional communicator with a clear communication style.";
  }
}

// Update the generateSmartAIResponse function signature
async function generateSmartAIResponse(
  messageText: string, 
  workspaceId: string, 
  userProfile: string,
  conversationHistory: string = ""
): Promise<string> {
  console.log(`[AVATAR:GENERATE] Generating smart AI response.
    Message length: ${messageText.length}
    Has profile: ${Boolean(userProfile)}
    Has history: ${Boolean(conversationHistory)}
  `);
  
  let relevantContext = "";
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    console.error(`[AVATAR:GENERATE] Missing OpenAI API key`);
    throw new Error("OpenAI API key not configured");
  }
  
  try {
    console.log(`[AVATAR:GENERATE] Creating embedding for semantic search`);
    const messageEmbedding = await _createEmbedding(messageText);
    
    // 2. Find relevant context from the vector database
    console.log(`[AVATAR:GENERATE] Searching for relevant context in vector database`);
    const vectorResults = await _querySimilarVectors(
      messageEmbedding,
      5, // Get top 5 most relevant messages
      {
        workspaceId: workspaceId,
        type: "message"
      }
    );
    
    // 3. Format the context for the prompt
    if (vectorResults.matches && vectorResults.matches.length > 0) {
      console.log(`[AVATAR:GENERATE] Found ${vectorResults.matches.length} relevant messages`);
      
      // Extract and format the context from the vector search results
      relevantContext = vectorResults.matches
        .map((match: any) => match.metadata.text)
        .join("\n\n");
      
      console.log(`[AVATAR:GENERATE] Retrieved context length: ${relevantContext.length} chars`);
    } else {
      console.log(`[AVATAR:GENERATE] No relevant context found`);
    }
  } catch (vectorError) {
    console.warn(`[AVATAR:GENERATE] Error retrieving context (proceeding without): ${vectorError}`);
    // Continue without context if vector search fails
  }
  
  // Build system prompt with user profile and context (if available)
  const contextPrompt = relevantContext 
    ? `\nHere's some relevant context from previous messages:\n${relevantContext}\n\nUse this context to inform your response when relevant, but don't reference the context explicitly.`
    : "";
  
  const systemPrompt = `${userProfile || "You are a helpful AI assistant."}
You are responding to a message in a chat workspace. Keep your responses concise, helpful, and conversational.${contextPrompt}
`;

  try {
    console.log(`[AVATAR:GENERATE] Making OpenAI API request with ${contextPrompt ? 'context' : 'no context'}`);
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
    
    // Ensure the text is properly formatted as a Quill Delta object
    try {
      // First check if the message is already in Delta format (rarely happens but possible)
      const parsedBody = JSON.parse(generatedText);
      if (parsedBody.ops && Array.isArray(parsedBody.ops)) {
        console.log(`[AVATAR:GENERATE] Response was already in Delta format`);
        return generatedText;
      }
    } catch (parseError) {
      // Not valid JSON, which is expected for most AI responses that are plain text
      // Continue with formatting
    }
    
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

// Internal helper function to create embeddings - simplified version of the one in vector.ts
// This avoids circular dependencies
async function _createEmbedding(text: string): Promise<number[]> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error("OpenAI API key is required but not configured");
  }
  
  // Call OpenAI API to create embeddings
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openaiApiKey}`
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }
  
  const result = await response.json();
  return result.data[0].embedding;
}

// Internal helper function to search for similar vectors - simplified version of the one in vector.ts
// This avoids circular dependencies
async function _querySimilarVectors(
  vector: number[],
  topK: number,
  filter?: any
): Promise<any> {
  const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
  const PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT;
  const PINECONE_INDEX = process.env.PINECONE_INDEX;
  
  // Ensure we have the necessary Pinecone credentials
  if (!PINECONE_API_KEY || !PINECONE_ENVIRONMENT || !PINECONE_INDEX) {
    throw new Error("Pinecone credentials are required but not configured");
  }
  
  // Initialize Pinecone client
  const indexUrl = `https://${PINECONE_INDEX}-${PINECONE_ENVIRONMENT}.svc.${PINECONE_ENVIRONMENT}.pinecone.io`;
  
  // Query similar vectors from Pinecone
  const response = await fetch(`${indexUrl}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Api-Key": PINECONE_API_KEY
    },
    body: JSON.stringify({
      vector,
      topK,
      includeMetadata: true,
      filter,
      namespace: "messages"
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinecone API error: ${error}`);
  }
  
  return await response.json();
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
      if (!handleResult.success) {
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

// Get a user's avatar state
export const getUserAvatarState = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = args;
    
    const avatarState = await ctx.db
      .query("avatarStates")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();
    
    return avatarState;
  },
});

// Test utility function that allows testing various aspects of the avatar module
export const testResponseFormat = action({
  args: {
    messageText: v.string(),
    conversationId: v.id("conversations"),
    workspaceId: v.id("workspaces"),
    receiverMemberId: v.id("members")
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    messageId?: Id<"messages">;
    reason?: string;
    test?: {
      rawText: string;
      formattedResponse: string;
      isJson: boolean;
    };
  }> => {
    const { messageText, conversationId, workspaceId, receiverMemberId } = args;
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    const userId = identity.tokenIdentifier;
    
    console.log(`[AVATAR:TEST] Testing response format generation
      userId: ${userId}
      messageText: ${messageText.substring(0, 50)}...
      conversationId: ${conversationId}
      workspaceId: ${workspaceId}
      receiverMemberId: ${receiverMemberId}
    `);
    
    try {
      // 1. Ensure avatar is active (temporarily if needed)
      const avatarState = await ctx.runQuery(api.avatar.getUserAvatarState, {
        userId
      });
      
      if (!avatarState) {
        console.log(`[AVATAR:TEST] Creating temporary avatar state for test`);
        await ctx.runMutation(api.avatar.updateAvatar, {
          isActive: true,
          personalityType: "helpful"
        });
      } else if (!avatarState.isActive) {
        console.log(`[AVATAR:TEST] Activating existing avatar for test`);
        await ctx.runMutation(api.avatar.updateAvatar, {
          isActive: true
        });
      }
      
      // 2. Directly call the functions to test each step
      // First try the normal handleAutomatedResponse function
      console.log(`[AVATAR:TEST] Calling handleAutomatedResponse`);
      const handleResult: {
        success: boolean;
        messageId?: Id<"messages">;
        reason?: string;
      } = await ctx.runMutation(api.avatar.handleAutomatedResponse, {
        userId,
        messageText,
        conversationId,
        workspaceId,
        receiverMemberId
      });
      
      console.log(`[AVATAR:TEST] handleAutomatedResponse result:`, handleResult);
      
      // If the normal route didn't work, try to directly generate a response
      if (!handleResult.success) {
        console.log(`[AVATAR:TEST] Normal flow failed. Trying direct AI response generation`);
        
        // Try to directly generate an AI response
        const rawText = "This is a test response from the AI avatar. The message was processed but couldn't be sent through the normal channels.";
        const formattedResponse = formatDeltaJson(rawText);
        
        return {
          success: false,
          reason: handleResult.reason || "Unknown error",
          test: {
            rawText,
            formattedResponse,
            isJson: isJsonString(formattedResponse)
          }
        };
      }
      
      return {
        success: true,
        messageId: handleResult.messageId
      };
    } catch (error) {
      console.error(`[AVATAR:TEST] Error testing response format: ${error}`);
      return {
        success: false,
        reason: `Error: ${error}`
      };
    }
  }
});

// Helper to format text as Delta JSON
function formatDeltaJson(text: string): string {
  try {
    const deltaObj = {
      ops: [
        { insert: text }
      ]
    };
    return JSON.stringify(deltaObj);
  } catch (error) {
    console.error(`[AVATAR] Error formatting delta JSON: ${error}`);
    return JSON.stringify({ ops: [{ insert: "Error formatting response" }] });
  }
}

// Helper to check if a string is valid JSON
function isJsonString(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

// Test utility to check if the avatar functionality is working
export const debug = query({
  args: {
    action: v.union(
      v.literal("checkSetup"),
      v.literal("testAI")
    ),
  },
  handler: async (ctx, args) => {
    // Check if the avatar functionality is correctly set up
    if (args.action === "checkSetup") {
      const hasOpenAI = !!process.env.OPENAI_API_KEY;
      const hasPinecone = !!(
        process.env.PINECONE_API_KEY && 
        process.env.PINECONE_ENVIRONMENT && 
        process.env.PINECONE_INDEX
      );
      
      return {
        status: "success",
        openai: hasOpenAI ? "configured" : "missing",
        pinecone: hasPinecone ? "configured" : "missing",
        timestamp: Date.now(),
        complete: hasOpenAI && hasPinecone
      };
    }
    
    // Test the AI response generation
    if (args.action === "testAI") {
      try {
        const testResponse = await generateSmartAIResponse(
          "Hello, this is a test message. How are you today?",
          "test-workspace",
          "You are a helpful assistant."
        );
        
        return {
          status: "success",
          response: testResponse,
          length: testResponse.length,
        };
      } catch (error) {
        return {
          status: "error",
          message: `Error testing AI: ${error}`,
        };
      }
    }
    
    return {
      status: "error",
      message: "Unknown action specified"
    };
  }
});

// Test utility for the avatar feature that allows running specific parts of the pipeline directly
export const processTest = action({
  args: {
    messageText: v.string(),
    conversationId: v.id("conversations"),
    workspaceId: v.id("workspaces"),
    receiverMemberId: v.id("members"),
    testType: v.union(
      v.literal("respond"), 
      v.literal("activate"),
      v.literal("context")
    )
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    message?: string;
    isActive?: boolean;
    contextFound?: boolean;
    contextCount?: number;
    contextSamples?: any[];
    messageId?: Id<"messages">;
    reason?: string;
    query?: string;
    test?: {
      rawText: string;
      formattedResponse: string;
      isJson: boolean;
    };
  }> => {
    const { messageText, conversationId, workspaceId, receiverMemberId, testType } = args;
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    const userId = identity.tokenIdentifier;
    
    // 1. Activate test
    if (testType === "activate") {
      try {
        await ctx.runMutation(api.avatar.updateAvatar, {
          isActive: true,
          personalityType: "helpful"
        });
        
        return {
          success: true,
          message: "Avatar activated successfully",
          isActive: true
        };
      } catch (error) {
        return {
          success: false,
          message: `Error activating avatar: ${error}`,
          isActive: false
        };
      }
    }
    
    // 2. Context retrieval test
    if (testType === "context") {
      try {
        // First create an embedding
        const embedding = await _createEmbedding(messageText);
        
        // Then search for similar messages
        const vectorResults = await _querySimilarVectors(
          embedding,
          5,
          {
            workspaceId: workspaceId.toString(),
            type: "message"
          }
        );
        
        // Format the results
        let contextSamples: any[] = [];
        if (vectorResults.matches && vectorResults.matches.length > 0) {
          contextSamples = vectorResults.matches.map((match: any) => ({
            text: match.metadata.text.substring(0, 100) + "...",
            score: match.score.toFixed(3),
            messageId: match.metadata.messageId || 'unknown'
          }));
        }
        
        return {
          success: true,
          query: messageText,
          contextFound: contextSamples.length > 0,
          contextCount: contextSamples.length,
          contextSamples
        };
      } catch (error) {
        return {
          success: false,
          message: `Error retrieving context: ${error}`
        };
      }
    }
    
    // 3. Response generation test (default)
    try {
      // Get the avatar config, including personality profile
      const avatarState = await ctx.runQuery(api.avatar.getUserAvatarState, {
        userId
      });
      
      if (!avatarState) {
        console.log(`[AVATAR:TEST] Creating temporary avatar state for test`);
        await ctx.runMutation(api.avatar.updateAvatar, {
          isActive: true,
          personalityType: "helpful"
        });
      } else if (!avatarState.isActive) {
        console.log(`[AVATAR:TEST] Activating existing avatar for test`);
        await ctx.runMutation(api.avatar.updateAvatar, {
          isActive: true
        });
      }
      
      // Directly call the functions to test each step
      console.log(`[AVATAR:TEST] Calling handleAutomatedResponse`);
      const handleResult: {
        success: boolean;
        messageId?: Id<"messages">;
        reason?: string;
      } = await ctx.runMutation(api.avatar.handleAutomatedResponse, {
        userId,
        messageText,
        conversationId,
        workspaceId,
        receiverMemberId
      });
      
      console.log(`[AVATAR:TEST] handleAutomatedResponse result:`, handleResult);
      
      // If the normal route didn't work, try to directly generate a response
      if (!handleResult.success) {
        console.log(`[AVATAR:TEST] Normal flow failed. Trying direct AI response generation`);
        
        // Try to directly generate an AI response
        const rawText = "This is a test response from the AI avatar. The message was processed but couldn't be sent through the normal channels.";
        const formattedResponse = formatDeltaJson(rawText);
        
        return {
          success: false,
          reason: handleResult.reason || "Unknown error",
          test: {
            rawText,
            formattedResponse,
            isJson: isJsonString(formattedResponse)
          }
        };
      }
      
      return {
        success: true,
        messageId: handleResult.messageId
      };
    } catch (error) {
      console.error(`[AVATAR:TEST] Error testing response generation: ${error}`);
      return {
        success: false,
        reason: `Error: ${error}`
      };
    }
  }
});

/**
 * Test end-to-end RAG pipeline with simulated context
 * This function combines context retrieval simulation with AI response generation
 */
export const testRAGWithAI = action({
  args: {
    messageText: v.string(),
    userProfile: v.string(),
    workspaceId: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    responseText?: string;
    contextFound?: boolean;
    contextCount?: number;
    contextSamples?: Array<{text: string; score: number}>;
    error?: string;
  }> => {
    const { messageText, userProfile, workspaceId } = args;
    
    console.log(`[AVATAR:RAG_TEST] Testing RAG pipeline with AI for message: "${messageText.substring(0, 50)}..."`);
    
    try {
      // Step 1: Simulate retrieving context (similar to our testSimulateRAG function)
      console.log(`[AVATAR:RAG_TEST] Step 1: Retrieving context for message`);
      
      // Simulate context retrieval
      const simulatedMessages = [
        { 
          text: "This is a simulated context message about project planning.", 
          score: 0.92 
        },
        { 
          text: "We need to schedule a meeting to discuss the upcoming release.", 
          score: 0.87 
        },
        { 
          text: "The AI avatar feature is almost ready for testing.", 
          score: 0.81 
        },
        { 
          text: "Remember to update the documentation for the new features.", 
          score: 0.76 
        }
      ];
      
      // Filter messages to make it seem like they match the query
      const matchedMessages = simulatedMessages.filter(msg => {
        const messageLower = messageText.toLowerCase();
        const textLower = msg.text.toLowerCase();
        
        return ['meeting', 'project', 'avatar', 'feature', 'documentation', 'testing', 'release']
          .some(keyword => messageLower.includes(keyword) && textLower.includes(keyword));
      });
      
      // If no matched messages, return some default ones
      const contextMessages = matchedMessages.length > 0 ? matchedMessages : simulatedMessages.slice(0, 2);
      
      // Create full context by joining messages
      const fullContext = contextMessages.map(msg => msg.text).join("\n\n");
      console.log(`[AVATAR:RAG_TEST] Found ${contextMessages.length} relevant context messages`);
      
      // Step 2: Generate AI response with the context
      console.log(`[AVATAR:RAG_TEST] Step 2: Generating AI response with context`);
      
      // Create a prompt that includes the context
      let prompt = `
You are responding as an AI avatar assistant. 

USER PROFILE:
${userProfile}

RELEVANT CONVERSATION HISTORY:
${fullContext}

USER MESSAGE:
${messageText}

Please provide a helpful, friendly response based on the context and user's message.
      `;
      
      // Generate AI response using the OpenAI API directly to include context
      console.log(`[AVATAR:RAG_TEST] Making OpenAI API request with simulated context`);
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        throw new Error("OpenAI API key is required but not configured");
      }
      
      // Call OpenAI API with our custom prompt that includes context
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            { 
              role: "system", 
              content: "You are an AI assistant responding in a chat application." 
            },
            { 
              role: "user", 
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }
      
      const result = await response.json();
      const aiText = result.choices[0].message.content;
      console.log(`[AVATAR:RAG_TEST] Generated AI text: ${aiText.substring(0, 50)}...`);
      
      // Format response as Delta JSON
      const formattedResponse = formatDeltaJson(aiText);
      console.log(`[AVATAR:RAG_TEST] Formatted as Delta JSON: ${formattedResponse.substring(0, 50)}...`);
      
      return {
        success: true,
        responseText: formattedResponse,
        contextFound: contextMessages.length > 0,
        contextCount: contextMessages.length,
        contextSamples: contextMessages
      };
    } catch (error) {
      console.error(`[AVATAR:RAG_TEST] Error in RAG pipeline: ${error}`);
      return {
        success: false,
        error: String(error)
      };
    }
  }
});

/**
 * Process a delayed response for the AI avatar - this creates a more natural feeling 
 * when the AI responds after a short delay
 */
export const processDelayedResponse = action({
  args: {
    userId: v.string(),
    messageText: v.string(),
    conversationId: v.id("conversations"),
    workspaceId: v.id("workspaces"),
    receiverMemberId: v.id("members"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    messageId?: Id<"messages">;
    reason?: string;
  }> => {
    const { 
      userId, 
      messageText, 
      conversationId, 
      workspaceId, 
      receiverMemberId 
    } = args;
    
    console.log(`[AVATAR:DELAYED] Processing delayed response
      userId: ${userId}
      messageText: ${messageText.substring(0, 50)}...
      conversationId: ${conversationId}
      workspaceId: ${workspaceId}
      receiverMemberId: ${receiverMemberId}
    `);
    
    try {
      // Verify avatar is still active and user is still offline
      const avatarState = await ctx.runQuery(api.avatar.isAvatarActive, {
        userId
      });
      
      if (!avatarState) {
        console.log(`[AVATAR:DELAYED] Avatar no longer active for user ${userId}`);
        return { success: false, reason: "Avatar not active" };
      }
      
      // Check if user is still offline (to avoid responding if they came online)
      const member = await ctx.runQuery(api.members.getMemberByUserId, {
        userId,
        workspaceId
      });
      
      if (member && member.isOnline) {
        console.log(`[AVATAR:DELAYED] User ${userId} is now online, cancelling automated response`);
        return { success: false, reason: "User is now online" };
      }
      
      console.log(`[AVATAR:DELAYED] All checks passed, generating response for userId: ${userId}`);
      
      // Get personality profile for better responses
      const avatarStateData = await ctx.runQuery(api.avatar.getUserAvatarState, {
        userId
      });
      
      const personalityProfile = avatarStateData?.personalityProfile || "You are a helpful assistant.";
      console.log(`[AVATAR:DELAYED] Using personality profile (length: ${personalityProfile.length})`);
      
      // Generate the AI response directly
      try {
        // Generate response
        const responseJson = await generateSmartAIResponse(
          messageText,
          workspaceId.toString(),
          personalityProfile
        );
        
        console.log(`[AVATAR:DELAYED] Generated response JSON (length: ${responseJson.length})`);
        
        // Send the message directly
        const messageId = await ctx.runMutation(api.messages.sendAIMessage, {
          conversationId,
          workspaceId,
          memberId: receiverMemberId,
          body: responseJson,
        });
        
        console.log(`[AVATAR:DELAYED] Successfully sent AI message, ID: ${messageId}`);
        
        return {
          success: true,
          messageId
        };
      } catch (aiError) {
        console.error(`[AVATAR:DELAYED] Error generating or sending AI response: ${aiError}`);
        
        // As a fallback, try the standard handler
        console.log(`[AVATAR:DELAYED] Trying fallback through handleAutomatedResponse`);
        return await ctx.runMutation(api.avatar.handleAutomatedResponse, {
          userId,
          messageText,
          conversationId,
          workspaceId,
          receiverMemberId
        });
      }
    } catch (error) {
      console.error(`[AVATAR:DELAYED] Error processing delayed response: ${error}`);
      return { 
        success: false, 
        reason: `Error: ${error}` 
      };
    }
  }
});

/**
 * Get all avatar states (for UI components that need to show avatar status)
 */
export const getAllAvatarStates = query({
  handler: async (ctx) => {
    const avatarStates = await ctx.db
      .query("avatarStates")
      .collect();
    
    return avatarStates.map(state => ({
      userId: state.userId,
      isActive: state.isActive
    }));
  }
}); 