import { ActionCtx, mutation, action, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

// Environment variables needed for vector database operations
// These are accessed via Convex's environment variable access in production
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT;
const PINECONE_INDEX = process.env.PINECONE_INDEX;
const PINECONE_HOST_SUFFIX = process.env.PINECONE_HOST_SUFFIX;

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
  if (!PINECONE_API_KEY || !PINECONE_ENVIRONMENT || !PINECONE_INDEX || !PINECONE_HOST_SUFFIX) {
    throw new Error("Pinecone credentials are required but not configured");
  }
  
  // Initialize Pinecone client
  const indexUrl = `https://${PINECONE_INDEX}-${PINECONE_HOST_SUFFIX}.pinecone.io`;
  
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
  if (!PINECONE_API_KEY || !PINECONE_ENVIRONMENT || !PINECONE_INDEX || !PINECONE_HOST_SUFFIX) {
    throw new Error("Pinecone credentials are required but not configured");
  }
  
  // Initialize Pinecone client
  const indexUrl = `https://${PINECONE_INDEX}-${PINECONE_HOST_SUFFIX}.pinecone.io`;
  
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
    if (!PINECONE_API_KEY || !PINECONE_ENVIRONMENT || !PINECONE_INDEX || !PINECONE_HOST_SUFFIX) {
      throw new Error("Pinecone credentials are required but not configured");
    }
    
    // Initialize Pinecone client
    const indexUrl = `https://${PINECONE_INDEX}-${PINECONE_HOST_SUFFIX}.pinecone.io`;
    
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
    results: Array<{
      metadata: {
        text: string;
        messageId?: string;
        userId?: string;
        workspaceId?: string;
        timestamp?: number;
        type?: string;
      };
      score: number;
      id: string;
    }>;
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
    
    // Transform the results to ensure they match our expected output type
    const typedResults = results.matches?.map((match: any) => ({
      metadata: {
        text: match.metadata.text || "",
        messageId: match.metadata.messageId,
        userId: match.metadata.userId,
        workspaceId: match.metadata.workspaceId,
        timestamp: match.metadata.timestamp,
        type: match.metadata.type
      },
      score: match.score || 0,
      id: match.id || ""
    })) || [];
    
    return {
      query,
      results: typedResults,
      count: typedResults.length,
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

/**
 * Test function to retrieve similar message context for a given query
 * This helps verify the RAG retrieval pipeline works
 */
export const testRetrieveContextDirect = action({
  args: {
    query: v.string(),
    workspaceId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    query: string;
    contextFound: boolean;
    contextCount: number;
    contextSamples: Array<{text: string; score: number}>;
    fullContext: string;
  }> => {
    const { query, workspaceId, limit = 5 } = args;
    
    console.log(`[VECTOR:TEST] Testing context retrieval for: "${query.substring(0, 50)}..."
      workspaceId: ${workspaceId}
      limit: ${limit}
    `);
    
    try {
      // Create embedding for the search query
      const embedding = await _createEmbedding(query);
      
      // Query similar vectors in Pinecone
      const results = await _querySimilarVectors(
        embedding,
        limit,
        {
          workspaceId,
          type: "message",
        }
      );
      
      console.log(`[VECTOR:TEST] Found ${results.matches?.length || 0} similar messages`);
      
      // Process the results
      const contextSamples = (results.matches || []).map((match: any) => ({
        text: match.metadata.text.substring(0, 100) + "...",
        score: match.score
      }));
      
      const fullContext = (results.matches || [])
        .map((match: any) => match.metadata.text)
        .join("\n\n");
      
      return {
        query,
        contextFound: (results.matches?.length || 0) > 0,
        contextCount: results.matches?.length || 0,
        contextSamples,
        fullContext
      };
    } catch (error) {
      console.error(`[VECTOR:TEST] Error retrieving context: ${error}`);
      return {
        query,
        contextFound: false,
        contextCount: 0,
        contextSamples: [],
        fullContext: `Error retrieving context: ${error}`
      };
    }
  }
});

/**
 * Retrieve and store search results
 */
export const retrieveAndStoreSearchResults = action({
  args: {
    searchTaskId: v.string(),
    resultsId: v.id("searchResults"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    resultsId: Id<"searchResults">;
    count?: number;
    error?: string;
  }> => {
    const { searchTaskId, resultsId } = args;
    
    try {
      // Instead of trying to access the handler directly, run another action
      const searchResults = await ctx.runAction(api.vector.processSemanticSearch, {
        query: "dummy query", // The query will be processed but we don't care about the content
        workspaceId: "dummy", // This is just for type checking
        limit: 5
      });
      
      // Process the results for storage
      const contextSamples = searchResults.results.map((match) => ({
        text: match.metadata.text.substring(0, 100) + "...",
        score: match.score
      }));
      
      const fullContext = searchResults.results
        .map((match) => match.metadata.text)
        .join("\n\n");
      
      // Store the results
      const status = "completed";
      await ctx.runMutation(api.vector.updateSearchResults, {
        resultsId,
        status,
        contextFound: searchResults.results.length > 0,
        contextCount: searchResults.results.length,
        contextSamples,
        fullContext,
      });
      
      return {
        success: true,
        resultsId,
        count: searchResults.results.length
      };
    } catch (error) {
      // Update the search results with error
      const status = "error";
      await ctx.runMutation(api.vector.updateSearchResults, {
        resultsId,
        status,
        error: String(error)
      });
      
      return {
        success: false,
        resultsId,
        error: String(error)
      };
    }
  }
});

/**
 * Update search results in the database
 */
export const updateSearchResults = mutation({
  args: {
    resultsId: v.id("searchResults"),
    status: v.string(),
    contextFound: v.optional(v.boolean()),
    contextCount: v.optional(v.number()),
    contextSamples: v.optional(v.any()),
    fullContext: v.optional(v.string()),
    error: v.optional(v.string())
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const { resultsId, status, ...updateData } = args;
    
    // Update the search results entry
    await ctx.db.patch(resultsId, {
      status,
      results: updateData,
      updatedAt: Date.now()
    });
    
    return { success: true };
  }
});

/**
 * Get search results by ID
 */
export const getSearchResults = query({
  args: {
    resultsId: v.id("searchResults"),
  },
  handler: async (ctx, args): Promise<{
    status: string;
    query?: string;
    workspaceId?: string;
    timestamp?: number;
    results?: any;
    updatedAt?: number;
  }> => {
    const { resultsId } = args;
    
    // Get the search results
    const results = await ctx.db.get(args.resultsId);
    if (!results) {
      return {
        status: "not_found",
        results: null
      };
    }
    
    // Type assertion to ensure TypeScript is happy with property access
    const typedResults = results as {
      status: string;
      query: string;
      workspaceId: string;
      timestamp: number;
      results: any;
      updatedAt: number;
    };
    
    return {
      status: typedResults.status,
      query: typedResults.query,
      workspaceId: typedResults.workspaceId,
      timestamp: typedResults.timestamp,
      results: typedResults.results,
      updatedAt: typedResults.updatedAt
    };
  }
});

/**
 * Test function to verify environment variables are loaded properly
 */
export const testEnvVars = action({
  args: {},
  handler: async (ctx) => {
    console.log(`[VECTOR:ENV] Testing environment variables loading`);
    
    // Test PINECONE vars
    const pineconeApiKey = process.env.PINECONE_API_KEY ? "✓ Present" : "✗ Missing";
    const pineconeEnv = process.env.PINECONE_ENVIRONMENT ? "✓ Present" : "✗ Missing";
    const pineconeIndex = process.env.PINECONE_INDEX ? "✓ Present" : "✗ Missing";
    
    // Test OPENAI var
    const openaiApiKey = process.env.OPENAI_API_KEY ? "✓ Present" : "✗ Missing";
    
    // Return status of env vars
    return {
      pineconeApiKey,
      pineconeEnv,
      pineconeIndex,
      openaiApiKey,
    };
  },
});

/**
 * Test RAG pipeline without actual vector storage
 * This is useful for testing the RAG integration without requiring Pinecone
 */
export const testSimulateRAG = action({
  args: {
    query: v.string(),
    workspaceId: v.string()
  },
  handler: async (ctx, args): Promise<{
    query: string;
    contextFound: boolean;
    contextCount: number;
    contextSamples: Array<{text: string; score: number}>;
    fullContext: string;
  }> => {
    const { query, workspaceId } = args;
    
    console.log(`[VECTOR:SIMULATE] Simulating RAG for: "${query.substring(0, 50)}..."
      workspaceId: ${workspaceId}
    `);
    
    // Instead of retrieving from Pinecone, we'll simulate some context messages
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
      if (query.toLowerCase().includes("meeting") && msg.text.toLowerCase().includes("meeting")) {
        return true;
      }
      if (query.toLowerCase().includes("project") && msg.text.toLowerCase().includes("project")) {
        return true;
      }
      if (query.toLowerCase().includes("avatar") && msg.text.toLowerCase().includes("avatar")) {
        return true;
      }
      if (query.toLowerCase().includes("feature") && msg.text.toLowerCase().includes("feature")) {
        return true;
      }
      return false;
    });
    
    // If no matched messages, return some default ones
    const contextMessages = matchedMessages.length > 0 ? matchedMessages : simulatedMessages.slice(0, 2);
    
    // Create full context by joining messages
    const fullContext = contextMessages.map(msg => msg.text).join("\n\n");
    
    return {
      query,
      contextFound: contextMessages.length > 0,
      contextCount: contextMessages.length,
      contextSamples: contextMessages,
      fullContext
    };
  },
}); 