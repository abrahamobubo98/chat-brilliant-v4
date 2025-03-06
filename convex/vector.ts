import { ActionCtx, mutation, action, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

// Environment variables needed for vector database operations
// These are accessed via Convex's environment variable access in production
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT;
const PINECONE_INDEX = process.env.PINECONE_INDEX;

// Internal utility function for creating embeddings (not exported as a Convex action)
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

// Internal utility function for storing vectors in Pinecone (not exported as a Convex action)
async function _storeVector(
  id: string, 
  vector: number[], 
  metadata: {
    text: string;
    messageId?: string;
    userId?: string;
    workspaceId?: string;
    timestamp?: number;
    type?: string;
  }
): Promise<any> {
  // Ensure we have the necessary Pinecone credentials
  if (!PINECONE_API_KEY || !PINECONE_ENVIRONMENT || !PINECONE_INDEX) {
    throw new Error("Pinecone credentials are required but not configured");
  }
  
  // Initialize Pinecone client
  const indexUrl = `https://${PINECONE_INDEX}-${PINECONE_ENVIRONMENT}.svc.${PINECONE_ENVIRONMENT}.pinecone.io`;
  
  // Upsert the vector into Pinecone
  const response = await fetch(`${indexUrl}/vectors/upsert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Api-Key": PINECONE_API_KEY
    },
    body: JSON.stringify({
      vectors: [{
        id,
        values: vector,
        metadata
      }],
      namespace: "messages"
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinecone API error: ${error}`);
  }
  
  return await response.json();
}

// Internal utility function for querying similar vectors (not exported as a Convex action)
async function _querySimilarVectors(
  vector: number[],
  topK: number,
  filter?: any
): Promise<any> {
  // Ensure we have the necessary Pinecone credentials
  if (!PINECONE_API_KEY || !PINECONE_ENVIRONMENT || !PINECONE_INDEX) {
    throw new Error("Pinecone credentials are required but not configured");
  }
  
  // Initialize Pinecone client
  const indexUrl = `https://${PINECONE_INDEX}-${PINECONE_ENVIRONMENT}.svc.${PINECONE_ENVIRONMENT}.pinecone.io`;
  
  // Query vectors from Pinecone
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

/**
 * Creates a vector embedding from the given text using OpenAI API
 * Public action for external calls
 */
export const createEmbedding = action({
  args: {
    text: v.string(),
  },
  handler: async (ctx: ActionCtx, args) => {
    const { text } = args;
    return await _createEmbedding(text);
  },
});

/**
 * Stores a vector in the Pinecone vector database
 * Public action for external calls
 */
export const storeVector = action({
  args: {
    id: v.string(),
    vector: v.array(v.number()),
    metadata: v.object({
      text: v.string(),
      messageId: v.optional(v.string()),
      userId: v.optional(v.string()),
      workspaceId: v.optional(v.string()),
      timestamp: v.optional(v.number()),
      type: v.optional(v.string()),
    }),
  },
  handler: async (ctx: ActionCtx, args) => {
    const { id, vector, metadata } = args;
    return await _storeVector(id, vector, metadata);
  },
});

/**
 * Query similar vectors from Pinecone using a vector embedding
 * Public action for external calls
 */
export const querySimilarVectors = action({
  args: {
    vector: v.array(v.number()),
    topK: v.number(),
    filter: v.optional(v.object({})),
  },
  handler: async (ctx: ActionCtx, args) => {
    const { vector, topK, filter } = args;
    return await _querySimilarVectors(vector, topK, filter);
  },
});

/**
 * Delete a vector from Pinecone by ID
 */
export const deleteVector = action({
  args: {
    id: v.string(),
  },
  handler: async (ctx: ActionCtx, args) => {
    const { id } = args;
    
    // Ensure we have the necessary Pinecone credentials
    if (!PINECONE_API_KEY || !PINECONE_ENVIRONMENT || !PINECONE_INDEX) {
      throw new Error("Pinecone credentials are required but not configured");
    }
    
    // Initialize Pinecone client
    const indexUrl = `https://${PINECONE_INDEX}-${PINECONE_ENVIRONMENT}.svc.${PINECONE_ENVIRONMENT}.pinecone.io`;
    
    // Delete the vector from Pinecone
    const response = await fetch(`${indexUrl}/vectors/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": PINECONE_API_KEY
      },
      body: JSON.stringify({
        ids: [id],
        namespace: "messages"
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pinecone API error: ${error}`);
    }
    
    return await response.json();
  },
});

/**
 * Process message text into vector embeddings and store in Pinecone
 * This is an intermediary action that handles the embedding creation
 * and storage in the vector database
 */
export const processMessageVector = action({
  args: {
    messageId: v.string(),
    text: v.string(),
    workspaceId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { messageId, text, workspaceId, userId } = args;
    
    // Create the embedding using our internal utility function
    const embedding = await _createEmbedding(text);
    
    // Store the embedding in Pinecone using our internal utility function
    await _storeVector(
      messageId,
      embedding,
      {
        text,
        messageId,
        userId,
        workspaceId,
        timestamp: Date.now(),
        type: "message",
      }
    );
    
    return { success: true };
  },
});

/**
 * Store a message in vector database for semantic search
 * Public mutation that will be called when a message is created
 */
export const storeMessageVector = mutation({
  args: {
    messageId: v.id("messages"),
    text: v.string(),
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { messageId, text, workspaceId, userId } = args;
    
    // Schedule the embedding creation and vector storage
    ctx.scheduler.runAfter(0, api.vector.processMessageVector, {
      messageId: messageId.toString(),
      text,
      workspaceId: workspaceId.toString(),
      userId: userId.toString(),
    });
    
    return { success: true };
  },
});

/**
 * Process updating a message vector
 */
export const processUpdateMessageVector = action({
  args: {
    messageId: v.string(),
    text: v.string(),
    workspaceId: v.string(),
    memberId: v.string(),
  },
  handler: async (ctx, args) => {
    const { messageId, text, workspaceId, memberId } = args;
    
    // Create the embedding using our internal utility function
    const embedding = await _createEmbedding(text);
    
    // Update the vector in Pinecone using our internal utility function
    await _storeVector(
      messageId,
      embedding,
      {
        text,
        messageId,
        userId: memberId,
        workspaceId,
        timestamp: Date.now(),
        type: "message",
      }
    );
    
    return { success: true };
  },
});

/**
 * Update a message vector in the database
 */
export const updateMessageVector = mutation({
  args: {
    messageId: v.id("messages"),
    newText: v.string(),
  },
  handler: async (ctx, args) => {
    const { messageId, newText } = args;
    
    // Get the message to ensure it exists and get its metadata
    const message = await ctx.db.get(messageId);
    if (!message) {
      throw new Error("Message not found");
    }
    
    // Schedule the update of the vector
    ctx.scheduler.runAfter(0, api.vector.processUpdateMessageVector, {
      messageId: messageId.toString(),
      text: newText,
      workspaceId: message.workspaceId.toString(),
      memberId: message.memberId.toString(),
    });
    
    return { success: true };
  },
});

/**
 * Delete a message vector from the database
 */
export const deleteMessageVector = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const { messageId } = args;
    
    // Schedule the deletion of the vector
    ctx.scheduler.runAfter(0, api.vector.deleteVector, {
      id: messageId.toString(),
    });
    
    return { success: true };
  },
});

/**
 * Search for similar messages using semantic search
 */
export const searchSimilarMessages = query({
  args: {
    query: v.string(),
    workspaceId: v.id("workspaces"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { query, workspaceId, limit = 5 } = args;
    
    // For query functions, we can't directly call actions
    // This is a placeholder - in real implementation, we would use
    // a mutation to perform the search and then return the results
    
    return {
      query,
      results: [],
      count: 0
    };
  },
});

/**
 * Process the semantic search
 */
export const processSemanticSearch = action({
  args: {
    query: v.string(),
    workspaceId: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args): Promise<{
    query: string;
    results: any[];
    count: number;
  }> => {
    const { query, workspaceId, limit } = args;
    
    // Create embedding for the search query using internal utility
    const embedding = await _createEmbedding(query);
    
    // Query similar vectors in Pinecone using internal utility
    const results = await _querySimilarVectors(
      embedding,
      limit,
      {
        workspaceId,
        type: "message",
      }
    );
    
    return {
      query,
      results: results.matches || [],
      count: results.matches?.length || 0,
    };
  },
});

/**
 * Perform semantic search (as a mutation to be able to call actions)
 */
export const performSemanticSearch = mutation({
  args: {
    query: v.string(),
    workspaceId: v.id("workspaces"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    status: string;
    taskId?: string;
    error?: string;
  }> => {
    const { query, workspaceId, limit = 5 } = args;
    
    try {
      // Schedule the search to run
      const searchTask = await ctx.scheduler.runAfter(0, api.vector.processSemanticSearch, {
        query,
        workspaceId: workspaceId.toString(),
        limit,
      });
      
      return {
        status: "scheduled",
        taskId: searchTask.toString()
      };
    } catch (error) {
      console.error("Error scheduling semantic search:", error);
      return {
        status: "error",
        error: String(error)
      };
    }
  },
}); 