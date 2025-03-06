import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/community/vectorstores/pinecone";

// Initialize Pinecone client with the correct host
const pineconeClient = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || "",
});

// Helper function to get the correct index with host
const getPineconeIndex = () => {
  const indexName = process.env.PINECONE_INDEX || 'chat-brilliant-v4';
  // The current Pinecone SDK version doesn't support passing a host parameter
  // We're using environment variables on the Convex server side instead
  return pineconeClient.Index(indexName);
};

/**
 * Index user messages in the vector store
 */
export async function indexUserMessages(userId: string, messages: { id: string; content?: string }[]) {
  if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
    console.warn("Pinecone credentials not configured. Skipping message indexing.");
    return;
  }

  try {
    const pineconeIndex = getPineconeIndex();
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, { 
      pineconeIndex,
      namespace: `user-${userId}`,
    });

    // Filter out messages without content
    const validMessages = messages.filter(m => m.content && m.content.trim() !== "");
    
    if (validMessages.length === 0) return;
    
    // Prepare documents for the vector store
    const documents = validMessages.map(message => ({
      pageContent: message.content || "",
      metadata: {
        messageId: message.id,
        userId,
      },
    }));
    
    // Add documents to the vector store
    await vectorStore.addDocuments(documents);
    console.log(`Indexed ${documents.length} messages for user ${userId}`);
    
  } catch (error) {
    console.error("Error indexing user messages:", error);
  }
}

/**
 * Retrieve relevant messages from the vector store
 */
export async function retrieveRelevantMessages(userId: string, query: string, limit = 5) {
  if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
    console.warn("Pinecone credentials not configured. Unable to retrieve relevant messages.");
    return [];
  }

  try {
    const pineconeIndex = getPineconeIndex();
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, { 
      pineconeIndex,
      namespace: `user-${userId}`,
    });
    
    const results = await vectorStore.similaritySearch(query, limit);
    return results;
    
  } catch (error) {
    console.error("Error retrieving relevant messages:", error);
    return [];
  }
} 