const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testVectorDatabase() {
  console.log('Starting vector database test...');
  
  try {
    // Initialize Pinecone client
    console.log('Initializing Pinecone client...');
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    
    // List available indexes
    console.log('Listing available indexes...');
    const indexes = await pinecone.listIndexes();
    console.log('Available indexes:', indexes);
    
    // Get the chat-brilliant-v4 index
    console.log('Getting chat-brilliant-v4 index...');
    const index = pinecone.Index('chat-brilliant-v4');
    
    // Get index stats
    console.log('Getting index stats...');
    const stats = await index.describeIndexStats();
    console.log('Index stats:', stats);
    
    // Create an embedding using OpenAI
    console.log('Creating test embedding...');
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    
    const testText = 'This is a test message for the vector database';
    const embedding = await embeddings.embedQuery(testText);
    console.log(`Created embedding with ${embedding.length} dimensions`);
    
    // Insert the embedding into Pinecone
    console.log('Inserting test vector into Pinecone...');
    const upsertResponse = await index.upsert([{
      id: 'test-vector-1',
      values: embedding,
      metadata: {
        text: testText,
        userId: 'test-user-123',
        timestamp: Date.now()
      }
    }]);
    console.log('Upsert response:', upsertResponse);
    
    // Query the vector
    console.log('Querying for similar vectors...');
    const queryResponse = await index.query({
      vector: embedding,
      topK: 1,
      includeMetadata: true
    });
    console.log('Query response:', queryResponse);
    
    console.log('Vector database test completed successfully!');
  } catch (error) {
    console.error('Error testing vector database:', error);
  }
}

// Run the test
testVectorDatabase(); 